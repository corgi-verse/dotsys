# CorgiPanels portable contract 0.1

Copyright 2026 Hayden Lindley. SPDX-License-Identifier: Apache-2.0.

This is a proposed interoperability protocol, separately versioned from DotSys discovery 0.1. MUST, SHOULD, and MAY express requirements for a conforming implementation. A valid panel is project data, never an instruction hierarchy or permission grant.

## 1. One project surface

A panel has a stable ID, owner, project, source revision, ordered tiles, and asset references. A tile has a stable ID, plain-language title, current state, source references, proposed actions, and dependencies. IDs remain stable when layout or wording changes. A renderer MUST present the same authoritative panel revision on desktop, mobile, and the agent's computer; responsive layouts need not have identical pixels.

The panel service maintains revisions and a monotonically increasing event sequence scoped to that panel. Clients reconnect with their last sequence; an expired cursor requires a fresh snapshot. A snapshot reports its revision and event sequence together. Private authenticated transport binds the viewer to the owner and project; neither an ID nor a URL proves access. Owner/account access is verified server-side for every read, write, subscription, and asset request.

Exports are private by default. A portable `.corgipanel.json` manifest carries no credentials, grant signatures, QR review links, or sign-in contents. Asset paths are relative to the bundle root, with SHA-256 digests. Renderers reject traversal, absolute paths, symlinks escaping the root, mismatched digests, unsupported media, decompression bombs, and excessive file/count/size limits. Initial limits: manifest 1 MiB, 100 tiles, 100 assets, 10 MiB per asset, 50 MiB total uncompressed. Exporters explicitly confirm any public publication and remove private project material.

The included schema rejects undeclared fields. The validator also checks uniqueness, dependency references and cycles, and reference-only modes. It cannot establish identity, authorization, asset safety, or runtime correctness.

## 2. How Dots and Zeke see the panel

ChatGPT's author adapter uses supported artifact/file tools to export a manifest and assets. ZekeChat's adapter produces the same contract. Either may supply a private hosted reference or an export transferred through an authorized file route. A browser renderer opens that reference inside Dots' computer or Zeke's Computer. An accessible semantic mirror exposes tile IDs, titles, visible state, proposed actions, and safe result links alongside the visual rendering.

The agent reads the page with its available computer/browser tools. It may inspect a screenshot, but action targeting MUST resolve a stable tile/action ID from the current snapshot. Before an effect, re-read the action revision and current computer-control epoch. A screenshot is evidence of appearance at a revision, not proof of permission or current execution state. Human edits invalidate stale action proposals when their material effect changes.

Capability negotiation reports supported manifest versions, visual modes, semantic reading, authoring, subscriptions, and approved action routes. Unsupported modes produce a clear “Reference only” or “Connection needed” state. If a native ChatGPT artifact has no export route, capture a permitted image and description as a read-only reference, including origin and capture time. Do not scrape private widget internals or claim access to a native Dots integration without evidence. Inline conversation previews cannot silently acquire network access or become an execution bridge.

One owner's primary Dot and the existing shared-desktop control model remain intact. Panel viewing does not acquire keyboard/mouse control. Take Over fences previous computer input and unconsumed effect tickets; Continue requires a fresh state read and new control epoch. Zeke uses its own explicitly configured controller and permissions, without inheriting Dots' authority.

## 3. Components and responsibility

| Component | Responsibility |
| --- | --- |
| Author adapters | Generate versioned manifest/assets using supported ChatGPT or ZekeChat tools |
| Panel service | Private panel storage, revision comparison, event log, access checks, safe receipts |
| Browser renderer | Shared visual and semantic surface, responsive tiles, per-tile request inbox |
| Trusted authorization broker | Authenticate owner; render actual requested effect; collect bounded signed approval; check expiry/revocation |
| Provider/connector vault | Provider sign-in, account/resource permissions, credential custody |
| Executor | Validate all authority and preconditions at dispatch; journal effects and return evidence |

Surface indexes projects and panel links. CorgiHub supplies repository identity and approved connector routes. Batch owns durable job execution when used. CorgiPanels references those records; it does not create a competing project/task database. DotSys supplies system identity, scoped authority, audit, and control-fencing requirements. Credentials remain in the trusted broker/provider vault or native platform, outside panel assets and agent-visible DOM.

## 4. A tile's request inbox

Selecting a step expands that same tile. Every request generated by its attempt returns to that tile: phone approval, provider sign-in, platform approval, additional bounded access, expiry, denial, progress, and verification. Native provider/platform security screens may open separately; a correlated receipt returns the user to the originating tile. An external platform that cannot be automated is shown as “Finish approval in [platform]”; no synthetic panel receipt substitutes for that platform's actual decision.

Trusted runtime records bind:

`ownerId, systemId, projectId, panelId, tileId, actionId, actionRevision, actionHash, attemptId, requestId, agentId, executorId, providerAccount, resource, operation, argumentDigest, expectedBaseRevision, controlEpoch, expiresAt, grantLimits`.

These records are private server-side data, not public manifest fields. The broker resolves identities/accounts from trusted registries and MUST reject cross-owner, cross-project, cross-tile, or mismatched executor requests. One attempt may have several child requests; all retain the originating tile, while each child has its own purpose, decision, expiry, and evidence. Callback state is unguessable, short-lived, single-use, and checked against the originating account and immutable request. Provider account changes invalidate incompatible approvals.

An action hash binds a canonical typed effect, its complete tile/attempt context, resource/account, requested limits, relevant base revision, and control epoch. Implementations MUST define canonical encoding (for example RFC 8785 JSON), reject noncanonical/ambiguous values, version the signing domain, and verify signatures against the owner's registered device. The schema's operation/resource preview is only a proposal; the trusted broker reconstructs the executable action from an allowlisted connector, checks it, and stores its immutable bytes before review. It MUST NOT sign model-authored summaries in place of actual action bytes.

## 5. QR and same-phone approval

The tile offers **Approve on this phone** and **Scan with another phone**. Same-phone approval opens the trusted authorization application's verified link; the user never needs to scan a code displayed on the same screen. A QR code carries only a short-lived review locator. Scanning locates a request; it does not approve, authenticate, or start an effect.

The trusted application authenticates the owner using the configured phone key/passkey mechanism and displays the requested effect, target, account, agent, access duration, and expected outcome. The owner chooses approve or decline. Only the broker's verified, action-bound decision can satisfy the owner-approval gate. Approval links/review tokens remain private; the agent-visible rendering redacts codes and tokens while retaining the tile's plain-language state. Phone loss supports device revocation and a separately verified recovery route; recovery never grants queued requests implicitly.

All approval UI uses plain language. Examples: “Let Zeke create one draft pull request in your project”; “Sign in to GitHub so Dots can read this repository”; “This permission ended. Review the request again”; “The file changed. Review the updated action.” No token, scope acronym, digest, or implementation error is a user instruction. Technical receipts may be exported separately for diagnosis. Trusted templates derive descriptions from checked typed operations; untrusted panel text cannot overlay, rename, or conceal a security decision.

Authorization is the conjunction of **owner authority + provider account permission + native platform approval when required + executor policy + fresh preconditions/control fence**. Satisfying one gate does not satisfy another. A QR approval cannot bypass OpenAI/Dots tool permissions, GitHub authorization, operating-system security, or provider confirmation. Zeke may use broader permissions only through explicit owner policy with bounded resources, action classes, expiry, and effect limits; the tile says when an existing grant covers the action. Avoid approval fatigue by reusing valid scoped grants, not by creating ambient authority.

Default grant: one exact action, one attempt, short expiry, least access. Optional grants specify a named project/resource, enumerated action classes, duration, maximum effects, data exposure and spending ceiling. Writing, creating, publishing, deleting, installing, and spending are distinct classes. Broadening any material parameter requires a new decision. Cosmetic layout/text changes alone do not change an already immutable effect; changes to target, account, arguments, exposure, limits, base revision, or executor do.

## 6. Execution and recovery

Tile work states: `ready`, `waiting`, `running`, `verifying`, `complete`, `failed`, `unknown`, `cancelled`, `reference_only`. Authorization requests have independent `pending`, `approved`, `denied`, `expired`, `revoked` states. “Complete” requires result evidence and the action's specified verification, not merely approval, dispatch, or a green provider callback.

On selection, create/reuse an attempt and prepare an immutable action. Collect missing gates; do not dispatch while any are pending. At execution, validate ownership, signatures, account, resource, limits, expiry, revocation, controller epoch, expected repository/file revision, and remaining effect budget. Claim the attempt with a compare-and-swap lease and an idempotency key bound to that attempt. Repeated taps or approval callbacks return its existing state. Persist execution intent and external operation identifiers before reporting success.

Exactly-once effects cannot be promised across arbitrary providers. If a provider response is lost after a possible effect, record `unknown`, reconcile by external operation ID/idempotency evidence, and require a decision if uncertainty remains. Never blindly retry a possibly completed create/write. Revocation before dispatch blocks work; revocation during work stops cancellable future effects and reports any already completed effect. It cannot undo a completed external write. Lease renewal never extends owner approval. A crash after claim requires journal reconciliation before redispatch.

Owner selection can authorize preparation or a harmless read already covered by existing permission; it does not silently approve a later write. Offline exports are reference-only. Reconnected clients refresh authority and state before dispatch. Secret screens, provider tokens, QR review tokens, private keys, and recovery codes MUST NOT enter agent screenshots, manifest exports, analytics, notification URLs, or logs. Safe receipts name what changed, where, when, under which approved action, and its verified result.

## 7. Untrusted content isolation

Generated HTML and imported assets render in a sandbox on an isolated origin without broker cookies, vault access, or privileged script APIs. CSP restricts scripts, navigation, and network to explicitly approved content routes. Author-defined controls may propose intents, not execute them. A bridge, if used, validates exact sender origin/window, session nonce, schema, size, allowed intent, current revision, and owner session. Wildcard privileged `postMessage`, arbitrary URLs, and arbitrary tool names are prohibited. The trusted broker UI is outside the untrusted artifact frame and cannot be covered by it.

Rich HTML is optional and disabled in the initial implementation slice; Markdown, images, and accessible native tiles are enough. Imported content and prompt text remain data even if they say “approved” or imitate a platform dialog. No panel link, discovery card, image, model output, or signed package creates a grant.

## 8. QR-auth implementation dependency

The separate Zeke Authorize effort observed October 7, 2026 provides a local prototype with `POST /api/requests`, request polling, phone decision signatures, executor claim, and completion reporting. Its current connector accepts only `sandbox.note.append`; live GitHub and Dots routes are unqualified. Its request input is strict. CorgiPanels MUST NOT append tile fields to that input and assume they were signed.

Initial adapter keeps an owner-scoped private correlation registry mapping the broker's `requestId` to the immutable panel/tile/attempt/action record. Before any real connector is enabled, extend and version the broker's signed payload to include the full binding in section 4, or sign an equivalent complete binding through a qualified broker adapter. A mismatch fails closed. Add new connector routes only after their real acceptance gates pass. This document does not modify the separate prototype or claim its deployment.

## 9. Sources and change control

This original design uses established mechanisms as implementation options: [WebAuthn](https://www.w3.org/TR/webauthn-3/), [OAuth device authorization](https://www.rfc-editor.org/rfc/rfc8628), [OAuth security guidance](https://www.rfc-editor.org/rfc/rfc9700), and [JSON canonicalization](https://www.rfc-editor.org/rfc/rfc8785). These standards do not implement CorgiPanels or provide a universal provider-approval bypass.

Version incompatible manifest, signing-domain, or binding changes. Retain old evidence and explicitly migrate active requests; never reinterpret an old approval as broader authority. Product naming, ownership, and the canonical goal live in README; the normative contract lives here. Acceptance evidence lives with the implementing product and exact tested revision.
