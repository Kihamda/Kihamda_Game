import copy
from ftplib import error_perm
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import scoped_delivery as delivery


class ReadOnlyFTP:
    def __init__(self, files):
        self.files = files
        self.calls = []

    def retrbinary(self, command, callback):
        self.calls.append(command)
        path = command.removeprefix("RETR ")
        if path not in self.files:
            raise error_perm("550 unavailable")
        callback(self.files[path])


class ScopedDeliveryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.package = self.root / "package"
        self.site = self.package / "site"
        bodies = {"index.html": b'<script src="/games/minerush/assets/index-test.js"></script>',
                  "assets/index-test.js": b"console.log('game')",
                  "build-version.json": json.dumps({"commit": "a" * 40, "game": "minerush", "scope": "/games/minerush/"}).encode()}
        self.manifest = {"schema": 1, "commit": "a" * 40, "scope": delivery.SCOPE,
                         "publication": "prepared-not-deployed", "files": []}
        for name, body in bodies.items():
            name = delivery.SCOPE + name
            file = self.site / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(body)
            self.manifest["files"].append({"path": name, "sha256": hashlib.sha256(body).hexdigest()})
        self.save_manifest()
        self.remote = {"index.html": b"production top",
                       delivery.SCOPE + "index.html": b'<script src="/assets/old.js"></script>',
                       "assets/old.js": b"old game"}
        self.http = {"": self.remote["index.html"], delivery.SCOPE: self.remote[delivery.SCOPE + "index.html"],
                     "assets/old.js": b"old game"}

    def save_manifest(self):
        (self.package / "manifest.json").write_text(json.dumps(self.manifest), encoding="utf-8")

    def test_read_only_backup_and_ambiguous_missing_asset(self):
        ftp = ReadOnlyFTP(copy.deepcopy(self.remote))
        report = delivery.inspect(self.package, self.root / "backup", ftp, self.http.__getitem__)
        self.assertFalse(report["deployed"])
        self.assertEqual(report["assetChecks"][0]["state"], "missing-or-inaccessible")
        self.assertEqual((self.root / "backup/before/assets/old.js").read_bytes(), b"old game")
        self.assertTrue(all(call.startswith("RETR ") for call in ftp.calls))
        self.assertEqual(ftp.files, self.remote)

    def test_wrong_root_stops_without_backup(self):
        self.remote["index.html"] = b"another site"
        with self.assertRaisesRegex(ValueError, "root does not match"):
            delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote), self.http.__getitem__)
        self.assertFalse((self.root / "backup").exists())

    def test_next_delivery_retains_current_scoped_assets_and_nested_imports(self):
        html = b'<script src="/games/minerush/assets/previous.js"></script>'
        self.remote[delivery.SCOPE + "index.html"] = self.http[delivery.SCOPE] = html
        bodies = {delivery.SCOPE + "assets/previous.js": b'import "./previous.css"; import("/games/other/assets/private.js");',
                  delivery.SCOPE + "assets/previous.css": b'a{background:url(./previous.png)}',
                  delivery.SCOPE + "assets/previous.png": b"old scoped image"}
        self.remote.update(bodies)
        self.http.update(bodies)
        ftp = ReadOnlyFTP(copy.deepcopy(self.remote))
        report = delivery.inspect(self.package, self.root / "backup", ftp, self.http.__getitem__)
        for path, body in bodies.items():
            self.assertEqual((self.root / "backup/before" / path).read_bytes(), body)
            self.assertEqual(ftp.calls.count("RETR " + path), 2)
        self.assertEqual(len(report["baseline"]), 5)
        self.assertFalse(any("games/other" in call for call in ftp.calls))

    def graph(self):
        files = {
            "assets/old.js": b'import("./chunk.js");const preload=["assets/style.css"];',
            "assets/chunk.js": b'export {x} from "./old.js";import("./nested/leaf.js");',
            "assets/nested/leaf.js": b'import "../chunk.js";import("https://example.org/assets/other.js");',
            "assets/style.css": b'@import "./nested/more.css";a{background:url(./image.png)}',
            "assets/nested/more.css": b'@font-face{src:url("../font.woff2")}',
            "assets/image.png": b"\x89PNG\xff",
            "assets/font.woff2": b"\xfffont",
        }
        self.remote.update(files)
        self.http.update(files)
        return files

    def test_transitive_graph_cycles_css_and_binary_recovery(self):
        files = self.graph()
        ftp = ReadOnlyFTP(copy.deepcopy(self.remote))
        report = delivery.inspect(self.package, self.root / "backup", ftp, self.http.__getitem__)
        for path, body in files.items():
            self.assertEqual((self.root / "backup/before" / path).read_bytes(), body)
            self.assertEqual(ftp.calls.count("RETR " + path), 2)
        self.assertEqual(report["recoveryDependencies"]["assets/nested/leaf.js"], ["assets/chunk.js"])
        self.assertIn("computed URLs", report["recoveryCoverage"])
        self.assertTrue(all(command.startswith("RETR ") for command in ftp.calls))

    def test_progress_exposes_counts_without_production_content(self):
        self.remote["assets/old.js"] = self.http["assets/old.js"] = (
            ";".join(f'import("./chunk{n}.js")' for n in range(18))).encode()
        for n in range(18):
            self.remote[f"assets/chunk{n}.js"] = self.http[f"assets/chunk{n}.js"] = b"private response body"
        events = []
        delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote),
                         self.http.__getitem__, progress=events.append)
        self.assertEqual({event["phase"] for event in events},
                         {"production-root-matched", "recovery-inventory", "baseline-reread"})
        self.assertNotIn("private response body", json.dumps(events))
        self.assertNotIn("assets/", json.dumps(events))

    def test_nested_dependency_mismatch_refused_without_partial_backup(self):
        self.graph()
        self.remote["assets/nested/leaf.js"] = b"different"
        with self.assertRaisesRegex(ValueError, "differs"):
            delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote), self.http.__getitem__)
        self.assertFalse((self.root / "backup").exists())

    def test_missing_nested_dependency_refused(self):
        self.graph()
        del self.remote["assets/nested/leaf.js"]
        with self.assertRaises(error_perm):
            delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote), self.http.__getitem__)
        self.assertFalse((self.root / "backup").exists())

    def test_graph_limits_refuse_without_backup(self):
        self.graph()
        for limit, value in (("MAX_RECOVERY_FILES", 3), ("MAX_RECOVERY_BYTES", 1)):
            with self.subTest(limit=limit), patch.object(delivery, limit, value):
                with self.assertRaisesRegex(ValueError, "limit exceeded"):
                    delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote), self.http.__getitem__)
                self.assertFalse((self.root / "backup").exists())

    def test_unsafe_static_dependency_refused(self):
        self.remote["assets/old.js"] = self.http["assets/old.js"] = b'import("/assets/%2e%2e/private.js")'
        with self.assertRaisesRegex(ValueError, "Unsafe recovery"):
            delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote), self.http.__getitem__)
        self.assertFalse((self.root / "backup").exists())

    def test_js_literals_are_not_bare_asset_paths(self):
        body = b'''const extension=".css";const tag="button";const selector="link[rel=";import("./actual.js");'''
        self.assertEqual(delivery.asset_references(body, "assets/entry.js"), {"assets/actual.js"})

    def test_mjs_dependencies_are_retained_transitively(self):
        self.remote["assets/old.js"] = self.http["assets/old.js"] = b'import "./module.mjs";'
        files = {"assets/module.mjs": b'import "./nested/leaf.mjs";',
                 "assets/nested/leaf.mjs": b'import "../styles.css";',
                 "assets/styles.css": b'body { background: url("./board.png"); }',
                 "assets/board.png": bytes([0, 255, 128])}
        self.remote.update(files)
        self.http.update(files)
        backup = self.root / "backup"
        report = delivery.inspect(self.package, backup, ReadOnlyFTP(self.remote), self.http.__getitem__)
        for path, body in files.items():
            self.assertEqual((backup / "before" / path).read_bytes(), body)
        self.assertEqual(report["recoveryDependencies"]["assets/module.mjs"], ["assets/nested/leaf.mjs"])

    def test_https_read_is_bounded_and_accepts_exact_limit(self):
        class Response(io.BytesIO):
            url = delivery.ORIGIN + "/assets/bundle.js"
            sizes = []
            def read(self, size=-1):
                self.sizes.append(size)
                return super().read(size)
        for body, succeeds in ((b"12345678", True), (b"1234567890", False)):
            response = Response(body)
            with self.subTest(succeeds=succeeds), patch.object(delivery, "MAX_RECOVERY_BYTES", 8), \
                    patch.object(delivery, "urlopen", return_value=response):
                if succeeds:
                    self.assertEqual(delivery.https_read("assets/bundle.js"), body)
                else:
                    with self.assertRaisesRegex(ValueError, "HTTPS response byte limit"):
                        delivery.https_read("assets/bundle.js")
                self.assertEqual(response.sizes[-1], 9)

    def test_ftp_read_stops_at_stream_limit(self):
        chunks_received = []
        class StreamingFTP:
            def retrbinary(self, command, callback):
                for chunk in (b"1234", b"5678", b"9", b"never read"):
                    chunks_received.append(chunk)
                    callback(chunk)
        with patch.object(delivery, "MAX_RECOVERY_BYTES", 8):
            self.assertEqual(delivery.ftp_read(ReadOnlyFTP({"asset": b"12345678"}), "asset"), b"12345678")
            with self.assertRaisesRegex(ValueError, "FTPS response byte limit"):
                delivery.ftp_read(StreamingFTP(), "asset")
        self.assertEqual(chunks_received, [b"1234", b"5678", b"9"])

    def test_combined_root_size_limit_without_dependencies(self):
        self.remote[delivery.SCOPE + "index.html"] = self.http[delivery.SCOPE] = b"old game without assets"
        limit = len(self.remote["index.html"]) + len(self.remote[delivery.SCOPE + "index.html"]) - 1
        with patch.object(delivery, "MAX_RECOVERY_BYTES", limit):
            with self.assertRaisesRegex(ValueError, "byte limit"):
                delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote), self.http.__getitem__)
        self.assertFalse((self.root / "backup").exists())

    def test_nested_dependency_change_during_inspection_refused(self):
        self.graph()
        ftp = ReadOnlyFTP(copy.deepcopy(self.remote))
        original = ftp.retrbinary
        def changing(command, callback):
            if command == "RETR " + delivery.SCOPE + "assets/index-test.js":
                ftp.files["assets/nested/leaf.js"] = b"changed after first read"
            original(command, callback)
        ftp.retrbinary = changing
        with self.assertRaisesRegex(ValueError, "changed during preflight"):
            delivery.inspect(self.package, self.root / "backup", ftp, self.http.__getitem__)
        self.assertFalse((self.root / "backup").exists())

    def test_collision_stops_without_backup(self):
        self.remote[delivery.SCOPE + "assets/index-test.js"] = b"different existing content"
        with self.assertRaisesRegex(ValueError, "collision"):
            delivery.inspect(self.package, self.root / "backup", ReadOnlyFTP(self.remote), self.http.__getitem__)

    def test_changed_production_stops(self):
        ftp = ReadOnlyFTP(self.remote)
        original = ftp.retrbinary
        def changing(command, callback):
            original(command, callback)
            if len(ftp.calls) == 3:
                ftp.files["index.html"] = b"concurrent deployment"
        ftp.retrbinary = changing
        with self.assertRaisesRegex(ValueError, "changed during preflight"):
            delivery.inspect(self.package, self.root / "backup", ftp, self.http.__getitem__)

    def test_unsafe_paths(self):
        for path in ("index.html", "games/minerush/../../index.html", "games/minerush/assets\\bad.js",
                     "games/minerush/assets/.secret", "games/minerush//index.html"):
            with self.subTest(path=path):
                manifest = copy.deepcopy(self.manifest)
                self.manifest["files"][0]["path"] = path
                self.save_manifest()
                with self.assertRaises(ValueError):
                    delivery.checked_package(self.package)
                self.manifest = manifest

    def test_extra_file_and_tampering_refused(self):
        extra = self.site / "index.html"
        extra.write_text("unrelated top", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "inventory"):
            delivery.checked_package(self.package)
        extra.unlink()
        (self.site / delivery.SCOPE / "index.html").write_text("tampered", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "checksum"):
            delivery.checked_package(self.package)

    def test_version_mismatch_refused(self):
        self.manifest["commit"] = "b" * 40
        self.save_manifest()
        with self.assertRaisesRegex(ValueError, "version"):
            delivery.checked_package(self.package)

    def test_recovery_directory_not_overwritten(self):
        backup = self.root / "backup"
        backup.mkdir()
        with self.assertRaisesRegex(ValueError, "fresh recovery"):
            delivery.inspect(self.package, backup, ReadOnlyFTP(self.remote), self.http.__getitem__)


if __name__ == "__main__":
    unittest.main()
