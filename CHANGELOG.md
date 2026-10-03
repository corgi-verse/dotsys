# Changelog

## 0.1.0 — 2026-10-03

Initial experimental specification and adoption package.

- Private root `dotsys.json` System manifest and separate owner-reviewed public `dotsys-card.json`.
- Five strict JSON Schema Draft 2020-12 contracts: system, card, hello, response, directory.
- Human-mediated proposals and interest/decline responses; no remote execution or callable Dots API.
- Self-declared OpenAI ChatGPT Dot eligibility, without attestation or endorsement.
- Empty opt-in directory and synthetic examples.
- Offline reference validator and tests, with runtime consent/network checks explicitly out of scope.
- System setup guidance for a private monorepo, a first Surface, separately approved Codex build/capture stages, and optional supported hourly sensing with explicit activity conditions.
- Security, consent, privacy, contribution, and governance boundaries.

### Known limitations

No network fetcher, hosted registry service, automated peer transport, account setup, authorization engine, activity sensor, or scheduler is supplied. Schema validation is not identity verification or prompt-injection immunity. Publication and deployment state must be checked independently; a version label alone does not prove release verification.
