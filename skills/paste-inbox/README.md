# Paste Inbox 0.1.0

Save deliberately pasted text to `dropbox/pasted-texts` on an authorized Dot cloud workspace. Keep the original text, timestamped filename and source metadata; organize with editable titles, tags and collection labels. This is a reusable skill plus a Python helper, not a deployed app or the Dropbox service.

## Start here
1. Inspect this package, especially `SKILL.md` and `scripts/paste_inbox.py`.
2. Provide the package through your host's supported attachment or skill-import route. No universal install command or automatic installation is claimed. Where skill import is unavailable, attach the files and request the bounded workflow for that conversation.
3. Ask: “Use Paste Inbox to save the following text on your cloud computer.” Put the payload in a separate clearly bounded message or attached text file. The assistant must check its actual writable workspace and tell you where it saved the capture.
4. Later ask to list the inbox, read an identified capture, or put selected records into a named collection. Collection names are virtual organization labels; the original files do not move.

A useful first test is synthetic text such as “Garden notes” followed by a second line. Verify the resulting file before using it for real notes. Do not paste passwords, authentication tokens or other secrets; this package has no guaranteed secret detector. Downloading this ZIP does not install anything or create persistent access.

## Requirements and limits
Python 3.9+ on Linux, IANA timezone data, and an authorized writable Dot workspace. No external packages, network, clipboard reading or new account are needed by the helper. Default timezone is America/Chicago; the assistant should pass your actual IANA timezone if different. Maximum payload is 1 MiB of UTF-8. Exactness means the received text, not bytes already changed by a clipboard or chat client. An original file is preferable where byte-level fidelity matters.

A cloud workspace is not a backup guarantee. Environment replacement can make old files unavailable. Permanent archival storage and cross-session restoration must be separately established; no automatic upload, sync or retention promise is included.

The hotkey-openable or triggered panel is designed in `references/panel-plan.md`, but not built. It requires a working authenticated transport to the exact Dot workspace. Native host availability and global hotkeys have not been demonstrated.

## Verification
The included synthetic helper tests cover text preservation, retry idempotency, concurrent retries, distinct new captures, safe slugs, inert instruction text, non-destructive organization, failed commits, empty/oversize input, timezone validation, symlink/traversal rejection and corruption detection. Run `python3 scripts/test_paste_inbox.py` from this folder. Native host import/discovery, panel, hotkeys and workspace retention are NOT_RUN.

## Attribution and license
An original Corgi-Verse/Dotsys skill, version 0.1.0. The included LICENSE and NOTICE govern this distribution: source-available, with operational adoption restricted to OpenAI ChatGPT Dots-operated systems and supporting OpenAI Codex workflows. It is not an OpenAI product, safety certification, or OSI-approved open-source release. Public files contain synthetic examples only; never contribute personal captures or runtime configuration.
