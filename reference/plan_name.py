"""Suggest a local instance name. Read-only: no creation, rename, or identity claim."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import unicodedata

MAX_SLUG = 63
RESERVED = {'con', 'prn', 'aux', 'nul', 'clock$'} | {
    f'{prefix}{number}' for prefix in ('com', 'lpt') for number in range(1, 10)
}


def _segment(value: str, limit: int) -> str:
    # Suggestions may transliterate accents, replace punctuation, and truncate.
    # Never use raw owner input as a path, and never infer a name from an account.
    ascii_value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode()
    segment = re.sub(r'[^a-z0-9]+', '-', ascii_value.lower()).strip('-')
    segment = segment[:limit].rstrip('-')
    if not segment:
        raise ValueError('choose a handle and component containing ASCII letters or digits')
    return segment


def suggest_slug(handle: str, component: str) -> str:
    """Return a portable suggestion from a deliberately supplied alias and category."""
    return f'dotsys-{_segment(handle, 32)}-{_segment(component, 20)}'


def validate_slug(value: str) -> str:
    """Explicit edits must already be safe; do not silently rewrite them."""
    if (len(value) > MAX_SLUG or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value)
            or value in RESERVED):
        raise ValueError('folder name must be 1–63 lowercase ASCII letters/digits with '
                         'single internal hyphens, and not a reserved device name')
    return value


def plan_name(parent: Path, handle: str, component: str, *,
              folder_name: str | None = None, display_name: str | None = None) -> dict:
    """Check one existing destination. The returned name is not a reservation."""
    base = validate_slug(suggest_slug(handle, component) if folder_name is None else folder_name)
    label = (f'{_segment(handle, 32)} {_segment(component, 20).capitalize()}'
             if display_name is None else display_name.strip())
    if not 1 <= len(label) <= 80 or any(unicodedata.category(c).startswith('C') for c in label):
        raise ValueError('display name must contain 1–80 characters without controls')
    # Include files, directories, and dangling symlinks; do not follow child links.
    # Case-fold even on case-sensitive hosts for more portable suggestions.
    occupied = {entry.name.casefold() for entry in Path(parent).iterdir()}
    candidate = base
    number = 2
    while candidate.casefold() in occupied:
        suffix = f'-{number}'
        candidate = base[:MAX_SLUG - len(suffix)].rstrip('-') + suffix
        number += 1
    return {'folder_name': candidate, 'display_name': label,
            'collision_adjusted': candidate != base}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--parent', required=True, type=Path,
                        help='Existing local destination to inspect; nothing is written')
    parser.add_argument('--handle', required=True, help='Chosen name, nickname, or neutral alias')
    parser.add_argument('--component', required=True, help='For example: system, depot, showcase')
    parser.add_argument('--folder-name', help='Optional exact safe folder-name edit')
    parser.add_argument('--display-name', help='Independent friendly label, up to 80 characters')
    args = parser.parse_args()
    try:
        plan = plan_name(args.parent, args.handle, args.component,
                         folder_name=args.folder_name, display_name=args.display_name)
    except (ValueError, OSError) as exc:
        parser.exit(1, 'Cannot plan name: ' + str(exc) + '\n')
    print(json.dumps(plan, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
