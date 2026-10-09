#!/usr/bin/env bash
# Fail a PR to the default branch that adds `.gestalt/` files other than the deliberate keeps.
#
# 🔴 WHY. On 2026-10-09 a branch cut from `feature/93f4284a-…` was merged to `main`, carrying the
# whole feature AND 37 `.gestalt/` per-run artifacts. `.gestalt/` is TRACKED on purpose — git is
# the transport between activities' fresh clones — and the only thing that keeps the per-run files
# off the default branch is the PURGE inside the platform's `merge_feature_to_main`. A hand merge
# never reaches it, so nothing else was watching.
#
# THE KEEPS MIRROR `gestalt_core.git.branches` EXACTLY (`_RUN_SCRATCH_KEEP` /
# `_RUN_SCRATCH_KEEP_MEMBERS`). These are the records a run exists to leave behind, not scratch:
#
#   .gestalt/architecture/     the reconciled architecture the crew produces
#   .gestalt/template-base/    the vendored base a template upgrade three-way-merges against
#   */refused-writes*          a write the platform REFUSED, awaiting a human decision — the
#                              opposite of scratch; run b9cdf0f5's two refused GOLDEN_PRINCIPLES
#                              additions were both correct
#   */feature-review-findings* the feature review's durable record
#
# Anything else under `.gestalt/` is per-correlation working state: spec.json, context-updates.json
# and the code backends' own dirs. Those are dead the moment a run ends.
set -euo pipefail

BASE="${1:-origin/main}"

added=$(git diff --diff-filter=A --name-only "${BASE}...HEAD" -- '.gestalt/**' || true)
[ -z "$added" ] && { echo "No .gestalt/ files added. OK."; exit 0; }

offenders=""
while IFS= read -r path; do
  [ -z "$path" ] && continue
  case "$path" in
    .gestalt/architecture/*|.gestalt/template-base/*) continue ;;
    */refused-writes*|*/feature-review-findings*)     continue ;;
  esac
  offenders="${offenders}${path}"$'\n'
done <<< "$added"

if [ -n "$offenders" ]; then
  count=$(printf '%s' "$offenders" | grep -c . || true)
  echo "🔴 ${count} per-run .gestalt/ artifact(s) would be added to ${BASE}:"
  printf '%s' "$offenders" | sed 's/^/    /'
  cat <<'MSG'

These are per-correlation working state and must not reach the default branch. The platform strips
them in `purge_run_scratch` immediately before `merge_feature_to_main`; a branch merged by hand
skips that, which is exactly how 37 of them landed on 2026-10-09.

If this PR is a feature merge, let the platform perform it (`gestalt signals feature-reconcile`).
If the branch was cut from a feature branch by mistake, rebase onto the base branch.
MSG
  exit 1
fi

echo "Only deliberate .gestalt/ keeps added. OK."

# repro trigger
