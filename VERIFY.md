# Offline reference verification

This package includes original local validation code, not a running network or agent integration.

## Requirements

Python 3.10 or later, `jsonschema` 4.26.0 and its `referencing` dependency. They were already installed in the verification environment; no dependency downloads, provider API calls, or network fetches were performed. A fresh environment needs these dependencies from its normal approved package source. Runtime installation and dependency provisioning are outside this package's tests.

From the package root:

```sh
python -m unittest discover -s tests -v
python reference/validate.py examples/hello.json --now 2026-10-03T12:00:00Z
python reference/validate.py examples/weave.json
python reference/validate.py directory/directory.json
```

Use `--now` only to reproduce dated fixtures. Omit it for the actual current UTC clock. The synthetic hello expires on October 4, 2026; it is supposed to fail after that time. CLI exit status is 0 for local document validity and 1 for rejected input. Validity never means authenticated, trusted, approved, safe to contact, or safe to execute.

## Checks implemented

- Strict UTF-8 JSON, duplicate-key rejection at every object level, rejection of non-finite numbers, trailing content, and unpaired Unicode surrogates.
- Maximum eight container levels; 64 KiB for system/card/hello/response and 256 KiB for a directory. CLI input reads are bounded before parsing.
- Packaged Draft 2020-12 schemas with URI, UUID, and date-time format checks. Input cannot select or download a schema.
- Exact version, platform/profile declaration, kind, closed fields, and schema limits.
- Offline HTTPS URL syntax screen: no credentials, queries, fragments, non-443 ports, IP literals, localhost/internal suffixes, numeric encodings, encoded hostnames, or ambiguous backslashes.
- Unique local surface names and paths; different hello sender and recipient URLs.
- Hello expiration, maximum 24-hour duration, and five-minute future-clock allowance.
- Future timestamp checks for cards and responses as a conservative local screen.

## Exact test result

26 unittest methods passed. The methods also exercise multiple hostile vectors through subtests. Coverage includes all four example documents, a directory, duplicate keys, size/depth boundaries, encoded data, malformed root/kind, URLs, fake platform attestation, wrong versions, unknown executable fields, time boundaries, duplicate surface labels, and a remotely supplied approval field.

The dated hello CLI, private System manifest CLI, and empty directory CLI also passed.

## Explicitly outside scope

No DNS resolution, HTTP client, TLS or certificate validation, redirect handling, actual IP destination verification, DNS-rebinding protection, decompression, rate limiting, network deadline, rendering, messaging, or execution adapter exists here. An acceptable hostname can still resolve to an unsafe destination; passing the offline URL screen does not establish safe fetchability.

No approval engine, trusted consent persistence, response correlation, URL reversal against a retained hello, replay store, owner authentication, or handshake runtime is implemented. Their requirements remain specification-only. The remotely supplied approval-field test establishes only that the schema rejects that field. It does not establish enforcement of real owner consent.

Untrusted prose may be structurally valid. One test intentionally preserves malicious-looking prose as data to demonstrate that schema validation is not a prompt-injection detector. An integrating application must keep such content out of authority and execution paths.

This is local parser/schema/semantic validation evidence, not end-to-end protocol or live security conformance.
