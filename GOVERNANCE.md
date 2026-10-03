# Governance

**Project:** Dotsys  
**Creator and initial maintainer:** Hayden Lindley / Corgi-Verse  
**Status:** Experimental 0.1.0  
**Platform boundary:** OpenAI ChatGPT Dots; separately approved Codex-supported builds  
**Relationship to OpenAI:** Independent; no affiliation or endorsement claimed

## Decision-making

The initial maintainer reviews changes and decides releases. Contributors may propose issues and pull requests; no committee, formal voting body, certification authority, or guaranteed maintenance period is implied. Decisions should explain the user benefit, compatibility impact, threat model, and test evidence. Security and owner authority take precedence over convenience.

The protocol's public repository is distinct from each adopter's private System monorepo. Maintainers have no implied right to read, operate, publish, or enroll those Systems. Each owner controls their own card, directory participation, data, consent, and deployments.

## Changes and releases

The specification, schemas, examples, and validation expectations form one versioned contract. V0.1 is experimental; incompatible changes may occur before 1.0 and must be clearly documented. Readers reject unknown versions instead of guessing. A release should identify its exact commit, verification evidence, compatibility changes, and known limitations in `CHANGELOG.md`.

Changes to platform scope, licensing, transport automation, identity assertions, or consent semantics require an explicit proposal and security review. Future work is not a promise. A schema change cannot silently confer a new capability or expand existing owner permissions.

## Directory stewardship

The directory is an opt-in pointer list, initially empty. Listing is not approval, verification, certification, or endorsement. Review additions for actual owner opt-in and appropriate public content. Do not scrape profiles or infer consent from public availability. Owners may request removal; verify control proportionately without asking for private credentials. Explain that removal cannot retract existing copies.

## Licensing and name

`LICENSE` is authoritative for usage rights. Do not describe this project as unrestricted open source if its license imposes platform or use restrictions. Attribution to Hayden Lindley / Corgi-Verse does not imply endorsement of an adopter, derivative, directory entry, or commercial service.
