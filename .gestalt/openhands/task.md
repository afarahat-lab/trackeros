# Fix specific quality-gate violations: Phase 5: LeaveBalance module (model + repository + service interface)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/8177937e-ec7c-4649-b943-9d9104b82731/5/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Remove `remainingDays` from the `create` method's input type by changing it to `Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>`, and remove the `remainingDays: 20` property from the `createInput` object in the repository test so the type system and tests both enforce that `remainingDays` is never a writable field.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-balance/leave-balance.repository.ts
Line: 14
Offending code: `balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,`
Rule violated: remainingDays-not-writable
Action (do this now): Edit `src/modules/leave-balance/leave-balance.repository.ts` at line 14 in place to fix the `remainingDays-not-writable` violation.
What the quality gate found — apply this: [remainingDays-not-writable] The `create` method's input type `Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>` includes `remainingDays` because it is not omitted. The constraint states "remainingDays must never be a stored column or a writable field; it is always computed at query time." The type should be `Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>` so callers cannot pass a value for the derived field. The test at tests/unit/modules/leave-balance/leave-balance.repository.test.ts:162 confirms the issue by passing `remainingDays: 20` in the create input.

- Site 2
File: tests/unit/modules/leave-balance/leave-balance.repository.test.ts
Line: 148
Offending code: `remainingDays: 20,`
Rule violated: review/constraint-violation
Action (do this now): Edit `tests/unit/modules/leave-balance/leave-balance.repository.test.ts` at line 148 in place to fix the `review/constraint-violation` violation.
What the quality gate found — apply this: [review/constraint-violation] The test's createInput includes `remainingDays: 20`, but `remainingDays` is a derived field (computed as `totalEntitlement - usedDays`) that must never be writable. The repository's `create` method silently ignores this value — it is not part of the INSERT statement. Including it in the test input masks the fact that the `Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>` type incorrectly admits `remainingDays` as a writable field, contradicting the spec constraint: "remainingDays must never be a stored column or a writable field."

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