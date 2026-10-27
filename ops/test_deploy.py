"""Exercise production deployment and rollback without contacting a server."""
import io
import os
from pathlib import Path
import runpy
import shutil
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SHA = 'a' * 40
OLD_HOME = b'previous home'
OLD_SITEMAP = b'previous sitemap'


class FakeFTP:
    def __init__(self, *args, **kwargs):
        self.files = {'index.html': OLD_HOME, 'sitemap.xml': b'previous sitemap'}
        self.events = []

    def __enter__(self): return self
    def __exit__(self, *args): return False
    def connect(self, *args): pass
    def login(self, *args): pass
    def prot_p(self): pass
    def cwd(self, *args): pass
    def mkd(self, *args): pass
    def nlst(self): return list(self.files)
    def delete(self, name):
        self.events.append(('delete', name))
        del self.files[name]
    def retrbinary(self, command, callback): callback(self.files[command[5:]])
    def storbinary(self, command, stream):
        self.events.append(('store', command[5:]))
        self.files[command[5:]] = stream.read()
    def rename(self, old, new):
        self.events.append((old, new))
        self.files[new] = self.files.pop(old)


class DeployTest(unittest.TestCase):
    def exercise(self, fail_home):
        ftp = FakeFTP()
        def urlopen(request, timeout):
            path = urlsplit(request.full_url).path.lstrip('/') or 'index.html'
            data = ftp.files[path]
            if fail_home and path == 'index.html' and data != OLD_HOME:
                data = b'wrong response'
            return io.BytesIO(data)

        env = {'GITHUB_SHA': SHA, 'FTP_SERVER': 'test', 'FTP_USERNAME': 'test', 'FTP_PASSWORD': 'test'}
        with tempfile.TemporaryDirectory(dir=ROOT.parent) as tmp:
            tmp_path = Path(tmp)
            shutil.copytree(ROOT / 'site', tmp_path / 'site')
            previous = Path.cwd()
            try:
                os.chdir(tmp_path)
                with patch.dict(os.environ, env), patch('ftplib.FTP_TLS', return_value=ftp), \
                        patch('urllib.request.urlopen', side_effect=urlopen), patch('time.sleep'):
                    if fail_home:
                        with self.assertRaisesRegex(RuntimeError, 'HTTPS verification failed'):
                            runpy.run_path(str(ROOT / 'ops' / 'deploy.py'))
                    else:
                        runpy.run_path(str(ROOT / 'ops' / 'deploy.py'))
                self.assertEqual((tmp_path / 'artifacts' / 'previous-index.html').read_bytes(), OLD_HOME)
            finally:
                os.chdir(previous)
        return ftp

    def test_publishes_versioned_files_before_home(self):
        ftp = self.exercise(False)
        self.assertNotEqual(ftp.files['index.html'], OLD_HOME)
        self.assertIn(b'href="/play-lights.html?mode=daily"', ftp.files['index.html'])
        self.assertIn(b'href="/play-lights.html"', ftp.files['index.html'])
        self.assertIn(b'/play-lights.html', ftp.files['sitemap.xml'])
        for name in ('index.html', 'game.html', 'catalog.js', 'game.js', 'style.css', 'about.html'):
            self.assertIn(f'kg-releases/{SHA}/{name}', ftp.files)
            self.assertIn(('store', f'kg-releases/{SHA}/{name}'), ftp.events[:-1])
        self.assertEqual(ftp.events[-1][1], 'sitemap.xml')
        for name in ('lights', 'memory', 'order', 'dodge', 'slide', 'garden'):
            self.assertIn(f'play-{name}.html', ftp.files)

    def test_restores_home_when_published_home_fails_verification(self):
        ftp = self.exercise(True)
        self.assertEqual(ftp.files['index.html'], OLD_HOME)
        self.assertEqual(ftp.files['sitemap.xml'], OLD_SITEMAP)
        self.assertFalse(any(name.startswith('play-') for name in ftp.files))
        self.assertFalse(any('.pending-' in name or '.restore-' in name for name in ftp.files))


if __name__ == '__main__':
    unittest.main()
