"""Check fixed-page descriptions and HTML escaping."""
from html.parser import HTMLParser
import json
from pathlib import Path
import tempfile
import unittest
from fixed_pages import fixed_pages


class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = None
        self.headings = []
        self.in_heading = False
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'meta' and values.get('name') == 'description': self.meta = values.get('content')
        if tag == 'h1': self.in_heading = True
    def handle_endtag(self, tag):
        if tag == 'h1': self.in_heading = False
    def handle_data(self, data):
        if self.in_heading: self.headings.append(data)


class FixedPageTest(unittest.TestCase):
    def test_catalog_values_are_escaped_and_round_trip(self):
        with tempfile.TemporaryDirectory() as temp:
            site = Path(temp)
            metadata = {'title': '題名 & <試験> "記号"', 'instructions': '押す & <戻る> "順番"'}
            (site / 'catalog.js').write_text('const gameCatalog = ' + json.dumps({'test':metadata}, ensure_ascii=False) + ';', encoding='utf-8')
            template = (Path(__file__).resolve().parents[1] / 'site' / 'game.html').read_text(encoding='utf-8')
            (site / 'game.html').write_text(template, encoding='utf-8')
            page = fixed_pages(site, 'a' * 40)['play-test.html'].decode('utf-8')
            parser = Parser(); parser.feed(page)
            self.assertEqual(parser.meta, metadata['instructions'])
            self.assertEqual(''.join(parser.headings), metadata['title'])
            self.assertNotIn('<試験>', page)

if __name__ == '__main__': unittest.main()
