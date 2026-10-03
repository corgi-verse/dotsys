"""Offline checks for the Skills landing section and downloadable package."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]

class Fields(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.fields = {}
        self.active = None
        self.ids = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'textarea':
            self.active = attrs['id']
            self.fields[self.active] = ''
    def handle_data(self, text):
        if self.active:
            self.fields[self.active] += text
    def handle_endtag(self, tag):
        if tag == 'textarea':
            self.active = None

class SkillsSectionTests(unittest.TestCase):
    def test_skill_prompt_matches_documented_prompt(self):
        page = Fields((ROOT / 'index.html').read_text())
        guide = (ROOT / 'skills/README.md').read_text()
        prompt = re.search(r'```text\n(.*?)\n```', guide, re.S).group(1)
        self.assertEqual(page.fields['paste-inbox-prompt'], prompt)
        self.assertEqual(len(page.ids), len(set(page.ids)))

    def test_system_setup_prompt_stays_in_sync(self):
        page = Fields((ROOT / 'index.html').read_text())
        for path in ['README.md', 'docs/ADOPTION.md']:
            with self.subTest(path=path):
                prompt = re.search(r'```text\n(.*?)\n```', (ROOT / path).read_text(), re.S).group(1)
                self.assertEqual(page.fields['setup-prompt'], prompt)

    def test_package_matches_all_reviewed_source_files_and_license(self):
        source = ROOT / 'skills/paste-inbox'
        expected = {str(p.relative_to(source)): p.read_bytes()
                    for p in source.rglob('*') if p.is_file()
                    and '__pycache__' not in p.parts and p.suffix != '.pyc'}
        with zipfile.ZipFile(ROOT / 'downloads/paste-inbox.zip') as package:
            actual = {}
            for name in package.namelist():
                self.assertFalse(name.startswith('/') or '..' in Path(name).parts)
                self.assertNotIn('__pycache__', name)
                if name.endswith('/'):
                    continue
                relative = name.removeprefix('paste-inbox/')
                self.assertNotIn(relative, actual)
                actual[relative] = package.read(name)
            self.assertEqual(actual, expected)
        self.assertEqual(expected['LICENSE'], (ROOT / 'LICENSE').read_bytes())
        self.assertEqual(expected['NOTICE'], (ROOT / 'NOTICE').read_bytes())

if __name__ == '__main__':
    unittest.main()
