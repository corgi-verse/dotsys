#!/usr/bin/env python3
"""Explicit text capture. No networking, clipboard, execution, or deletion."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unicodedata
import uuid
from zoneinfo import ZoneInfo

LIMIT = 1024 * 1024
NS = uuid.UUID('ac6415f0-d1fc-4f7c-bf56-bf939be6bc42')

def checked(path):
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        if part.is_symlink():
            raise ValueError('Symlink paths are not supported')
    return path

def write_bytes(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())

def sync_dir(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)

def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')

def slug(text):
    subject = next((line.strip() for line in text.splitlines() if line.strip()), 'Untitled paste')[:160]
    normalized = unicodedata.normalize('NFKD', subject).encode('ascii', 'ignore').decode()
    safe = re.sub(r'[^a-z0-9]+', '-', normalized.lower()).strip('-')[:60].strip('-')
    return subject, safe or 'untitled-paste'

def read_json(path):
    return json.loads(checked(path).read_text(encoding='utf-8'))

class Inbox:
    def __init__(self, workspace):
        workspace = checked(workspace)
        if not workspace.is_dir():
            raise ValueError('Authorized workspace must already exist')
        self.root = checked(workspace / 'dropbox' / 'pasted-texts')
        self.records = self.root / 'records'
        checked(self.records).mkdir(parents=True, exist_ok=True, mode=0o700)

    @contextmanager
    def locked(self):
        p = checked(self.root / '.lock')
        fd = os.open(p, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            yield

    def directory(self, ident):
        if not isinstance(ident, str) or str(uuid.UUID(ident)) != ident:
            raise ValueError('Expected canonical record UUID')
        return checked(self.records / ident)

    def record(self, ident):
        directory = self.directory(ident)
        meta = read_json(directory / 'metadata.json')
        filename = meta['filename']
        if Path(filename).name != filename or not filename.endswith('.txt'):
            raise ValueError('Unsafe record filename')
        raw = checked(directory / filename).read_bytes()
        if hashlib.sha256(raw).hexdigest() != meta['sha256']:
            raise ValueError('Stored content failed checksum verification')
        return {'metadata': meta, 'organization': read_json(directory / 'organization.json'),
                'path': str(directory / filename), 'text': raw.decode('utf-8')}

    def capture(self, text, request_id, zone='America/Chicago'):
        if not isinstance(text, str) or not text.strip():
            raise ValueError('Paste is empty; nothing saved')
        if not isinstance(request_id, str) or not 1 <= len(request_id) <= 200:
            raise ValueError('A stable request_id of 1–200 characters is required')
        raw = text.encode('utf-8', errors='strict')
        if len(raw) > LIMIT:
            raise ValueError('Paste exceeds 1 MiB; retain input and use a file workflow')
        tz = ZoneInfo(zone)
        ident = str(uuid.uuid5(NS, request_id))
        digest = hashlib.sha256(raw).hexdigest()
        with self.locked():
            target = self.directory(ident)
            if target.exists():
                old = self.record(ident)
                if old['metadata']['sha256'] != digest:
                    raise ValueError('Idempotency conflict: request_id already holds different text')
                return {'status': 'already_saved', 'id': ident, 'path': old['path'], 'sha256': digest}
            now = datetime.now(timezone.utc)
            subject, safe = slug(text)
            filename = f"{now.strftime('%Y%m%dT%H%M%S.%fZ')}__{safe}__{ident}.txt"
            meta = {'schema_version': 1, 'id': ident, 'created_at_utc': now.isoformat().replace('+00:00', 'Z'),
                    'created_at_local': now.astimezone(tz).isoformat(), 'timezone': zone,
                    'subject': subject, 'filename': filename, 'sha256': digest,
                    'byte_count': len(raw), 'encoding': 'UTF-8', 'source': 'explicit-paste'}
            temp = Path(tempfile.mkdtemp(prefix='.pending-', dir=self.records))
            try:
                write_bytes(temp / filename, raw)
                write_bytes(temp / 'metadata.json', encoded(meta))
                write_bytes(temp / 'organization.json', encoded({'revision': 0, 'title': subject, 'tags': [], 'collection': 'inbox'}))
                sync_dir(temp)
                os.rename(temp, target)
                sync_dir(self.records)
            finally:
                if temp.exists():
                    shutil.rmtree(temp)
            saved = self.record(ident)
            return {'status': 'saved', 'id': ident, 'path': saved['path'], 'sha256': digest, 'byte_count': len(raw)}

    def organize(self, ident, title, tags, collection, expected_revision):
        if not isinstance(title, str) or not title.strip() or len(title) > 160:
            raise ValueError('Title must contain 1–160 characters')
        if not isinstance(tags, list) or len(tags) > 32 or any(not isinstance(t, str) or not t.strip() or len(t) > 64 for t in tags):
            raise ValueError('Use at most 32 nonempty tags of up to 64 characters')
        if not isinstance(collection, str) or not collection.strip() or len(collection) > 80:
            raise ValueError('Collection must contain 1–80 characters')
        with self.locked():
            current = self.record(ident)
            revision = current['organization']['revision']
            if type(expected_revision) is not int or expected_revision != revision:
                raise ValueError('Organization revision conflict; read current state before retrying')
            value = {'revision': revision + 1, 'title': title, 'tags': list(dict.fromkeys(tags)), 'collection': collection}
            directory = self.directory(ident)
            temp = directory / ('.organization-' + uuid.uuid4().hex)
            try:
                write_bytes(temp, encoded(value))
                os.replace(temp, directory / 'organization.json')
                sync_dir(directory)
            finally:
                if temp.exists():
                    temp.unlink()
            return {'status': 'organized', 'id': ident, 'organization': value}

    def listing(self):
        result = []
        for directory in self.records.iterdir():
            if directory.name.startswith('.'):
                continue
            record = self.record(directory.name)
            result.append({k: record[k] for k in ['metadata', 'organization', 'path']})
        return {'status': 'listed', 'records': sorted(result, key=lambda v: v['metadata']['created_at_utc'], reverse=True)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace-root', required=True, help='Existing authorized workspace; never inferred from pasted data')
    args = parser.parse_args()
    try:
        data = sys.stdin.buffer.read(8 * LIMIT + 1)
        if len(data) > 8 * LIMIT:
            raise ValueError('Input envelope too large; nothing saved')
        request = json.loads(data.decode('utf-8'))
        inbox = Inbox(args.workspace_root)
        action = request.get('action')
        if action == 'capture':
            result = inbox.capture(request['text'], request['request_id'], request.get('timezone', 'America/Chicago'))
        elif action == 'list':
            result = inbox.listing()
        elif action == 'read':
            result = {'status': 'read', **inbox.record(request['id'])}
        elif action == 'organize':
            result = inbox.organize(request['id'], request['title'], request['tags'], request['collection'], request['expected_revision'])
        else:
            raise ValueError('Unknown action; use capture, list, read, or organize')
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'status': 'error', 'error': str(error), 'input_preserved': 'Source input is not modified; retain it until saved is confirmed'}))
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
