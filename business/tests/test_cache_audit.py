import hashlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import cache_audit as cache


class CacheAuditTest(unittest.TestCase):
    def fetch(self, path, conditional=None):
        headers = {"Cache-Control": "no-cache", "ETag": '"version-a"'}
        return (304, headers, b"") if conditional else (200, headers, b"same bytes")

    def test_explicit_policy_and_conditional_roundtrip(self):
        result = cache.audit(self.fetch)
        self.assertTrue(result["policyPassed"])
        self.assertFalse(result["productionWrites"])
        self.assertFalse(result["browserAcceptance"])
        self.assertEqual(len(cache.PATHS), len(result["paths"]))
        self.assertEqual(hashlib.sha256(b"same bytes").hexdigest(), result["paths"][""]["sha256"])

    def test_missing_or_conflicting_policy_fails(self):
        for value in (None, "public", "max-age=604800", "no-cache, max-age=600",
                      "no-cache, immutable", 'no-cache="ETag"', "max-age=0",
                      "no-cache, max-age=-1", "no-cache, max-age=0, max-age=60",
                      "no-cache, s-maxage=600", "no-cache, max-age=oops"):
            with self.subTest(value=value):
                self.assertFalse(cache.policy(value))

    def test_supported_explicit_policies(self):
        for value in ("no-cache", "no-store", "public, max-age=0, must-revalidate",
                      'MAX-AGE="0", must-revalidate', "no-cache, max-age=0"):
            with self.subTest(value=value):
                self.assertTrue(cache.policy(value))

    def test_version_marker_freshness_is_not_hidden_by_html(self):
        def fetch(path, conditional=None):
            status, headers, body = self.fetch(path, conditional)
            if path.endswith("build-version.json"):
                headers["Cache-Control"] = "max-age=604800"
            return status, headers, body
        self.assertFalse(cache.audit(fetch)["policyPassed"])

    def test_changed_bytes_between_requests_do_not_pass(self):
        def fetch(path, conditional=None):
            return 200, {"Cache-Control": "no-cache", "ETag": '"a"'}, b"new" if conditional else b"old"
        self.assertFalse(cache.audit(fetch)["policyPassed"])

    def test_conditional_freshness_override_fails(self):
        def fetch(path, conditional=None):
            status, headers, body = self.fetch(path, conditional)
            if conditional:
                headers["Cache-Control"] = "max-age=604800"
            return status, headers, body
        self.assertFalse(cache.audit(fetch)["policyPassed"])

    def test_304_with_different_entity_tag_is_refused(self):
        def fetch(path, conditional=None):
            status, headers, body = self.fetch(path, conditional)
            if conditional:
                headers["ETag"] = '"different"'
            return status, headers, body
        with self.assertRaisesRegex(ValueError, "entity tag"):
            cache.audit(fetch)

    def test_existing_receipt_refused_before_network(self):
        import tempfile
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "receipt.json"
            output.write_bytes(b"preserve")
            with patch.object(sys, "argv", ["cache_audit.py", str(output)]), patch.object(cache, "audit") as audit:
                with self.assertRaises(FileExistsError):
                    cache.main()
                audit.assert_not_called()
            self.assertEqual(b"preserve", output.read_bytes())

    def test_failed_network_does_not_leave_a_receipt(self):
        import tempfile
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "receipt.json"
            with patch.object(sys, "argv", ["cache_audit.py", str(output)]), patch.object(cache, "audit", side_effect=OSError("network")):
                with self.assertRaises(OSError):
                    cache.main()
            self.assertFalse(output.exists())

    def test_last_modified_fallback_and_unconditional_200(self):
        requests = []
        def fetch(path, conditional=None):
            requests.append(conditional)
            return 200, {"Cache-Control": "no-store", "Last-Modified": "date"}, b"same"
        self.assertTrue(cache.audit(fetch)["policyPassed"])
        self.assertEqual({"If-Modified-Since": "date"}, requests[1])

    def test_alias_mismatch_fails(self):
        def fetch(path, conditional=None):
            return 200, {"Cache-Control": "no-cache"}, path.encode()
        self.assertFalse(cache.audit(fetch)["aliasBytesMatch"])

    def test_unexpected_initial_status_or_invalid_304_fails(self):
        for initial in (True, False):
            def fetch(path, conditional=None):
                if initial or conditional:
                    return 304, {"ETag": '"a"'}, b"invalid body"
                return self.fetch(path)
            with self.subTest(initial=initial), self.assertRaises(ValueError):
                cache.audit(fetch)

    def test_path_rejected_before_network(self):
        for path in (".htaccess", "https://example.com/", "../", "?x=1"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                cache.read(path)

    def test_real_http_duplicate_headers_redirect_and_conditional(self):
        requests = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                requests.append((self.path, self.headers.get("Cache-Control")))
                if self.path == "/about/":
                    self.send_response(302)
                    self.send_header("Location", "/contact/")
                    self.end_headers()
                    return
                self.send_response(304 if self.headers.get("If-None-Match") else 200)
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Cache-Control", "max-age=600")
                self.send_header("ETag", '"a"')
                self.end_headers()
                if not self.headers.get("If-None-Match"):
                    self.wfile.write(b"body")

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.object(cache, "ORIGIN", f"http://127.0.0.1:{server.server_port}"):
                status, headers, body = cache.read("")
                self.assertEqual((200, b"body"), (status, body))
                self.assertFalse(cache.policy(headers["Cache-Control"]))
                self.assertEqual(304, cache.read("", {"If-None-Match": '"a"'})[0])
                with self.assertRaises(Exception) as error:
                    cache.read("about/")
                self.assertEqual(302, error.exception.code)
            self.assertNotIn(("/contact/", "no-cache"), requests)
            self.assertTrue(all(control == "no-cache" for _, control in requests))
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
