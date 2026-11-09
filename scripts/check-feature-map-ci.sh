#!/usr/bin/env bash
# CI gate for FEATURE_MAP.md. Fails on every checker error and on every warning except
# "code changed since <revision>".
#
# Why drift is advisory here: main is squash-merged, so `revision:` can only name a commit
# that is already on main. A pull request that edits mapped code therefore always shows
# drift for its own files until the map is re-walked and `revision:` is bumped on main.
# Unmapped routes, missing Coverage paths and broken entries still fail the build.
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
