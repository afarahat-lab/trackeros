# Fix specific quality-gate violations: Phase 5: LeaveBalance model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/bfdb6110-c37d-4c1b-a01f-6fca50944d25/5/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Add both `findById(id: string): Promise<LeaveBalance | null>` and `softDelete(id: string): Promise<boolean>` to `ILeaveBalanceRepository` and implement them in `LeaveBalanceRepository` following the established pattern in `leave-type.repository.ts`; refactor the `update` method's empty-fields fallback to delegate to `this.findById(id)` instead of inlining a raw `pool.query`.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave-balance.repository.ts
Line: 4
Offending code: `export interface ILeaveBalanceRepository {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave-balance.repository.ts` at line 4 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Missing `softDelete` method. Every existing repository in the project (EmployeeRepository, LeaveTypeRepository, LeavePolicyRepository) declares and implements `softDelete(id: string): Promise<boolean>`. The new ILeaveBalanceRepository omits it, yet all its SQL queries filter on `deleted_at IS NULL`, implying the column exists and soft-delete semantics are expected.

- Site 2
File: src/modules/leave/leave-balance.repository.ts
Line: 4
Offending code: `export interface ILeaveBalanceRepository {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave-balance.repository.ts` at line 4 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Missing `findById` method. Every existing repository in the project (EmployeeRepository, LeaveTypeRepository, LeavePolicyRepository) declares `findById(id: string): Promise<T | null>`. The new ILeaveBalanceRepository omits it, yet the `update` method's empty-fields fallback (line 82-85) inlines a raw `pool.query` for the same purpose instead of delegating to a `findById` method, breaking the established pattern.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.