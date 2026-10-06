"""Focused checks for portable, owner-chosen, read-only instance naming."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'reference'))
from plan_name import plan_name, suggest_slug, validate_slug
from validate import validate_document


class NamePlanningTests(unittest.TestCase):
    def test_shared_prefix_and_component_examples(self):
        for handle in ('hayden', 'bob'):
            for component in ('depot', 'showcase'):
                self.assertEqual(suggest_slug(handle, component), f'dotsys-{handle}-{component}')

    def test_suggestions_normalize_and_bound_segments(self):
        self.assertEqual(suggest_slug(' Héloïse / ../ Bob\\ ', 'SHOW CASE'),
                         'dotsys-heloise-bob-show-case')
        slug = suggest_slug('A' * 200, 'B' * 200)
        self.assertEqual(slug, 'dotsys-' + 'a' * 32 + '-' + 'b' * 20)
        self.assertLessEqual(len(slug), 63)
        self.assertEqual(validate_slug(slug), slug)

    def test_empty_or_unrepresentable_segments_require_alias(self):
        for value in ('', '  ', '../', '\\', '東京', '🐶'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                suggest_slug(value, 'depot')
            with self.subTest(component=value), self.assertRaises(ValueError):
                suggest_slug('bob', value)

    def test_explicit_edits_reject_paths_reserved_names_and_bad_limits(self):
        for value in ('', '.', '..', '../depot', '/tmp/depot', 'a/b', 'a\\b',
                      'C:\\depot', 'con', 'prn', 'aux', 'nul', 'com1', 'lpt9',
                      'CON', 'con.txt', 'trailing.', 'two words', '-a', 'a-',
                      'a--b', 'a\n', 'a\x00b', 'é', 'a' * 64):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_slug(value)
        self.assertEqual(validate_slug('a' * 63), 'a' * 63)
        self.assertEqual(validate_slug('my-depot'), 'my-depot')

    def test_reserved_handle_is_safe_with_prefix(self):
        self.assertEqual(validate_slug(suggest_slug('CON', 'depot')), 'dotsys-con-depot')

    def test_collision_checks_files_directories_case_and_dangling_links(self):
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            (parent / 'Dotsys-Bob-Depot').mkdir()
            (parent / 'dotsys-bob-depot-2').write_text('keep')
            (parent / 'dotsys-bob-depot-3').symlink_to(parent / 'missing')
            before = {p.name for p in parent.iterdir()}
            plan = plan_name(parent, 'Bob', 'depot', display_name="Bob's Depot")
            self.assertEqual(plan, {'folder_name': 'dotsys-bob-depot-4',
                                   'display_name': "Bob's Depot", 'collision_adjusted': True})
            self.assertEqual({p.name for p in parent.iterdir()}, before)
            self.assertEqual((parent / 'dotsys-bob-depot-2').read_text(), 'keep')
            self.assertTrue((parent / 'dotsys-bob-depot-3').is_symlink())

    def test_suffix_keeps_maximum_length(self):
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            base = 'a' * 61 + '-b'
            (parent / base).touch()
            result = plan_name(parent, 'bob', 'depot', folder_name=base)['folder_name']
            self.assertEqual(len(result), 63)
            self.assertEqual(validate_slug(result), result)
            self.assertTrue(result.endswith('-2'))

    def test_display_and_folder_edits_are_independent(self):
        with tempfile.TemporaryDirectory() as directory:
            plan = plan_name(Path(directory), 'quiet-fox', 'depot',
                             folder_name='my-depot', display_name='  My private shelf  ')
            self.assertEqual(plan, {'folder_name': 'my-depot', 'display_name': 'My private shelf',
                                   'collision_adjusted': False})
            self.assertNotIn('system_id', plan)
            self.assertNotIn('card_id', plan)

    def test_invalid_display_names_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            for label in ('', ' ', 'x' * 81, 'a\nb', 'a\x00b', '\ud800'):
                with self.subTest(label=repr(label)), self.assertRaises(ValueError):
                    plan_name(Path(directory), 'bob', 'depot', display_name=label)

    def test_missing_parent_is_not_created(self):
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory) / 'missing'
            with self.assertRaises(OSError):
                plan_name(parent, 'bob', 'depot')
            self.assertFalse(parent.exists())

    def test_existing_manifest_and_ids_are_unchanged(self):
        raw = (ROOT / 'examples/dotsys.json').read_bytes()
        original = validate_document(raw)
        renamed = {**original, 'name': "Bob's System"}
        checked = validate_document(json.dumps(renamed).encode())
        self.assertEqual(checked['system_id'], original['system_id'])
        self.assertEqual(checked['surfaces'], original['surfaces'])
        self.assertEqual(checked['version'], '0.1.0')
        self.assertEqual((ROOT / 'examples/dotsys.json').read_bytes(), raw)

    def test_cli_success_and_clean_failure_without_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            command = [sys.executable, str(ROOT / 'reference/plan_name.py'), '--parent', directory,
                       '--handle', 'Bob', '--component', 'showcase']
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)['folder_name'], 'dotsys-bob-showcase')
            self.assertEqual(list(Path(directory).iterdir()), [])
            rejected = subprocess.run(command + ['--folder-name', '../escape'],
                                      capture_output=True, text=True)
            self.assertEqual(rejected.returncode, 1)
            self.assertIn('Cannot plan name:', rejected.stderr)
            self.assertNotIn('Traceback', rejected.stderr)
            self.assertEqual(list(Path(directory).iterdir()), [])


if __name__ == '__main__':
    unittest.main()
