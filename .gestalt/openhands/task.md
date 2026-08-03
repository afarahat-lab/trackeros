# Fix specific quality-gate violations: Phase 7: LeaveRequest service (business logic)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/8177937e-ec7c-4649-b943-9d9104b82731/7/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Replace all three cross-module repository imports in src/modules/leave-request/leave-request.service.ts with their module barrel exports: import ILeaveBalanceRepository from '../leave-balance', IEmployeeRepository from '../employee', and ILeavePolicyRepository from '../leave-policy' instead of reaching into the internal *.repository.ts files.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-request/leave-request.service.ts
Line: 2
Offending code: `import { ILeaveBalanceRepository } from '../leave-balance/leave-balance.repository';`
Rule violated: barrel-export-only
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 2 in place to fix the `barrel-export-only` violation.
What the quality gate found — apply this: [barrel-export-only] Cross-module import bypasses the public barrel export. The leave-balance module's index.ts exports ILeaveBalanceRepository, but this import reaches directly into the internal leave-balance.repository.ts file. Per ARCHITECTURE.md: "Modules import from each other ONLY through their declared public entry point (index.ts)".

- Site 2
File: src/modules/leave-request/leave-request.service.ts
Line: 3
Offending code: `import { IEmployeeRepository } from '../employee/employee.repository';`
Rule violated: barrel-export-only
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 3 in place to fix the `barrel-export-only` violation.
What the quality gate found — apply this: [barrel-export-only] Cross-module import bypasses the public barrel export. The employee module's index.ts exports IEmployeeRepository, but this import reaches directly into the internal employee.repository.ts file. Per ARCHITECTURE.md: "Modules import from each other ONLY through their declared public entry point (index.ts)".

- Site 3
File: src/modules/leave-request/leave-request.service.ts
Line: 4
Offending code: `import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository';`
Rule violated: barrel-export-only
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 4 in place to fix the `barrel-export-only` violation.
What the quality gate found — apply this: [barrel-export-only] Cross-module import bypasses the public barrel export. The leave-policy module's index.ts exports ILeavePolicyRepository, but this import reaches directly into the internal leave-policy.repository.ts file. Per ARCHITECTURE.md: "Modules import from each other ONLY through their declared public entry point (index.ts)".

- Site 4
File: src/modules/leave-request/leave-request.service.ts
Line: 2
Offending code: `import { ILeaveBalanceRepository } from '../leave-balance/leave-balance.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 2 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public entry point. ARCHITECTURE.md requires modules to import from each other ONLY through their declared public entry point (index.ts). The leave-balance module's index.ts already exports ILeaveBalanceRepository. Import from '../leave-balance' instead of '../leave-balance/leave-balance.repository'.

- Site 5
File: src/modules/leave-request/leave-request.service.ts
Line: 3
Offending code: `import { IEmployeeRepository } from '../employee/employee.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 3 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public entry point. ARCHITECTURE.md requires modules to import from each other ONLY through their declared public entry point (index.ts). The employee module's index.ts already exports IEmployeeRepository. Import from '../employee' instead of '../employee/employee.repository'.

- Site 6
File: src/modules/leave-request/leave-request.service.ts
Line: 4
Offending code: `import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 4 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import bypasses the public entry point. ARCHITECTURE.md requires modules to import from each other ONLY through their declared public entry point (index.ts). The leave-policy module's index.ts already exports ILeavePolicyRepository. Import from '../leave-policy' instead of '../leave-policy/leave-policy.repository'.

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