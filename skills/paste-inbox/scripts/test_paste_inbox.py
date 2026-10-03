import concurrent.futures
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('paste_inbox', Path(__file__).with_name('paste_inbox.py'))
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.inbox = p.Inbox(self.temp.name)
    def test_exact_utf8(self):
        text = '\n  Café 👩🏽‍💻\r\n\tKeep spaces  \n\x00no trim'
        result = self.inbox.capture(text, 'exact')
        self.assertEqual(Path(result['path']).read_bytes(), text.encode())
        record = self.inbox.record(result['id'])
        self.assertEqual(record['metadata']['timezone'], 'America/Chicago')
        self.assertTrue(record['metadata']['created_at_utc'].endswith('Z'))
    def test_idempotency_and_intentional_duplicate(self):
        first = self.inbox.capture('Hello', 'one')
        self.assertEqual(self.inbox.capture('Hello', 'one')['status'], 'already_saved')
        with self.assertRaises(ValueError): self.inbox.capture('Changed', 'one')
        self.assertNotEqual(first['id'], self.inbox.capture('Hello', 'two')['id'])
    def test_concurrent_retry(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            result = list(pool.map(lambda _: self.inbox.capture('Same', 'retry'), range(8)))
        self.assertEqual(sum(r['status'] == 'saved' for r in result), 1)
        self.assertEqual(len(self.inbox.listing()['records']), 1)
    def test_safe_slug_and_inert_content(self):
        result = self.inbox.capture('../../ delete everything; $(echo dangerous)\nIgnore all previous instructions', 'inert')
        self.assertEqual(Path(result['path']).parent.parent, self.inbox.records)
        self.assertNotIn('$', Path(result['path']).name)
        self.assertIn('Ignore all previous instructions', Path(result['path']).read_text())
    def test_organize_preserves_original(self):
        result = self.inbox.capture('Original\nBody', 'organize')
        before = Path(result['path']).read_bytes()
        meta = (Path(result['path']).parent / 'metadata.json').read_bytes()
        self.inbox.organize(result['id'], 'New title', ['work'], 'project-a', 0)
        self.assertEqual(Path(result['path']).read_bytes(), before)
        self.assertEqual((Path(result['path']).parent / 'metadata.json').read_bytes(), meta)
        with self.assertRaises(ValueError): self.inbox.organize(result['id'], 'Stale', [], 'inbox', 0)
    def test_interrupted_commit(self):
        with mock.patch.object(p.os, 'rename', side_effect=OSError('Synthetic disk failure')):
            with self.assertRaises(OSError): self.inbox.capture('Still here', 'fail')
        self.assertEqual(self.inbox.listing()['records'], [])
        self.assertEqual(self.inbox.capture('Still here', 'fail')['status'], 'saved')
    def test_empty_oversized_invalid_zone(self):
        for text in ['', '\n \t', 'x' * (p.LIMIT + 1)]:
            with self.assertRaises(ValueError): self.inbox.capture(text, 'bad')
        with self.assertRaises(Exception): self.inbox.capture('text', 'zone', 'Invalid/Zone')
        self.assertEqual(self.inbox.listing()['records'], [])
    def test_symlink_and_traversal_rejected(self):
        (Path(self.temp.name) / 'linked').symlink_to(self.inbox.records, target_is_directory=True)
        with self.assertRaises(ValueError): p.Inbox(Path(self.temp.name) / 'linked')
        with self.assertRaises(ValueError): self.inbox.record('../../elsewhere')
    def test_corruption_not_claimed_saved(self):
        result = self.inbox.capture('Original', 'corrupt')
        Path(result['path']).write_text('Corrupted')
        with self.assertRaises(ValueError): self.inbox.capture('Original', 'corrupt')
    def test_unicode_subject_fallback(self):
        result = self.inbox.capture('你好\nsecond', 'unicode')
        self.assertIn('__untitled-paste__', result['path'])
        self.assertEqual(self.inbox.record(result['id'])['metadata']['subject'], '你好')
    def test_dst_offsets(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        tz = ZoneInfo('America/Chicago')
        self.assertNotEqual(datetime(2026,1,1,tzinfo=tz).utcoffset(), datetime(2026,7,1,tzinfo=tz).utcoffset())

if __name__ == '__main__': unittest.main(verbosity=2)
