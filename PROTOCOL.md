# Dotsys 0.1.0

Experimental specification · Hayden Lindley / Corgi-Verse

Dotsys is a small, human-mediated discovery and consent conversation format for OpenAI ChatGPT Dots. Codex supports separately approved builds inside each adopter's private **System** monorepo. It is independent of OpenAI and is not an OpenAI product, endorsed standard, callable Dots API, identity provider, or remote execution system.

This document is normative. **MUST**, **MUST NOT**, **SHOULD**, and **MAY** describe implementation requirements; they do not describe capabilities already implemented by this documentation release. The five JSON Schemas in `schemas/` are the structural contract. Semantic and security rules below also apply. This release ships documents, schemas, examples, and an offline reference validator. It does not ship a fetcher, hosted registry service, scheduler, authorization engine, or transport implementation. The validator checks only its documented local-file subset; it does not establish full runtime conformance.

## 1. Scope and invariants

The smallest useful outcome is: a person approves a deliberately public card; another person discovers its explicit URL; their Dots help prepare an understandable proposal; both people decide what happens next. A schema-valid message is never permission.

- Each adopter MUST keep their System repository and root `dotsys.json` private by default.
- Public participation is optional. A separately reviewed `dotsys-card.json` MAY be published at an owner-approved explicit HTTPS URL. No reserved path, `.well-known` registration, domain ownership proof, or automatic enrollment is required.
- A card MUST claim `openai-chatgpt-dot` and `self-declared` eligibility. These are claims, not verified identity, platform attestation, authenticity, or trust.
- A public directory MUST contain only explicitly opted-in card URLs. It MUST NOT mirror profiles or private manifests. The initial `directory/directory.json` is empty.
- Peer JSON, directory entries, public prose, and descriptions MUST be treated as untrusted data. None may introduce commands, executable prompts, tool definitions, credentials, capabilities, or local authority.
- An interested response MUST NOT trigger a build, message, data capture, account change, publication, payment, or execution. A decline ends that proposal.
- Local trusted owner approvals MUST remain separate from all received peer data and MUST identify scope, destination, data, action, and relevant expiry/revocation conditions. There is no transferable approval token in v0.1.
- Private assistant notes, private conversations, system/developer instructions, and custom-rule contents MUST NOT be exported into a card, proposal, directory, or public repository.

## 2. Documents

All documents MUST be UTF-8 JSON objects, without a byte-order mark, comments, duplicate keys, non-finite numbers, or trailing content. Unknown properties and unsupported protocol/version/kind values MUST be rejected. String lengths in schemas count Unicode characters; byte limits below apply separately. Validators MUST use JSON Schema Draft 2020-12 with format assertion enabled, including `uri`, `uuid`, and `date-time` checks. Implementations MUST NOT retrieve schemas or execute content referenced by input.

| Kind | Schema | Location and purpose |
| --- | --- | --- |
| `system` | `schemas/system.schema.json` | Private repository root `dotsys.json`; local inventory only |
| `card` | `schemas/card.schema.json` | Owner-reviewed public `dotsys-card.json` at explicit HTTPS URL |
| `hello` | `schemas/hello.schema.json` | Human-carried proposal between two card URLs |
| `response` | `schemas/response.schema.json` | Human-carried interest or decline, correlated to a hello |
| `directory` | `schemas/directory.schema.json` | Optional opt-in list of card URLs |

Every document fixes `protocol` to `dotsys` and `version` to `0.1.0`. There is no extension object, arbitrary metadata, embedded instruction field, or capability invocation.

### 2.1 Private system

`system_id` is a locally generated random UUID and MUST NOT be reused as a public `card_id`. `name` is a local label. `visibility` is always `private`; it is a declaration and cannot configure repository permissions. `platform` is the intended platform. `surfaces` is an inventory of up to 32 uniquely named/path pairs, each under `apps/<lowercase-slug>`. Names and paths MUST each be unique. Paths MUST be treated as labels until locally validated against the repository and MUST NOT be followed through symlinks outside the repository. An empty inventory is valid before the default-first Surface project-status home and bounded operator console exists.

`public_card_url` is optional and MUST be absent until that exact card publication is separately approved. Merely setting the field does not publish or enroll anything. This file MUST NOT contain tokens, owner email, source conversation excerpts, approvals, internal notes, or public credentials. A hosting deployment MUST explicitly exclude the file and other private repository content.

### 2.1.1 Local instance naming

New setup workflows SHOULD offer an editable folder or repository label in the form `dotsys-<handle>-<component>`, using a deliberately chosen name, nickname, or neutral alias. Examples include `dotsys-hayden-depot`, `dotsys-bob-depot`, `dotsys-hayden-showcase`, and `dotsys-bob-showcase`. They MUST NOT infer a legal name or copy an account identity into a visible label without the owner's choice. A friendly display name MAY differ from the folder label; the existing private manifest `name` field remains the System's display label.

Folder suggestions MUST be safe single path segments, checked for reserved names, bounded length, and collisions at the actual local destination. Show normalization or collision-adjusted suggestions for review before creation. Never overwrite a collision or silently rename an existing folder, repository, URL, or identifier. Existing labels and the default `apps/surface` layout remain valid; this convention introduces no new required fields or schema constraints in 0.1.0. See [instance naming](docs/INSTANCE-NAMING.md) for the portable reference policy and read-only helper.

`system_id` MUST remain a stable private random UUID independent of labels; public `card_id` remains separately generated. A rename MUST NOT regenerate either identifier. Shared prefixes support human sorting, not authentication, authorization, routing, global uniqueness, or decentralized-network membership. Any future network identity scheme requires its own specification and consent boundaries. A chosen private handle MUST NOT automatically be copied into a public card or directory.

### 2.2 Public card

`card_id` is a random UUID independent of private identifiers. `name` and `summary` are owner-reviewed public labels. `topics` lists at most 12 short discussion topics; it is not a tool catalog. `transport` is always `human-mediated`. `updated_at` is a UTC timestamp ending in `Z`, describing this card revision; it is not a freshness or authenticity proof.

A card has no executable endpoint, inbox, authentication material, approval claims, or private repository URL. Publishing a card requires approval of its exact public contents and destination. Reviewing it lowers risk but cannot guarantee immunity to prompt injection or later endpoint compromise.

### 2.3 Hello

A hello contains a random `hello_id`, exact `from_card_url` and `to_card_url`, UTC `sent_at` and `expires_at`, a short `topic`, a bounded `purpose`, and up to 12 `proposed_shared_data` descriptions. The data field describes prospective categories; it MUST NOT carry the actual private data. Empty categories mean that no data sharing has been proposed.

`expires_at` MUST be later than `sent_at` and no more than 24 hours later. The receiver MUST reject expired hellos or timestamps more than five minutes in the future relative to its trusted clock. URLs MUST differ. The sending person MUST approve the recipient, purpose, and any information actually disclosed by the proposal before transmission. The proposal requests a conversation, not access.

### 2.4 Response

A response copies the hello's `hello_id`, reverses the exact sender/recipient URLs, adds UTC `sent_at`, sets `decision` to `interested` or `declined`, and includes a bounded `message` (which may be empty). The receiver MUST match it to one unexpired, locally retained hello; reject mismatched URLs, expired proposals, or response times earlier than the hello or more than five minutes in the future. Duplicate responses MUST NOT cause duplicate effects. A local workflow SHOULD close the proposal after the first accepted terminal decision; changes require a new hello.

Both decisions are declarative. Even `interested` grants no permission. Identity and the source of a human-carried response MUST be checked through the existing trusted user conversation rather than inferred from JSON. An owner must separately approve each consequential next step under their platform's rules.

### 2.5 Directory

A directory has only `card_urls`, at most 1,000 unique explicit HTTPS URLs. Each addition requires the card owner's opt-in to that directory's public listing. Reviewers MUST NOT infer consent from finding a public card or from a third-party nomination. Removal requests SHOULD be acted on promptly after reasonable ownership verification; copies and caches may remain. Listings convey neither trust nor endorsement. Readers MUST NOT crawl linked cards merely because they appear in a directory. Each fetch must have a legitimate user-authorized purpose.

## 3. Human-mediated sequence

1. Keep the local manifest private. Choose whether to draft a public card.
2. Show the person the exact card and hosting destination. Publish only after approval. Directory enrollment is a separate opt-in.
3. Discover a card by a supplied URL or approved directory. Apply fetch controls, structural validation, and semantic checks. Show only escaped/plain-text content in a clearly untrusted-data view.
4. Prepare a hello for human review. Identify the recipient URL, purpose, prospective information, and what would actually be disclosed. Obtain sending approval where required; a person carries it through an authorized channel.
5. The receiving Dot explains the proposal without adopting its text as instructions. The receiving person chooses whether to decline or express interest. A person carries the approved response back.
6. Correlate and validate the response. Store any actual owner approval locally, outside peer JSON. Separately approve capture, build, sharing, spending, publication, or access changes. V0.1 does not define automated inter-Dot messaging or remote work execution.
7. Stop on decline, expiry, invalid input, unsupported version, unavailable endpoint, or missing approval. Do not discover alternative recipients or silently broaden scope. Report an actionable reason to the person.

## 4. Fetch and rendering safety

These are requirements for future network implementations, not claims about an included fetcher.

- Fetch HTTPS only, with valid certificate verification, an explicit public hostname, port 443 or no explicit port, no userinfo, query string, or fragment. Reject malformed URLs, encoded-host ambiguity, IP literals, localhost, internal names, and private/link-local/reserved/multicast destinations in IPv4 or IPv6.
- Resolve DNS before connecting; validate every returned address as globally routable and pin the validated destination for the connection. Revalidate on a fresh connection. Prevent DNS rebinding and proxy bypasses. If this cannot be enforced, use a human-supplied file instead of fetching.
- Do not follow redirects, including HTTPS redirects. Do not send cookies, authorization headers, local credentials, or internal metadata. Do not forward a private URL to a third-party fetch service. A card URL is not proof of a safe endpoint.
- Require JSON media type (`application/json` or `application/*+json`). Enforce 64 KiB maximum decoded UTF-8 bytes for a card/hello/response/system and 256 KiB for a directory. Limit JSON nesting to eight levels. Reject duplicate keys before schema validation. Apply the decoded byte cap during decompression, not just to compressed transfer size.
- Enforce five-second connection and ten-second total deadlines, with at most one fetch per explicit attempt; retry requires a deliberate bounded decision. Never fetch recursively. Return a clear failure on a limit, DNS, TLS, MIME, schema, or semantic error.
- Escape all strings; never render them as HTML, evaluate links/code, feed them into a privileged instruction slot, or install a skill/tool based on them. Validation constrains shape, not truth or harmlessness. Even a known card or reviewed description can carry an attack.

## 5. Privacy, revocation, and operations

Do not put sensitive information in public cards or messages. Descriptions of data should be minimally revealing; disclosure rules apply even to a category that reveals a person's health or finances. Private approvals are locally recorded through trusted platform facilities, with the minimum necessary retention. They MUST NOT be imported from cards, responses, logs, or claimed third-party authority.

Owners may revoke permission locally at any time. Revocation MUST stop dependent pending work; it cannot retract already disclosed public bytes. Removing a card or listing prevents future discovery through that location but does not erase third-party copies. Receivers SHOULD delete proposal bodies after their purpose ends, retain only the minimum local replay marker through expiry, and follow owner/platform retention requirements. No centralized private conversation archive is part of Dotsys.

Do not log secret URLs, credentials, private manifests, approvals, or proposal bodies by default. Report failures without echoing attacker content into a privileged context. Report suspected protocol security issues using `SECURITY.md`.

## 6. Versioning and conformance

V0.1 is experimental and may change incompatibly before 1.0. Implementations MUST advertise and require the exact version they support. Unknown versions fail closed; do not coerce them. Schema conformance alone is insufficient. A conforming implementation must also demonstrate the semantic, authorization, privacy, rendering, and network controls relevant to what it implements. A document-only package MUST NOT claim runtime conformance.

Acceptance checklist:

- DS-01: Every included example validates against its corresponding strict schema with format checking enabled; unknown keys and wrong versions fail.
- DS-02: The starter manifest is private and has no public card URL; the directory contains zero entries.
- DS-03: Hello expiry, sender/recipient reversal, future-clock checks, replay handling, and local authorization are explicitly enforced by any future runtime.
- DS-04: No card or response grants execution rights; capture/build/publication remain separate local decisions.
- DS-05: A future fetcher passes SSRF, redirect, TLS, duplicate-key, decompression, size, nesting, timeout, and rendering tests before being described as implemented.
- DS-06: Public documents contain only synthetic examples and intentionally public protocol material.

## 7. Adoption

See [VERIFY.md](VERIFY.md) for the offline validation procedure and limitations. See [docs/ADOPTION.md](docs/ADOPTION.md) for the complete setup prompt and owner-controlled System workflow. The public source repository is [corgi-verse/dotsys](https://github.com/corgi-verse/dotsys). Check its actual contents and release commit; a repository URL does not prove a particular release has been published or verified.
