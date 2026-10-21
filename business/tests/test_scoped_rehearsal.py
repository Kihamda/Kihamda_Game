import copy
import json
from pathlib import Path
import sys
import shutil
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import scoped_upload as upload
import scoped_delivery as delivery
import test_scoped_delivery as fixtures
from test_scoped_upload import WritableFTP
from rehearse_scoped_artifact import rehearse
import rehearse_scoped_artifact as rehearsal
from scoped_delivery import SCOPE, inspect, sha
from scoped_upload import deliver


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


class ScopedNextCandidateRehearsalTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.ScopedDeliveryTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.artifact = self.fixture.root / "artifact"
        self.package = self.artifact / "scoped-minerush"
        shutil.copytree(self.fixture.package, self.package)
        self.backup = self.artifact / "scoped-recovery"
        self.journal = self.artifact / "transaction.json"
        ftp = WritableFTP(copy.deepcopy(self.fixture.remote))
        inspect(self.package, self.backup, ftp, self.fixture.http.__getitem__)
        deliver(self.package, self.backup, ftp, self.journal)
        self.candidate = self.fixture.root / "candidate"
        shutil.copytree(self.package, self.candidate)
        site = self.candidate / "site" / SCOPE
        (site / "assets/index-test.js").unlink()
        (site / "assets/index-next.js").write_bytes(b"console.log('next')")
        (site / "index.html").write_bytes(b'<script src="/games/minerush/assets/index-next.js"></script>')
        (site / "build-version.json").write_text(json.dumps(
            {"commit": "b" * 40, "game": "minerush", "scope": "/" + SCOPE}))
        files = [{"path": path.relative_to(self.candidate / "site").as_posix(),
                  "sha256": sha(path.read_bytes())} for path in site.rglob("*") if path.is_file()]
        (self.candidate / "manifest.json").write_text(json.dumps(
            {"schema": 1, "commit": "b" * 40, "scope": SCOPE,
             "publication": "prepared-not-deployed", "files": files}))

    def snapshot(self):
        return {path.relative_to(self.fixture.root).as_posix(): path.read_bytes()
                for path in self.fixture.root.rglob("*") if path.is_file()}

    def test_next_package_and_previous_mode_preserve_all_input_bytes_without_network(self):
        before = self.snapshot()
        with patch("socket.socket", side_effect=AssertionError("Network forbidden")):
            result = rehearsal.rehearse_candidate(self.artifact, self.candidate)
            original = rehearsal.rehearse(self.package, self.backup, self.journal)
        self.assertEqual(result["candidateCommit"], "b" * 40)
        self.assertEqual(result["sourceCommit"], "a" * 40)
        self.assertEqual(result["recoveryStatus"], "entry-restored-awaiting-http-and-browser-acceptance")
        self.assertFalse(result["retainedVersionMarker"])
        self.assertFalse(result["liveAcceptanceVerified"])
        self.assertFalse(result["productionWrites"])
        self.assertEqual(original["status"], "offline-artifact-rehearsal-passed")
        self.assertEqual(self.snapshot(), before)

    def test_incomplete_or_pending_source_upload_refused(self):
        original = json.loads(self.journal.read_text())
        for field, value in (("status", "uploading"), ("pending", {"path": SCOPE + "index.html"}),
                             ("written", [SCOPE + "build-version.json"])):
            with self.subTest(field=field):
                state = {**original, field: value}
                self.journal.write_text(json.dumps(state))
                with patch.object(rehearsal, "WritableFTP") as fake:
                    with self.assertRaisesRegex(ValueError, "Completed upload"):
                        rehearsal.rehearse_candidate(self.artifact, self.candidate)
                    fake.assert_not_called()

    def test_tampered_candidate_refused_before_simulated_server(self):
        (self.candidate / "site" / SCOPE / "assets/index-next.js").write_bytes(b"tampered")
        with patch.object(rehearsal, "WritableFTP") as fake:
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                rehearsal.rehearse_candidate(self.artifact, self.candidate)
            fake.assert_not_called()

    def test_tampered_source_backup_refused_before_simulated_server(self):
        (self.backup / "before" / SCOPE / "index.html").write_bytes(b"tampered")
        with patch.object(rehearsal, "WritableFTP") as fake:
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                rehearsal.rehearse_candidate(self.artifact, self.candidate)
            fake.assert_not_called()

    def test_next_simulation_failure_preserves_sources_and_never_accepts(self):
        before = self.snapshot()
        with patch.object(rehearsal, "recover", side_effect=ConnectionError("simulated failure")):
            with self.assertRaisesRegex(ConnectionError, "simulated failure"):
                rehearsal.rehearse_candidate(self.artifact, self.candidate)
        self.assertEqual(self.snapshot(), before)


if __name__ == "__main__":
    unittest.main()
