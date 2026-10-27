"""Build a local copy of the fixed pages for browser verification."""
from pathlib import Path
import shutil
from fixed_pages import fixed_home, fixed_pages

site = Path('site')
preview = Path('preview')
release = 'a' * 40
assets = preview / 'kg-releases' / release
assets.mkdir(parents=True, exist_ok=True)
for name in ('style.css', 'catalog.js', 'game.js', 'about.html'):
    shutil.copyfile(site / name, assets / name)
pages = fixed_pages(site, release)
(preview / 'index.html').write_bytes(fixed_home(site, release, pages))
for name, content in pages.items():
    (preview / name).write_bytes(content)
