from ftplib import error_perm
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import portal_publish as portal


class FakeFTP:
    def __init__(self):
        self.files = {"index.html": b"old portal", **{p: b"protected game" for p in portal.PROTECTED}}
        self.directories = {"", "games", *{str(Path(p).parent).replace("\\", "/") for p in portal.PROTECTED}}
        self.renamed = []
        self.on_store = lambda: None

    def mlsd(self, directory):
        directory = directory.removeprefix(".").strip("/")
        if directory not in self.directories:
            raise error_perm("550 no access")
        prefix = directory + "/" if directory else ""
        entries = {}
        for path in self.files:
            if path.startswith(prefix):
                rest = path[len(prefix):]
                entries[rest.split("/")[0]] = {"type": "dir" if "/" in rest else "file"}
        for path in self.directories:
            if path.startswith(prefix) and path != directory:
                rest = path[len(prefix):]
                entries[rest.split("/")[0]] = {"type": "dir"}
        return entries.items()

    def retrbinary(self, command, receive):
        path = command.removeprefix("RETR ")
        if path not in self.files:
            raise error_perm("550 missing or forbidden")
        receive(self.files[path])

    def mkd(self, directory):
        self.directories.add(directory)

    def storbinary(self, command, stream):
        self.files[command.removeprefix("STOR ")] = stream.read()
        self.on_store()

    def rename(self, source, destination):
        self.files[destination] = self.files.pop(source)
        self.renamed.append(destination)


class PortalPublishTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.package = self.root / "package"
        self.site = self.package / "site"
        self.files = {"index.html": b"new portal", "build-version.json":
                      json.dumps({"commit": "a" * 40}).encode(),
                      "brand/icon.svg": b"brand image", "assets/app-test.js": b"new asset", "works/minerush/index.html": b"detail",
                      "media/inspection/minerush-test.jpg": b"image bytes",
                      "games/minerush/index.html": b"MUST NEVER BE UPLOADED", "sw.js": b"skip worker"}
        for path, body in self.files.items():
            file = self.site / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(body)
        self.write_manifest()
        self.ftp = FakeFTP()
        self.before = dict(self.ftp.files)

    def write_manifest(self):
        self.manifest = {"schema": 1, "sourceCommit": "a" * 40,
                         "files": [{"path": path, "sha256": portal.sha(body)} for path, body in self.files.items()]}
        (self.package / "manifest.json").write_text(json.dumps(self.manifest), encoding="utf-8")

    def publish(self):
        return portal.publish(self.package, self.root / "backup", self.root / "journal.json", self.ftp,
                              lambda path: self.ftp.files[path or "index.html"])

    def test_home_last_games_unchanged_and_previous_bytes_retained(self):
        result = self.publish()
        self.assertEqual(self.ftp.renamed[-1], "index.html")
        self.assertEqual(result["status"], "http-verified-browser-acceptance-pending")
        self.assertIsNone(result["pending"])
        for path in portal.PROTECTED:
            self.assertEqual(self.ftp.files[path], self.before[path])
        self.assertNotIn("sw.js", self.ftp.files)
        self.assertEqual((self.root / "backup/before/index.html").read_bytes(), b"old portal")
        self.assertEqual(self.ftp.files["media/inspection/minerush-test.jpg"], b"image bytes")

    def test_unsafe_inventory_and_tampering_refused(self):
        for path in ("../outside", "/index.html", "assets/../private", "bad\\path"):
            with self.subTest(path=path):
                self.manifest["files"][0]["path"] = path
                (self.package / "manifest.json").write_text(json.dumps(self.manifest))
                with self.assertRaises(ValueError):
                    portal.candidate(self.package)
        self.write_manifest()
        (self.site / "index.html").write_bytes(b"tampered")
        with self.assertRaises(ValueError):
            self.publish()
        self.assertEqual(self.ftp.renamed, [])

    def test_asset_collision_refused_before_any_write(self):
        self.ftp.files["assets/app-test.js"] = b"different immutable asset"
        self.ftp.directories.add("assets")
        with self.assertRaisesRegex(ValueError, "collision"):
            self.publish()
        self.assertEqual(self.ftp.renamed, [])

    def test_root_mismatch_and_ambiguous_550_refused(self):
        with self.assertRaisesRegex(ValueError, "root"):
            portal.publish(self.package, self.root / "backup", self.root / "journal.json", self.ftp,
                           lambda path: b"wrong public site")
        self.ftp.mlsd = lambda directory: (_ for _ in ()).throw(error_perm("550 permission denied"))
        with self.assertRaises(error_perm):
            self.publish()
        self.assertEqual(self.ftp.renamed, [])

    def test_changed_target_during_staging_is_not_overwritten(self):
        self.ftp.on_store = lambda: self.ftp.files.update({"index.html": b"third-party change"})
        with self.assertRaisesRegex(ValueError, "changed"):
            self.publish()
        self.assertEqual(self.ftp.files["index.html"], b"third-party change")
        state = json.loads((self.root / "journal.json").read_text())
        self.assertEqual(state["status"], "uncertain-reconcile-before-retry")

    def test_recovery_restores_old_home_and_keeps_games_and_new_assets(self):
        self.publish()
        state = portal.recover(self.package, self.root / "backup", self.root / "journal.json", self.ftp)
        self.assertEqual(self.ftp.files["index.html"], self.before["index.html"])
        for path in portal.PROTECTED:
            self.assertEqual(self.ftp.files[path], self.before[path])
        self.assertEqual(self.ftp.files["assets/app-test.js"], b"new asset")
        self.assertEqual(state["status"], "portal-restored-awaiting-http-and-browser-acceptance")

    def test_recovery_does_not_overwrite_third_party_or_tampered_backup(self):
        self.publish()
        self.ftp.files["index.html"] = b"external new home"
        with self.assertRaisesRegex(ValueError, "externally"):
            portal.recover(self.package, self.root / "backup", self.root / "journal.json", self.ftp)
        self.ftp.files["index.html"] = self.files["index.html"]
        (self.root / "backup/before/index.html").write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "old bytes"):
            portal.recover(self.package, self.root / "backup", self.root / "journal.json", self.ftp)


if __name__ == "__main__":
    unittest.main()
