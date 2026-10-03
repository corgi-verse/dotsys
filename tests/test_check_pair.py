import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import subprocess
import sys
import unittest

from reference.check_pair import check_pair, InvalidDocument, MAX_BYTES

ROOT = Path(__file__).resolve().parents[1]
NOW = datetime(2026, 10, 3, 12, tzinfo=timezone.utc)


def raw(doc):
    return json.dumps(doc).encode()


class PairTests(unittest.TestCase):
    def setUp(self):
        self.hello = json.loads((ROOT / 'examples/hello.json').read_text())
        self.response = json.loads((ROOT / 'examples/response.json').read_text())

    def check(self, previous=None, now=NOW):
        return check_pair(raw(self.hello), raw(self.response),
                          previous_response_raw=raw(previous) if previous is not None else None,
                          now=now)

    def test_worked_fixtures(self):
        hello = raw(self.hello)
        declined = (ROOT / 'tests/fixtures/pairs/declined.json').read_bytes()
        mismatch = (ROOT / 'tests/fixtures/pairs/mismatched-id.json').read_bytes()
        self.assertEqual(check_pair(hello, declined, now=NOW)['decision'], 'declined')
        with self.assertRaisesRegex(InvalidDocument, 'hello_id'):
            check_pair(hello, mismatch, now=NOW)
        with self.assertRaisesRegex(InvalidDocument, 'already closed'):
            check_pair(hello, declined, previous_response_raw=raw(self.response), now=NOW)

    def test_worked_interest_and_decline(self):
        for decision in ('interested', 'declined'):
            self.response['decision'] = decision
            self.assertEqual(self.check(), {'status': 'review-only', 'decision': decision})

    def test_mismatched_id_and_each_url(self):
        for field, value in (
            ('hello_id', '00000000-0000-4000-8000-000000000001'),
            ('from_card_url', 'https://other.example/card.json'),
            ('to_card_url', 'https://other.example/card.json'),
            ('from_card_url', 'https://BOB.example/dotsys-card.json'),
        ):
            with self.subTest(field=field, value=value):
                original = self.response[field]
                self.response[field] = value
                with self.assertRaises(InvalidDocument):
                    self.check()
                self.response[field] = original

    def test_earlier_response(self):
        self.response['sent_at'] = '2026-10-02T23:59:59Z'
        with self.assertRaisesRegex(InvalidDocument, 'predates'):
            self.check()
        self.response['sent_at'] = self.hello['sent_at']
        self.check()

    def test_expiry_at_current_clock(self):
        expiry = datetime(2026, 10, 4, tzinfo=timezone.utc)
        self.check(now=expiry - timedelta(seconds=1))
        for now in (expiry, expiry + timedelta(seconds=1)):
            with self.subTest(now=now), self.assertRaises(InvalidDocument):
                self.check(now=now)

    def test_response_must_be_before_expiry(self):
        self.response['sent_at'] = self.hello['expires_at']
        with self.assertRaisesRegex(InvalidDocument, 'outside hello lifetime'):
            self.check(now=datetime(2026, 10, 3, 23, 59, tzinfo=timezone.utc))

    def test_fractional_precision_fails_closed(self):
        for position, field, timestamp in (
            (0, 'sent_at', '2026-10-03T00:00:00.0000009Z'),
            (0, 'expires_at', '2026-10-04T00:00:00.0000001Z'),
            (1, 'sent_at', '2026-10-03T00:00:00.0000001Z'),
            (2, 'sent_at', '2026-10-03T00:00:00.0000001Z'),
        ):
            docs = [copy.deepcopy(self.hello), copy.deepcopy(self.response), copy.deepcopy(self.response)]
            docs[position][field] = timestamp
            with self.subTest(position=position, field=field), self.assertRaisesRegex(InvalidDocument, 'six fractional'):
                check_pair(raw(docs[0]), raw(docs[1]), previous_response_raw=raw(docs[2]), now=NOW)
        self.hello['sent_at'] = '2026-10-03T00:00:00.000009Z'
        self.response['sent_at'] = '2026-10-03T00:00:00.000001Z'
        with self.assertRaisesRegex(InvalidDocument, 'predates'):
            self.check()
        self.response['sent_at'] = self.hello['sent_at']
        self.check()

    def test_future_clock_boundary(self):
        self.response['sent_at'] = '2026-10-03T12:05:00Z'
        self.check()
        self.response['sent_at'] = '2026-10-03T12:05:01Z'
        with self.assertRaises(InvalidDocument):
            self.check()
        with self.assertRaises(InvalidDocument):
            self.check(now=NOW.replace(tzinfo=None))

    def test_duplicate_is_no_op_despite_json_formatting(self):
        for decision in ('interested', 'declined'):
            self.response['decision'] = decision
            result = check_pair(raw(self.hello), raw(self.response),
                                previous_response_raw=json.dumps(self.response, indent=4).encode(), now=NOW)
            self.assertEqual(result['status'], 'duplicate-no-op')

    def test_closed_decision_cannot_change(self):
        for first, second in (('interested', 'declined'), ('declined', 'interested')):
            prior = copy.deepcopy(self.response)
            prior['decision'] = first
            self.response['decision'] = second
            with self.subTest(first=first), self.assertRaisesRegex(InvalidDocument, 'already closed'):
                self.check(previous=prior)

    def test_same_decision_changed_message_or_time_is_not_duplicate(self):
        for field, value in (('message', 'Different untrusted prose'), ('sent_at', '2026-10-03T00:06:00Z')):
            prior = copy.deepcopy(self.response)
            prior[field] = value
            with self.subTest(field=field), self.assertRaisesRegex(InvalidDocument, 'already closed'):
                self.check(previous=prior)

    def test_prior_response_also_checked(self):
        for field, value in (('hello_id', '00000000-0000-4000-8000-000000000001'),
                             ('local_user_approved', True), ('sent_at', '2026-10-02T00:00:00Z')):
            prior = copy.deepcopy(self.response)
            prior[field] = value
            with self.subTest(field=field), self.assertRaises(InvalidDocument):
                self.check(previous=prior)

    def test_wrong_kinds_and_remote_authority_rejected(self):
        with self.assertRaisesRegex(InvalidDocument, 'retained hello'):
            check_pair(raw(self.response), raw(self.response), now=NOW)
        with self.assertRaisesRegex(InvalidDocument, 'response document'):
            check_pair(raw(self.hello), raw(self.hello), now=NOW)
        self.response['local_user_approved'] = True
        with self.assertRaises(InvalidDocument):
            self.check()

    def test_all_inputs_bounded_and_strict(self):
        for bad in (b' ' * (MAX_BYTES + 1), b'{"kind":"hello","kind":"hello"}', b'NaN', b'\xff'):
            for position in range(3):
                inputs = [raw(self.hello), raw(self.response), raw(self.response)]
                inputs[position] = bad
                with self.subTest(position=position, bad=bad[:20]), self.assertRaises(InvalidDocument):
                    check_pair(inputs[0], inputs[1], previous_response_raw=inputs[2], now=NOW)

    def test_cli_review_and_duplicate(self):
        command = [sys.executable, 'reference/check_pair.py', 'examples/hello.json',
                   'examples/response.json', '--now', '2026-10-03T12:00:00Z']
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Interest is not authority', result.stdout)
        self.assertNotIn(self.response['message'], result.stdout)
        duplicate = subprocess.run(command + ['--previous-response', 'examples/response.json'],
                                   cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(duplicate.returncode, 0, duplicate.stderr)
        self.assertIn('duplicate-no-op', duplicate.stdout)

    def test_cli_expired_and_missing_file(self):
        for hello in ('examples/hello.json', 'missing-pair-fixture.json'):
            result = subprocess.run([sys.executable, 'reference/check_pair.py', hello,
                                     'examples/response.json', '--now', '2026-10-04T00:00:00Z'],
                                    cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertIn('INVALID PAIR:', result.stderr)


if __name__ == '__main__':
    unittest.main()
