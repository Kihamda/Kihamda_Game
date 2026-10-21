import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import scoped_upload as upload
import scoped_delivery as delivery
import test_scoped_delivery as fixtures
from test_scoped_upload import WritableFTP
from rehearse_scoped_artifact import rehearse


class ScopedRehearsalTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.ScopedDeliveryTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.backup = self.fixture.root / "backup"
        self.journal = self.fixture.root / "transaction.json"
        ftp = WritableFTP(copy.deepcopy(self.fixture.remote))
        delivery.inspect(self.fixture.package, self.backup, ftp, self.fixture.http.__getitem__)
        upload.deliver(self.fixture.package, self.backup, ftp, self.journal)

    def test_rehearsal_preserves_source_and_never_connects(self):
        before = {path: path.read_bytes() for path in self.fixture.root.rglob("*") if path.is_file()}
        with patch.object(delivery, "FTP_TLS") as read_connection, \
                patch.object(upload, "FTP_TLS") as write_connection, \
                patch.object(delivery, "urlopen") as http_connection:
            result = rehearse(self.fixture.package, self.backup, self.journal)
            read_connection.assert_not_called()
            write_connection.assert_not_called()
            http_connection.assert_not_called()
        after = {path: path.read_bytes() for path in self.fixture.root.rglob("*") if path.is_file()}
        self.assertEqual(before, after)
        self.assertFalse(result["deployed"])
        self.assertFalse(result["productionWrites"])
        self.assertTrue(result["fakeFtp"])
        self.assertEqual(result["restoredFiles"], 3)
        self.assertEqual(len(result["nextBaselinePaths"]), 3)

    def test_invalid_source_fails_before_simulation(self):
        state = json.loads(self.journal.read_text())
        state["oldHtmlHex"] = b"wrong entry".hex()
        self.journal.write_text(json.dumps(state))
        with patch("rehearse_scoped_artifact.WritableFTP") as simulation:
            with self.assertRaisesRegex(ValueError, "Old entry"):
                rehearse(self.fixture.package, self.backup, self.journal)
            simulation.assert_not_called()

    def test_existing_version_is_simulated_and_restored(self):
        backup = self.fixture.root / "versioned-backup"
        journal = self.fixture.root / "versioned-transaction.json"
        ftp = WritableFTP(copy.deepcopy(self.fixture.remote))
        ftp.files[delivery.SCOPE + "build-version.json"] = b"previous version"
        delivery.inspect(self.fixture.package, backup, ftp, self.fixture.http.__getitem__)
        upload.deliver(self.fixture.package, backup, ftp, journal)
        result = rehearse(self.fixture.package, backup, journal)
        self.assertFalse(result["retainedVersionMarker"])

    def test_previous_nested_scoped_dependencies_are_preserved(self):
        backup = self.fixture.root / "nested-backup"
        journal = self.fixture.root / "nested-transaction.json"
        old = copy.deepcopy(self.fixture.remote)
        old[delivery.SCOPE + "index.html"] = b'<script src="/games/minerush/assets/nested/previous.mjs"></script>'
        old[delivery.SCOPE + "assets/nested/previous.mjs"] = b'import "./previous.css";'
        old[delivery.SCOPE + "assets/nested/previous.css"] = b"body { color: black; }"
        ftp = WritableFTP(old)
        ftp.directories.update((delivery.SCOPE + "assets", delivery.SCOPE + "assets/nested"))
        http = lambda path: old["index.html" if path == "" else
                                delivery.SCOPE + "index.html" if path == delivery.SCOPE else path]
        delivery.inspect(self.fixture.package, backup, ftp, http)
        upload.deliver(self.fixture.package, backup, ftp, journal)
        result = rehearse(self.fixture.package, backup, journal)
        self.assertEqual(result["restoredFiles"], 4)

    def test_simulation_failure_is_not_reported_as_acceptance(self):
        before = {path: path.read_bytes() for path in self.fixture.root.rglob("*") if path.is_file()}
        with patch("rehearse_scoped_artifact.recover", side_effect=ConnectionError("simulated failure")):
            with self.assertRaisesRegex(ConnectionError, "simulated failure"):
                rehearse(self.fixture.package, self.backup, self.journal)
        after = {path: path.read_bytes() for path in self.fixture.root.rglob("*") if path.is_file()}
        self.assertEqual(before, after)
