# Fix specific quality-gate violations: Phase 9: Leave service — core business logic

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/10/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Replace all 6 cross-module import statements in src/modules/leave/leave.service.ts to import through each module's public barrel instead of internal files: IEmployeeRepository from '../employee', ILeavePolicyRepository from '../policy', ILeaveBalanceRepository from '../balance', IHolidayRepository from '../../shared/holidays', INotificationService from '../notification', and IAuditLogRepository from '../audit'.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.service.ts
Line: 4
Offending code: `import type { IEmployeeRepository } from '../employee/employee.repository';`
Rule violated: cross-module-barrel-imports
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 4 in place to fix the `cross-module-barrel-imports` violation.
What the quality gate found — apply this: [cross-module-barrel-imports] Cross-module import bypasses the barrel (index.ts). The constraint requires imports from other modules to go through each module's public entry point (e.g., '../employee' not '../employee/employee.repository'). All 6 cross-module imports in this file (lines 4-9) violate this rule — they import directly from internal files (employee.repository, policy.repository, balance.repository, holiday.repository, notification.service.interface, audit.repository) instead of their respective barrels, even though every needed type is re-exported by the corresponding index.ts.

- Site 2
File: src/modules/leave/leave.service.ts
Line: 4
Offending code: `import type { IEmployeeRepository } from '../employee/employee.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 4 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public barrel (index.ts). The spec constraint requires imports through each module's public entry point. The employee barrel at '../employee' exports IEmployeeRepository — import from '../employee' instead.

- Site 3
File: src/modules/leave/leave.service.ts
Line: 5
Offending code: `import type { ILeavePolicyRepository } from '../policy/policy.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 5 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public barrel (index.ts). The spec constraint requires imports through each module's public entry point. The policy barrel at '../policy' exports ILeavePolicyRepository — import from '../policy' instead.

- Site 4
File: src/modules/leave/leave.service.ts
Line: 6
Offending code: `import type { ILeaveBalanceRepository } from '../balance/balance.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 6 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public barrel (index.ts). The spec constraint requires imports through each module's public entry point. The balance barrel at '../balance' exports ILeaveBalanceRepository — import from '../balance' instead.

- Site 5
File: src/modules/leave/leave.service.ts
Line: 7
Offending code: `import type { IHolidayRepository } from '../../shared/holidays/holiday.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 7 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public barrel (index.ts). The spec constraint requires imports through each module's public entry point. The holidays barrel at '../../shared/holidays' exports IHolidayRepository — import from '../../shared/holidays' instead.

- Site 6
File: src/modules/leave/leave.service.ts
Line: 8
Offending code: `import type { INotificationService } from '../notification/notification.service.interface';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 8 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public barrel (index.ts). The spec constraint requires imports through each module's public entry point. The notification barrel at '../notification' exports INotificationService — import from '../notification' instead.

- Site 7
File: src/modules/leave/leave.service.ts
Line: 9
Offending code: `import type { IAuditLogRepository } from '../audit/audit.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 9 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public barrel (index.ts). The spec constraint requires imports through each module's public entry point. The audit barrel at '../audit' exports IAuditLogRepository — import from '../audit' instead.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.