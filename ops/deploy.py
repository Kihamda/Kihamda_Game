"""Publish versioned assets first, then switch the home page over FTPS."""
from ftplib import FTP_TLS, error_perm
from pathlib import Path
from urllib.request import urlopen, Request
import io
import os
import re
import ssl
import time
from fixed_pages import fixed_home, fixed_pages
from promote import promote

commit = os.environ['GITHUB_SHA']
if not re.fullmatch(r'[a-f0-9]{40}', commit):
    raise SystemExit('Invalid commit SHA')
prefix = f'kg-releases/{commit}'
source = Path('site')
files = {name: (source / name).read_bytes() for name in ('game.html', 'catalog.js', 'game.js', 'style.css', 'about.html')}
pages = fixed_pages(source, commit)
home = fixed_home(source, commit, pages)
files['index.html'] = home
sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + ''.join(f'  <url><loc>https://game.kihamda.net/{name}</loc></url>\n'
                     for name in ['', *pages]) + '</urlset>\n').encode('utf-8')

def read_ftp(ftp, path):
    out = io.BytesIO()
    ftp.retrbinary('RETR ' + path, out.write)
    return out.getvalue()

def verify_http(path, expected):
    url = 'https://game.kihamda.net/' + path + ('&' if '?' in path else '?') + 'verify=' + commit
    last = None
    for _ in range(4):
        try:
            with urlopen(Request(url, headers={'Cache-Control': 'no-cache'}), timeout=30) as response:
                if response.read() == expected:
                    return
        except Exception as exc:
            last = exc
        time.sleep(3)
    raise RuntimeError(f'HTTPS verification failed for {path}: {last}')

with FTP_TLS(context=ssl.create_default_context(), timeout=30) as ftp:
    ftp.connect(os.environ['FTP_SERVER'], 21)
    ftp.login(os.environ['FTP_USERNAME'], os.environ['FTP_PASSWORD'])
    ftp.prot_p()
    ftp.cwd(os.environ.get('FTP_SERVER_DIR') or '.')
    old = read_ftp(ftp, 'index.html')
    Path('artifacts').mkdir(exist_ok=True)
    Path('artifacts/previous-index.html').write_bytes(old)
    for directory in ('kg-releases', prefix):
        try:
            ftp.mkd(directory)
        except error_perm:
            # Confirm it is an existing directory rather than hiding another FTP error.
            current = ftp.pwd()
            ftp.cwd(directory)
            ftp.cwd(current)
    for name, body in files.items():
        target = f'{prefix}/{name}'
        ftp.storbinary('STOR ' + target, io.BytesIO(body))
        if read_ftp(ftp, target) != body:
            raise RuntimeError('FTP verification failed: ' + target)
        verify_http(target, body)
    # Each fixed page refers to immutable assets, so old and new pages can coexist.
    def verify_root_file(name, body):
        verify_http(name, body)
        if name == 'index.html':
            verify_http('', body)
    promote(ftp, {**pages, 'index.html': home, 'sitemap.xml': sitemap}, verify_root_file, read_ftp)
print('Published and verified', commit)
