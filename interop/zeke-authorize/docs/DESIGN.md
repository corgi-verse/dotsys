# Zeke Authorize — shared phone approval design

**Prepared October 7, 2026. Project: Zeke by Corgi-verse. Intended clients: Zeke and ChatGPT Dots.**

## 1. Product contract

The owner can approve an agent action from any **integrated and registered** Dots or Zeke chat, regardless of which connected system will execute it. The private approval key remains managed by the owner’s phone. One protocol connects clients, brokers, phones, and executors; Zeke supplies its own phone experience. A future Dots integration can supply a cleaner OpenAI-native interface while retaining the same authorization semantics.

“Authorize anything anywhere” means extensible coverage through enforced connector adapters. It does not mean bypassing an OS prompt, another person’s permissions, a provider’s OAuth consent screen, or a platform rule. Actions outside the owner’s existing authority are refused. Any connector without the gate cannot be described as covered. Approval is additional consent, not an account credential or universal root key.

The authority order is: provider/OS permissions → owner policy → authenticated agent identity → exact phone approval → authenticated executor and precondition check. Every layer must allow the operation. Agents may ask; agents cannot enroll phones, sign decisions, expand their own policy, or claim to be a different agent.

## 2. Components and flow

```mermaid
sequenceDiagram
    participant C as Dots or Zeke chat
    participant B as Authorization broker
    participant P as Owner's phone
    participant E as Connected executor
    C->>B: Authenticated exact action request
    B-->>C: QR or tap link plus pending status
    P->>B: Open request on enrolled trusted origin
    B-->>P: Immutable action and expiry
    P->>P: Review, then unlock phone-held key
    P->>B: Action-bound approve or deny signature
    B-->>C: Signed decision accepted; status changes
    E->>B: Claim with executor identity and action digest
    B-->>E: One-use operation, if still approved
    E->>E: Recheck resource and perform exact operation
    E->>B: Request-bound execution result
    B-->>C: Receipt or explicit unknown outcome
```

- **Chat adapter:** posts requests through an authenticated client identity and renders an approval card. The requesting client and executor are fixed by registration. A browser, terminal, desktop app, or mobile chat can all render the same link and QR.
- **Broker:** maps verified owner identity to enrolled public keys; fixes actions; checks decisions; manages expiry, revocation, claim state, and receipts. It holds no phone private key.
- **Phone:** shows an independently obtained action, asks for an explicit decision, and invokes the OS key authentication. Scanning and unlocking are separate steps.
- **Executor gate:** sits immediately before each sensitive tool side effect, under the connector/service’s control. It blocks missing, denied, stale, altered, canceled, or already-used authority.
- **Provider connector:** holds its own scoped service credentials. These are not encoded in QR codes or sent to the phone. Third-party account linking remains the provider’s supported flow.

The production design uses an owner identity provider, a shared durable transactional database, per-client credentials or workload identity, TLS, and a protected execution service. The shipped reference uses a single owner and local SQLite, with separate randomly generated client and executor bearer credentials. It is not a horizontally scaled or multi-tenant service.

## 3. QR and same-phone links

Reference URL shape:

```text
https://YOUR-AUTH-DOMAIN/approve#id=<request-uuid>&t=<random-review-token>
```

The 256-bit review token authorizes viewing this one request during its two-minute lifetime; it cannot approve, enroll a key, or execute. Only its hash is persisted. The fragment avoids placing it in an HTTP query, proxy access logs, or referrer headers. The phone web client removes it from the address bar after opening and keeps it only in memory. Reloading then requires reopening the original chat link. Screenshots and copied links can still disclose request details during the short lifetime, so treat the QR as sensitive when the requested action is sensitive.

The native app must accept only the **previously enrolled exact HTTPS origin**, the `/approve` path, one valid UUID, and one correctly shaped review token. It must reject unknown origins, URL credentials, duplicate parameters, custom-scheme redirects, and malformed payloads. Opening an unfamiliar QR never enrolls a new broker or key. Enrollment is a separately initiated owner ceremony.

On the same phone, use “Review on this phone”; do not ask users to scan their own screen. A chat on another computer shows both QR and a clickable link. Push notifications, if added, merely open the same pending request and never confer approval. Internet connectivity is required for issuance, decision, and claim in v1; there is no offline execution authority.

## 4. Exact action and decision protocol

The reference action payload is a fixed JSON object with these bindings:

| Field | Meaning |
|---|---|
| `v`, `origin` | Protocol version and enrolled broker origin |
| `requestId`, `nonce` | Unique request and 256-bit freshness value |
| `ownerId`, `epoch` | Owner and current revocation generation |
| `clientId`, `agentId` | Server-assigned requesting identities |
| `executorId` | One intended executing system |
| `kind`, `target`, `parameters` | Exact operation and effect inputs |
| `createdAt`, `expiresAt` | Issuance and expiry as integer Unix milliseconds |

The reference supports only `sandbox.note.append`, target `sandbox:notes`, and `{text: <1–2000 characters>}`. It rejects extra action fields, control/bidirectional presentation characters, and unknown operations. No agent-provided “friendly summary” substitutes for effect inputs.

Canonical encoding sorts object keys lexicographically, preserves array order, and uses compact JSON string encoding. The restricted schema has ASCII property names, strings, and safe integer timestamps/epochs. No floats, duplicate JSON members, unknown semantic fields, normalization, or implicit defaults belong in signed data. Duplicate JSON-member rejection must be added to the network parser before a multi-language production release; the reference ultimately signs the parsed fixed-schema object. `protocol-vectors.json` supplies a cross-platform message/digest/signature verification fixture. Promote to a standardized canonical encoding such as RFC 8785 only through an explicitly versioned protocol change and interoperability tests.

`actionHash = base64url(SHA-256(canonical(actionPayload)))`.

The decision message is exact UTF-8 text with a single newline after the domain separator, followed by canonical JSON:

```text
zeke.authorize.decision/1\n
{"actionHash":"...","decision":"approve","epoch":1,"expiresAt":...,"nonce":"...","origin":"...","ownerId":"...","requestId":"..."}
```

The illustrated newline is one byte `0x0A`, not the literal characters backslash and n. `decision` is either `approve` or `deny`. Native keys perform ECDSA P-256 with SHA-256 over the **raw message bytes**, returning ASN.1 DER signatures, base64url without padding. Do not prehash and then hash again. Public keys are X.509 SPKI PEM. Native enrollment proves possession by signing a separate `zeke.authorize.enrollment/1` message, including enrolled origin, owner, device ID, nonce, and enrollment-ticket hash.

In the passkey path, the WebAuthn challenge is `base64url(SHA-256(decisionMessage))`. The server requires user presence and verification, verifies expected RP ID/origin/challenge/signature, and updates authenticator counters transactionally. Challenge verification is one-use and request state/epoch is rechecked after asynchronous cryptographic verification. Approval does not establish a reusable unrestricted login session. A new operation needs a new decision.

State transitions:

```text
pending -> approved | denied | canceled | expired | revoked
approved -> succeeded (atomic sandbox) | claimed (external) | canceled | expired | revoked
claimed -> succeeded | failed | unknown
```

Only the authenticating executor named in the payload may claim. The submitted digest must match. Approved means permission is available; claimed means one executor has consumed it; succeeded requires an execution receipt. A signed approval itself is never evidence of successful execution.

## 5. Custom Zeke phone experience

**Home:** three calm sections: Pending, Activity, Devices. “Scan request” opens the rear camera; “Review on this phone” opens an incoming universal/app link. No scan starts an action or signs automatically. Native app distribution and these three screens are specified here; the package currently implements the phone web review/enrollment screens and native key modules.

**Review screen:** service origin and owner profile at top; verified client/agent identity; executing machine or service; a verb-based action; exact target and parameters; expiry; risk and preconditions. The primary button says “Approve this action”; the secondary says “Deny.” The default is no decision. For a file mutation, show an exact diff and current-content digest. For sending, show account, recipients and complete body. For payment, show payee, currency, integer minor-unit amount, maximum total charge, and recurrence. Those connectors are future work, not enabled by the reference.

A long action must be fully inspectable before signing. Never truncate the destination or give an agent-authored summary visual precedence over the actual effect. Render data as text, escape controls, and prevent web content or a model from supplying executable markup. Use accessible labels, large tap areas, dynamic text, screen-reader order, and explicit state text rather than color alone.

**OS authentication:** after the owner taps Approve, invoke a fresh key operation under the system prompt. Cancellation or failed authentication leaves the request pending; it never maps to success. Separate approve and deny messages prevent changing a signed decision. Where a local dismissal is desired, distinguish it from a signed denial sent to the requesting chat.

**Result:** show Approved and Waiting for executor separately from Completed. A receipt names the request, destination, executor, time and result. Failure states say Expired, Denied, Revoked, Canceled, Failed, or Outcome unknown. “Stop” fences new claims and asks running connectors to cancel; an already-started external effect may still finish.

### iPhone implementation

The native target uses a P-256 signing key created by CryptoKit’s Secure Enclave interface. Store only its opaque key representation in Keychain with `WhenUnlockedThisDeviceOnly`; apply private-key-use access control with user presence, and use a fresh `LAContext` for each operation. Unsupported hardware is a clear refusal for strict phone-only mode. A new phone enrolls a new key rather than importing this one. The included Swift module implements key creation, opaque storage and DER signing; the complete app shell, networking, camera and UI still need implementation and Xcode/device validation. Apple documents the Secure Enclave key boundary in [Protecting keys with the Secure Enclave](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave).

Use the stock iPhone Camera with an HTTPS universal link for the lowest-friction entry. Add Apple Associated Domains and an owner-hosted `apple-app-site-association` file for the signed app; use `/approve` links only for the enrolled service. Inside the app, AVFoundation QR metadata capture is a supported scanning option. Camera access is requested when the user starts scanning; frames stay on device and are not sent to agents. See [Apple universal links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app) and [AVFoundation code detection](https://developer.apple.com/library/archive/technotes/tn2325/_index.html).

For the web/passkey mode or optional native convenience mode, use Apple’s platform passkey APIs. Credential-provider sync is a different assurance class from an app’s device-only Secure Enclave key. A biometric prompt is evidence of platform verification, not a guarantee that the hardware itself displayed the transaction text. See [Apple passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys).

### Android implementation

The native key module targets Android 11/API 30+ for a consistent per-operation biometric configuration. Generate P-256 in Android Keystore; request StrongBox where available. A StrongBox failure must lead to an explicit policy choice: hardware TEE fallback with the correct label, or refuse strict mode. Check hardware residency before enrollment; never silently substitute a software key. Configure per-operation strong biometric authentication and sign through the exact `BiometricPrompt.CryptoObject` returned on success. Enrollment changes invalidate the biometric-only key. The module implements this key path; complete Android app, camera/network/UI and hardware validation remain required. Remote hardware assurance needs validated evidence, not a self-declared device label. See [Android Keystore](https://developer.android.com/privacy-and-security/keystore).

Use the stock camera’s HTTPS link handling when supported, backed by Android App Links and a verified `/.well-known/assetlinks.json` with the actual app signing-certificate fingerprint. Provide an in-app CameraX scanner with a barcode recognizer when stock-camera behavior differs by device. Request camera permission on Scan; keep frames local. Native convenience passkeys use Credential Manager and the correct website/app association. See [Credential Manager](https://developer.android.com/identity/credential-manager) and [association prerequisites](https://developer.android.com/identity/credential-manager/prerequisites).

The browser reference does not access arbitrary Secure Enclave or Keystore private keys directly. The native modules use P-256 because both platforms support that family; the existing Zeke runner’s Ed25519 identity remains a separate machine identity.

## 6. Enrollment, authority and recovery

First phone enrollment is issued by the authenticated owner/operator, through a short-lived, one-use ticket delivered independently from agent requests. Enrollment grants owner approval authority and must be presented as such. Agents cannot create tickets. The reference issues tickets using a local private-state CLI and verifies proof of possession. Production must bind ticket issuance to owner reauthentication and permit a current enrolled key to approve addition of a second phone.

Each enrolled key has an ID, owner binding, status, assurance class, enrollment receipt, and revocation epoch. Platform backups and biometrics follow OS rules. Neither iOS app hardware keys nor the strict Android key path should be promised to survive device migration. Enroll a second trusted device or establish a separate recovery mechanism before relying on one phone.

Production recovery uses owner identity reauthentication plus a second enrolled device or separately protected recovery credential, not an agent chat’s statement. Recovered keys cannot resurrect old approvals: rotate the epoch, revoke old devices, and reissue requests. Adding a device, broadening policy, changing issuer trust, exporting data and resetting recovery are themselves authorization-sensitive operations. Remote device management is not implemented in v0.1.

For important actions, require fresh network confirmation of current key status/epoch at execution. If the broker cannot be reached, refuse new execution. A revoked key does not cancel work that has already crossed an irreversible side-effect boundary; expose that distinction and reconcile outcomes.

## 7. Scope and enforcement in a connected system

The production operation registry defines versioned schemas, authoritative parameter renderers, risk classes, provider scopes, preconditions and connector code for each action. Initial useful adapters are selected-document write acceptance, message send, resource deployment and computer pairing; shell access is a separately reviewed high-risk connector. Every adapter is disabled until its own authorization and provider gates pass.

A file action binds the selected document ID, content digest and exact proposed bytes/diff. A deployment binds environment, revision, artifact digest and configuration change. A machine pairing binds machine public key, approved pack digest and owner trust root. A request cannot create provider scopes the owner does not possess. If a precondition changes after approval, refuse and ask for a new decision. No “approve this task” blanket grants in v1. Future bounded recurring grants must fix target sets, verbs, duration, budget, usage limits and a visible revocation path under a new protocol version.

At a remote executor, verify current owner authority and bind the claimed operation to the actual call. In the reference SDK the broker is trusted and TLS plus executor authentication protects a transactional one-use claim. Stronger deployments also mirror trusted public keys and independently verify the phone evidence at the executor; v0.1 does not implement that distributed verification or a signed bearer capability format.

Do not send a “yes” message through chat and interpret it as authority. Chat text is not a signed decision. Model output, quoted content and tool results cannot enroll identities or disable this gate. If a service retains credentials outside its gate, the protocol cannot prevent that compromised service from using them; production isolation must put secrets and side-effect access behind enforcement.

## 8. Reliability and threats

| Condition | Required behavior |
|---|---|
| QR stolen or photographed | It can view only one short-lived request; key signature still required |
| QR replaced/phishing domain | Native app refuses unregistered origins; web user checks domain and enrolled RP |
| Genuine-origin request shown to the wrong person | Explicit owner/action review; QR does not prove that the user initiated it |
| Parameters, target, client or executor changed | Digest/signature binding fails or a new request is required |
| Replayed or raced approval | Transactional one-use state; one successful claim |
| Key revoked during authentication | Recheck active key and epoch at decision commit and claim |
| Phone offline, approval expired | No execution; reissue and review again |
| Connector crashes after claim | Durable claimed/unknown outcome; reconcile before another attempt |
| Broker or phone UI compromised | Trusted component failure; requires hardening/audit, not solved by QR |
| Prompt injection asks an agent to auto-approve | Agent has no phone key, enrollment ticket or bypass path |

The sandbox note and its success receipt commit in the same transaction, so a lost HTTP response cannot create a second note. External services cannot generally share that transaction. Use a downstream idempotency key equal to the request ID and immutable parameters; never claim universal exactly-once execution. Persist claim before dispatch and preserve uncertain outcomes. Receipts are authenticated broker records in v0.1, not independently signed audit-log exports.

Production needs bounded database retention, edge/request limits, secure owner sessions, owner/client isolation, enrollment abuse defenses, protected proxy configuration, encrypted backups, dependency review and an independent security review. Native hardware attestation and app-integrity policy need platform-specific validation; v0.1 labels native enrollment hardware-unverified and does not accept that as proof for higher-risk actions.

## 9. Zeke / Dots rollout and release gates

The current Zeke runner source separates machine identity, pack trust, pairing and provider protection. This proposal adds a human action-approval layer without treating any one of those as approval for the others. Runtime identity and immutable pack checks remain in effect. Existing deployment decisions belong to the established source/deployment owner; this package is an isolated handoff, not a live runtime or registry change.

Dots integration requires a supported client/tool surface and executor hooks from the relevant platform owner. No internal OpenAI interface is assumed or modified. The proposed OpenAI-owned surface can use a native confirmation sheet and built-in camera/passkey handling; that is an integration target, not a verified existing Dots feature. The open protocol lets Dots and Zeke share semantics while keeping their phone presentation separate.

| Gate | v0.1 status |
|---|---|
| Local broker, QR and HTTP/native/WebAuthn signature tests | PASS; see validation receipt |
| Single-use sandbox side effect and durable state | PASS |
| Custom Swift/Kotlin complete app build | NOT_RUN; only key modules and design supplied |
| Actual iPhone/Android camera, key storage and biometric tests | NOT_RUN |
| Operator-controlled HTTPS phone pilot | NOT_RUN |
| Existing Zeke runtime/hosted integration | NOT_RUN |
| Actual ChatGPT Dots adapter | NOT_RUN; supported integration surface needed |
| Multi-owner isolation, independent executor verification, security audit | NOT_RUN; required before general release for real sensitive actions |

The source package can be placed as an experimental open-source reference. Production claims require closing the relevant gates with receipts. The release license is the standard [Apache-2.0 text](https://www.apache.org/licenses/LICENSE-2.0.txt); the separate branding permission boundary follows its trademark clause. Restrictions requiring permission for code reuse would conflict with the intended [open-source definition](https://opensource.org/osd), so they are not included.
