# Fix specific quality-gate violations: Phase 4: LeaveBalance model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e7c49d71-30a2-45f6-9ac3-179c69d7de0f/4/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Add `fiscalYear: number` as the third parameter to `findByEmployeeAndPolicy` in both the interface and implementation, include `AND fiscal_year = $3` in the SQL WHERE clause, and update all test calls to `findByEmployeeAndPolicy` to pass the `fiscalYear` argument.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave-balance.repository.ts
Line: 8
Offending code: `findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null>;`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave-balance.repository.ts` at line 8 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The success criteria specifies `findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number)` with a `fiscalYear` parameter, but the implementation omits it. The architecture defines a unique constraint on `(employee_id, leave_policy_id, fiscal_year)`, so omitting `fiscalYear` means the query cannot reliably return the correct balance when multiple fiscal years exist for the same employee+policy pair.

- Site 2
File: tests/unit/modules/leave/leave-balance.repository.test.ts
Line: 96
Offending code: `'SELECT * FROM leave_balance WHERE employee_id = $1 AND policy_id = $2',`
Rule violated: review/architecture
Action (do this now): Edit `tests/unit/modules/leave/leave-balance.repository.test.ts` at line 96 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Test asserts the wrong column name `policy_id`; ARCHITECTURE.md specifies `leave_policy_id` for the `leave_balance` table. The test will pass against the current (incorrect) implementation but would fail against a correctly migrated database.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Replace all occurrences of the SQL column name `policy_id` with `leave_policy_id` across the repository (findByEmployeeAndPolicy, create, upsert, and ON CONFLICT clauses) and in the test file's expected SQL strings.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave-balance.repository.ts
Line: 37
Offending code: `'SELECT * FROM leave_balance WHERE employee_id = $1 AND policy_id = $2',`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave-balance.repository.ts` at line 37 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The ARCHITECTURE.md specifies the column name as `leave_policy_id` in the `leave_balance` table, but the repository uses `policy_id` throughout all SQL queries. This mismatch means the repository will fail at runtime against a database built from the architecture specification.

- Site 2
File: src/modules/leave/leave-balance.repository.ts
Line: 37
Offending code: `'SELECT * FROM leave_balance WHERE employee_id = $1 AND policy_id = $2',`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave-balance.repository.ts` at line 37 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] ARCHITECTURE.md specifies the column as `leave_policy_id` in the `leave_balance` table, but the repository uses `policy_id` in all SQL queries (findByEmployeeAndPolicy, create INSERT, upsert INSERT, and ON CONFLICT clause). This mismatch will cause runtime failures against a database built from the architecture specification.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.