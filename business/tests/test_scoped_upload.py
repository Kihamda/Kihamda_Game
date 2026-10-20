import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import scoped_delivery as delivery
import scoped_upload as upload
import test_scoped_delivery as fixtures


class WritableFTP(fixtures.ReadOnlyFTP):
    def __init__(self, files):
        super().__init__(files)
        self.directories = {"games/minerush"}
        self.mutations = []
        self.hook = lambda command: None

    def mlsd(self, directory):
        if directory not in self.directories:
            raise PermissionError("Cannot list directory")
        prefix = directory + "/"
        entries = {}
        for path in self.files:
            if path.startswith(prefix):
                name = path[len(prefix):].split("/")[0]
                entries[name] = {"type": "dir" if "/" in path[len(prefix):] else "file"}
        for path in self.directories:
            if path.startswith(prefix):
                entries[path[len(prefix):]] = {"type": "dir"}
        return entries.items()

    def mkd(self, directory):
        self.mutations.append(("MKD", directory))
        self.directories.add(directory)

    def storbinary(self, command, stream):
        self.mutations.append(("STOR", command.removeprefix("STOR ")))
        self.hook(command)
        self.files[command.removeprefix("STOR ")] = stream.read()

    def rename(self, source, destination):
        self.mutations.append(("RENAME", destination))
        self.hook("RENAME " + destination)
        self.files[destination] = self.files.pop(source)


class ScopedUploadTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.ScopedDeliveryTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.package = self.fixture.package
        self.backup = self.fixture.root / "backup"
        self.journal = self.fixture.root / "transaction.json"
        self.ftp = WritableFTP(copy.deepcopy(self.fixture.remote))
        delivery.inspect(self.package, self.backup, self.ftp, self.fixture.http.__getitem__)

    def deliver(self):
        return upload.deliver(self.package, self.backup, self.ftp, self.journal)

    def test_upload_order_scope_and_conditional_recovery(self):
        old = copy.deepcopy(self.ftp.files)
        state = self.deliver()
        self.assertFalse(state["deployed"])
        self.assertEqual(state["status"], "uploaded-awaiting-http-and-browser-acceptance")
        renamed = [path for command, path in self.ftp.mutations if command == "RENAME"]
        self.assertEqual(renamed[-2:], [delivery.SCOPE + "build-version.json", delivery.SCOPE + "index.html"])
        self.assertTrue(all(path.startswith(delivery.SCOPE) for _, path in self.ftp.mutations))
        for path, body in old.items():
            if path != delivery.SCOPE + "index.html":
                self.assertEqual(self.ftp.files[path], body)
        recovered = upload.recover(self.ftp, self.journal)
        self.assertTrue(recovered["retainedVersionMarker"])
        self.assertEqual(self.ftp.files[delivery.SCOPE + "index.html"], old[delivery.SCOPE + "index.html"])
        self.assertEqual(upload.recover(self.ftp, self.journal)["status"], recovered["status"])

    def test_existing_version_is_restored(self):
        version = delivery.SCOPE + "build-version.json"
        self.ftp.files[version] = b"old version"
        self.deliver()
        upload.recover(self.ftp, self.journal)
        self.assertEqual(self.ftp.files[version], b"old version")

    def test_preflight_package_or_backup_tamper_stops_before_write(self):
        (self.backup / "before/index.html").write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.deliver()
        self.assertFalse(self.ftp.mutations)

    def test_changed_baseline_stops_before_write(self):
        self.ftp.files["index.html"] = b"new top"
        with self.assertRaisesRegex(ValueError, "baseline changed"):
            self.deliver()
        self.assertFalse(self.ftp.mutations)

    def test_denied_listing_is_not_absence(self):
        self.ftp.mlsd = lambda directory: (_ for _ in ()).throw(PermissionError("denied"))
        with self.assertRaises(PermissionError):
            self.deliver()
        self.assertFalse(self.ftp.mutations)

    def test_asset_collision_refused(self):
        self.ftp.directories.add(delivery.SCOPE + "assets")
        self.ftp.files[delivery.SCOPE + "assets/index-test.js"] = b"other content"
        with self.assertRaisesRegex(ValueError, "collision"):
            self.deliver()
        self.assertFalse(self.ftp.mutations)

    def test_identical_asset_not_rewritten(self):
        self.ftp.directories.add(delivery.SCOPE + "assets")
        path = delivery.SCOPE + "assets/index-test.js"
        self.ftp.files[path] = (self.package / "site" / path).read_bytes()
        self.deliver()
        self.assertFalse(any(target.startswith(path) for _, target in self.ftp.mutations))

    def test_partial_upload_preserves_entry_and_journals_uncertainty(self):
        old = self.ftp.files[delivery.SCOPE + "index.html"]
        def fail(command):
            if command.startswith("STOR "):
                self.ftp.files[command[5:]] = b"partial"
                raise ConnectionError("lost connection")
        self.ftp.hook = fail
        with self.assertRaises(ConnectionError):
            self.deliver()
        state = json.loads(self.journal.read_text())
        self.assertEqual(state["status"], "uncertain-reconcile-before-retry")
        self.assertIsNotNone(state["pending"])
        self.assertEqual(self.ftp.files[delivery.SCOPE + "index.html"], old)
        self.ftp.hook = lambda command: None
        upload.recover(self.ftp, self.journal)

    def test_lost_rename_ack_reconciles_actual_entry(self):
        old = self.ftp.files[delivery.SCOPE + "index.html"]
        original = self.ftp.rename
        def rename(source, destination):
            original(source, destination)
            if destination == delivery.SCOPE + "index.html":
                raise ConnectionError("ack lost")
        self.ftp.rename = rename
        with self.assertRaises(ConnectionError):
            self.deliver()
        self.ftp.rename = original
        upload.recover(self.ftp, self.journal)
        self.assertEqual(self.ftp.files[delivery.SCOPE + "index.html"], old)

    def test_concurrent_change_during_asset_upload_does_not_switch_entry(self):
        old = self.ftp.files[delivery.SCOPE + "index.html"]
        def change(command):
            if command.startswith("RENAME "):
                self.ftp.files["index.html"] = b"other deployment"
        self.ftp.hook = change
        with self.assertRaisesRegex(ValueError, "baseline changed"):
            self.deliver()
        self.assertEqual(self.ftp.files[delivery.SCOPE + "index.html"], old)

    def test_external_entry_change_refuses_recovery(self):
        self.deliver()
        self.ftp.files[delivery.SCOPE + "index.html"] = b"later deployment"
        before = len(self.ftp.mutations)
        with self.assertRaisesRegex(ValueError, "changed externally"):
            upload.recover(self.ftp, self.journal)
        self.assertEqual(len(self.ftp.mutations), before)

    def test_transaction_cannot_be_replayed(self):
        self.deliver()
        before = len(self.ftp.mutations)
        with self.assertRaisesRegex(ValueError, "fresh transaction"):
            self.deliver()
        self.assertEqual(len(self.ftp.mutations), before)

    def test_external_version_change_refuses_recovery_before_any_write(self):
        self.deliver()
        self.ftp.files[delivery.SCOPE + "build-version.json"] = b"later version"
        before = len(self.ftp.mutations)
        with self.assertRaisesRegex(ValueError, "Version changed externally"):
            upload.recover(self.ftp, self.journal)
        self.assertEqual(len(self.ftp.mutations), before)

    def test_rename_failure_never_removes_current_entry(self):
        old = self.ftp.files[delivery.SCOPE + "index.html"]
        def fail(command):
            if command == "RENAME " + delivery.SCOPE + "index.html":
                raise PermissionError("server refuses overwrite rename")
        self.ftp.hook = fail
        with self.assertRaises(PermissionError):
            self.deliver()
        self.assertEqual(self.ftp.files[delivery.SCOPE + "index.html"], old)
        self.ftp.hook = lambda command: None
        upload.recover(self.ftp, self.journal)

    def test_unsafe_write_and_journal_identifier_refused(self):
        for path in ("index.html", delivery.SCOPE + "assets/../../index.html",
                     delivery.SCOPE + "assets/x.js\r\nDELE index.html"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                upload.replace(self.ftp, path, b"x", {"transaction": "a" * 32}, self.journal)
        with self.assertRaises(ValueError):
            upload.replace(self.ftp, delivery.SCOPE + "index.html", b"x",
                           {"transaction": "../invalid"}, self.journal)
        self.assertFalse(self.ftp.mutations)


if __name__ == "__main__":
    unittest.main()
