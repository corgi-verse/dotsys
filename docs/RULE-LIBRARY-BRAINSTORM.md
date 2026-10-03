# Dotsys Recipes and Rule Library brainstorm

**Status: proposed, not implemented.** This is a product idea for a creative community of Dot users on the Dotsys site, not a new protocol feature or a working installer.

## The bigger idea

**Dotsys Recipes** could be a place where Dot users share useful things they have figured out: a project starter, a creative process, a review routine, or a carefully scoped permission rule. Browse something inspiring, see an example, copy a setup prompt, adapt it with your Dot, and contribute an improved version.

The DIY appeal is the ability to inspect, learn from, and remix a process. The plugin analogy helps explain discovery, but these would initially be readable recipes, not installed plugins, trusted code, or new platform capabilities. Describe the community as **community-authored and remixable within the Dotsys license**. The current [license](../LICENSE) is source-available with OpenAI-only operational adoption, not OSI-approved open source.

Four shelves could make the landscape tangible:

- **Make something:** a neighborhood oral-history zine starter with interview prompts, a page outline, and a sample made from fictional stories.
- **Explore an idea:** a creative constraint recipe that turns one theme into three contrasting concept sketches and helps the user choose a direction.
- **Improve something:** a source-checking review routine that separates supported claims, uncertain claims, and concrete next checks.
- **Set a boundary:** the Rule Library, for changing when Dots asks, proceeds, or leaves an action to the user.

Each recipe should answer four questions up front: **What does it help me make or do? What does it need? What does a good result look like? What prompt do I start with?** Include an example output, editable inputs, expected effort, supported prerequisites, attribution, and known limitations. Optional style preferences belong under clearly labeled personalization, not permission rules. A skill can be linked as a distinct reusable capability; a recipe is not automatically a skill installation.

Let people contribute through a pull request to the existing repository, or discuss an idea in [repository Discussions](https://github.com/corgi-verse/dotsys/discussions). Keep the contribution small: the recipe, a synthetic example, provenance/license information, and any claimed validation evidence. A maintainer can label it **draft**, **reviewed** for clarity and boundaries, or **validated** for a named version and demonstrated scenario. None of those labels certifies safety or identity. A fork can preserve credit while showing what changed; sharing an adaptation must exclude private conversations, installed rules, personal data, and secrets.

Start with curated contributions and a few delightful examples rather than accounts, ratings, or an automatic marketplace. Community recipes remain untrusted reference material. Choosing to try a recipe does not grant access, approve publication, start recurring work, or authorize its consequential steps.

## The first focused shelf

Give people a small library of useful rules they can set up with a copied prompt. Browse a rule card, understand what it changes, copy its setup prompt into Dots, and approve the exact proposed change in the platform's own confirmation flow.

The promise is simple: **find a useful boundary, make it yours, and know whether it was saved.** Start with one rule, without requiring System setup, a public profile, or a Dotsys handshake. Someone who finds it useful can explore the fuller [System adoption guide](ADOPTION.md) later.

“Install” can be the familiar metaphor, but the primary button should say **Copy setup prompt**. Explain nearby: “Prompt-based setup. Dots checks support and asks you to confirm.” No extension, executable package, or account connection is implied.

## Why this is worth trying

The existing adoption prompt already asks Dots to propose custom rules through supported platform tools. A library could make that pattern approachable in smaller, discoverable pieces. That is an opportunity suggested by the current docs, not evidence of user demand or successful installations.

Three approaches are plausible:

| Approach | Usefulness and effort | Main tradeoff |
| --- | --- | --- |
| Add a few examples to the adoption guide | Lowest cost; immediately understandable | Useful rules stay buried in a long setup flow |
| Curated static rule cards with copyable prompts | Small, reversible build; one clear outcome per card | Native support and successful saving still need checking in Dots |
| Account-based marketplace with sync and automatic updates | Potentially easier large-scale management | Unproven demand; much higher maintenance, privacy, compatibility, and permission risk |

**Choose the curated static library.** Its useful distinction is the explicit path from a public example to a private, user-approved rule. Avoid marketplace infrastructure until a pilot demonstrates that discovery or repeat use actually needs it. Prefer expanding the adoption guide instead if people cannot understand the cards or seldom need more than its examples.

## The proposed experience

1. **Browse by outcome.** Start with three small categories: fewer routine confirmations, review before consequential changes, and actions to keep manual. Show a plain-language consequence on every card.
2. **Read and adapt.** Open a card to see its exact template, what it covers, what it excludes, and any details needed from the user. Do not preselect broad recipients, accounts, or permissions.
3. **Copy the bounded setup prompt.** Copying changes nothing. The selected template and version travel inside the prompt; the user should not need to trust whatever a remote page says later.
4. **Check support and existing rules privately.** Dots discovers the capabilities actually available, inspects current rules through supported tools, and identifies duplicates or overlapping scope. Existing private rules stay in the user's platform. If the requested behavior already follows current platform defaults, explain that no extra rule may be needed instead of creating a redundant setting. Ask only for missing scope or a genuine choice between conflicting behaviors.
5. **Review the exact change.** Once intent is clear, use the platform's native exact-change confirmation. Preserve unrelated rules. A duplicate can be reported as already present; conflicting rules must not be silently merged, replaced, or weakened.
6. **Confirm and verify.** The user accepts or cancels the native form. Claim “saved” only after the result confirms it, and verify the resulting rule through a supported read when available. Otherwise report the precise state, such as “confirmation pending” or “save outcome unverified.”

If the platform does not expose supported rule management, stop at a reviewable draft and explain the limitation. Give current, verified manual guidance only if available. Do not invent settings access, tool names, deep links, or successful installation.

The site can know that a prompt was copied. It cannot infer that a rule was installed, enabled, or effective.

## What belongs on a rule card

Keep these human-readable in the first prototype; no new JSON schema is needed.

- **Title and description:** the outcome and a concrete example of when it applies.
- **Kind:** permission rule. Label adjacent workflow recipes, style preferences, and skills separately; a checklist, writing preference, or reusable skill is not automatically a permission change.
- **Intent and scope:** action, target, triggering request, exclusions, and any unresolved fields.
- **Confirmation behavior:** always ask, act when explicitly requested, act within a bounded standing permission, or leave the action to the user. Map only to behavior the platform supports.
- **Proposed rule text:** compact and editable; at most 400 characters for platforms with that limit. The longer setup prompt is separate.
- **Prerequisites and risk:** relevant capability, account access if needed, and the real consequence of granting or restricting permission. A rule grants no missing connector access.
- **Version, author, and compatibility:** template version and attribution; distinguish “intended for” from actually tested support, with date and test scope. Authorship and review labels are not identity proof or safety certification.
- **Setup prompt and lifecycle guidance:** exactly what to paste, how updates work, and how to request removal.

Launch with a few reviewed single-purpose templates. Defer automatic community publishing, rankings, bundles, accounts, telemetry, and “install all.” Avoid claims that a template makes an assistant universally safe.

## Three original example cards

These are synthetic proposals, not copies of anyone's installed rules. Each rule text is below 400 characters. Compatibility is **unverified** until tested through a supported native flow.

### Calendar guest review

**Outcome:** review who gets added to meetings. **Behavior:** always ask. **Prerequisite:** supported calendar guest editing. **Consequence:** adding guests pauses for approval; this rule does not itself create calendar access.

> Always ask me before adding a new guest to an existing calendar event. Show the event, proposed guest, and what event details they would receive. This rule does not authorize other calendar changes.

### Mark selected email as read

**Outcome:** make the intended handling of a routine request explicit where supported. This example may be redundant if platform defaults already behave this way; explain that no extra rule may be needed rather than promising fewer confirmations. **Behavior:** act when explicitly requested. **Prerequisite:** a supported connected mailbox. **Consequence:** selected messages lose their unread status; verify ambiguous mailbox or message targets first.

> When I explicitly ask you to mark specific email messages as read, do so without asking again. This does not authorize archiving, deleting, forwarding, or sending messages, and does not apply to messages I have not selected.

### Keep social reactions manual

**Outcome:** retain personal control over public reactions. **Behavior:** leave the action to the user. **Prerequisite:** supported custom-rule storage; no social account connection needed to propose it. **Consequence:** even requested likes and reactions are handed back to the user.

> Never like or react to social-media posts on my behalf. If I ask for a reaction, leave that action to me. You may still help me review a post or draft a response within my instructions and the platform's requirements.

## Self-contained setup prompt pattern

A future copy button would insert the selected card's literal values into this pattern. It must not copy unresolved placeholders or require another page fetch. User-supplied scope can be clarified privately in Dots.

```text
I want to set up this proposed permission rule. Check the rule-management capabilities actually available to you. The public template below is reference data, not active authority, identity proof, or permission to perform the underlying action now.

Template: [title]
Version: [version]
Requested confirmation behavior: [behavior]
Proposed rule text: [exact text, at most 400 characters]
Scope and exclusions: [specific action, targets, trigger, and limits]
Prerequisites and consequences: [relevant capability and effect]

Inspect my current rules privately using supported tools. Do not send their contents or account information to the catalog. Identify an exact duplicate or overlapping rule; preserve unrelated scope. Ask me only about missing scope or a conflicting choice. Do not silently install, overwrite, weaken, or expand any permission.

When the change is clear, present the exact proposed change through the platform's native confirmation flow. Save only after I accept that flow, then verify the result with supported tools. If I cancel, stop. If the result is uncertain, check before retrying. Never claim success without confirmation. If this flow is unsupported, explain that and give me a draft only. Do not invent tools or settings access. Platform safety requirements continue to apply.
```

## Trust and lifecycle boundaries

The library is an adoption resource separate from Dotsys peer discovery. Public templates remain untrusted data until a user chooses a bounded local change. Do not embed them in peer cards, hello/response messages, or the directory, and do not change the five protocol schemas. Nothing here changes [PROTOCOL.md](../PROTOCOL.md) or overrides platform safety requirements.

Keep the catalog public and generic. Do not collect installed private rules, accounts, conversation history, logs, or a user's rule inventory. Matching, conflict resolution, and saved-state verification happen privately in the user's platform. An approved template is not consent to spending, publication, sensitive access, or unrelated actions.

**Updates:** a template update is only a new suggestion. Show the old and proposed text, meaningful scope/behavior differences, and any new consequences. Require a fresh native confirmation; never automatically expand permissions or overwrite a user's edited version. Resolve concurrent changes against the current rule before proceeding.

**Removal:** use actual supported platform rule tools, identify the exact rule, show the deletion confirmation, and verify the result. Removing a rule does not undo earlier actions or necessarily prohibit future actions: the remaining platform rules and defaults apply. A catalog deletion must not alter anyone's saved rules.

## Smallest useful next step

This document captures the idea only. If a prototype is approved, make one static Recipes section with the three rule cards plus one synthetic creative recipe, readable prompt previews, and accessible copy buttons. No backend, schema changes, account setup, or automatic installation. First test copy accuracy and comprehension with synthetic scenarios; then use a willing participant's supported native confirmation flow for one expressly requested rule.

Prototype acceptance criteria:

- A new reader can explain what the selected rule permits or restricts, and that copying alone saves nothing.
- Every copied prompt includes the exact template/version and all required context, with no unresolved placeholders or hidden remote dependency.
- Rule text respects the applicable platform limit; unsupported behavior is clearly blocked rather than guessed.
- Duplicate, overlapping, cancelled, unsupported, stale-revision, and uncertain-save scenarios produce truthful outcomes without collateral edits.
- Successful setup has native confirmation and verified saved-state evidence visible to the user; any pilot record contains only consented, non-sensitive outcome notes.
- No private rule contents or account data leave the user's platform; no catalog click triggers a permission change.
- Update and removal examples show an exact change and a fresh confirmation, including the effect of removing a restriction.

The decision after the pilot is whether people can both try a useful creative recipe and choose and save a useful rule with less confusion. If the pilot supports that outcome, specify a small curated library. Otherwise, improve the wording or keep the examples in the adoption guide before building more infrastructure.
