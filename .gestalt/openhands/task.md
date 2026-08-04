# Fix specific quality-gate violations: Phase 8a: Leave Service — Foundation, Errors & CRUD

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/4fbbfee4-4feb-4a2b-8127-85025f82af24/8/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Remove the locally-defined InsufficientBalanceError class from leave.service.ts and import it from the balance module barrel instead; update leave/index.ts to re-export InsufficientBalanceError from '../balance' rather than from './leave.service', ensuring a single canonical class identity for cross-module instanceof checks.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.service.ts
Line: 13
Offending code: `export class InsufficientBalanceError extends Error {`
Rule violated: InsufficientBalanceError-redefinition
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 13 in place to fix the `InsufficientBalanceError-redefinition` violation.
What the quality gate found — apply this: [InsufficientBalanceError-redefinition] InsufficientBalanceError is redefined in the leave service instead of being imported/re-exported from the balance module (src/modules/balance/balance.service.ts). The spec constraint states: "InsufficientBalanceError must be imported/re-exported from the balance module, NOT redefined in the leave service — redefining would break instanceof checks across module boundaries." The balance module already exports InsufficientBalanceError at balance.service.ts:5, and the leave module's index.ts re-exports the locally-defined version from ./leave.service rather than from the balance module.

- Site 2
File: src/modules/leave/leave.service.ts
Line: 13
Offending code: `export class InsufficientBalanceError extends Error {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 13 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] InsufficientBalanceError is redefined in leave.service.ts instead of being imported from the balance module (src/modules/balance/balance.service.ts). The spec constraint explicitly states: "InsufficientBalanceError must be imported/re-exported from the balance module, NOT redefined in the leave service — redefining would break instanceof checks across module boundaries." The redefined version has a different constructor signature (remainingBalance, requestedDays) vs the balance module's (balanceId, requested, remaining).

- Site 3
File: src/modules/leave/index.ts
Line: 8
Offending code: `InsufficientBalanceError,`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/index.ts` at line 8 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The barrel exports InsufficientBalanceError from ./leave.service (where it is redefined), but the spec requires it to be re-exported from the balance module. The consistency requirement states: "The leave module barrel (index.ts) must be updated to export ... plus re-export InsufficientBalanceError from the balance module." Exporting the redefined version breaks instanceof checks across module boundaries.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 1
File: src/modules/leave/leave.service.ts
Line: 4
Offending code: `import { IBalanceService } from '../balance/balance.service';`
Rule violated: barrel-import-violation
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 4 in place to fix the `barrel-import-violation` violation.
What the quality gate found — apply this: [barrel-import-violation] Cross-module import bypasses the barrel (index.ts). ARCHITECTURE.md states: "Modules import from each other ONLY through their declared public entry point (index.ts)." This import should be from '../balance' (the barrel), not '../balance/balance.service'. The same violation occurs on lines 5 (audit), 6 (notification), 7 (policy), and 8 (employee) — all five cross-module imports go directly to internal files instead of through their respective barrel files.

### Edit 2
File: src/modules/leave/leave.service.ts
Line: 103
Offending code: `if (actor.id !== dto.employeeId) {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 103 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The create() authorization check blocks all actors (including managers and hr_admins) from creating leave requests for other employees. The spec's interface constraint for create states: "Employee actor may only create for themselves (dto.employeeId === actor.id). Manager and hr_admin actors may create for any employee." The current blanket check (actor.id !== dto.employeeId) prevents managers and hr_admins from exercising their authorized access.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.