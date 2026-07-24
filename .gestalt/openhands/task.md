# Fix specific quality-gate violations: Phase 2: Shared base repository and error types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e7c49d71-30a2-45f6-9ac3-179c69d7de0f/2/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: tests/unit/shared/base-repository.test.ts
Line: 36
Rule violated: test-failed
Action (do this now): Edit `tests/unit/shared/base-repository.test.ts` at line 36 in place to fix the `test-failed` violation.
What the quality gate found — apply this: The 'test' check (jest --passWithNoTests) exited with code 1. The test suite tests/unit/shared/base-repository.test.ts failed to run due to four deterministic TypeScript compilation errors (TS2345) at lines 36, 47, 58, and 71: 'Argument of type ... is not assignable to parameter of type never' on mockPool.query.mockResolvedValueOnce/mockRejectedValueOnce calls. This is a genuine type error in application test code, not flaky or environmental. ci-results.json confirms test=failure. The run should block.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.