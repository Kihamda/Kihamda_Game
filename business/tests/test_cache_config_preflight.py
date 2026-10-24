from ftplib import error_perm
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import cache_config_preflight as preflight
from test_portal_publish import FakeFTP


class CacheConfigPreflightTest(unittest.TestCase):
    def fixture(self):
        ftp = FakeFTP()
        for path in preflight.CONFIG_PATHS:
            directory = str(Path(path).parent).replace("\\", "/")
            if directory != ".":
                ftp.directories.add(directory)
        ftp.files[".htaccess"] = b"# existing redirects\r\n"
        ftp.files["games/.htaccess"] = b"# inherited game configuration\n"
        return ftp

    def test_read_only_retention_preserves_unrelated_bytes(self):
        ftp = self.fixture()
        original = dict(ftp.files)
        receipt, configs, proposed = preflight.inspect(ftp, ftp.files.__getitem__)
        self.assertEqual(original, ftp.files)
        self.assertEqual([], ftp.renamed)
        self.assertFalse(receipt["productionWrites"])
        self.assertFalse(receipt["hostingHeaderSupportProven"])
        self.assertTrue(proposed.startswith(ftp.files[".htaccess"]))
        self.assertIsNone(configs["about/.htaccess"])
        self.assertEqual(preflight.sha(proposed), receipt["proposedRootSha256"])
        self.assertNotIn("existing redirects", str(receipt))

    def test_ambiguous_permission_denial_is_not_absence(self):
        ftp = self.fixture()
        original = ftp.mlsd
        def listing(directory):
            if directory == "about":
                raise error_perm("550 inaccessible")
            return original(directory)
        ftp.mlsd = listing
        with self.assertRaises(error_perm):
            preflight.inspect(ftp, ftp.files.__getitem__)

    def test_root_mismatch_fails_before_config_reads(self):
        ftp = self.fixture()
        with self.assertRaisesRegex(ValueError, "root"):
            preflight.inspect(ftp, lambda path: b"wrong")

    def test_existing_root_changed_between_reads_refused(self):
        ftp = self.fixture()
        original = ftp.retrbinary
        count = 0
        def read(command, receive):
            nonlocal count
            if command == "RETR .htaccess":
                count += 1
                if count == 2:
                    ftp.files[".htaccess"] = b"external edit"
            original(command, receive)
        ftp.retrbinary = read
        with self.assertRaisesRegex(ValueError, "changed"):
            preflight.inspect(ftp, ftp.files.__getitem__)

    def test_candidate_refuses_stale_replay_or_oversized_source(self):
        for body, digest in ((b"old", "0" * 64), (preflight.MARKER, preflight.sha(preflight.MARKER)),
                             (b"a" * 65537, preflight.sha(b"a" * 65537))):
            with self.subTest(size=len(body)), self.assertRaises(ValueError):
                preflight.candidate(body, digest)

    def test_absent_root_is_distinct_from_empty_root(self):
        proposed = preflight.candidate(None, None)
        self.assertTrue(proposed.startswith(preflight.MARKER))
        with self.assertRaises(ValueError):
            preflight.candidate(b"", None)

    def test_cli_refuses_public_or_existing_backup_before_connection(self):
        for path in (preflight.ROOT / "business/unity/evidence/config-copy",
                     preflight.ROOT / "artifacts", preflight.ROOT / "../outside"):
            with self.subTest(path=path), patch.object(sys, "argv", ["preflight", str(path)]), patch.object(preflight, "FTP_TLS") as connect:
                with self.assertRaises(ValueError):
                    preflight.main()
                connect.assert_not_called()

    def test_newline_is_added_without_reformatting_original(self):
        original = b"# original with CRLF\r\n# final without newline"
        proposed = preflight.candidate(original, preflight.sha(original), b"# reviewed block\n")
        self.assertEqual(original + b"\n" + preflight.MARKER + b"\n# reviewed block\n", proposed)

    def test_symlink_config_is_not_read_as_regular_file(self):
        ftp = self.fixture()
        original = ftp.mlsd
        def listing(directory):
            entries = dict(original(directory))
            if directory == ".":
                entries[".htaccess"] = {"type": "OS.unix=slink"}
            return entries.items()
        ftp.mlsd = listing
        with self.assertRaises(ValueError):
            preflight.inspect(ftp, ftp.files.__getitem__)


if __name__ == "__main__":
    unittest.main()
