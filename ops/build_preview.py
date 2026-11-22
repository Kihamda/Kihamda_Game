"""Build a local copy of the fixed pages for browser verification."""
import argparse
from pathlib import Path
import shutil
from fixed_pages import fixed_home, fixed_info, fixed_pages

site = Path('site')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=Path('preview'),
                    help='output directory (default: preview)')
preview = parser.parse_args().output
release = 'a' * 40
assets = preview / 'kg-releases' / release
assets.mkdir(parents=True, exist_ok=True)
for name in ('style.css', 'catalog.js', 'game.js', 'about.html'):
    shutil.copyfile(site / name, assets / name)
pages = fixed_pages(site, release)
(preview / 'index.html').write_bytes(fixed_home(site, release, pages))
(preview / 'site-info.html').write_bytes(fixed_info(site, release))
shutil.copyfile(site / 'ads.txt', preview / 'ads.txt')
for name, content in pages.items():
    (preview / name).write_bytes(content)
