"""Local Corgi Weave document checks. No network, authority, or execution."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import ipaddress
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry

ROOT = Path(__file__).resolve().parents[1]
KINDS = frozenset({'system', 'card', 'directory', 'hello', 'response'})
MAX_BYTES = 65536
MAX_DIRECTORY_BYTES = 262144
MAX_DEPTH = 8


class InvalidDocument(ValueError):
    """Untrusted input did not satisfy local document requirements."""


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InvalidDocument('duplicate JSON object key')
        result[key] = value
    return result


def _constant(value):
    raise InvalidDocument('non-finite JSON number')


def parse_document(raw: bytes):
    if len(raw) > MAX_DIRECTORY_BYTES:
        raise InvalidDocument('document exceeds 262144 bytes')
    try:
        text = raw.decode('utf-8', errors='strict')
    except UnicodeDecodeError as exc:
        raise InvalidDocument('document is not UTF-8') from exc
    depth = 0
    quoted = escaped = False
    for char in text:
        if quoted:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                quoted = False
        elif char == '"':
            quoted = True
        elif char in '[{':
            depth += 1
            if depth > MAX_DEPTH:
                raise InvalidDocument('document nesting exceeds 8')
        elif char in ']}':
            depth -= 1
    try:
        value = json.loads(text, object_pairs_hook=_pairs, parse_constant=_constant)
    except (ValueError, RecursionError) as exc:
        raise InvalidDocument('invalid JSON: ' + str(exc)) from exc
    def check(node):
        if isinstance(node, float) and not math.isfinite(node):
            raise InvalidDocument('non-finite JSON number')
        if isinstance(node, str):
            try:
                node.encode('utf-8', errors='strict')
            except UnicodeEncodeError as exc:
                raise InvalidDocument('unpaired Unicode surrogate') from exc
        if isinstance(node, dict):
            for key, item in node.items():
                check(key)
                check(item)
        elif isinstance(node, list):
            for item in node:
                check(item)
    check(value)
    return value


def check_public_url(value: str):
    """Offline screen only: cannot prove DNS/public routing or safe fetch behavior."""
    if any(ord(c) <= 32 or ord(c) == 127 for c in value) or '\\' in value:
        raise InvalidDocument('URL has control characters, whitespace, or backslash')
    try:
        url = urlsplit(value)
        host = url.hostname
        port = url.port
    except ValueError as exc:
        raise InvalidDocument('invalid URL') from exc
    if (url.scheme != 'https' or not host or url.username is not None
            or url.password is not None or port not in (None, 443)
            or '?' in value or '#' in value):
        raise InvalidDocument('URL requires HTTPS:443 without credentials/query/fragment')
    if '%' in url.netloc or host.endswith('.'):
        raise InvalidDocument('encoded or trailing-dot hostname is not supported')
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        # Deliberately conservative ASCII DNS syntax, with legacy numeric forms rejected.
        if not host.isascii() or len(host) > 253 or '.' not in host:
            raise InvalidDocument('URL requires a fully qualified ASCII hostname')
        labels = host.lower().split('.')
        if any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', x) for x in labels):
            raise InvalidDocument('invalid DNS hostname')
        if (labels[-1] in {'localhost', 'local', 'internal', 'home', 'lan', 'arpa'}
                or all(re.fullmatch(r'(?:[0-9]+|0x[0-9a-f]+)', x) for x in labels)):
            raise InvalidDocument('local or legacy numeric hostname is not supported')
    else:
        raise InvalidDocument('IP literals are not supported; use a public hostname')


def _instant(value):
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, TypeError) as exc:
        raise InvalidDocument('invalid timestamp') from exc
    if result.tzinfo is None:
        raise InvalidDocument('timestamp lacks timezone')
    return result


def validate_document(raw: bytes, now: datetime | None = None):
    doc = parse_document(raw)
    if not isinstance(doc, dict) or not isinstance(doc.get('kind'), str) or doc['kind'] not in KINDS:
        raise InvalidDocument('unknown document kind')
    if doc['kind'] != 'directory' and len(raw) > MAX_BYTES:
        raise InvalidDocument('non-directory document exceeds 65536 bytes')
    schema = json.loads((ROOT / 'schemas' / (doc['kind'] + '.schema.json')).read_text())
    Draft202012Validator.check_schema(schema)
    # Empty registry fails closed for external references: never fetch instance-provided schemas.
    validator = Draft202012Validator(schema, format_checker=FormatChecker(), registry=Registry())
    errors = sorted(validator.iter_errors(doc), key=lambda e: str(list(e.path)))
    if errors:
        raise InvalidDocument('schema validation failed at ' + '/'.join(map(str, errors[0].path)))
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise InvalidDocument('validation clock must include timezone')
    for key in ('public_card_url', 'from_card_url', 'to_card_url'):
        if key in doc:
            check_public_url(doc[key])
    for value in doc.get('card_urls', []):
        check_public_url(value)
    for key in ('sent_at', 'updated_at'):
        if key in doc and _instant(doc[key]) > now + timedelta(minutes=5):
            raise InvalidDocument('timestamp is in the future')
    if 'expires_at' in doc:
        expiry = _instant(doc['expires_at'])
        if expiry <= now:
            raise InvalidDocument('document has expired')
        if 'sent_at' in doc:
            duration = expiry - _instant(doc['sent_at'])
            if duration <= timedelta(0) or duration > timedelta(hours=24):
                raise InvalidDocument('expiry must be within 24 hours after sent_at')
    if doc.get('from_card_url') is not None and doc['from_card_url'] == doc.get('to_card_url'):
        raise InvalidDocument('sender and recipient must differ')
    if 'surfaces' in doc:
        names = [entry['name'] for entry in doc['surfaces']]
        if len(names) != len(set(names)):
            raise InvalidDocument('surface names must be unique')
        paths = [entry['path'] for entry in doc['surfaces']]
        if len(paths) != len(set(paths)):
            raise InvalidDocument('surface paths must be unique')
    return doc


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    parser.add_argument('--now', help='Explicit UTC timestamp for reproducible fixtures; default is current UTC')
    args = parser.parse_args()
    try:
        with args.file.open('rb') as source:
            raw = source.read(MAX_DIRECTORY_BYTES + 1)
        doc = validate_document(raw, _instant(args.now) if args.now else None)
    except (InvalidDocument, OSError) as exc:
        parser.exit(1, 'INVALID: ' + str(exc) + '\n')
    print('VALID local document:', doc['kind'], '(not authenticated or authorized; no fetch performed)')


if __name__ == '__main__':
    main()
