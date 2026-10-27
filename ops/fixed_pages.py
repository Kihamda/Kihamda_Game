"""Build fixed game pages from the shared catalog and versioned assets."""
import html
import json
import re
from pathlib import Path


def fixed_pages(site, release):
    if not re.fullmatch(r'[a-f0-9]{40}', release):
        raise ValueError('Invalid release identifier')
    catalog_js = (site / 'catalog.js').read_text(encoding='utf-8').strip()
    prefix = 'const gameCatalog = '
    if not catalog_js.startswith(prefix) or not catalog_js.endswith(';'):
        raise ValueError('Invalid game catalog')
    catalog = json.loads(catalog_js[len(prefix):-1])
    template = (site / 'game.html').read_text(encoding='utf-8')
    result = {}
    for game, metadata in catalog.items():
        if not re.fullmatch(r'[a-z]+', game):
            raise ValueError('Invalid game identifier')
        title = html.escape(metadata['title'], quote=True)
        instructions = html.escape(metadata['instructions'], quote=True)
        page = template.replace('<body>', f'<body data-game="{game}">')
        page = page.replace('<title>ゲーム | Kihamda Games</title>',
                            f'<title>{title} | Kihamda Games</title>')
        page = page.replace('<h1 id="title">ゲーム</h1>', f'<h1 id="title">{title}</h1>')
        page = page.replace('<p id="instructions"></p>',
                            f'<p id="instructions">{instructions}</p><noscript><p>このゲームはJavaScriptを使います。</p></noscript>')
        for name in ('style.css', 'catalog.js', 'game.js'):
            page = page.replace(f'"{name}"', f'"/kg-releases/{release}/{name}"')
        page = page.replace('href="about.html"', 'href="/site-info.html"')
        page = page.replace('</head>', f'<meta name="description" content="{instructions}"><link rel="canonical" href="https://game.kihamda.net/play-{game}.html"></head>')
        result[f'play-{game}.html'] = page.encode('utf-8')
    return result


def fixed_home(site, release, pages):
    home = (site / 'index.html').read_text(encoding='utf-8')
    for name in pages:
        game = name.removeprefix('play-').removesuffix('.html')
        home = home.replace(f'game.html?game={game}&amp;', f'/{name}?')
        home = home.replace(f'game.html?game={game}"', f'/{name}"')
    home = home.replace('href="style.css"', f'href="/kg-releases/{release}/style.css"')
    home = home.replace('href="about.html"', 'href="/site-info.html"')
    return home.encode('utf-8')


def fixed_info(site, release):
    if not re.fullmatch(r'[a-f0-9]{40}', release):
        raise ValueError('Invalid release identifier')
    page = (site / 'about.html').read_text(encoding='utf-8')
    page = page.replace('href="style.css"', f'href="/kg-releases/{release}/style.css"')
    page = page.replace('</head>', '<link rel="canonical" href="https://game.kihamda.net/site-info.html"></head>')
    return page.encode('utf-8')
