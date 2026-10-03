# Capture contract

## Requests
One JSON object on standard input; shell arguments contain only the verified workspace root. `capture`: `action`, `text` (string), `request_id` (stable opaque string, 1–200 characters), optional `timezone` (IANA name; default America/Chicago). Text limit: 1 MiB encoded UTF-8; reject whitespace-only input. Envelope limit: 8 MiB. Binary attachments and rich clipboard formats are out of scope.

Example envelope with synthetic data:

```json
{"action":"capture","text":"Garden notes\nTry basil by the window.\n","request_id":"demo-unique-request-01","timezone":"America/Chicago"}
```

`list`: `{"action":"list"}`. `read`: `{"action":"read","id":"<returned-record-UUID>"}`. `organize`: action, returned id, title (1–160 chars), tags (up to 32 strings of 1–64 chars), collection (1–80 chars), expected_revision (integer read from organization). Organization is a label view; no user input is treated as a path.

## Layout

```text
<authorized-workspace>/dropbox/pasted-texts/
  .lock
  records/<deterministic-record-UUID>/
    20261003T161700.123456Z__garden-notes__<record-UUID>.txt
    metadata.json
    organization.json
```

Filename is UTC sortable timestamp, first nonblank line as a safe ASCII slug, and unique record UUID. Unicode subject is preserved in metadata. Slug is at most 60 ASCII characters, lowercased and dash-separated; punctuation-only/nontransliterable subjects fall back to `untitled-paste`. UUID is deterministically derived from request ID for idempotency. New requests receive new IDs even if their text is identical. Filename date is UTC; metadata records ISO UTC, local time including offset, and IANA zone, avoiding DST ambiguity.

Original `.txt` has no added metadata or newline. Metadata includes schema version, ID, timestamps, subject, filename, encoding, SHA-256 and byte count. Original and metadata are immutable under helper operations. Display title, collection, tags and revision live separately.

## Commit and recovery
The helper serializes writers with a POSIX advisory lock, writes a temporary record directory beside the destination, flushes files and directory, renames the complete directory atomically, then flushes the parent. Readers ignore `.pending-*` entries. No partial committed record is reported. Organization uses a flushed temporary sidecar plus atomic replacement and revision guard. Existing record + matching text checksum returns `already_saved`; the same request ID with different text fails. A checksum mismatch is an error, not success.

After an uncertain result, retry with the same request ID and exact text. A crash can leave an ignored pending directory; do not treat it as saved or automatically delete unknown files. Do not change the request ID to make a retry succeed. Source input is not changed by this helper. A panel must retain its own input until the committed receipt arrives; this script does not persist a UI draft. Locking/rename/fsync guarantees assume a local POSIX filesystem, and cannot ensure persistence after workspace teardown or catastrophic storage failure.

The workspace root must already exist and be authorized. Symlinks in paths are rejected; generated record names prevent path traversal. This is a single-user trusted-workspace helper, not a hardened multi-tenant server; it is not secure against an adversarial process concurrently replacing ancestor paths. No network calls, clipboard access, arbitrary filesystem destinations, shell execution of text, or delete command.
