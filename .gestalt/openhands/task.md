# Fix specific quality-gate violations: Phase 7: Leave module — model, repository, and validation

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/4fbbfee4-4feb-4a2b-8127-85025f82af24/7/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Create src/modules/leave/index.ts as a barrel that re-exports all public symbols from leave.model.ts (LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams, LeaveStatus), leave.repository.ts (ILeaveRepository, LeaveRepository), and leave.validation.ts (createLeaveRequestSchema, updateLeaveRequestSchema), following the pattern in src/modules/employee/index.ts.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/index.ts
Offending code: `(file does not exist)`
Rule violated: barrel-required
Action (do this now): Edit `src/modules/leave/index.ts` in place to fix the `barrel-required` violation.
What the quality gate found — apply this: [barrel-required] The leave module barrel (index.ts) was not created. ARCHITECTURE.md states "Modules import from each other ONLY through their declared public entry point (index.ts)" and the success criteria require "The leave barrel (index.ts) re-exports the model types, the repository interface and class, and the validation schemas." The file is absent from the working tree.

- Site 2
File: src/modules/leave/index.ts
Offending code: `src/modules/leave/leave.model.ts`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/index.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Missing barrel export (index.ts). Success criterion #10 requires: "The leave barrel (index.ts) re-exports the model types, the repository interface and class, and the validation schemas." The file does not exist; all other modules (employee, policy, balance, notification, audit) have an index.ts barrel.

- Site 3
File: src/modules/leave/index.ts
Offending code: `- **No barrel (`index.ts`):** The leave module currently has no barrel export, unlike all other modules. Consumers must import directly from individual files.`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/index.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Missing barrel export (index.ts). Success criterion #10 requires: "The leave barrel (index.ts) re-exports the model types, the repository interface and class, and the validation schemas." The file does not exist; all other modules (employee, policy, balance, notification, audit) have an index.ts barrel. ARCHITECTURE.md documents this as a known divergence.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 1
File: tests/unit/modules/leave/leave.repository.test.ts
Offending code: `(file does not exist)`
Rule violated: tests-missing
Action (do this now): Edit `tests/unit/modules/leave/leave.repository.test.ts` in place to fix the `tests-missing` violation.
What the quality gate found — apply this: [tests-missing] The required test file tests/unit/modules/leave/leave.repository.test.ts was not created. The task explicitly requires "Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts" and the success criteria require "Unit tests cover found, not-found, empty-result, and database-error cases for every repository method." The tests/unit/modules/leave/ directory does not exist.

### Edit 2
File: tests/unit/modules/leave/leave.validation.test.ts
Offending code: `(file does not exist)`
Rule violated: tests-missing
Action (do this now): Edit `tests/unit/modules/leave/leave.validation.test.ts` in place to fix the `tests-missing` violation.
What the quality gate found — apply this: [tests-missing] The required test file tests/unit/modules/leave/leave.validation.test.ts was not created. The task explicitly requires "Jest unit tests in tests/unit/modules/leave/leave.validation.test.ts" and the success criteria require "validation tests cover valid and each invalid-input case." The tests/unit/modules/leave/ directory does not exist.

### Edit 3
File: tests/unit/modules/leave/
Offending code: `- **No tests:** The plan prescribed `tests/unit/modules/leave/leave.repository.test.ts` and `tests/unit/modules/leave/leave.validation.test.ts`; neither was created in this phase.`
Rule violated: review/architecture
Action (do this now): Edit `tests/unit/modules/leave/` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Missing unit tests. Success criterion #11 requires: "Unit tests cover found, not-found, empty-result, and database-error cases for every repository method, asserting exact SQL via toHaveBeenCalledWith / stringContaining; validation tests cover valid and each invalid-input case." Consistency requirement #5 mandates tests at tests/unit/modules/leave/leave.repository.test.ts and tests/unit/modules/leave/leave.validation.test.ts. No test files exist under tests/ for the leave module.

### Edit 4
File: src/modules/leave/leave.repository.ts
Line: 1
Offending code: `import { randomUUID } from 'crypto';`
Rule violated: review/code-quality
Action (do this now): Edit `src/modules/leave/leave.repository.ts` at line 1 in place to fix the `review/code-quality` violation.
What the quality gate found — apply this: [review/code-quality] Unused import: `randomUUID` is imported but never called anywhere in the file. The `create` method does not generate a UUID for the `id` column — it relies on a database default. This is dead code and suggests the developer intended to generate UUIDs but forgot to wire it up.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.