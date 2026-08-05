# Fix specific quality-gate violations: Phase 4: LeaveBalance model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/be068fd3-a1c9-4eb0-ae38-156852fec5c5/4/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: src/modules/leave-balance/leave-balance.repository.ts
Line: 33
Rule violated: test-failure
Action (do this now): Edit `src/modules/leave-balance/leave-balance.repository.ts` at line 33 in place to fix the `test-failure` violation.
What the quality gate found — apply this: Failing test: PgLeaveBalanceRepository › incrementUsedDays › should throw BalanceNotActiveError when balance is CLOSED. expect(received).rejects.toThrow(expected) Expected substring: "Balance lb-001 is not ACTIVE (status: CLOSED); only ACTIVE balances can be modified" Received message:   "Cannot read properties of undefined (reading 'rows')" at Object.toThrow (node_modules/expect/build/index.js:218:22)

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.