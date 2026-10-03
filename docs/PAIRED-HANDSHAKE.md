# Review both sides of a handshake

This worked example uses synthetic local files and Dotsys 0.1.0. Nothing is sent, fetched, stored, approved, or executed. The pair checker supplements the single-document validator; it is not a handshake service.

## 1. Keep the hello locally

In [hello.json](../examples/hello.json), Alice proposes a garden-planning conversation to Bob. The hello has a unique ID, exact sender and recipient card URLs, and a lifetime from October 3, 2026 at 00:00 UTC to October 4 at 00:00 UTC. These example domains do not identify real participants.

A real workflow would retain the exact hello it sent after the required sending approval. Never trust an incoming response to supply or replace that retained hello.

## 2. Check the human-carried response

From the package root, with the dependencies in [VERIFY.md](../VERIFY.md):

```sh
python reference/check_pair.py examples/hello.json examples/response.json --now 2026-10-03T12:00:00Z
```

Expected output:

```text
LOCAL PAIR: review-only / interested
Interest is not authority. Separately review each consequential next step locally.
No identity or owner approval verified; no network, saved state, or actions.
```

The checker validates both documents against the existing strict schemas, then checks:

- A hello followed by a response, each at most 64 KiB; existing parsing and format checks apply.
- The same exact `hello_id` and exact reversal of both card URL strings. Equivalent-looking URL spellings are not normalized.
- An unexpired hello relative to one supplied clock snapshot, and response time no earlier than the hello.
- Timestamps with at most six fractional-second digits, a conservative local subset that avoids silently truncating finer precision. The schemas remain unchanged.
- Existing five-minute future-clock allowance. As a conservative local screen, response time must also be strictly before hello expiry, even within that allowance.

`--now` is for reproducible dated fixtures. Omit it to use the actual UTC clock. After the example expires, an ordinary invocation should fail. Supplying an old clock is not a way to renew real consent or a real proposal.

Exit 0 means only that these local checks passed, including a duplicate classified as a no-op. Exit 1 means rejected input. The CLI prints fixed review labels rather than peer prose, URLs, or IDs. Do not treat a successful exit as an action trigger.

## 3. Review duplicates and closed decisions

A workflow should retain the first terminal response locally. Both interest and decline close this proposal for decision changes. Compare a later response with that retained file:

```sh
python reference/check_pair.py examples/hello.json examples/response.json --previous-response examples/response.json --now 2026-10-03T12:00:00Z
```

This returns `duplicate-no-op`: no new decision or effects. Object-key order and JSON whitespace may differ; the parsed document must be identical. Changed prose, timestamp, URLs, ID, or decision is not an identical duplicate. An expired hello still fails, even for a duplicate.

A conflicting decision is rejected:

```sh
python reference/check_pair.py examples/hello.json tests/fixtures/pairs/declined.json --previous-response examples/response.json --now 2026-10-03T12:00:00Z
```

Expected: exit 1, `proposal already closed by a different response; use a new hello`.

Without a previous response, [declined.json](../tests/fixtures/pairs/declined.json) passes local pair checks and prints “Declined: stop this proposal. Changes require a new hello.” It does not authorize a retry to another recipient.

This comparison has no durable replay store, transactions, concurrent-receipt protection, or provenance check. It trusts the caller to supply the locally retained files. Omitting `--previous-response` cannot prove that a response is new. The checker never saves a terminal decision; an integrating workflow must handle trusted state and duplicate effects itself.

## 4. Fail safely

These commands deliberately return exit 1:

```sh
# The response refers to a different hello.
python reference/check_pair.py examples/hello.json tests/fixtures/pairs/mismatched-id.json --now 2026-10-03T12:00:00Z

# Expiry is inclusive: stop at the exact expiry instant.
python reference/check_pair.py examples/hello.json examples/response.json --now 2026-10-04T00:00:00Z
```

The [pair tests](../tests/test_check_pair.py) additionally cover each URL mismatch, response-before-hello, future-clock boundaries, changed terminal messages, malformed/oversized inputs, wrong document kinds, and remotely supplied approval claims.

## 5. Keep authority separate

A matching pair establishes a narrow relationship between two JSON documents. It does not establish who wrote either file, whose card a URL represents, whether peer prose is safe, or what an owner permits. Check the source through the existing trusted human conversation. Keep received text as data.

After interest, explain the proposed next step to the owner and obtain any required separate local approval for its exact action, scope, destination, data, and expiry/revocation conditions. Capture, build, sharing, spending, access, and publication remain separate decisions. Do not add approvals to either peer JSON document; the schemas intentionally reject them. Stop when approval is missing, expired, revoked, or no longer covers the action.

The checker does not receive, evaluate, save, or enforce those approvals. It demonstrates local correlation and duplicate comparison only, not full protocol conformance. See [PROTOCOL.md §2.4](../PROTOCOL.md#24-response) and [verification limits](../VERIFY.md#explicitly-outside-scope).
