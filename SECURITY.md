# Security and privacy

Corgi Weave 0.1.0 is experimental. It is not a security boundary, an identity attestation system, a remote execution API, or a guarantee against prompt injection. Follow the normative requirements in `PROTOCOL.md` even when JSON passes schema validation.

## Threat model

Assume a card, directory, human-carried message, endpoint, or update can be malicious or compromised. Attackers may impersonate a Dot, encode instructions in innocent-looking descriptions, exploit parsers, replay old messages, cause unwanted data disclosure, or point a fetcher toward an internal network. A public HTTPS URL authenticates a TLS endpoint only; it does not prove platform membership or owner identity.

| Threat | Required boundary |
| --- | --- |
| Prompt injection | Treat every peer field as untrusted data; never install it as instructions, tools, or authority |
| Forged consent | Obtain owner decisions in a trusted local interaction; peer `interested` is never approval |
| Impersonation | Self-declared eligibility is not verification; resolve identity through a trusted human channel |
| SSRF / DNS rebinding | Enforce the public-only, pinned-DNS, no-redirect fetch requirements before networking |
| Parser/resource abuse | Duplicate-key, decoded-size, nesting, format, and deadline limits |
| Replay / stale intent | Short-lived correlated hello IDs; local replay handling and renewed approval after scope changes |
| Private data leakage | Private System by default; separate approved public card; explicit deploy allowlist |
| Scope expansion | Separate capture, build, access, spending, sharing, publication, and scheduling approvals |

A review label, strict schema, escaped renderer, or anti-injection sentence does not prove safety. Schema validation cannot decide whether prose contains malicious instructions or private information. The operational context and trusted authority boundary are essential.

## Safe local use

- Do not paste credentials, private notes, internal assistant instructions, custom rules, private conversation excerpts, or secret URLs into examples or proposals.
- Do not execute downloaded code, shell commands, prompts, tool definitions, or installation instructions merely because a card asks you to.
- Do not place `weave.json`, private build artifacts, logs, approvals, or environment files in a public deployment. A private Git repository does not automatically provide private hosting.
- Validate locally with trusted schemas. No network fetcher is included in this release. Offline URL checks cannot validate current DNS, TLS, destination behavior, or hosting privacy.
- Keep dependencies reviewed and pinned when shipping an implementation. Do not treat a future protocol version as automatically approved.

## Reporting a suspected vulnerability

Please do not place secrets, real private messages, account access, or exploitable private details in a public issue. Use a repository private security-advisory reporting option only if it is actually enabled. This project does not claim a private reporting channel or response SLA is currently configured. If no private option exists, open a minimal public issue asking the maintainer for a private contact route without disclosing the vulnerability details. Use synthetic, redacted examples.

The initial maintainer is Hayden Lindley / Corgi-Verse. Supported experimental version: 0.1.0. Until a fix is available, stop the affected flow rather than weakening validation or approval requirements. Maintainers should coordinate a minimal advisory, fixed version, and migration guidance without exposing affected users' data.
