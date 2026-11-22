#!/usr/bin/env bash
# CI gate for FEATURE_MAP.md. Fails on every checker error, on every warning except
# "code changed since <revision>", and on drift from code that already landed on main.
#
# Drift from the change itself only warns: main is squash-merged, so `revision:` can only
# name a commit already on main, and a pull request that edits mapped code always shows
# drift for its own files. Drift from code that landed on main after `revision:` fails
# (check-feature-map-landed.py): re-read those entries and set `revision:` to the merge-base.
# Unmapped routes, missing Coverage paths and broken entries fail too.
# For a full strict pass (after a reconcile), run `npm run check:map:strict`.
set -euo pipefail
cd "$(dirname "$0")/.."

out=$(python3 scripts/check-feature-map.py FEATURE_MAP.md --routes 'src/app/**/*.tsx') || {
  echo "$out"
  exit 1
}
echo "$out"
if echo "$out" | grep '^warn:' | grep -v 'code changed since' >/dev/null; then
  echo "feature map: warnings other than drift must be fixed (map the route or add it to ## Coverage)" >&2
  exit 1
fi
if echo "$out" | grep -q 'code changed since'; then
  echo "::warning title=Feature map drift::Entries above touch code changed since the map's revision. Re-read them and update the entries in this change."
fi

# Code that landed on main since `revision:`. Always main, even for a pull request stacked
# on another branch: that branch's own commits (and any merge of main into it) haven't
# landed, and a merge commit's diff would show all of main's changes as unreconciled.
base="origin/main"
git rev-parse --verify --quiet "$base^{commit}" >/dev/null || base=main
if git rev-parse --verify --quiet "$base^{commit}" >/dev/null; then
  python3 scripts/check-feature-map-landed.py FEATURE_MAP.md "$base"
else
  echo "feature map: no origin/main or main to compare with; skipped the landed-drift check" >&2
fi
