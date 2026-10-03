# Triggered panel: proposed, not implemented

## Recommended experience
Open “Paste Inbox” from a supported thread tab or global app entrypoint. One large text field, optional title/tags, visible destination, Save, and recent captures. Focus starts in the field. Normal paste remains a user action. Ctrl/Cmd+Enter can be an in-panel Save shortcut, not a promise of an OS-wide launcher. Empty, saving, saved, error, disconnected and conflict states are explicit. Never clear the field until a committed receipt arrives; errors keep text and retry ID. Render text as escaped text, never executable HTML. Warn before closing an unsaved draft; no claim that browser state is durable.

## Required transport gate
The panel calls a proposed `paste.capture` MCP tool with text and an idempotency key. That tool must execute the bundled writer on the same authorized dot workspace, or use a separately approved destination with explicit synchronization. A remotely hosted Sites plugin has a different filesystem; its local storage is not the dot workspace. No documented arbitrary “write to dot computer” API has been established here. Before building, prove a supported executor-backed bridge with a synthetic save/readback or stop and retain chat capture. Never expose an unauthenticated write endpoint or use UI localStorage as the inbox.

Additional proposed tools: `paste.list`, `paste.read`, `paste.organize`. Authenticate requests to the exact user and destination; validate identity server-side and restrict writes to this inbox. No payloads in analytics or URLs. Remote auth must follow the current host requirements; new persistent access is a separate approval, not implied by this design.

## Documented support and limits
OpenAI's extension specification documents global navigation and thread-tab entrypoints, and deep links. Its support matrix is expected DevDay-launch support, excludes classic ChatGPT from “Web,” and is not proof of availability in a particular dot session. The specification does not establish an OS-global hotkey mechanism. Its file-resource writing rules cover an opened, writable host resource, not arbitrary creation under a dot workspace. [OpenAI MCP Extensions](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md)

OpenAI's UI guidance assigns authoritative records and cross-session data to server-side storage, while widget state is instance-scoped. A future panel must not treat iframe storage as an archive. [UI and state](https://developers.openai.com/plugins/build/chatgpt-ui)

For a custom authenticated MCP server, OpenAI documents OAuth 2.1 with validation of issuer, audience, expiration and scopes. Reauthorization can occur; authentication alone says nothing about workspace persistence. [Authentication](https://developers.openai.com/plugins/build/auth)

Sources checked 2026-10-03. Recheck installed SDK and live host capability before implementation. No native panel, launcher shortcut, filesystem bridge or authentication grant was created for this package.
