# Fix specific quality-gate violations: Phase 1: Shared types and enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e207b7c2-5967-4897-aeeb-2fac2e370ce3/1/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Rename all LeaveType enum members in src/shared/types/enums.ts to lowercase so each member name equals its value: annual = 'annual', sick = 'sick', emergency = 'emergency', unpaid = 'unpaid', maternity = 'maternity', paternity = 'paternity'. Update tests/unit/shared/types/enums.spec.ts to reference the new lowercase member names.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/shared/types/enums.ts
Line: 2
Offending code: `ANNUAL = 'annual',`
Rule violated: LeaveType-member-name-casing
Action (do this now): Edit `src/shared/types/enums.ts` at line 2 in place to fix the `LeaveType-member-name-casing` violation.
What the quality gate found — apply this: [LeaveType-member-name-casing] The success criterion requires "each a string enum whose member name equals its value (lowercase)." The member name `ANNUAL` (uppercase) does not equal its value `'annual'` (lowercase). The member should be named `annual` to match the criterion. This applies to all six members (lines 2–7).

- Site 2
File: src/shared/types/enums.ts
Line: 2
Offending code: `ANNUAL = 'annual',`
Rule violated: review/spec-violation
Action (do this now): Edit `src/shared/types/enums.ts` at line 2 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] LeaveType enum member name 'ANNUAL' (uppercase) does not equal its value 'annual' (lowercase). Success criterion #1 requires "each a string enum whose member name equals its value (lowercase)" — meaning member names must be lowercase: annual, sick, emergency, unpaid, maternity, paternity. All six members (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY) have this same issue.

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