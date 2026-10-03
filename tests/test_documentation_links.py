"""Offline checks for the human-facing documentation entry points.

These inspect repository paths, not HTTP availability or Markdown rendering.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class PageLinks(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links = []
        self.ids = set()
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])


class DocumentationLinksTests(unittest.TestCase):
    def test_landing_page_links_to_human_documentation_guide(self):
        page = PageLinks((ROOT / 'index.html').read_text(encoding='utf-8'))
        self.assertIn(
            'https://github.com/corgi-verse/dotsys/blob/main/docs/README.md',
            page.links)
        self.assertIn('llms.txt', page.links)

    def test_landing_page_local_navigation_targets_exist(self):
        page = PageLinks((ROOT / 'index.html').read_text(encoding='utf-8'))
        for link in page.links:
            with self.subTest(link=link):
                url = urlsplit(link)
                if url.scheme or url.netloc:
                    continue
                if url.path:
                    target = (ROOT / unquote(url.path)).resolve()
                    self.assertTrue(target.is_relative_to(ROOT))
                    self.assertTrue(target.is_file(), f'Missing file: {link}')
                elif url.fragment:
                    self.assertIn(unquote(url.fragment), page.ids)

    def test_documentation_guide_local_destinations_exist(self):
        guide = ROOT / 'docs/README.md'
        # The guide uses ordinary inline links with simple repository paths.
        links = re.findall(r'\[[^\]\n]+\]\(([^\s)]+)\)',
                           guide.read_text(encoding='utf-8'))
        self.assertTrue(links, 'The guide must provide navigation links')
        for link in links:
            with self.subTest(link=link):
                url = urlsplit(link)
                self.assertFalse(url.scheme or url.netloc,
                                 'Keep this repository guide portable')
                target = (guide.parent / unquote(url.path)).resolve()
                self.assertTrue(target.is_relative_to(ROOT))
                self.assertTrue(target.is_file(), f'Missing file: {link}')
                if url.fragment:
                    # Only simple ASCII heading fragments are used here.
                    headings = re.findall(r'^#{1,6}\s+(.+)$',
                                          target.read_text(encoding='utf-8'),
                                          re.MULTILINE)
                    anchors = {re.sub(r'[^a-z0-9 -]', '', h.lower())
                               .replace(' ', '-') for h in headings}
                    self.assertIn(unquote(url.fragment), anchors)


if __name__ == '__main__':
    unittest.main()
