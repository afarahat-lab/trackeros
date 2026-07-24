# Fix specific quality-gate violations: Phase 3: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e7c49d71-30a2-45f6-9ac3-179c69d7de0f/3/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: tests/unit/modules/leave/leave-policy.repository.test.ts
Line: 72
Rule violated: test-failed
Action (do this now): Edit `tests/unit/modules/leave/leave-policy.repository.test.ts` at line 72 in place to fix the `test-failed` violation.
What the quality gate found — apply this: Jest test 'LeavePolicyRepository › findAll › should return all non-deleted policies ordered by name' in tests/unit/modules/leave/leave-policy.repository.test.ts:72 failed deterministically: expected mockQuery called with 1 arg (SQL string), received 2 args (SQL string, undefined). Exit code 1, 1 failed / 35 passed. Not flaky or environmental — same inputs reproduce the failure. The repository is passing an extra undefined parameter, or the test expectation needs updating; either way this is an unambiguous real defect that must block.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.