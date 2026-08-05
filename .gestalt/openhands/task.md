# Fix specific quality-gate violations: Phase 4: LeaveBalance model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/be068fd3-a1c9-4eb0-ae38-156852fec5c5/4/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Enforce the entity invariant remainingDays = totalEntitlement - usedDays in the repository: in save, compute remainingDays from totalEntitlement - usedDays in the INSERT (e.g., $4 - $5) instead of persisting the caller-supplied value; in update, after merging the partial onto existing, recompute merged.remainingDays = merged.totalEntitlement - merged.usedDays (or compute remaining_days = total_entitlement - used_days directly in the UPDATE SQL) so the stored row always satisfies the invariant.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-balance/leave-balance.repository.ts
Offending code: `const merged = { ...existing, ...partial, id, updatedAt: new Date() };`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/leave-balance/leave-balance.repository.ts` in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] The `update` method does not recompute `remainingDays` when `totalEntitlement` or `usedDays` changes in the partial. The merged object retains the stale `remainingDays` from `existing`, violating the entity invariant that `remainingDays` must equal `totalEntitlement - usedDays` at all times. If a caller passes `{ totalEntitlement: 30 }` on a balance with `totalEntitlement: 20, usedDays: 5, remainingDays: 15`, the stored row will have `totalEntitlement: 30, remainingDays: 15` instead of `25`.

- Site 2
File: src/modules/leave-balance/leave-balance.repository.ts
Offending code: `balance.remainingDays,`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/leave-balance/leave-balance.repository.ts` in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] The `save` method stores `balance.remainingDays` as passed by the caller without computing it from `totalEntitlement - usedDays`. This violates the entity invariant that `remainingDays` must equal `totalEntitlement - usedDays` at all times and must never be independently set to an arbitrary value. A caller could pass `remainingDays: 99` with `totalEntitlement: 20, usedDays: 5` and the repository would persist the inconsistency.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.