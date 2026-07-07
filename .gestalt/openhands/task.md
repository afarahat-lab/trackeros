# Fix specific quality-gate violations: Phase 2: Employee module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/cea62b22-5636-423f-b1cb-ef65b5b11db5/2/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: src/modules/employee/employee.repository.ts
Line: 114
Rule violated: error-handling
Required change: Edit src/modules/employee/employee.repository.ts to resolve the error-handling violation: [error-handling] The `create()` method calls `mapRow(result.rows[0])` without first checking that `result.rows[0]` exists. If the INSERT query returns zero rows (e.g., due to a database error or constraint violation that doesn't throw), `result.rows[0]` is `undefined`, and `mapRow(undefined)` will throw a TypeError that propagates unhandled to the caller. The `findById`, `findByEmployeeNumber`, and `findByEmail` methods correctly guard with `result.rows.length > 0 ? mapRow(result.rows[0]) : null` — `create()` and `update()` should follow the same pattern.
  Evidence: "return mapRow(result.rows[0]);"

### Edit 2
File: src/modules/employee/employee.repository.ts
Line: 152
Rule violated: error-handling
Required change: Edit src/modules/employee/employee.repository.ts to resolve the error-handling violation: [error-handling] The `update()` method calls `mapRow(result.rows[0])` without first checking that `result.rows[0]` exists. If the UPDATE query matches zero rows (e.g., the employee was already soft-deleted or the id doesn't exist), `result.rows[0]` is `undefined`, and `mapRow(undefined)` will throw a TypeError that propagates unhandled to the caller. The `findById`, `findByEmployeeNumber`, and `findByEmail` methods correctly guard with `result.rows.length > 0 ? mapRow(result.rows[0]) : null` — `update()` should follow the same pattern.
  Evidence: "return mapRow(result.rows[0]);"

### Edit 3
File: src/modules/employee/employee.repository.ts
Line: 142
Rule violated: error-handling
Required change: Edit src/modules/employee/employee.repository.ts to resolve the error-handling violation: [error-handling] The `update()` method throws a raw `Error` instead of using the project's established error hierarchy. The project defines `ValidationError` in `src/shared/errors/index.ts` (statusCode 400, code 'VALIDATION_ERROR'), which is the appropriate type for this case. Using a raw `Error` bypasses the project's error-handling conventions and makes it harder for upstream layers (controllers, error middleware) to distinguish validation failures from unexpected runtime errors.
  Evidence: "throw new Error('No fields to update');"

### Edit 4
File: src/modules/employee/employee.repository.ts
Line: 131
Rule violated: review/bug
Required change: Edit src/modules/employee/employee.repository.ts to resolve the review/bug violation: [review/bug] The `update` method does not check whether a row was actually updated before calling `mapRow(result.rows[0])`. If the employee ID does not exist or the record is soft-deleted, `result.rows[0]` is `undefined` and `mapRow(undefined)` throws a TypeError. Compare with `findById` (line 50) which correctly guards with `result.rows.length > 0`.
  Evidence: "    return mapRow(result.rows[0]);"
  Fix: Add a guard before the return: `if (result.rows.length === 0) throw new NotFoundError('Employee', id);` (or return null if the interface allows it).

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.