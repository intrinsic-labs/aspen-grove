#!/usr/bin/env python3
# Vendored copy of the feature-map checker, for CI. Do not edit here.
# Source: Tools/skills/feature-mapping/check_map.md in the Intrinsic Labs vault
#   (~/Documents/obsidian/intrinsic-labs-v01), the ```python block, which stays canonical.
# Vault skill revision: 5c37b9835ad34ba053836bd29abe7d7f2da8f8fc
#   (git log -1 --format=%H -- Tools/skills/feature-mapping/check_map.md)
# To update: re-extract with
#   awk '/^```python$/{f=1;next} /^```$/{f=0} f' <vault>/Tools/skills/feature-mapping/check_map.md
# and bump the revision above.
"""Check a feature map against the code it describes.

Usage:
  python3 check_map.py MAP.md [--root DIR] [--routes GLOB]... [--strict]
  (repeat --routes once per glob)
  python3 check_map.py --self-test

Errors (exit 1): front matter that never closes, or lacks `feature-map: 1`, a full 40-hex
`revision:` or a `reconciled:` date (YYYY-MM-DD); a `Code:` path that no longer exists, an entry missing a
required field (Status included), a selector without its working/proposed/none
state, an unknown status, a duplicate id, a `Code:` path outside the root, a
root that isn't in a git repository, or a `revision:` that isn't a commit in it
or isn't an ancestor of its HEAD.

Warnings (exit 0 unless --strict): code that changed since the map's
`revision:`, untracked files under an entry's paths included (git); files matching --routes that neither an entry's `Code:` nor
a backticked path in the `## Coverage` section accounts for; Coverage paths
that no longer exist or sit outside the root; a --routes glob that matches
nothing. Warnings mean "re-read this", not "this is wrong".
Server endpoints in Coverage are a record for readers; the check only resolves
file paths: a backticked token with no spaces that has a slash or a glob and
doesn't start with `/`. Write a root-level file as `./App.tsx` and an endpoint
with its method, `GET /api/x`. A pass proves the
referenced files exist and the entries are complete. It cannot prove a map is
current: a file can still exist after the feature moved out of it.

Stdlib only, Python 3.9+, and git on PATH.
"""
from __future__ import annotations

import argparse
import datetime
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

REQUIRED = ("ID", "Purpose", "Where", "Reach", "Requires", "Selector", "Code", "Backend", "Status")
STATUSES = ("live", "placeholder", "unavailable", "restricted")
FIELD_RE = re.compile(r"^\s*[-*]\s+\*\*([A-Za-z ]+?):\*\*\s*(.*)$")
TICK_RE = re.compile(r"`([^`]+)`")
SELECTOR_RE = re.compile(r"^(working|proposed|none)(?=\s|—|:|$)")


@dataclass
class Entry:
    name: str
    line: int
    fields: dict[str, str] = field(default_factory=dict)

    def code_paths(self) -> list[str]:
        out = []
        for raw in TICK_RE.findall(self.fields.get("Code", "")):
            path = strip_hint(raw)
            if path:
                out.append(path)
        return out


def is_glob(p: str) -> bool:
    return any(c in p for c in "*?[")


def is_pathish(p: str) -> bool:
    # Coverage mixes paths with prose (feature IDs, words); a path has a slash or
    # a glob, so a root-level file is written `./App.tsx`.
    return is_glob(p) or "/" in p


def inside(root: Path, p: str) -> bool:
    if os.path.isabs(os.path.expanduser(p)):
        return False
    target = (root / p).resolve()
    return target == root or root in target.parents


def resolve(root: Path, p: str) -> list[str]:
    hits = glob.glob(str(root / p), recursive=True) if is_glob(p) \
        else ([str(root / p)] if (root / p).exists() else [])
    return [h for h in hits if inside(root, os.path.relpath(h, root))]


def is_date(value: str) -> bool:
    try:
        return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value)) and bool(datetime.date.fromisoformat(value))
    except ValueError:
        return False


def strip_hint(raw: str) -> str:
    return re.split(r"#|::", raw.strip(), maxsplit=1)[0].strip()


def parse(text: str) -> tuple[dict[str, str], list[Entry], list[str]]:
    meta: dict[str, str] = {}
    coverage: list[str] = []
    in_coverage = False
    lines = text.splitlines()
    start = 0
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                start = i + 1
                break
            key, _, value = lines[i].partition(":")
            meta[key.strip()] = value.split("#", 1)[0].strip()
        else:
            meta = {"unclosed": "1"}
    entries: list[Entry] = []
    current: Entry | None = None
    last_field = None
    for n, line in enumerate(lines[start:], start=start + 1):
        if line.startswith("### "):
            current = Entry(line[4:].strip(), n)
            entries.append(current)
            last_field = None
            in_coverage = False
        elif line.startswith("#"):
            current = None
            in_coverage = line.lstrip("#").strip().lower() == "coverage"
        elif in_coverage:
            coverage += [strip_hint(t) for t in TICK_RE.findall(line)
                         if " " not in t.strip() and not t.startswith("/") and is_pathish(strip_hint(t))]
        elif current is not None:
            m = FIELD_RE.match(line)
            if m:
                last_field = m.group(1).strip()
                current.fields[last_field] = m.group(2).strip()
            elif last_field and line.startswith("  ") and line.strip():
                current.fields[last_field] += " " + line.strip()
    return meta, entries, coverage


def resolve_root(map_path: Path, meta: dict[str, str], override: str | None) -> Path:
    root = override or meta.get("root") or "."
    p = Path(os.path.expanduser(root))
    return (p if p.is_absolute() else map_path.parent / p).resolve()


def git(root: Path, *args: str) -> str | None:
    try:
        r = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)
    except OSError:
        return None
    return r.stdout if r.returncode == 0 else None


def check(map_path: Path, root_override: str | None = None,
          routes: list[str] | None = None) -> tuple[list[str], list[str]]:
    meta, entries, coverage = parse(map_path.read_text(encoding="utf-8"))
    root = resolve_root(map_path, meta, root_override)
    errors: list[str] = []
    warnings: list[str] = []
    if not root.is_dir():
        return [f"root {root} is not a directory (front matter `root:` or --root)"], []
    if meta.get("unclosed"):
        errors.append("front matter opens with `---` but never closes")
    elif meta.get("feature-map") != "1":
        errors.append("front matter must declare `feature-map: 1`")
    if not re.fullmatch(r"[0-9a-f]{40}", meta.get("revision", "")):
        errors.append("front matter `revision:` must be the full 40-character commit sha the map was reconciled against")
    if not is_date(meta.get("reconciled", "")):
        errors.append("front matter `reconciled:` must be a YYYY-MM-DD date")
    if not entries:
        errors.append("no `### ` feature entries found")
    seen: dict[str, int] = {}
    referenced: set[Path] = set()
    for e in entries:
        where = f"{map_path.name}:{e.line} [{e.name}]"
        for f in REQUIRED:
            if not e.fields.get(f):
                errors.append(f"{where}: missing **{f}:**")
        ident = TICK_RE.sub(r"\1", e.fields.get("ID", "")).strip()
        if ident:
            if ident in seen:
                errors.append(f"{where}: duplicate ID {ident} (also line {seen[ident]})")
            seen[ident] = e.line
        sel = e.fields.get("Selector", "").lower()
        if sel and not SELECTOR_RE.match(sel):
            errors.append(f"{where}: Selector must start with working, proposed or none")
        status = (e.fields.get("Status", "").split() or ["live"])[0].strip(" .,;—-").lower()
        if e.fields.get("Status") and status not in STATUSES:
            errors.append(f"{where}: Status {status!r} is not one of {', '.join(STATUSES)}")
        paths = e.code_paths()
        if e.fields.get("Code") and not paths:
            errors.append(f"{where}: Code lists no `backticked` paths")
        for p in paths:
            if not inside(root, p):
                errors.append(f"{where}: Code path `{p}` is outside the map's root {root}")
                continue
            hits = resolve(root, p)
            if not hits:
                errors.append(f"{where}: Code path `{p}` no longer exists under {root}")
            referenced.update(Path(h).resolve() for h in hits)
    accounted = set(referenced)
    for p in coverage:
        if not inside(root, p):
            warnings.append(f"Coverage path `{p}` is outside the map's root {root}")
            continue
        hits = resolve(root, p)
        if hits:
            accounted.update(Path(h).resolve() for h in hits)
        elif is_pathish(p):
            warnings.append(f"Coverage path `{p}` no longer exists under {root}")
    rev = meta.get("revision")
    if rev and git(root, "rev-parse", "--git-dir") is None:
        errors.append(f"root {root} is not in a git repository, so `revision:` can't be verified "
                      "and drift can't be checked (map a git checkout)")
    elif rev:
        if git(root, "cat-file", "-e", f"{rev}^{{commit}}") is None:
            errors.append(f"revision {rev} is not a commit in {root}; drift can't be checked")
        elif git(root, "merge-base", "--is-ancestor", rev, "HEAD") is None:
            errors.append(f"revision {rev} is not an ancestor of HEAD in {root}, so it isn't a "
                          "baseline for the checked-out code")
        else:
            for e in entries:
                ps = [p for p in e.code_paths() if inside(root, p) and ((root / p).exists() or is_glob(p))]
                if not ps:
                    continue
                changed = (git(root, "diff", "--name-only", rev, "--", *ps) or "") + \
                    (git(root, "ls-files", "--others", "--exclude-standard", "--", *ps) or "")
                files = sorted({c for c in changed.splitlines() if c})
                if files:
                    warnings.append(f"[{e.name}] code changed since {rev[:10]}: "
                                    f"{', '.join(files[:4])}{' …' if len(files) > 4 else ''}"
                                    " (re-read this entry)")
    for pattern in routes or []:
        matched = sorted(glob.glob(str(root / pattern), recursive=True))
        if not matched:
            warnings.append(f"--routes `{pattern}` matches no files under {root}")
        for hit in matched:
            hp = Path(hit).resolve()
            if hp.is_file() and not any(hp == r or r in hp.parents for r in accounted):
                warnings.append(f"route/screen file in no entry and not in Coverage: "
                                f"{os.path.relpath(hp, root)}")
    return errors, warnings


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        (t / "src/screens").mkdir(parents=True)
        (t / "src/screens/Home.tsx").write_text("x")
        (t / "src/screens/Settings.tsx").write_text("x")
        (t / "src/api.ts").write_text("x")
        (t / "src/routes").mkdir()
        (t / "src/routes/home.ts").write_text("x")
        (t / "src/routes/_layout.ts").write_text("x")
        (t / "App.tsx").write_text("x")
        m = t / "FEATURE_MAP.md"
        m.write_text("""---
feature-map: 1
root: .
revision: 0123456789abcdef0123456789abcdef01234567
reconciled: 2026-01-01
---
## Home
### Home feed
- **ID:** `home.feed`
- **Purpose:** Shows today's items.
- **Where:** Home tab, main list.
- **Reach:** `/` after sign-in
- **Requires:** demo sign-in; any role; web + iOS
- **Selector:** working — `[data-testid="home-feed"]`
- **Code:** `src/screens/Home.tsx`, `src/routes/home.ts`, `src/api.ts#getFeed`
- **Backend:** `GET /api/feed`
- **Status:** live
### Settings
- **ID:** `settings`
- **Purpose:** Account settings.
- **Where:** Avatar menu → Settings.
- **Reach:** `/settings`
- **Requires:** demo sign-in
- **Selector:** proposed — `settings-screen` (not in code yet)
- **Code:** `src/screens/*.tsx`
- **Backend:** none — local preferences only
- **Status:** placeholder
## Coverage
- `src/routes/_layout.ts` — shared shell, no feature of its own
- `./App.tsx` — root component
- `GET /api/health` — internal probe
""")
        if not shutil.which("git"):
            print("self-test needs git: the check verifies `revision:` against the root's repository")
            return 1
        g = ["git", "-C", tmp, "-c", "user.email=t@t", "-c", "user.name=t",
             "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null"]
        subprocess.run(g + ["init", "-q"], check=True)
        subprocess.run(g + ["add", "."], check=True)
        subprocess.run(g + ["commit", "-qm", "base"], check=True)
        head = subprocess.run(g + ["rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        fake = "0123456789abcdef0123456789abcdef01234567"
        good = m.read_text().replace(fake, head)
        m.write_text(good)
        ok_err, ok_warn = check(m, routes=["src/screens/*.tsx", "src/routes/*.ts"])
        (t / "src/routes/new.ts").write_text("x")
        _, new_warn = check(m, routes=["src/routes/*.ts"])
        (t / "src/routes/new.ts").unlink()
        (t / "App.tsx").unlink()
        _, gone_cov_warn = check(m)
        (t / "App.tsx").write_text("x")
        m.write_text(good.replace("- **Status:** live\n", ""))
        nostatus_err, _ = check(m)
        m.write_text(good.replace("working — `[data-", "working-but-broken — `[data-"))
        badsel_err, _ = check(m)
        m.write_text(good.replace("reconciled: 2026-01-01\n", ""))
        nometa_err, _ = check(m)
        m.write_text(good.replace("reconciled: 2026-01-01\n", "reconciled: 2026-99-99\n"))
        baddate_err, _ = check(m)
        m.write_text(good.replace("reconciled: 2026-01-01\n---\n", "reconciled: 2026-01-01\n", 1))
        unclosed_err, _ = check(m)
        m.write_text(good.replace("`src/routes/home.ts`", "`../outside.ts`, `/etc/hosts`"))
        outside_err, _ = check(m)
        m.write_text(good.replace("- **ID:** `settings`", "- **ID:** `home.feed`"))
        dup_err, _ = check(m)
        m.write_text(good.replace(head, fake))
        unknown_rev_err, _ = check(m)
        side = subprocess.run(g + ["commit-tree", "HEAD^{tree}", "-m", "side"],
                              capture_output=True, text=True).stdout.strip()
        m.write_text(good.replace(head, side))
        side_rev_err, _ = check(m)
        m.write_text(good)
        (t / "src/screens/Settings.tsx").write_text("changed")
        drift_err, drift_warn = check(m)
        (t / "src/screens/Settings.tsx").write_text("x")
        (t / "src/screens/Profile.tsx").write_text("x")
        _, untracked_warn = check(m)
        (t / "src/screens/Profile.tsx").unlink()
        (t / "src/api.ts").unlink()
        bad_err, _ = check(m)
        (t / "src/api.ts").write_text("x")
        shutil.rmtree(t / ".git")
        nogit_err, _ = check(m)
        print("valid map:", "PASS" if not ok_err and not ok_warn else f"FAIL {ok_err + ok_warn}")
        print("unmapped route warns:", "yes" if any("new.ts" in w for w in new_warn) else "NO")
        print("removed Coverage file warns:", "yes" if any("App.tsx" in w for w in gone_cov_warn) else "NO")
        print("missing Status fails:", "yes" if any("Status" in e for e in nostatus_err) else "NO")
        print("invalid selector state fails:",
              "yes" if any("Selector" in e for e in badsel_err) else "NO")
        print("missing reconciled: fails:", "yes" if any("reconciled" in e for e in nometa_err) else "NO")
        print("impossible date fails:", "yes" if any("reconciled" in e for e in baddate_err) else "NO")
        print("unclosed front matter fails:", "yes" if any("never closes" in e for e in unclosed_err) else "NO")
        print("outside-root paths fail:", "yes" if sum("outside" in e for e in outside_err) == 2 else "NO")
        print("duplicate ID fails:", "yes" if any("duplicate ID" in e for e in dup_err) else "NO")
        print("drift since revision warns:",
              "yes" if not drift_err and any("Settings" in w for w in drift_warn) else "NO")
        print("new untracked file warns:", "yes" if any("Profile" in w for w in untracked_warn) else "NO")
        print("unknown revision fails:", "yes" if any("not a commit" in e for e in unknown_rev_err) else "NO")
        print("non-ancestor revision fails:", "yes" if any("not an ancestor" in e for e in side_rev_err) else "NO")
        print("non-git root fails:", "yes" if any("not in a git repository" in e for e in nogit_err) else "NO")
        print("removed-file fixture:", "FAIL as expected" if bad_err else "PASSED (wrong)")
        for e in bad_err:
            print("  ", e)
        passed = (not ok_err and not ok_warn and len(bad_err) == 1 and "api.ts" in bad_err[0]
                  and len(new_warn) == 1 and "new.ts" in new_warn[0]
                  and len(gone_cov_warn) == 1 and "App.tsx" in gone_cov_warn[0]
                  and any("Status" in e for e in nostatus_err)
                  and len(badsel_err) == 1 and "Selector" in badsel_err[0]
                  and len(nometa_err) == 1 and "reconciled" in nometa_err[0]
                  and len(baddate_err) == 1 and "reconciled" in baddate_err[0]
                  and any("never closes" in e for e in unclosed_err)
                  and sum("outside" in e for e in outside_err) == 2
                  and any("duplicate ID" in e for e in dup_err)
                  and not drift_err and len(drift_warn) == 1 and "Settings" in drift_warn[0]
                  and len(untracked_warn) == 1 and "Profile" in untracked_warn[0]
                  and len(unknown_rev_err) == 1 and "not a commit" in unknown_rev_err[0]
                  and len(side_rev_err) == 1 and "not an ancestor" in side_rev_err[0]
                  and len(nogit_err) == 1 and "not in a git repository" in nogit_err[0])
        print("self-test", "ok" if passed else "BROKEN")
        return 0 if passed else 1


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("map", nargs="?", type=Path)
    ap.add_argument("--root", help="code root (overrides the map's `root:`)")
    ap.add_argument("--routes", action="append", default=[],
                    help="glob (relative to root) of route/screen files every entry set should cover")
    ap.add_argument("--strict", action="store_true", help="exit 1 on warnings too")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args(argv)
    if a.self_test:
        return self_test()
    if not a.map:
        ap.error("MAP is required")
    errors, warnings = check(a.map, a.root, a.routes)
    for w in warnings:
        print("warn:", w)
    for e in errors:
        print("error:", e)
    _, entries, _ = parse(a.map.read_text(encoding="utf-8"))
    print(f"{a.map}: {len(entries)} entries, {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors or (a.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
