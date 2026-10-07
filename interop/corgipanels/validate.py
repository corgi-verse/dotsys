"""Offline structure checks only. Copyright 2026 Hayden Lindley. Apache-2.0."""
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent
SCHEMA = json.loads((ROOT / "panel.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(SCHEMA)
VALIDATOR = Draft202012Validator(SCHEMA)


def validate(panel):
    """Return safe structural errors; never fetch URLs or execute proposals."""
    errors = ["schema: " + "/".join(map(str, e.absolute_path)) for e in VALIDATOR.iter_errors(panel)]
    if errors:
        return errors
    tiles = panel["tiles"]
    ids = [tile["id"] for tile in tiles]
    if len(ids) != len(set(ids)):
        errors.append("duplicate tile ID")
    asset_paths = [asset["path"] for asset in panel["assets"]]
    if len(asset_paths) != len(set(asset_paths)):
        errors.append("duplicate asset path")
    if sum(asset["size"] for asset in panel["assets"]) > 50 * 1024 * 1024:
        errors.append("asset total exceeds limit")
    graph = {tile["id"]: tile["dependsOn"] for tile in tiles}
    for tile in tiles:
        action_ids = [action["id"] for action in tile["actions"]]
        if len(action_ids) != len(set(action_ids)):
            errors.append("duplicate action ID within tile")
        if any(dep not in graph for dep in tile["dependsOn"]):
            errors.append("unknown dependency")
        if (panel["mode"] == "reference_only" or tile["state"] == "reference_only") and tile["actions"]:
            errors.append("reference-only tile cannot propose executable actions")
        for ref in tile["references"]:
            try:
                parsed = urlsplit(ref["uri"])
                valid = parsed.hostname and parsed.username is None and parsed.password is None and not parsed.query and not parsed.fragment
            except ValueError:
                valid = False
            if not valid:
                errors.append("reference must have a host and no userinfo, query, or fragment")
    active, done = set(), set()

    def visit(node):
        if node in active:
            return True
        if node in done:
            return False
        active.add(node)
        cycle = any(visit(dep) for dep in graph[node] if dep in graph)
        active.remove(node)
        done.add(node)
        return cycle

    if any(visit(node) for node in graph):
        errors.append("cyclic dependencies")
    return errors


def strict_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON property")
        result[key] = value
    return result


def load_panel(path):
    raw = Path(path).read_bytes()
    if len(raw) > 1024 * 1024:
        raise ValueError("manifest exceeds 1 MiB")
    return json.loads(raw.decode("utf-8"), object_pairs_hook=strict_object,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError("nonfinite JSON value")))


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("usage: validate.py panel.corgipanel.json")
        problems = validate(load_panel(sys.argv[1]))
        print("FAIL: " + "; ".join(problems) if problems else "PASS: structure only; identity, permissions, assets and runtime NOT_RUN")
        sys.exit(bool(problems))
    except (ValueError, OSError, RecursionError):
        print("FAIL: cannot read a valid bounded JSON manifest")
        sys.exit(1)
