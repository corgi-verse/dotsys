# CorgiPanels acceptance gates

Copyright 2026 Hayden Lindley. SPDX-License-Identifier: Apache-2.0.

Each implementing product records exact source revision, environment, account/resource boundary, timestamp, evidence, and PASS/FAIL/NOT_RUN. Synthetic tests cannot close live gates. No production credentials belong in receipts.

| Gate | Required evidence |
| --- | --- |
| Portable reference | ChatGPT and ZekeChat each export a panel that the actual Dots/Zeke browser can open; revision and semantic tile IDs match; unsupported native widgets explicitly fall back to reference-only |
| Cross-device continuity | A human edit on phone appears in agent computer; reconnect/cursor gap refreshes correctly; stale actions fail |
| Ownership | Forged owner/project/tile/executor/account IDs and unauthorized asset/event reads fail; no cross-owner data leaks |
| Same tile | Every phone/provider/platform subrequest, denial, expiry, progress event, and verification returns to its originating tile after refresh |
| Phone approval | Actual paired phone approves exact immutable effect; decline, expired code, replay, wrong device, revoked device, and lost-phone recovery fail safely; same-phone route needs no scan |
| Provider permission | Live provider sign-in binds intended account/resource; account change, missing scope, cancelled sign-in, and forged callback fail; native platform decisions remain authoritative |
| Grant boundary | Read/create/write/publish/delete/spend tested separately; argument/resource/executor/base-revision changes require fresh review; limits cannot be expanded by panel text |
| Controller fence | Take Over stops old computer input and unconsumed effects; Continue reads current state before new effects |
| Concurrency | Duplicate taps, callbacks, two browser clients, and lease collisions dispatch at most one known effect for one attempt |
| Recovery | Crash before/after claim, network loss after external write, expiry during wait, and revocation during execution preserve evidence; unknown effects reconcile before retry |
| Content safety | Malicious artifact HTML, overlay/sign-in spoof, traversal/symlink/archive bomb, digest mismatch, forged bridge messages, and prompt-injection content cannot reach broker/vault |
| Privacy | Credentials, QR tokens, private keys and provider screens absent from agent DOM/screenshots, exports, analytics and notification links |
| Plain-language mobile | At 320px and desktop, keyboard/touch users can understand who asks for what, target/account, limits, approve/decline, progress and results; no clipping or technical error dumps |
| Open-source release | Original source and dependencies have compatible licenses/notices, synthetic examples, secret-free package, reproducible checks; root DotSys license boundary remains explicit |

First vertical slice: private panel + one tile + typed sandbox note + phone approval + fenced executor + verified receipt. Qualify that before adding a GitHub create-draft-PR route. A view-only dashboard may ship earlier if it makes no execution claim.
