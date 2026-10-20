import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import scoped_acceptance as acceptance
import scoped_delivery as delivery
import test_scoped_delivery as fixtures


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
