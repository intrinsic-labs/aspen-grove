#!/usr/bin/env python3
"""Fail when FEATURE_MAP.md has fallen behind code that already landed on main.

Usage: python3 scripts/check-feature-map-landed.py FEATURE_MAP.md BASE_REF

The vendored checker (check-feature-map.py, not edited here) warns on every entry whose code
changed since the map's `revision:`. Part of that drift is the pull request's own change,
which can't be reconciled until it lands (main is squash-merged, so `revision:` can only name
a commit on main). The rest is code that landed on main after `revision:` and was never
reconciled. This script reports only that part: files that changed between `revision:` and
the merge-base of HEAD and BASE_REF. Any such entry fails, so the map can't drift further
than one merged change behind main.

Exit 0: nothing landed since `revision:` touches a mapped entry, or HEAD is BASE_REF's merge-base
itself (a push to main), where it only warns.
Exit 1: entries to re-read, and the merge-base to set as `revision:`.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "check_feature_map", Path(__file__).with_name("check-feature-map.py"))
fm = importlib.util.module_from_spec(_spec)
sys.modules["check_feature_map"] = fm  # dataclasses resolve the module by name
_spec.loader.exec_module(fm)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    map_path, base_ref = Path(argv[0]), argv[1]
    meta, entries, _ = fm.parse(map_path.read_text(encoding="utf-8"))
    root = fm.resolve_root(map_path, meta, None)
    rev = meta.get("revision", "")
    base = (fm.git(root, "merge-base", "HEAD", base_ref) or "").strip()
    if not base:
        print(f"feature map: can't find the merge-base of HEAD and {base_ref}", file=sys.stderr)
        return 2
    if fm.git(root, "merge-base", "--is-ancestor", rev, base) is None:
        # revision isn't behind the merge-base (or is invalid, which check:map reports).
        print(f"feature map: revision {rev[:10]} is not behind {base_ref}; nothing landed to reconcile")
        return 0

    stale = []
    for e in entries:
        ps = [p for p in e.code_paths() if fm.inside(root, p)]
        if not ps:
            continue
        changed = fm.git(root, "diff", "--name-only", rev, base, "--", *ps) or ""
        files = sorted({c for c in changed.splitlines() if c})
        if files:
            stale.append((e, files))

    if not stale:
        print(f"feature map: nothing that landed on {base_ref} since {rev[:10]} touches a mapped entry")
        return 0
    head = (fm.git(root, "rev-parse", "HEAD") or "").strip()
    on_base = head == base
    print(f"feature map: code that landed on {base_ref} after revision {rev[:10]} changed "
          f"{len(stale)} entr{'y' if len(stale) == 1 else 'ies'}, and the map was never reconciled:")
    for e, files in stale:
        shown = ", ".join(files[:4]) + (" …" if len(files) > 4 else "")
        print(f"  - {map_path.name}:{e.line} [{e.name}]: {shown}")
    if on_base:
        # Checking main itself (a push to main): the change that just landed can't have
        # bumped `revision:` to its own commit. The next pull request must reconcile it.
        print(f"::warning title=Feature map behind main::This is {base_ref} itself, so it only warns: the next pull request must re-read "
              f"these entries and set `revision:` to {base}.")
        return 0
    print("Re-read each entry above against the code and fix it, then set FEATURE_MAP.md's\n"
          f"`revision:` to the merge-base, {base}, in this change.")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
