# Fix specific quality-gate violations: Phase 1: Shared foundation — types, base repository, error types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/b05db51f-a0dc-4cb4-93b3-8c6655f6f6af/1/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Rewrite all three enums in src/shared/types/index.ts to match ARCHITECTURE.md exactly: LeaveType gains UNPAID, MATERNITY, PATERNITY; LeaveRequestStatus replaces PENDING with DRAFT and SUBMITTED; EmployeeStatus drops ON_LEAVE. Update the corresponding Jest tests to use the corrected enum values.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/shared/types/index.ts
Line: 4
Offending code: `EMERGENCY = 'EMERGENCY',`
Rule violated: review/architecture
Action (do this now): Edit `src/shared/types/index.ts` at line 4 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] LeaveType enum is missing three values declared in ARCHITECTURE.md: UNPAID, MATERNITY, PATERNITY. The architecture specifies six leave types; only three are implemented.

- Site 2
File: src/shared/types/index.ts
Line: 8
Offending code: `PENDING = 'PENDING',`
Rule violated: review/architecture
Action (do this now): Edit `src/shared/types/index.ts` at line 8 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] LeaveRequestStatus uses 'PENDING' but ARCHITECTURE.md defines the lifecycle as DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. The 'PENDING' value conflates DRAFT and SUBMITTED into a single state, breaking BR-013 notification rules which distinguish DRAFT→SUBMITTED transitions.

- Site 3
File: src/shared/types/index.ts
Line: 18
Offending code: `ON_LEAVE = 'ON_LEAVE',`
Rule violated: review/architecture
Action (do this now): Edit `src/shared/types/index.ts` at line 18 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] EmployeeStatus includes 'ON_LEAVE' which is not declared in ARCHITECTURE.md. The canonical Employee lifecycle states are ACTIVE, INACTIVE, TERMINATED only. The extra value may cause confusion with the ACTIVE state for eligibility checks (BR-001).

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.