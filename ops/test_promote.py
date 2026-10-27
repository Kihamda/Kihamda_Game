"""Check promotion of existing and new files under common FTP failures."""
import io
import unittest
from promote import promote


class FTP:
    def __init__(self):
        self.files = {'index.html': b'old home', 'play-lights.html': b'old lights', 'sitemap.xml': b'old map'}
        self.fail_partial = False
        self.fail_rename = None
        self.inject_external = False
    def nlst(self): return list(self.files)
    def retrbinary(self, command, sink): sink(self.files[command[5:]])
    def storbinary(self, command, stream):
        name = command[5:]
        content = stream.read()
        if self.fail_partial and name.startswith('play-memory.html.pending-'):
            self.files[name] = content[:2]
            raise OSError('partial upload')
        self.files[name] = content
    def rename(self, source, target):
        if target == self.fail_rename and '.pending-' in source:
            raise OSError('rename failed')
        self.files[target] = self.files.pop(source)
    def delete(self, name): del self.files[name]


def read(ftp, path):
    out = io.BytesIO()
    ftp.retrbinary('RETR ' + path, out.write)
    return out.getvalue()


class PromoteTest(unittest.TestCase):
    def setUp(self):
        self.ftp = FTP()
        self.old = self.ftp.files.copy()
        self.changes = {'play-lights.html': b'new lights', 'play-memory.html': b'new memory', 'index.html': b'new home', 'sitemap.xml': b'new map'}
    def check_restored(self): self.assertEqual(self.ftp.files, self.old)
    def test_success(self):
        promote(self.ftp, self.changes, lambda name, body: None, read)
        self.assertEqual(self.ftp.files, self.changes)
    def test_partial_upload_is_cleaned(self):
        self.ftp.fail_partial = True
        with self.assertRaisesRegex(OSError, 'partial upload'):
            promote(self.ftp, self.changes, lambda name, body: None, read)
        self.check_restored()
    def test_rename_failure_rolls_back_previous_page(self):
        self.ftp.fail_rename = 'play-memory.html'
        with self.assertRaisesRegex(OSError, 'rename failed'):
            promote(self.ftp, self.changes, lambda name, body: None, read)
        self.check_restored()
    def test_http_failure_restores_all_existing_and_removes_new(self):
        def verify(name, body):
            if name == 'sitemap.xml': raise RuntimeError('HTTP mismatch')
        with self.assertRaisesRegex(RuntimeError, 'HTTP mismatch'):
            promote(self.ftp, self.changes, verify, read)
        self.check_restored()
    def test_external_change_is_not_overwritten(self):
        def verify(name, body):
            if name == 'play-lights.html': self.ftp.files['index.html'] = b'external home'
        with self.assertRaisesRegex(RuntimeError, 'File changed during staging'):
            promote(self.ftp, self.changes, verify, read)
        self.assertEqual(self.ftp.files, {**self.old, 'index.html': b'external home'})

if __name__ == '__main__': unittest.main()
