import copy
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
