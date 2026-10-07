# Zeke Authorize by Corgi-verse

**An open-source phone approval system for agent actions.** Any integrated Dots or Zeke chat can initiate a request. The owner reviews it on their phone, signs a decision with a phone-held key, and a connected executor performs only the approved operation.

Version 0.1.0 is a functioning **single-owner reference implementation**, with a deliberately small execution surface: adding an exact note to its own SQLite sandbox. It includes a working passkey phone web client, QR generation, P-256 native signature endpoints, persistent authorization state, a Node adapter, and custom iOS/Android key-module source. It is not yet a deployed Zeke integration or an installable native phone app.

## Start locally

Requires Node 24 or later. From this package directory:

```sh
npm ci --ignore-scripts
npm test
node tools/init.mjs /absolute/private/zeke-auth-state http://localhost:8787
node src/server.mjs /absolute/private/zeke-auth-state/config.json
```

Open `http://localhost:8787`. Choose a state directory outside this Git checkout. The private state directory contains `config.json`, `broker.sqlite`, and a one-use enrollment ticket in `enrollment.json`. These files are credentials/state and must stay outside the release or Git repository. The initializer refuses to overwrite an existing configuration.

For the desktop demo, put one configured **client** token in the chat-client-key field. Request a note. Review and sign it on an enrolled phone, or on the local computer for a development check. Put the separately configured **executor** token in the executor field and run the approved note. A client token cannot sign approvals or execute. The phone sees neither token. This manual token form is a development console; a real chat adapter supplies its own authenticated identity without asking users to paste service keys.

## Use an actual phone

`localhost` on a phone points to that phone. A LAN IP over plain HTTP will not work as a secure WebAuthn origin and is refused by this package. Use an operator-controlled HTTPS domain with a publicly trusted certificate, reachable by both phone and clients. Configure that exact origin at initialization:

```sh
node tools/init.mjs /absolute/private/zeke-auth-state https://YOUR-AUTH-DOMAIN
node src/server.mjs /absolute/private/zeke-auth-state/config.json
```

Put a TLS reverse proxy in front of the loopback service on port 8787. Preserve the configured `Host` exactly; do not forward arbitrary public hosts. Maintain origin and certificate validation, block direct access to the backend, and add edge rate limits. The package does not install a proxy, register a domain, or deploy itself.

1. On the intended phone, open `https://YOUR-AUTH-DOMAIN/enroll` directly from the trusted setup instructions.
2. Enter the owner-issued, one-use enrollment ticket and create a phone passkey with the system credential provider.
3. From a connected client, request an action. Scan its QR code with the phone’s stock camera, or tap its review link when chatting on the same phone.
4. Check the agent, client, executing system, destination, and exact content. Choose Approve or Deny, then confirm with the system passkey prompt.
5. The initiating chat receives status. Its authenticated executor must consume the approval before doing the exact action.

The passkey path uses phone-managed Apple/Android credentials. It does not promise that a synced passkey exists exclusively on that physical phone. Strict device-only keys are covered by the custom native design in `docs/DESIGN.md` and the native key modules.

## Additional devices and recovery

The first enrollment ticket expires after 15 minutes. For a fresh ticket:

```sh
node tools/ticket.mjs /absolute/private/zeke-auth-state
```

To revoke an enrolled phone using its saved device ID:

```sh
node tools/revoke.mjs /absolute/private/zeke-auth-state DEVICE_ID
```

Revocation increases the owner’s authority epoch and invalidates all pending and approved requests. Already claimed external work needs reconciliation; a server cannot undo an external effect that already began. Recovery here requires access to the private operator state; remote self-service recovery and phone-based device management are specified future work.

## Integration and release

- `docs/DESIGN.md`: architecture, protocol, phone design, threat model, rollout gates, and official sources.
- `docs/INTEGRATION.md`: request/decision/execute APIs and the Zeke/Dots adapter boundary.
- `docs/BASSET-HANDOFF.md`: placement packet and accurate release claims.
- `docs/VALIDATION.md`: checks, limitations, and required hardware qualification.
- `native/ios/PhoneKey.swift` and `native/android/PhoneKey.kt`: custom device-key implementation modules; compilation and phone tests remain NOT_RUN.
- `src/sdk.mjs`: a broker-mediated executor adapter for Node applications.

The reference supports one owner, one broker, and authenticated registered clients/executors. Native enrollment verifies possession of a P-256 key but does not prove hardware backing; its assurance is explicitly `hardware-unverified`. Arbitrary shell execution, account login, payments, and live integrations are not enabled.

Code and documentation are Apache-2.0. Official Corgi-verse/Zeke branding and claims of endorsed Dots integration require the owner’s permission under `BRANDING.md`. There is no case-by-case permission restriction on Apache-licensed code reuse. No OpenAI endorsement or integration access is represented.

## Repository placement

This complete reference is isolated in `interop/zeke-authorize/` under its own Apache-2.0 license. It does not change DotSys discovery 0.1, the other interoperability contracts, or the root source-available license. See [provenance](PROVENANCE.md) for the original release and validation boundary.
