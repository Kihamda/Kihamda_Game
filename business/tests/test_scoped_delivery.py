import copy
from ftplib import error_perm
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

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
