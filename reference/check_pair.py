"""Offline hello/response review. No networking, persistence, or authority."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

if __package__:
    from .validate import InvalidDocument, MAX_BYTES, _instant, validate_document
else:
    from validate import InvalidDocument, MAX_BYTES, _instant, validate_document


def _response_for(hello, raw, now):
    response = validate_document(raw, now)
    if response['kind'] != 'response':
        raise InvalidDocument('expected a response document')
    if response['hello_id'] != hello['hello_id']:
        raise InvalidDocument('response hello_id does not match retained hello')
    if (response['from_card_url'] != hello['to_card_url']
            or response['to_card_url'] != hello['from_card_url']):
        raise InvalidDocument('response URLs do not exactly reverse retained hello URLs')
    sent = _instant(response['sent_at'])
    if sent < _instant(hello['sent_at']):
        raise InvalidDocument('response predates retained hello')
    if sent >= _instant(hello['expires_at']):
        raise InvalidDocument('response timestamp is outside hello lifetime')
    return response


def check_pair(hello_raw: bytes, response_raw: bytes, *,
               previous_response_raw: bytes | None = None,
               now: datetime | None = None) -> dict[str, str]:
    """Review one pair, optionally against one locally retained terminal response.

    The caller supplies the retained files and a trusted clock. This function
    cannot authenticate them or prove any prior acceptance. It never stores
    state or triggers actions. A previous response is a comparison input only,
    not an approval token. Omitting it cannot establish absence of a replay.
    """
    now = now or datetime.now(timezone.utc)
    # Reject oversized input before parsing, including wrong-kind directories.
    inputs = [hello_raw, response_raw]
    if previous_response_raw is not None:
        inputs.append(previous_response_raw)
    if any(len(raw) > MAX_BYTES for raw in inputs):
        raise InvalidDocument('pair input exceeds 65536 bytes')
    hello = validate_document(hello_raw, now)
    if hello['kind'] != 'hello':
        raise InvalidDocument('expected a retained hello document')
    response = _response_for(hello, response_raw, now)
    status = 'review-only'
    if previous_response_raw is not None:
        previous = _response_for(hello, previous_response_raw, now)
        if response != previous:
            raise InvalidDocument('proposal already closed by a different response; use a new hello')
        status = 'duplicate-no-op'
    return {'status': status, 'decision': response['decision']}


def _read(path):
    with path.open('rb') as source:
        return source.read(MAX_BYTES + 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('hello', type=Path, help='Locally retained hello file')
    parser.add_argument('response', type=Path, help='Human-carried response file')
    parser.add_argument('--previous-response', type=Path,
                        help='Locally retained first terminal response; comparison only')
    parser.add_argument('--now', help='Reproduce fixtures with a fixed clock; default is current UTC')
    args = parser.parse_args()
    try:
        result = check_pair(
            _read(args.hello), _read(args.response),
            previous_response_raw=_read(args.previous_response) if args.previous_response else None,
            now=_instant(args.now) if args.now else None,
        )
    except (InvalidDocument, OSError) as exc:
        parser.exit(1, 'INVALID PAIR: ' + str(exc) + '\n')
    # Only fixed labels are printed; never echo peer prose or identifiers.
    print('LOCAL PAIR:', result['status'], '/', result['decision'])
    if result['status'] == 'duplicate-no-op':
        print('Repeated response: no new decision or effects.')
    elif result['decision'] == 'declined':
        print('Declined: stop this proposal. Changes require a new hello.')
    else:
        print('Interest is not authority. Separately review each consequential next step locally.')
    print('No identity or owner approval verified; no network, saved state, or actions.')


if __name__ == '__main__':
    main()
