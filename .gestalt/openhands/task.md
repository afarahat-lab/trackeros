# Fix specific quality-gate violations: Phase 2: LeaveRequest model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e52e7dc9-5a2d-453b-b5a3-9d187c6021f7/2/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: src/modules/leave/leave.repository.ts
Line: 41
Offending code: `const [row] = await this.db(TABLE_NAME).insert(entity).returning('*');`
Rule violated: error-handling-explicit
Action (do this now): Edit `src/modules/leave/leave.repository.ts` at line 41 in place to fix the `error-handling-explicit` violation.
What the quality gate found — apply this: [error-handling-explicit] The KnexLeaveRepository class contains zero error handling across all its methods (findById, findAll, findByEmployeeId, findByStatus, create, update, delete). Every database operation — including this insert — can throw Knex/pg errors (connection failures, constraint violations, etc.) that propagate unhandled to callers. The architectural rule requires explicit error handling so that callers are not exposed to raw failures from dependencies. The repository must wrap database calls in try/catch and translate low-level errors into domain-appropriate error types.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.