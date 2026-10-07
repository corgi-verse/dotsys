# CorgiPanels

**Owner: Hayden Lindley, owner of Corgi-verse, DotSys, and Zeke.**

CorgiPanels gives a person and their agent one visual reference surface for a project. ChatGPT or ZekeChat authors the panel; Dots or Zeke opens its portable rendering in its computer. Each step keeps the work, permission requests, progress, and result together in the same tile.

## Canon

> now dots can see whatever ChatGPT makes as a reference surface for its projects in its Dots computer using CorgiPanels.

This is the canonical product goal, established October 7, 2026 by Hayden Lindley's request. It is a design commitment, not a claim that a live Dots integration has passed acceptance. “Whatever” means content supplied through a supported export or author adapter. A proprietary host widget with no export is represented by an explicitly read-only capture; this specification does not invent access to a host's private APIs.

The entry phrase is **“make a CorgiPanel for the project.”** Resolve the project and owner access, reuse or create its panel, show the user's work as steps, and publish a reference the agent can actually open. Request only missing permissions for the selected action. Merely creating or viewing a panel supplies no execution authority.

## Implement it

- [Portable protocol and system design](PROTOCOL.md): shared references, browser access, tile-bound authorization, recovery, and trust boundaries.
- [Panel schema](panel.schema.json), [synthetic example](example.corgipanel.json), and [offline validator](validate.py): a strict, secret-free interoperability starting point.
- [Acceptance gates](ACCEPTANCE.md): evidence needed before claiming real phone, provider, or agent integration.
- Product home: `corgi-verse/corgi-verse`, `docs/projects/corgipanels/`; eventual application code belongs in `apps/corgipanels/`. The product design references this contract rather than defining a competing wire protocol.

## Open-source scope

All original material in **this directory** is separately licensed under [Apache License 2.0](LICENSE), with [NOTICE](NOTICE). ChatGPT, Dots, Zeke, and other implementers may use this contract under those terms. This separate license does not relicense the rest of DotSys, its discovery protocol, or any platform's software. The repository's existing root license continues to govern its other materials. No official OpenAI endorsement or native Dots API is asserted.

## Status

Offline checks on October 7, 2026: eight CorgiPanels contract tests PASS; all 63 existing DotSys tests PASS after installing the repository's declared requirements in an isolated environment. Initial checks with incomplete system/bundled dependencies failed to import existing validators; the qualified environment resolved those setup failures. These are structural checks, not phone/provider acceptance.

From the repository root, with its requirements installed:

```sh
python -m unittest discover -s interop/corgipanels -p 'test_*.py' -v
python interop/corgipanels/validate.py interop/corgipanels/example.corgipanel.json
python -m unittest discover -s tests -v
```

Specified interoperability contract, schema, offline validator, and synthetic example. Product interface preview is a local simulation. Hosted panel service, author adapters, phone pairing, provider connections, and execution in Dots/Zeke computers remain **NOT_RUN** until implemented and verified. The current QR-auth prototype is a separate dependency, not an already connected CorgiPanels service.
