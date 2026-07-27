# Fix specific quality-gate violations: Phase 2: LeaveRequest model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e52e7dc9-5a2d-453b-b5a3-9d187c6021f7/2/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: tests/unit/modules/leave/leave.repository.test.ts
Line: 233
Offending code: `});`
Rule violated: review/test-coverage
Action (do this now): Edit `tests/unit/modules/leave/leave.repository.test.ts` at line 233 in place to fix the `review/test-coverage` violation.
What the quality gate found — apply this: [review/test-coverage] Success criterion #5 requires "a mocked-Knex test that rejects the query confirms the thrown error is a RepositoryError." The test file contains no test that calls mockRejectedValue on a Knex method and asserts the rejection is a RepositoryError. The repository implementation correctly wraps errors in RepositoryError (GP-006 satisfied), but the test coverage for this behavior is absent — zero occurrences of 'RepositoryError', 'mockRejectedValue', 'rejects', or 'toThrow' in the entire test file.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.