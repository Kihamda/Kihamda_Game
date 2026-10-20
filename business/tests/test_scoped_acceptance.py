import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import scoped_acceptance as acceptance
import scoped_delivery as delivery
import scoped_upload as upload
import test_scoped_delivery as fixtures
from test_scoped_upload import WritableFTP


class ScopedAcceptanceTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.ScopedDeliveryTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.http = {path: path.encode() for path in acceptance.PROTECTED_URLS}
        self.before = acceptance.snapshot(self.http.__getitem__)
        for entry in self.fixture.manifest["files"]:
            self.http[entry["path"]] = (self.fixture.site / entry["path"]).read_bytes()
        self.http[delivery.SCOPE] = self.http[delivery.SCOPE + "index.html"]

    def test_every_byte_matches_without_claiming_browser_acceptance(self):
        result = acceptance.verify(self.fixture.package, self.before, self.http.__getitem__)
        self.assertFalse(result["deployed"])
        self.assertIn("browser-acceptance-pending", result["status"])
        self.assertIn(delivery.SCOPE, result["files"])

    def test_version_alone_is_not_publication_proof(self):
        self.http[delivery.SCOPE] = b"old game"
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            acceptance.verify(self.fixture.package, self.before, self.http.__getitem__)

    def test_unrelated_url_change_fails(self):
        for path in acceptance.PROTECTED_URLS:
            original = copy.deepcopy(self.http)
            self.http[path] = b"changed"
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, "Unrelated"):
                acceptance.verify(self.fixture.package, self.before, self.http.__getitem__)
            self.http = original

    def test_incomplete_snapshot_refused(self):
        del self.before["contact/"]
        with self.assertRaisesRegex(ValueError, "incomplete"):
            acceptance.verify(self.fixture.package, self.before, self.http.__getitem__)

    def test_recovery_checks_both_entry_urls_and_old_version(self):
        journal = self.fixture.root / "journal.json"
        state = {"schema": 1, "scope": delivery.SCOPE,
                 "status": "entry-restored-awaiting-http-and-browser-acceptance",
                 "oldHtmlHex": b"old entry".hex(), "oldVersionHex": b"old version".hex()}
        journal.write_text(json.dumps(state), encoding="utf-8")
        for path in (delivery.SCOPE, delivery.SCOPE + "index.html"):
            self.http[path] = b"old entry"
        self.http[delivery.SCOPE + "build-version.json"] = b"old version"
        self.assertFalse(acceptance.verify_recovery(journal, self.before, self.http.__getitem__)["deployed"])
        for path in (delivery.SCOPE, delivery.SCOPE + "index.html", delivery.SCOPE + "build-version.json"):
            original = self.http[path]
            self.http[path] = b"wrong"
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, "checksum mismatch"):
                acceptance.verify_recovery(journal, self.before, self.http.__getitem__)
            self.http[path] = original

    def test_uncertain_journal_is_not_recovery_success(self):
        journal = self.fixture.root / "journal.json"
        journal.write_text(json.dumps({"schema": 1, "scope": delivery.SCOPE,
                                      "status": "uncertain-reconcile-before-retry"}))
        with self.assertRaisesRegex(ValueError, "not completed"):
            acceptance.verify_recovery(journal, self.before, self.http.__getitem__)


class InterruptedDeliveryTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.ScopedDeliveryTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.backup = self.fixture.root / "backup"
        self.journal = self.fixture.root / "journal.json"
        self.ftp = WritableFTP(copy.deepcopy(self.fixture.remote))
        delivery.inspect(self.fixture.package, self.backup, self.ftp,
                         self.fixture.http.__getitem__)
        self.http = {path: path.encode() for path in acceptance.PROTECTED_URLS}
        self.http[""] = self.fixture.remote["index.html"]
        self.before = acceptance.snapshot(self.http.__getitem__)
        self.http.update(self.fixture.remote)
        upload.deliver(self.fixture.package, self.backup, self.ftp, self.journal)
        self.http.update(self.ftp.files)
        self.http[delivery.SCOPE] = self.http[delivery.SCOPE + "index.html"]
        # SIGTERM may leave a stale phase even though the HTML switch finished.
        self.change_journal(status="creating-assets-directory")

    def change_journal(self, **changes):
        state = json.loads(self.journal.read_text())
        state.update(changes)
        self.journal.write_text(json.dumps(state))

    def reconcile(self):
        return acceptance.reconcile(self.fixture.package, self.backup, self.journal,
                                    self.before, self.http.__getitem__)

    def test_cancelled_after_entry_switch_is_reconciled_without_replay(self):
        original = self.journal.read_bytes()
        mutations = copy.deepcopy(self.ftp.mutations)
        result = self.reconcile()
        self.assertIn("http-reconciled", result["status"])
        self.assertFalse(result["deployed"])
        self.assertFalse(result["replayed"])
        self.assertIn("index.html", result["preservedBaselineFiles"])
        self.assertEqual(original, self.journal.read_bytes())
        self.assertEqual(mutations, self.ftp.mutations)

    def test_partial_switch_and_changed_old_dependencies_refused(self):
        for path in (delivery.SCOPE, delivery.SCOPE + "index.html", "assets/old.js"):
            original = copy.deepcopy(self.http)
            self.http[path] = b"changed"
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.reconcile()
            self.http = original

    def test_mismatched_transaction_and_old_entry_refused_before_http(self):
        original = self.journal.read_bytes()
        def fail_http(path):
            self.fail("Local evidence must fail before HTTP: " + path)
        for change in ({"commit": "b" * 40}, {"scope": "games/other/"},
                       {"transaction": "invalid"}, {"newHtmlSha256": "0" * 64},
                       {"newVersionSha256": "0" * 64}, {"oldHtmlHex": b"other".hex()}):
            self.journal.write_bytes(original)
            self.change_journal(**change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                acceptance.reconcile(self.fixture.package, self.backup, self.journal,
                                     self.before, fail_http)

    def test_recovery_inventory_tamper_and_unsafe_paths_refused(self):
        report_path = self.backup / "preflight.json"
        original = json.loads(report_path.read_text())
        for path in ("../outside", "assets/../../outside", "index.html"):
            report = copy.deepcopy(original)
            report["baseline"].append({"path": path, "sha256": "0" * 64})
            report_path.write_text(json.dumps(report))
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, "Unsafe or duplicate"):
                self.reconcile()
        report_path.write_text(json.dumps(original))
        (self.backup / "before/index.html").write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "Recovery checksum"):
            self.reconcile()

    def test_truncated_static_dependency_inventory_refused_before_http(self):
        report_path = self.backup / "preflight.json"
        report = json.loads(report_path.read_text())
        report["baseline"] = [entry for entry in report["baseline"] if entry["path"] != "assets/old.js"]
        report_path.write_text(json.dumps(report))
        def fail_http(path):
            self.fail("Truncated inventory must fail before HTTP: " + path)
        with self.assertRaisesRegex(ValueError, "static dependency missing"):
            acceptance.reconcile(self.fixture.package, self.backup, self.journal,
                                 self.before, fail_http)
