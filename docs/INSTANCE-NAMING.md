# Name a Dotsys instance

Offer an editable, consistently prefixed folder or repository name for new instances:

- `dotsys-hayden-depot`
- `dotsys-bob-depot`
- `dotsys-hayden-showcase`
- `dotsys-bob-showcase`

The form is `dotsys-<chosen-handle>-<component>`. Use `system` for a new System root, `depot` for a depot, or `showcase` for a showcase. These are organizational labels, not mandatory installed services. Ask which name, nickname, or neutral alias the person wants; never infer a legal name or silently reuse an account name. Offer a neutral alias when they prefer not to reveal their name. Explain that a public repository name, URL, or screenshot can reveal the chosen handle.

## Three independent concepts

- **Folder/repository slug:** a portable label such as `dotsys-bob-depot`. The owner may edit it or retain an existing name.
- **Friendly display name:** for example, “Bob's Depot” or “My private shelf”. The existing private System manifest's `name` is a display label, with its existing 80-character limit. Component apps may use their own local display-name setting. A display label is never a filesystem path.
- **Stable identity:** keep the private random `system_id` unchanged across renames, and the independently generated public `card_id` unchanged across public-label edits. Do not derive IDs from handles, paths, display names, or each other. New installations need fresh IDs; a naming helper must not clone an example identity.

Do not add `handle`, `folder_name`, or component settings to the closed 0.1.0 manifest schema. This convention changes no wire document or required schema field. It does not require a migration. Existing names remain valid, including the default-first `apps/surface` path. For a newly approved component directory under `apps/`, an owner may choose this convention while respecting the manifest's existing path limits. Do not create extra repositories merely to repeat the naming pattern.

## Implemented: read-only local preview

From the repository root, with an existing destination directory:

```sh
python reference/plan_name.py --parent /path/to/projects --handle bob --component depot --display-name "Bob's Depot"
```

Typical output when that local name is unused:

```json
{
  "folder_name": "dotsys-bob-depot",
  "display_name": "Bob's Depot",
  "collision_adjusted": false
}
```

The standard-library-only helper normalizes the supplied handle and component into a suggestion, accepts an independent display label, and inspects only the supplied local parent directory. `--folder-name my-depot` supplies an exact edited slug; unsafe edits are rejected rather than silently rewritten. No files, folders, repositories, manifests, credentials, or IDs are created or changed. No network check is performed. JSON output is a preview, not approval or a reservation.

### Portable reference policy

1. Suggested segments use Unicode NFKD normalization, discard non-ASCII characters, lowercase, replace other runs with one hyphen, and trim outer hyphens. The handle is capped at 32 characters and the component at 20. Review the result: transliteration can be lossy. If nothing remains, ask for a different alias; never invent an identity.
2. The complete slug is at most 63 ASCII characters, using letters, digits, and single internal hyphens. Explicit edits must already satisfy this policy. Reject empty names, `.`/`..`, path separators, drive or absolute paths, whitespace, trailing dots/hyphens, and Windows device names (`con`, `prn`, `aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9`). A full prefixed name such as `dotsys-con-depot` is safe even if its handle alone is reserved.
3. Inspect the actual existing local destination. Treat case-insensitive matches as occupied for portability, including files, directories, and dangling symlinks. Suggest the first free numbered suffix starting at `-2`, truncating the base if necessary to keep the total within 63 characters. Show any adjusted name for review; do not rename an existing item.
4. The helper does not reserve a name. A future creator must recheck immediately before creation, use an exclusive/no-overwrite operation, and safely reject races and symlink escapes. A local unused name says nothing about availability on GitHub, a hosting provider, or a network; check the chosen provider separately before an authorized creation.
5. Review both labels before creating a new instance. Changing a display name must not silently change its folder, repository, URLs, or IDs. For an explicit existing-path migration, separately inspect references, Git origins, app roots, links, and deployment settings before applying it.

## Still specification-only

The setup prompt now offers this naming choice, and the helper can produce a local preview. This package still has no installer, folder-creation workflow, repository provisioner, automatic migration, or deployed component-onboarding UI. An integrating application must implement and verify those steps within the owner's permissions.

Consistent names make sorting and categorization easier. They are not globally unique, proof of identity or ownership, an authorization grant, a decentralized address, or network membership. A decentralized discovery/identity service would need a separately designed protocol; none is implemented here. Public cards and directory enrollment remain separately approved, and a private handle must not be copied into them automatically.

See [the protocol](../PROTOCOL.md), [setup guide](ADOPTION.md), and [verification limits](../VERIFY.md).
