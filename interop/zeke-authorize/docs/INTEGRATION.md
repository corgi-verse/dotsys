# Integration contract

## Transport and identity

All remotely reachable traffic uses the configured HTTPS origin. The loopback backend is HTTP only behind an owner-configured TLS proxy. Proxy `Host` must match that origin. No wildcard CORS, redirects, arbitrary RP origins, or dynamically supplied issuers are supported.

Each chat adapter uses a unique registered client credential. Each execution gate uses a separate registered executor credential. Never ship those keys in phone apps, public JavaScript bundles, chat text, or QR codes. The reference browser console requires manual keys solely for local testing. Production adapters must bind the authenticated chat session to the configured owner and server-side client; never let a model supply `ownerId`, `clientId`, `agentId`, or `executorId`.

The reference is one-owner. It does not implement OAuth service registration, tenant routing, a remote administrator API, or production secrets management. Configure new identities in the private operator configuration and restart the service. Production should use scoped short-lived workload credentials with independent rotation.

## Endpoints

JSON POST bodies require `Content-Type: application/json`; the request cap is 32 KiB. Status and error replies are JSON, with errors such as `approval_unavailable`, `action_changed`, `wrong_executor`, or `review_link_expired`.

| Method and path | Caller | Operation |
|---|---|---|
| POST `/api/requests` | Client bearer token | Create immutable request, return QR/link/digest |
| GET `/api/requests/:id` | Issuing client bearer token | Read own request status and receipt |
| GET `/api/requests/:id` | `X-Review-Token` | Read exact request while link is unexpired |
| POST `/api/cancel` | Issuing client bearer token | Cancel pending/approved request |
| POST `/api/enroll/options` | One-use owner enrollment ticket in body | Start passkey enrollment |
| POST `/api/enroll/verify` | Same ticket plus ceremony and credential | Verify and enroll passkey |
| POST `/api/enroll/native/options` | One-use enrollment ticket | Obtain enrollment device ID/message |
| POST `/api/enroll/native/verify` | Same ticket plus SPKI/signature | Prove P-256 key possession and enroll |
| POST `/api/decision/options` | Review token | Prepare request-bound passkey challenge |
| POST `/api/decision/verify` | Review token plus assertion | Verify and commit signed decision |
| POST `/api/native/message` | Review token | Obtain exact native decision message |
| POST `/api/native/decision` | Review token plus signature | Verify and commit native decision |
| POST `/api/execute` | Bound executor bearer token | Execute exact sandbox note atomically |
| POST `/api/claim` | Bound executor bearer token | Consume one approval for external dispatch |
| POST `/api/result` | Same executor bearer token | Record succeeded/failed/unknown outcome |

Request creation body:

```json
{"kind":"sandbox.note.append","target":"sandbox:notes","parameters":{"text":"Approved content"}}
```

Returned data includes `payload`, `actionHash`, `state`, `receipt`, `reviewUrl`, and `qrDataUrl`. A Dots/Zeke card should show the registered agent, target, action, expiry, digest, QR, and tap link. Poll status until terminal. An approval card is a review invitation, never an approval record itself.

Passkey enrollment bodies are `{enrollmentToken}` and `{enrollmentToken, ceremonyId, response}`. Native enrollment verification is `{enrollmentToken, ceremonyId, spki, signature}`; the options reply supplies `{deviceId, message, ceremonyId}`. Save the device ID with the app key reference. Do not ship or persist the enrollment ticket in the app.

Passkey decision options body is `{id, decision}`. Verify body is `{ceremonyId, response}`. Both use `X-Review-Token`. The native message call is `{id, decision}`; native decision is `{id, decision, deviceId, signature}`. The native app must recompute the action digest and expected message from the typed payload it displayed, compare the returned message byte-for-byte, and sign only after a user tap. Treat these reference modules as key helpers, not complete phone clients.

Execute/claim body is `{id, actionHash}`. An external claim returns the fixed action and a durable claimed receipt. Dispatch only the returned operation after checking the expected kind/target/parameters against the queued action. Result body is `{id, status, result}`; `result` is bounded to 4,000 canonical JSON characters and must omit secrets. A claimed request cannot be claimed again. A timeout is not proof that claim failed: inspect its saved state and reconcile.

## Node adapter

`requestApproval(origin, clientToken, action)` creates the card data. `readApproval(origin, clientToken, id)` reads status. `executeApproved({origin, executorToken, id, actionHash, expectedAction, perform})` claims, checks the exact queued effect inputs, passes the returned operation to the connector, and reports its result. The supplied `perform(operation, {idempotencyKey})` callback must derive all side-effect inputs from that operation. If the callback throws, the adapter records `unknown`, since exceptions cannot generally establish that no external effect happened.

The callback helper cannot sandbox arbitrary code or force a compromised connector to obey. Credentials and sensitive operations must be placed behind the actual gate, and the gate must perform its checks in the same service that owns the side effect. The reference only enforces the supported sandbox connector and a broker-mediated claim.

## Zeke placement

The inspected local Zeke runner source at `source/services/zeke-runner/README.md` describes separate machine keys, approved runtime packs, pairing, current owner authority and selected-document changes. Add this human approval layer at the existing server-side tool dispatch/acceptance boundary, then again at execution. Preserve the runner identity protocol and pack verification. A phone’s P-256 approval key and the runner’s Ed25519 machine key serve different purposes.

Proposed adapters:

1. **Pair computer:** exact machine public key, pack digest and owner trust root; no grant before all three match current policy.
2. **Accept document edit:** owner-selected document, current head digest and exact candidate diff; changed head requires new approval.
3. **Run an authorized tool:** schema-specific immutable operation, appropriate provider scopes, current control epoch and executor incarnation.
4. **Deploy:** reviewed revision, environment, immutable artifact and approved configuration delta; performed only through the established deployment owner.

These are integration specifications. None is patched into or enabled on the existing Zeke runtime by this standalone package. The operator must validate current live prerequisites before rollout; old handoff receipts cannot authorize a new pairing or deployment.

## Dots placement

Dots can render the common request card and use the shared protocol through a supported integration. OpenAI can replace the Zeke phone presentation with a native sheet and its own supported key workflow while preserving exact-action binding, one-use decisions, current revocation checks and executor enforcement.

This package does not provide or claim access to ChatGPT’s internal approval machinery. A connected MCP/tool surface can request an approval, but it cannot enforce unrelated tools unless the platform routes those tools through the gate. Every supported executor needs an enforcement hook. Publish a coverage matrix listing covered/unsupported operations rather than claiming universal control from a chat widget.
