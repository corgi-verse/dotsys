# Offline reference verification

This package includes original local validation code, not a running network or agent integration.

## Requirements

Python 3.10 or later, `jsonschema` 4.26.0 and its `referencing` dependency. They were already installed in the verification environment; no dependency downloads, provider API calls, or network fetches were performed. A fresh environment needs these dependencies from its normal approved package source. Runtime installation and dependency provisioning are outside this package's tests.

From the package root:

```sh
python -m unittest discover -s tests -v
python reference/validate.py examples/hello.json --now 2026-10-03T12:00:00Z
python reference/validate.py examples/dotsys.json
python reference/validate.py directory/directory.json
python reference/check_pair.py examples/hello.json examples/response.json --now 2026-10-03T12:00:00Z
```

Use `--now` only to reproduce dated fixtures. Omit it for the actual current UTC clock. The synthetic hello expires on October 4, 2026; it is supposed to fail after that time. CLI exit status is 0 for local document validity and 1 for rejected input. Validity never means authenticated, trusted, approved, safe to contact, or safe to execute.

The [paired handshake walkthrough](docs/PAIRED-HANDSHAKE.md) shows interest, decline, duplicate, conflict, mismatch, and expiry using local files. The pair checker also returns 0 for a duplicate no-op and 1 for rejected input; neither status grants authority.

## Checks implemented

- Strict UTF-8 JSON, duplicate-key rejection at every object level, rejection of non-finite numbers, trailing content, and unpaired Unicode surrogates.
- Maximum eight container levels; 64 KiB for system/card/hello/response and 256 KiB for a directory. CLI input reads are bounded before parsing.
- Packaged Draft 2020-12 schemas with URI, UUID, and date-time format checks. Input cannot select or download a schema.
- Exact version, platform/profile declaration, kind, closed fields, and schema limits.
- Offline HTTPS URL syntax screen: no credentials, queries, fragments, non-443 ports, IP literals, localhost/internal suffixes, numeric encodings, encoded hostnames, or ambiguous backslashes.
- Unique local surface names and paths; different hello sender and recipient URLs.
- Hello expiration, maximum 24-hour duration, and five-minute future-clock allowance.
- Future timestamp checks for cards and responses as a conservative local screen.
- All local timestamp parsing, including explicit CLI clocks, conservatively rejects more than six fractional-second digits before datetime conversion, which would otherwise silently truncate them. This is a reference-tool precision limit, not a change to the protocol schemas.
- Local pair checking: exact hello ID and reversed URLs, response no earlier than hello and strictly before its expiry, with both documents checked at one clock snapshot.
- Optional comparison against a supplied locally retained terminal response: identical parsed documents are duplicate no-ops; changed responses are rejected. No state is saved.

## Exact test result

48 unittest methods passed (29 document-validator methods, 16 pair-checker methods, and three documentation-navigation methods). The methods also exercise multiple hostile vectors through subtests. Coverage includes all four example documents, a directory, duplicate keys, size/depth boundaries, encoded data, malformed root/kind, URLs, fake platform attestation, wrong versions, unknown executable fields, time boundaries, duplicate surface labels, and a remotely supplied approval field. Timestamp regressions cover unsupported precision, supported microsecond future/expiry/lifetime boundaries, and clean CLI rejection.

Pair coverage includes ID and each URL mismatch, equality/expiry/future-clock boundaries, both decisions, duplicates, conflicting decisions and changed messages, invalid previous responses, strict input limits, fractional-second precision rejection, and CLI success/failure output.

The dated hello CLI, private System manifest CLI, empty directory CLI, and dated pair CLI also passed.

Documentation-navigation checks verify the landing page’s link to the GitHub-rendered human guide and separate machine index, local landing-page file and in-page targets, and the guide’s local file and simple heading targets. They do not fetch external URLs or verify hosted Markdown rendering.

## Explicitly outside scope

No DNS resolution, HTTP client, TLS or certificate validation, redirect handling, actual IP destination verification, DNS-rebinding protection, decompression, rate limiting, network deadline, rendering, messaging, or execution adapter exists here. An acceptable hostname can still resolve to an unsafe destination; passing the offline URL screen does not establish safe fetchability.

No approval engine, trusted consent persistence, durable replay store, owner authentication, or handshake runtime is implemented. The pair checker correlates supplied local files and compares an optional previous response; it cannot authenticate retained state, prove prior acceptance, prevent concurrent/restarted workflow effects, or detect a replay when previous state is omitted. Those runtime requirements remain specification-only. The remotely supplied approval-field test establishes only that the schema rejects that field. It does not establish enforcement of real owner consent.

Untrusted prose may be structurally valid. One test intentionally preserves malicious-looking prose as data to demonstrate that schema validation is not a prompt-injection detector. An integrating application must keep such content out of authority and execution paths.

This is local parser/schema/semantic validation evidence, not end-to-end protocol or live security conformance.

## Landing-page copy controls

When Node.js is already available, run the separate, dependency-free UI logic checks:

```sh
node --test tests/test_site_copy.cjs
```

Seven checks exercise shared-control locking during fetch/clipboard work, repeated and overlapping clicks, manual selection with an accurate field label, setup-prompt restoration, clipboard rejection/insecure-context fallback, recovery from fetch/read failures, and stalled fetch/body deadlines with retry and late-result suppression. They use a small in-memory DOM/clipboard stub and make no network requests. The Python suite above remains independent of Node.js.

These are JavaScript behavior checks, not browser, visual, keyboard, screen-reader, or native clipboard verification. In a browser, check both copy buttons, denied/unavailable clipboard fallback, protocol-load failure, and copying the setup prompt after a protocol fallback. The disabled controls indicate an operation in progress. Protocol loading has a ten-second deadline covering both fetch and body read; a timed-out load cannot later overwrite the clipboard or status. Clipboard writes themselves retain the lock until the browser settles them, because native writes cannot be cancelled safely. File links remain available for manual recovery.


## Skills section checks

Run the landing-page copy checks with Node’s built-in runner:

```sh
node --test tests/test_site_copy.cjs tests/test_skill_copy.cjs
```

The Skills checks verify literal prompt copying, manual selection fallback when clipboard access is unavailable, repeat-click locking, and truthful installation wording. Python documentation checks cover local links, matching use prompts, unchanged setup-prompt consistency, and ZIP/source agreement. Run the Paste Inbox package’s own tests using its [usage guide](skills/paste-inbox/README.md).

These offline checks do not verify skill import in any host, durable storage across execution environments, or a device-to-Dot paste panel/hotkey connection. Before release, inspect the published section on desktop and narrow screens and verify the ZIP download and copy action in a real browser.
