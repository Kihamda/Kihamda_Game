import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import scoped_delivery as delivery
import scoped_upload as upload
import scoped_transaction as transaction
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
                entries[path[len(prefix):].split("/")[0]] = {"type": "dir"}
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

    def test_incomplete_or_misbound_upload_backup_refused_before_ftp(self):
        report_path = self.backup / "preflight.json"
        original = json.loads(report_path.read_text())
        reports = []
        for field, value in (("schema", 2), ("commit", "b" * 40),
                             ("scope", "games/other/"),
                             ("packageManifestSha256", "0" * 64)):
            report = copy.deepcopy(original)
            report[field] = value
            reports.append(report)
        for missing in ("index.html", delivery.SCOPE + "index.html", "assets/old.js"):
            report = copy.deepcopy(original)
            report["baseline"] = [item for item in report["baseline"] if item["path"] != missing]
            reports.append(report)
        for extra in (copy.deepcopy(original["baseline"][0]),
                      {"path": "../outside", "sha256": "0" * 64}):
            report = copy.deepcopy(original)
            report["baseline"].append(extra)
            reports.append(report)
        report = copy.deepcopy(original)
        report["baseline"] *= delivery.MAX_RECOVERY_FILES
        reports.append(report)
        for index, report in enumerate(reports):
            report_path.write_text(json.dumps(report))
            # No remote read, directory listing, journal or receipt is allowed.
            with self.subTest(case=index), patch.object(upload, "baseline_check") as remote:
                with self.assertRaises(ValueError):
                    self.deliver()
                remote.assert_not_called()
                self.assertFalse(self.journal.exists())
                self.assertEqual(self.ftp.mutations, [])
                self.assertEqual(list(self.backup.glob("transaction-*.json")), [])

    def test_upload_backup_byte_limit_refused_before_ftp(self):
        with patch.object(transaction, "MAX_RECOVERY_BYTES", 1), \
                patch.object(upload, "baseline_check") as remote:
            with self.assertRaisesRegex(ValueError, "byte limit"):
                self.deliver()
            remote.assert_not_called()
        self.assertFalse(self.journal.exists())

    def test_upload_cli_refuses_incomplete_backup_before_connection(self):
        report_path = self.backup / "preflight.json"
        report = json.loads(report_path.read_text())
        report["baseline"] = [item for item in report["baseline"] if item["path"] != "assets/old.js"]
        report_path.write_text(json.dumps(report))
        argv = ["scoped_upload.py", "upload", str(self.journal),
                "--package", str(self.package), "--backup", str(self.backup)]
        with patch.object(sys, "argv", argv), patch.object(upload, "FTP_TLS") as connect:
            with self.assertRaisesRegex(ValueError, "static dependency missing"):
                upload.main()
            connect.assert_not_called()

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
        recovered = upload.recover(self.ftp, self.journal, self.package, self.backup)
        self.assertTrue(recovered["retainedVersionMarker"])
        self.assertEqual(self.ftp.files[delivery.SCOPE + "index.html"], old[delivery.SCOPE + "index.html"])
        self.assertEqual(upload.recover(self.ftp, self.journal, self.package, self.backup)["status"], recovered["status"])

    def test_existing_version_is_restored(self):
        version = delivery.SCOPE + "build-version.json"
        self.ftp.files[version] = b"old version"
        self.deliver()
        upload.recover(self.ftp, self.journal, self.package, self.backup)
        self.assertEqual(self.ftp.files[version], b"old version")

    def test_changed_old_dependency_refuses_recovery_before_mutation(self):
        self.deliver()
        self.ftp.files["assets/old.js"] = b"externally changed dependency"
        mutations = copy.deepcopy(self.ftp.mutations)
        with self.assertRaisesRegex(ValueError, "baseline changed"):
            upload.recover(self.ftp, self.journal, self.package, self.backup)
        self.assertEqual(self.ftp.mutations, mutations)

    def test_repeated_scoped_delivery_retains_assets_and_restores_old_version(self):
        html = b'<script src="/games/minerush/assets/previous.js"></script>'
        self.ftp.files[delivery.SCOPE + "index.html"] = html
        old_assets = {delivery.SCOPE + "assets/previous.js": b'import "./previous.css";',
                      delivery.SCOPE + "assets/previous.css": b"body{color:white}"}
        self.ftp.files.update(old_assets)
        self.ftp.files[delivery.SCOPE + "build-version.json"] = b"previous version"
        self.ftp.directories.add(delivery.SCOPE + "assets")
        backup = self.fixture.root / "next-backup"
        def http(path):
            return self.ftp.files["index.html" if path == "" else
                                  delivery.SCOPE + "index.html" if path == delivery.SCOPE else path]
        delivery.inspect(self.package, backup, self.ftp, http)
        upload.deliver(self.package, backup, self.ftp, self.journal)
        upload.recover(self.ftp, self.journal, self.package, backup)
        self.assertEqual(self.ftp.files[delivery.SCOPE + "index.html"], html)
        self.assertEqual(self.ftp.files[delivery.SCOPE + "build-version.json"], b"previous version")
        for path, body in old_assets.items():
            self.assertEqual((backup / "before" / path).read_bytes(), body)
            self.assertEqual(self.ftp.files[path], body)

    def test_modified_journal_cannot_supply_recovery_bytes(self):
        self.deliver()
        original = self.journal.read_bytes()
        mutations = copy.deepcopy(self.ftp.mutations)
        calls = len(self.ftp.calls)
        for change in ({"oldHtmlHex": b"injected old entry".hex()},
                       {"oldVersionHex": b"injected old version".hex()},
                       {"commit": "b" * 40}, {"newHtmlSha256": "0" * 64}):
            state = json.loads(original)
            state.update(change)
            self.journal.write_text(json.dumps(state))
            with self.subTest(change=change), self.assertRaises(ValueError):
                upload.recover(self.ftp, self.journal, self.package, self.backup)
            self.assertEqual(self.ftp.mutations, mutations)
            self.assertEqual(len(self.ftp.calls), calls)

    def test_wrong_backup_cannot_restore_entry(self):
        self.deliver()
        (self.backup / "before" / delivery.SCOPE / "index.html").write_bytes(b"wrong old entry")
        mutations = copy.deepcopy(self.ftp.mutations)
        calls = len(self.ftp.calls)
        with self.assertRaisesRegex(ValueError, "Recovery checksum"):
            upload.recover(self.ftp, self.journal, self.package, self.backup)
        self.assertEqual(self.ftp.mutations, mutations)
        self.assertEqual(len(self.ftp.calls), calls)

    def test_recovery_cli_refuses_invalid_evidence_before_connection(self):
        self.deliver()
        state = json.loads(self.journal.read_text())
        state["oldHtmlHex"] = b"wrong old entry".hex()
        self.journal.write_text(json.dumps(state))
        argv = ["scoped_upload.py", "recover", str(self.journal),
                "--package", str(self.package), "--backup", str(self.backup)]
        with patch.object(sys, "argv", argv), patch.object(upload, "FTP_TLS") as connect:
            with self.assertRaisesRegex(ValueError, "Old entry"):
                upload.main()
            connect.assert_not_called()

    def test_legacy_journal_cannot_restore_unretained_old_version(self):
        self.ftp.files[delivery.SCOPE + "build-version.json"] = b"old version"
        state = self.deliver()
        (self.backup / ("transaction-" + state["transaction"] + ".json")).unlink()
        mutations = copy.deepcopy(self.ftp.mutations)
        with self.assertRaisesRegex(ValueError, "old version receipt required"):
            upload.recover(self.ftp, self.journal, self.package, self.backup)
        self.assertEqual(self.ftp.mutations, mutations)

    def test_legacy_journal_with_absent_old_version_remains_recoverable(self):
        state = self.deliver()
        (self.backup / ("transaction-" + state["transaction"] + ".json")).unlink()
        result = upload.recover(self.ftp, self.journal, self.package, self.backup)
        self.assertTrue(result["retainedVersionMarker"])

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
        upload.recover(self.ftp, self.journal, self.package, self.backup)

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
        upload.recover(self.ftp, self.journal, self.package, self.backup)
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
            upload.recover(self.ftp, self.journal, self.package, self.backup)
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
            upload.recover(self.ftp, self.journal, self.package, self.backup)
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
        upload.recover(self.ftp, self.journal, self.package, self.backup)

    def test_unsafe_write_and_journal_identifier_refused(self):
        for path in ("index.html", delivery.SCOPE + "assets/../../index.html",
                     delivery.SCOPE + "assets/x.js\r\nDELE index.html"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                upload.replace(self.ftp, path, b"x", {"transaction": "a" * 32}, self.journal)
        with self.assertRaises(ValueError):
            upload.replace(self.ftp, delivery.SCOPE + "index.html", b"x",
                           {"transaction": "../invalid"}, self.journal)
        self.assertFalse(self.ftp.mutations)

    def test_connection_loss_at_each_ftp_boundary_is_recoverable(self):
        """Exercise failures before and after every server command, including ACK loss."""
        methods = ("retrbinary", "mlsd", "mkd", "storbinary", "rename")
        trace = []
        originals = {name: getattr(self.ftp, name) for name in methods}
        for name in methods:
            def record(*args, method=name, **kwargs):
                trace.append(method)
                return originals[method](*args, **kwargs)
            setattr(self.ftp, name, record)
        self.deliver()
        for name, method in originals.items():
            setattr(self.ftp, name, method)
        for boundary in range(len(trace)):
            for after in (False, True):
                with self.subTest(command=trace[boundary], boundary=boundary, after=after):
                    ftp = WritableFTP(copy.deepcopy(self.fixture.remote))
                    journal = self.fixture.root / f"fault-{boundary}-{after}.json"
                    counter = [0]
                    methods_before_fault = {name: getattr(ftp, name) for name in methods}
                    for name in methods:
                        def interrupt(*args, method=name, **kwargs):
                            index = counter[0]
                            counter[0] += 1
                            if index == boundary and not after:
                                raise ConnectionError("before command")
                            result = methods_before_fault[method](*args, **kwargs)
                            if index == boundary and after:
                                raise ConnectionError("after command")
                            return result
                        setattr(ftp, name, interrupt)
                    with self.assertRaises(ConnectionError):
                        upload.deliver(self.package, self.backup, ftp, journal)
                    for name, method in methods_before_fault.items():
                        setattr(ftp, name, method)
                    if journal.exists():
                        upload.recover(ftp, journal, self.package, self.backup)
                    for path, body in self.fixture.remote.items():
                        self.assertEqual(ftp.files[path], body)

    def test_recovery_connection_loss_can_be_reconciled_at_each_boundary(self):
        self.deliver()
        uploaded = copy.deepcopy(self.ftp.files)
        journal_bytes = self.journal.read_bytes()
        methods = ("retrbinary", "mlsd", "storbinary", "rename")
        trace = []
        originals = {name: getattr(self.ftp, name) for name in methods}
        for name in methods:
            def record(*args, method=name, **kwargs):
                trace.append(method)
                return originals[method](*args, **kwargs)
            setattr(self.ftp, name, record)
        upload.recover(self.ftp, self.journal, self.package, self.backup)
        for boundary in range(len(trace)):
            for after in (False, True):
                with self.subTest(boundary=boundary, after=after):
                    ftp = WritableFTP(copy.deepcopy(uploaded))
                    journal = self.fixture.root / f"recovery-fault-{boundary}-{after}.json"
                    journal.write_bytes(journal_bytes)
                    counter = [0]
                    commands = {name: getattr(ftp, name) for name in methods}
                    for name in methods:
                        def interrupt(*args, method=name, **kwargs):
                            index = counter[0]
                            counter[0] += 1
                            if index == boundary and not after:
                                raise ConnectionError("before recovery command")
                            result = commands[method](*args, **kwargs)
                            if index == boundary and after:
                                raise ConnectionError("after recovery command")
                            return result
                        setattr(ftp, name, interrupt)
                    with self.assertRaises(ConnectionError):
                        upload.recover(ftp, journal, self.package, self.backup)
                    for name, command in commands.items():
                        setattr(ftp, name, command)
                    upload.recover(ftp, journal, self.package, self.backup)
                    for path, body in self.fixture.remote.items():
                        self.assertEqual(ftp.files[path], body)


if __name__ == "__main__":
    unittest.main()
