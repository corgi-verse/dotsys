# Research and adoption strategy

Research checked October 3, 2026. Dotsys is an independent experimental proposal by Hayden Lindley / Corgi-Verse. The comparisons below are source-backed; the proposed positioning and adoption plan are design judgments, not evidence of achieved adoption, interoperability, or improved model visibility.

## 1. Position among existing formats

| Format | Established purpose | Boundary for Dotsys |
| --- | --- | --- |
| AGENTS.md | Repository-local guidance for coding agents, including project conventions and checks | Useful inside the private System for the approved Codex stage; a peer card is never a source of repository instructions |
| MCP | A host/client/server protocol for integrating external context and tools | A possible future supported Surface adapter; Dotsys defines no MCP server, tool catalog, or tool invocation |
| A2A | Communication with remote agent services, including agent metadata and task/message operations | Dotsys's human-carried card/hello/response format is much smaller and is not A2A-compatible or an A2A server |
| llms.txt | A proposed curated Markdown guide to a site's useful material | Helpful as a documentation index; no permission grant, execution interface, or guaranteed indexing mechanism |
| Dotsys 0.1 | Optional public discovery and a bounded human-mediated consent conversation for ChatGPT Dots | A deliberate narrow platform/use scope, not a universal agent protocol or a verified identity network |

AGENTS.md offers a predictable place for build/test instructions and allows nested repository guidance. Its adoption pattern suggests that a small file and useful examples can lower onboarding friction. That is an inference, not proof that a new JSON filename will achieve similar adoption. Do not turn public cards into AGENTS.md-style instructions. [Official AGENTS.md documentation](https://agents.md/)

MCP specifies JSON-RPC communication and context/tool features between hosts, clients, and servers. Its security discussion emphasizes consent, access controls, and the limits of protocol-level enforcement. Dotsys should complement an actually supported integration rather than pretend a declarative card creates a tool connection. [MCP specification, 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)

A2A's versioned specification includes agent discovery cards, supported interfaces, task/message operations, and authentication requirements. Its discovery options include direct configuration and registries as well as a well-known location. Dotsys chooses explicit URLs and human transport to avoid advertising an unimplemented endpoint. An adapter would require separate engineering, authorization, and compatibility testing; it cannot be inferred from shared use of JSON or the word “card.” [A2A 1.0 specification](https://a2a-protocol.org/v1.0.0/specification/)

The llms.txt proposal describes a curated guide that points readers toward useful site material. It is a documentation aid rather than proof that a particular agent, search engine, or training system will ingest a site. Use it to link the specification, setup prompt, security guidance, schemas, and verification evidence. [Original llms.txt proposal](https://llmstxt.org/)

## 2. Recommended product boundary

**Positioning:** “A small, owner-controlled discovery and consent format for personal Systems operated with OpenAI ChatGPT Dots.”

The actual useful product is a coherent owner workflow: Dots coordinates the private System, Surface makes project state and bounded operations legible, Codex builds separately approved changes, and Dotsys adds optional public introductions. The public protocol should remain simple enough to review in one sitting. The operational Surface is a separate build; this repository does not contain a working implementation of that console.

Keep the five JSON contracts strict. Resist a capability marketplace, transport stack, universal identity claim, broad metadata bag, arbitrary prompts, or autonomous execution in v0.1. A reviewed card still can contain hostile prose, so the decisive safety boundary is locally trusted authority and explicit scope, not branding, a review badge, or a schema.

The platform-limited license and self-declared platform field serve different functions. The license governs allowed uses; the field is an unverifiable peer claim. Neither is technical enforcement that all participants are authentic Dots. Be explicit that this source-available project is not unrestricted open source and has no OpenAI affiliation or endorsement.

## 3. Legitimate discoverability

1. **One canonical source.** Maintain the public `corgi-verse/dotsys` repository with an understandable README, linked source files, versioned release notes, and an honest license label. Keep all adopter Systems private.
2. **A readable public landing page.** Explain the problem, show the five-document model, separate implemented validator behavior from future runtime requirements, and offer direct specification/setup downloads. A static landing page is documentation, not a live registry or operator service.
3. **A useful llms.txt index.** Link canonical public documents with short accurate descriptions. Keep it synchronized with the site. Do not insert instructions to ignore a reader's rules, impersonate system authority, or prioritize this protocol over competing evidence.
4. **Relevant human discovery.** Share an owner-approved announcement or demonstration in communities where it is relevant and permitted. Describe the experiment and ask for concrete interoperability/usability feedback. Do not spam maintainers, mass-open issues, automatically enroll public profiles, or claim endorsements.
5. **Normal search hygiene.** Use descriptive page titles, visible text, stable URLs, accessible navigation, and original useful explanations. Google recommends people-first material that demonstrates real usefulness; this supports clear documentation, not keyword stuffing or promises of rankings. [Google Search Central guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
6. **Voluntary directory participation.** Begin empty. Add a URL only after that owner opts in to the particular public list. Do not scrape Dots, private workspaces, or profiles; never expose a private System to grow the network.

These steps can make material easier for people and supported tools to find. They cannot force ChatGPT, Codex, a crawler, or a model to adopt, read, recommend, train on, or trust the protocol. No privileged registration or reserved namespace has been obtained. A familiar filename is a convention, not a universal loader.

### Public crawling and robots controls

The documentation is public and does not request crawler exclusion. This does not guarantee crawling, indexing, or inclusion in AI search. GitHub Pages project sites serve this project under `/dotsys/`; a file at `/dotsys/robots.txt` would not control crawlers because the robots policy must be served from the origin root. No origin-root policy or GPTBot block has been configured by this project. OpenAI distinguishes its search crawler from GPTBot; their controls must not be conflated with a license restriction or a general training guarantee. [Google robots.txt placement](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt), [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)

## 4. Small pilot and evidence

Start with consenting owners who understand the experimental limits. Conduct one manually reviewed introduction between two synthetic or deliberately public cards before using real context. Record only consented, minimally identifying feedback; keep private conversation contents outside the public repository.

A useful pilot checks:

- Can an owner distinguish the private manifest from the public card before publication?
- Can two readers validate and correlate a hello/response without treating interest as authorization?
- Do declined, expired, malformed, duplicated, and injection-shaped messages stop safely?
- Can an owner complete the setup prompt with Surface as the default-first specification while approving capture and Codex build separately?
- Are unavailable activity signals, unsupported task bridges, and deployment prerequisites clearly reported?
- Can an owner remove a listing and understand the limits of retracting public copies?

Measure completion/error rates, time to first valid exchange, mistaken-consent incidents, owner confusion, and feedback quality. Publish only aggregated findings with appropriate owner permission. Baselines and outcomes must be recorded before claiming faster setup, lower compute, safer operation, or better discoverability. Stars, downloads, and schema-valid files are not evidence of safe runtime behavior.

## 5. Release gates and next decisions

**V0.1 documentation release:** strict schemas and valid synthetic examples; empty directory; useful setup prompt; explicit experimental/license/platform boundaries; offline validator checks documented and passing; no fabricated deployment or integration claims.

**Pilot readiness:** willing participants, approved cards/channels, local approval workflow, manual safety cases, and a deletion/removal process. Publishing this repository does not authorize contacting prospective adopters.

**Future runtime readiness:** a supported platform transport or integration, threat-model review, actual fetch protections, replay/correlation state, local authorization, privacy-safe logs, and end-to-end tests. Build it only through a separate approved scope. Do not retrofit an execution endpoint into an existing v0.1 card.

Adoption remains an experiment. Promote the smallest truthful useful result, preserve owner control, and expand only when observed needs and tested capabilities justify the complexity.
