# Validation and release boundary

Date: October 7, 2026. Host: Linux x86_64, Node 24.14.1. Scope: isolated source package and disposable local test state. No live Zeke source, runtime, pack registry, pairing, credentials, or deployment was changed.

## Verified behavior

The automated tests verify native P-256 DER signatures and WebAuthn ES256 registration/assertions using real cryptography and synthetic software authenticators. They do **not** substitute for physical phone validation. The complete HTTP test creates a request, obtains a bound challenge, submits a signed decision, and executes one exact sandbox note.

The suite covers:

- QR/review-token separation from signing authority; short-lived review access.
- Required action schemas, policy, client ownership and executor identity.
- Signature substitution between requests and between approve/deny.
- Expiry before approval and before execution; denial and cancellation.
- Revocation after approval and during a pending WebAuthn ceremony.
- One-use enrollment tickets and challenge consumption.
- WebAuthn origin/challenge/signature checks and required user verification.
- Native HTTP enrollment proof-of-possession and signing interoperability.
- Concurrent execution producing exactly one sandbox effect.
- Persistent phone public keys, approved state, claim consumption and unknown receipts across restart.
- Adapter rejection of changed queued actions; uncertain external failures recorded without retry.
- Published canonical UTF-8/hash/signature fixture, including Unicode and a newline.
- HTTPS/host/origin configuration, JSON size limits and security headers.

Source syntax checks cover the server, core, SDK and both browser scripts. The pinned dependency installation was audited against the available registry database; zero known vulnerabilities were reported at the time of the run. That result is not an independent security audit.

## UI inspection

The running reference desktop page and enrollment page were observed in the in-app browser. A real broker-created request was opened in its phone review page. At a 390 × 844 CSS-pixel viewport, the exact agent/client/executor, action, target and content were visible, with separate Approve and Deny buttons. The fragment was removed from the address bar. `Zeke-Phone-Review.png` in the release outputs records that responsive layout with synthetic note content.

No browser enrollment, biometric approval, OS camera permission, or actual phone use was performed in this workspace. UI evidence proves layout and request rendering, not physical key custody.

## Correctness and logic review

The review checked the central claim against code: a review token cannot grant execution; identity fields come from trusted registration; a decision signs the full action digest and context; async verification must still commit only against a pending current-epoch request; and consume must require the bound executor, matching digest, active signer and approved state. Durable one-use claim state prevents repeated external dispatch through this gate.

The review found and repaired two edge cases: review links were initially readable after action expiry, and an SDK queued-action mismatch initially left a claim without a terminal no-effect receipt. The final source refuses expired review links and records a failed no-effect receipt for that mismatch. Tests cover both repairs.

The sandbox transaction includes the note and receipt, making repeated execution impossible there. External callbacks cannot prove exactly-once effects or guarantee rollback; the adapter records uncertainty on an exception. A compromised executor with independently available service credentials is outside the protocol's enforcement boundary. The reference broker is trusted, and audit receipts are not independently signed. Native enrollment labels hardware assurance unverified rather than trusting a device claim.

## Acceptance matrix

| Check | Result |
|---|---|
| Automated reference tests | PASS, 24/24; retained `test-results.txt` |
| JavaScript syntax and pinned dependency audit | PASS |
| Phone-size review rendering | PASS |
| Archive manifest, payload hashes, secret/state exclusions and ZIP CRC | PASS; packaging receipt alongside archive |
| Actual iPhone camera/passkey/Secure Enclave behavior | NOT_RUN |
| Actual Android camera/passkey/Keystore/StrongBox behavior | NOT_RUN |
| Swift/Kotlin compile and installable native app | NOT_RUN; key modules only |
| Public HTTPS phone pilot and native association files | NOT_RUN |
| Live Zeke and Dots integration | NOT_RUN |
| Provider-specific real side effects | NOT_RUN; only sandbox implemented |
| Multi-owner/scaled deployment and tenant isolation | NOT_RUN; single-owner reference |
| Remote hardware attestation and independent executor verification | NOT_RUN |
| Independent security review | NOT_RUN |

An experimental source release is supported by the evidence. A production universal-authorization claim is not. Before sensitive deployment, close the phone, HTTPS, connector, authority/isolation and security-review gates relevant to that deployment.

## Reproduce

Run `npm ci --ignore-scripts` and `npm test` from the unpacked package using Node 24 or later. These tests use temporary local state and generate software-only keys in memory; no owner secrets are required. For actual phones, follow the trusted HTTPS setup in README and record the device/OS/app versions, hardware assurance, camera path, enrollment, approval, revocation and crash/recovery receipts separately.
