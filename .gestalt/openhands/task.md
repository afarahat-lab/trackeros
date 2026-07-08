# Fix specific quality-gate violations: Phase 2: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/a88212d7-6a1c-4612-8a09-8a5db627b262/2/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: src/modules/policy/policy.model.ts
Line: 8
Offending code: `accrualRate: number;"
  Fix: Change to `accrualRate: number | null;`
Rule violated: review/type-safety
Action (do this now): Edit `src/modules/policy/policy.model.ts` at line 8 in place to fix the `review/type-safety` violation.
What the quality gate found — apply this: [review/type-safety] `accrualRate` is typed as `number` but the intent spec and DOMAIN.md both require `number | null`. This field is nullable in the canonical schema.

### Edit 2
File: src/modules/policy/policy.model.ts
Line: 9
Offending code: `maxAccumulation: number;"
  Fix: Change to `maxAccumulation: number | null;`
Rule violated: review/type-safety
Action (do this now): Edit `src/modules/policy/policy.model.ts` at line 9 in place to fix the `review/type-safety` violation.
What the quality gate found — apply this: [review/type-safety] `maxAccumulation` is typed as `number` but the intent spec and DOMAIN.md both require `number | null`. This field is nullable in the canonical schema.

### Edit 3
File: src/modules/policy/policy.model.ts
Line: 10
Offending code: `minimumNoticeDays: number;"
  Fix: Change to `minimumNoticeDays: number | null;`
Rule violated: review/type-safety
Action (do this now): Edit `src/modules/policy/policy.model.ts` at line 10 in place to fix the `review/type-safety` violation.
What the quality gate found — apply this: [review/type-safety] `minimumNoticeDays` is typed as `number` but the intent spec and DOMAIN.md both require `number | null`. This field is nullable in the canonical schema.

### Edit 4
File: src/modules/policy/policy.repository.ts
Line: 5
Offending code: `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;"
  Fix: Change return type to `Promise<LeavePolicy[]>` and update the mock + tests accordingly.`
Rule violated: review/interface-contract
Action (do this now): Edit `src/modules/policy/policy.repository.ts` at line 5 in place to fix the `review/interface-contract` violation.
What the quality gate found — apply this: [review/interface-contract] `findByLeaveType` returns `Promise<LeavePolicy | null>` but the intent spec requires `Promise<LeavePolicy[]>`. A leave type can map to multiple policies (e.g., different fiscal years or variants), so the array return is the correct contract.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.