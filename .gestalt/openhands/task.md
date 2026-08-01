# Fix specific quality-gate violations: Phase 9: Leave service — core business logic

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/35df38af-c9d7-41ee-b412-79ee8d149189/9/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): In src/modules/leave/leave.service.ts, replace all six cross-module direct-file imports with barrel imports: change '../audit/audit.model' to '../audit', '../balance/balance.model' to '../balance', '../employee/employee.model' to '../employee', '../notification/notification.model' to '../notification', '../policy/policy.model' to '../policy', and '../../shared/utils/day-count' to '../../shared/utils'. Preserve all imported symbols.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.service.ts
Line: 9
Offending code: `import { IAuditRepository } from '../audit/audit.model';`
Rule violated: barrel-import-only
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 9 in place to fix the `barrel-import-only` violation.
What the quality gate found — apply this: [barrel-import-only] Imports from internal model file '../audit/audit.model' instead of the barrel export '../audit'. The barrel at src/modules/audit/index.ts exports IAuditRepository. Cross-module imports must go through the declared public entry point (index.ts).

- Site 2
File: src/modules/leave/leave.service.ts
Line: 10
Offending code: `import { IBalanceRepository, InsufficientBalanceError } from '../balance/balance.model';`
Rule violated: barrel-import-only
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 10 in place to fix the `barrel-import-only` violation.
What the quality gate found — apply this: [barrel-import-only] Imports from internal model file '../balance/balance.model' instead of the barrel export '../balance'. The barrel at src/modules/balance/index.ts exports both IBalanceRepository and InsufficientBalanceError.

- Site 3
File: src/modules/leave/leave.service.ts
Line: 11
Offending code: `import { IEmployeeRepository } from '../employee/employee.model';`
Rule violated: barrel-import-only
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 11 in place to fix the `barrel-import-only` violation.
What the quality gate found — apply this: [barrel-import-only] Imports from internal model file '../employee/employee.model' instead of the barrel export '../employee'. The barrel at src/modules/employee/index.ts exports IEmployeeRepository.

- Site 4
File: src/modules/leave/leave.service.ts
Line: 12
Offending code: `import { INotificationRepository } from '../notification/notification.model';`
Rule violated: barrel-import-only
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 12 in place to fix the `barrel-import-only` violation.
What the quality gate found — apply this: [barrel-import-only] Imports from internal model file '../notification/notification.model' instead of the barrel export '../notification'. The barrel at src/modules/notification/index.ts exports INotificationRepository.

- Site 5
File: src/modules/leave/leave.service.ts
Line: 8
Offending code: `import { calculateBusinessDays, getHolidaysForYear } from '../../shared/utils/day-count';`
Rule violated: barrel-import-only
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 8 in place to fix the `barrel-import-only` violation.
What the quality gate found — apply this: [barrel-import-only] Imports from internal file '../../shared/utils/day-count' instead of the barrel export '../../shared/utils'. The barrel at src/shared/utils/index.ts exports both calculateBusinessDays and getHolidaysForYear.

- Site 6
File: src/modules/leave/leave.service.ts
Line: 13
Offending code: `import { IPolicyRepository } from '../policy/policy.model';`
Rule violated: barrel-import-only
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 13 in place to fix the `barrel-import-only` violation.
What the quality gate found — apply this: [barrel-import-only] Imports from internal model file '../policy/policy.model' instead of the barrel export '../policy'. The barrel at src/modules/policy/index.ts exports IPolicyRepository.

- Site 7
File: src/modules/leave/leave.service.ts
Line: 8
Offending code: `import { IAuditRepository } from '../audit/audit.model';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 8 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Import bypasses the audit module's barrel export (index.ts). The constraint requires importing through the declared public entry point: `import { IAuditRepository } from '../audit';`

- Site 8
File: src/modules/leave/leave.service.ts
Line: 9
Offending code: `import { IBalanceRepository, InsufficientBalanceError } from '../balance/balance.model';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 9 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Import bypasses the balance module's barrel export (index.ts). The constraint requires importing through the declared public entry point: `import { IBalanceRepository, InsufficientBalanceError } from '../balance';`

- Site 9
File: src/modules/leave/leave.service.ts
Line: 10
Offending code: `import { IEmployeeRepository } from '../employee/employee.model';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 10 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Import bypasses the employee module's barrel export (index.ts). The constraint requires importing through the declared public entry point: `import { IEmployeeRepository } from '../employee';`

- Site 10
File: src/modules/leave/leave.service.ts
Line: 11
Offending code: `import { INotificationRepository } from '../notification/notification.model';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 11 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Import bypasses the notification module's barrel export (index.ts). The constraint requires importing through the declared public entry point: `import { INotificationRepository } from '../notification';`

- Site 11
File: src/modules/leave/leave.service.ts
Line: 12
Offending code: `import { IPolicyRepository } from '../policy/policy.model';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 12 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Import bypasses the policy module's barrel export (index.ts). The constraint requires importing through the declared public entry point: `import { IPolicyRepository } from '../policy';`

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): In src/modules/leave/index.ts, add two export lines alongside the existing exports: `export { ILeaveService } from './leave.service.interface';` and `export { LeaveService } from './leave.service';`

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/index.ts
Offending code: `export { LeaveRequest, ILeaveRepository } from './leave.model';
export { LeaveRepository } from './leave.repository';`
Rule violated: missing-barrel-exports
Action (do this now): Edit `src/modules/leave/index.ts` in place to fix the `missing-barrel-exports` violation.
What the quality gate found — apply this: [missing-barrel-exports] The leave barrel (index.ts) does not export ILeaveService or LeaveService. The success criteria require: "The leave barrel (src/modules/leave/index.ts) additionally exports ILeaveService and LeaveService alongside the existing LeaveRequest, ILeaveRepository, and LeaveRepository exports."

- Site 2
File: src/modules/leave/index.ts
Line: 1
Offending code: `export { LeaveRequest, ILeaveRepository } from './leave.model';
export { LeaveRepository } from './leave.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/index.ts` at line 1 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The leave barrel (index.ts) does not export ILeaveService and LeaveService as required by success criterion #10. Only LeaveRequest, ILeaveRepository, and LeaveRepository are exported.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 3 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Rename tests/unit/modules/leave/leave.service.spec.ts to tests/unit/modules/leave/leave.service.test.ts so Jest discovers and runs it under the configured testMatch pattern.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: tests/unit/modules/leave/leave.service.spec.ts
Offending code: `tests/unit/modules/leave/leave.service.spec.ts`
Rule violated: test-file-naming
Action (do this now): Edit `tests/unit/modules/leave/leave.service.spec.ts` in place to fix the `test-file-naming` violation.
What the quality gate found — apply this: [test-file-naming] The test file uses the `.spec.ts` extension, but jest.config.js only matches `**/tests/**/*.test.(ts|js)`. Jest does not discover or run this file (confirmed by `npx jest --listTests` — the file is absent). The success criteria require: "Unit tests exist and run under the Jest testMatch config (file extension .test.ts, not .spec.ts)."

- Site 2
File: tests/unit/modules/leave/leave.service.spec.ts
Line: 1
Offending code: `tests/unit/modules/leave/leave.service.spec.ts`
Rule violated: review/test-infrastructure
Action (do this now): Edit `tests/unit/modules/leave/leave.service.spec.ts` at line 1 in place to fix the `review/test-infrastructure` violation.
What the quality gate found — apply this: [review/test-infrastructure] Test file uses `.spec.ts` extension but Jest config only matches `**/tests/**/*.test.(ts|js)`. The 30 service tests are never executed. Verified: `npx jest --listTests` does not list this file, and `npx jest tests/unit/modules/leave/leave.service.spec.ts` reports "No tests found."

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.