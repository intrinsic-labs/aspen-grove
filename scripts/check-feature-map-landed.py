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

A landed commit that changed an entry's code and also edited that entry's text in the map
counts as reconciled for that entry: its pull request already re-read it. So a change that
keeps its own entries current doesn't force the next pull request to bump `revision:`. Only
code that landed without its entry being touched still needs a re-read.

Exit 0: nothing landed since `revision:` touches a mapped entry, or HEAD is BASE_REF's merge-base
itself (a push to main), where it only warns.
Exit 1: entries to re-read, and the merge-base to set as `revision:`; or a `revision:` that is not
a commit on BASE_REF.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "check_feature_map", Path(__file__).with_name("check-feature-map.py"))
fm = importlib.util.module_from_spec(_spec)
sys.modules["check_feature_map"] = fm  # dataclasses resolve the module by name
_spec.loader.exec_module(fm)


def landed_commits(root: Path, rev: str, base: str) -> list[str]:
    """The commits on main after `revision:` up to the merge-base, oldest first."""
    out = fm.git(root, "rev-list", "--first-parent", "--reverse", f"{rev}..{base}") or ""
    return [c for c in out.splitlines() if c]


def entry_spans(text: str) -> dict[str, tuple[int, int]]:
    """Each entry's first and last line (1-based) in one version of the map."""
    _, entries, _ = fm.parse(text)
    total = len(text.splitlines())
    spans = {}
    for i, e in enumerate(entries):
        end = entries[i + 1].line - 1 if i + 1 < len(entries) else total
        spans[e.name] = (e.line, end)
    return spans


HUNK_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", re.M)


def reconciled_by_commit(root: Path, map_path: Path, rev: str, base: str) -> dict[str, set[str]]:
    """For each landed commit that edited the map, the entries whose text it changed.

    A change that edits an entry's code and that same entry's text in one squash commit has
    reconciled it already: its pull request re-read the entry. Only code changes that left
    the entry's text untouched still need a re-read.
    """
    rel = str(map_path.resolve().relative_to(root.resolve()))
    out: dict[str, set[str]] = {}
    for commit in landed_commits(root, rev, base):
        diff = fm.git(root, "diff", "-U0", f"{commit}^", commit, "--", rel) or ""
        hunks = [(int(a), int(b) if b else 1) for a, b in HUNK_RE.findall(diff)]
        if not hunks:
            continue
        text = fm.git(root, "show", f"{commit}:{rel}") or ""
        touched = set()
        for name, (lo, hi) in entry_spans(text).items():
            for start, count in hunks:
                # A pure deletion (count 0) sits after line `start`; count it as that line.
                if start <= hi and start + max(count, 1) - 1 >= lo:
                    touched.add(name)
                    break
        out[commit] = touched
    return out


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
        # A revision that isn't on the base (a commit only on this branch, or a typo) would
        # silently switch this gate off, so it fails: `revision:` must name a commit on main.
        print(f"feature map: revision {rev[:10] or '(none)'} is not a commit on {base_ref}. "
              f"Set FEATURE_MAP.md's `revision:` to a commit on {base_ref}, such as the merge-base, {base}.")
        return 1

    reconciled = reconciled_by_commit(root, map_path, rev, base)
    commits = landed_commits(root, rev, base)
    stale = []
    for e in entries:
        ps = [p for p in e.code_paths() if fm.inside(root, p)]
        if not ps:
            continue
        files: set[str] = set()
        for commit in commits:
            if e.name in reconciled.get(commit, set()):
                continue
            changed = fm.git(root, "diff", "--name-only", f"{commit}^", commit, "--", *ps) or ""
            files.update(c for c in changed.splitlines() if c)
        if files:
            stale.append((e, sorted(files)))

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
