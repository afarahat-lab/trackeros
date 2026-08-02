# Fix specific quality-gate violations: Phase 1: Shared types and enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e207b7c2-5967-4897-aeeb-2fac2e370ce3/1/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: tests/unit/shared/types/enums.spec.ts
Offending code: `import { LeaveType, LeaveStatus, AuditAction } from '../../../../src/shared/types/enums';`
Rule violated: review/convention
Action (do this now): Edit `tests/unit/shared/types/enums.spec.ts` in place to fix the `review/convention` violation.
What the quality gate found — apply this: [review/convention] Duplicate test file with .spec.ts extension violates project convention. AGENTS.md states: "Test files use the .test.ts extension ... the project convention is .test.ts — do not create .spec.ts files." The file tests/unit/shared/types/enums.spec.ts is identical to enums.test.ts and should be removed.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.