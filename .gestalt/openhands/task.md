# Fix specific quality-gate violations: Phase 1: Shared enums and base types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/022f5981-2f89-498b-906d-0f2e5bf44abd/1/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Add UNDER_REVIEW = 'UNDER_REVIEW' to the LeaveStatus enum between SUBMITTED and APPROVED, and add a corresponding test assertion for LeaveStatus.UNDER_REVIEW while updating the LeaveStatus member-count assertion from 5 to 6.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/shared/types/leave.enums.ts
Line: 5
Offending code: `APPROVED = 'APPROVED',`
Rule violated: review/architecture
Action (do this now): Edit `src/shared/types/leave.enums.ts` at line 5 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] LeaveStatus enum is missing UNDER_REVIEW member. ARCHITECTURE.md line 62 defines the LeaveRequest lifecycle as "DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED/CANCELLED" and BR-002 (line 68) references UNDER_REVIEW as a valid overlapping state. The enum omits this required state.

- Site 2
File: tests/unit/shared/types/leave.enums.test.ts
Line: 10
Offending code: `expect(LeaveStatus.APPROVED).toBe('APPROVED');`
Rule violated: review/architecture
Action (do this now): Edit `tests/unit/shared/types/leave.enums.test.ts` at line 10 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Test verifies APPROVED but does not verify UNDER_REVIEW, which ARCHITECTURE.md line 62 requires as a LeaveRequest lifecycle state. The test will need updating when the enum is corrected.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Replace the PolicyStatus enum members INACTIVE and ARCHIVED with SUPERSEDED and REVOKED respectively so the enum matches the documented lifecycle: ACTIVE, SUPERSEDED, REVOKED. Update any test assertions for PolicyStatus accordingly.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/shared/types/leave.enums.ts
Line: 17
Offending code: `INACTIVE = 'INACTIVE',`
Rule violated: review/architecture
Action (do this now): Edit `src/shared/types/leave.enums.ts` at line 17 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] PolicyStatus enum uses INACTIVE and ARCHIVED, but ARCHITECTURE.md line 60 defines the LeavePolicy lifecycle as "ACTIVE, SUPERSEDED, REVOKED". The enum members do not match the documented domain lifecycle.

- Site 2
File: src/shared/types/leave.enums.ts
Line: 18
Offending code: `ARCHIVED = 'ARCHIVED',`
Rule violated: review/architecture
Action (do this now): Edit `src/shared/types/leave.enums.ts` at line 18 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] PolicyStatus enum uses ARCHIVED, but ARCHITECTURE.md line 60 defines the LeavePolicy lifecycle as "ACTIVE, SUPERSEDED, REVOKED". ARCHIVED is not a documented lifecycle state.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 1
File: src/shared/types/leave.enums.ts
Line: 23
Offending code: `EXPIRED = 'EXPIRED',`
Rule violated: review/architecture
Action (do this now): Edit `src/shared/types/leave.enums.ts` at line 23 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] BalanceStatus enum uses EXPIRED, but ARCHITECTURE.md line 61 defines the LeaveBalance lifecycle as "ACTIVE, EXHAUSTED, FROZEN". EXPIRED is not a documented lifecycle state, and EXHAUSTED and FROZEN are missing.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.