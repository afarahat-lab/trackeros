# Fix specific quality-gate violations: Phase 8: LeaveRequestService — core orchestration

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/76d847b2-5905-40af-b702-36710232b1e4/8/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `ILeaveBalanceRepository` symbol imported into `leave-request.service.ts` must be the identical TypeScript type exported from `src/modules/leave-balance/index.ts` (which re-exports from `leave-balance.repository.ts`). (see `src/modules/leave-balance/index.ts`)
- The `ILeavePolicyRepository` symbol imported into `leave-request.service.ts` must be the identical TypeScript type exported from `src/modules/leave-policy/index.ts` (which re-exports from `leave-policy.repository.ts`). (see `src/modules/leave-policy/index.ts`)
- The `IEmployeeRepository` symbol imported into `leave-request.service.ts` must be the identical TypeScript type exported from `src/modules/employee/index.ts` (which re-exports from `employee.repository.ts`). (see `src/modules/employee/index.ts`)

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

## Architecture & constraint rules the quality gate enforces (satisfy these now)
The quality gate judges your code against the rules below and BLOCKS the phase on any violation — a violation it rates critical escalates to a human with no automatic retry. These are the same rules the gate checks, so comply up front rather than leaving them for the gate:
- Data access is only permitted in the designated data access layer of this project. Code in business logic, presentation, or routing layers must delegate all data operations to the data access layer.
- The data access layer is the only layer permitted to contain connection management, query execution, and direct interaction with the data store.
- Each architectural layer communicates only with its immediately adjacent layer. Layers must not bypass intermediate layers.
- Dependencies flow in one direction only — from outer layers toward inner layers. Inner layers must not depend on outer layers.
- Error handling must be explicit. Callers must not be exposed to unhandled failures from dependencies.
- Do not redefine a symbol another module already owns. Before declaring an error class, DTO, interface, enum, or constant, check whether a symbol representing the SAME concept is already exported by another module; if so, import it from that module's public entry point instead of declaring a second copy. The test is conceptual identity, NOT name identity — a symbol that shares a name but represents a genuinely DIFFERENT concept (different fields or meaning, owned by THIS module) is a legitimately distinct declaration and is not a violation; only flag a declaration that duplicates the shape and meaning of an existing exported symbol.

## Module boundary & dependency rules (satisfy these now)
The quality gate's review judges your code against the project's cross-module dependency rules below and BLOCKS the phase on a violation. These govern how modules depend on each other: import another module ONLY through its declared public entry point (its barrel / index) — never reach into another module's internal files — and introduce no circular dependencies. Comply now rather than leaving them for the gate:
- Modules import from each other ONLY through their declared public entry point (`index.ts`, `__init__.py`, package root — whatever the stack uses)
- No circular dependencies between modules

## Golden principles (NON-NEGOTIABLE — satisfy every one that applies)
These are the project's non-negotiable invariants. A violation is a GOLDEN_PRINCIPLE_BREACH: the quality gate BLOCKS the phase and escalates to a human with NO automatic retry, so it is far more costly than an ordinary finding. Apply EVERY principle relevant to the code you write in this phase — e.g. enforce role-based access control on every API endpoint you add, and validate all inputs at API boundaries before use:
- GP-001 — Repository pattern: All database access goes through repository interfaces. Never query the database directly from services or controllers.
- GP-002 — Audit records: All state-changing operations write an audit record.
- GP-003 — Input validation: Validate all inputs at API boundaries before processing.
- GP-004 — No sensitive data in logs: Never log passwords, tokens, PII, or financial data.
- GP-005 — RBAC enforcement: All API endpoints enforce role-based access control.
- GP-006 — Error handling: No unhandled promise rejections. All async errors are caught and handled.

## Project stack & references
Before making the edits below, read the referenced files (those present in the working directory) to learn the project's architecture, conventions, and the cross-cutting rules your fix must still satisfy — then keep the edits consistent with them:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Replace all three direct internal-file imports in src/modules/leave-request/leave-request.service.ts with barrel imports through each module's public entry point: change `import { ILeaveBalanceRepository } from '../leave-balance/leave-balance.repository'` to `import { ILeaveBalanceRepository } from '../leave-balance'`, `import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository'` to `import { ILeavePolicyRepository } from '../leave-policy'`, and `import { IEmployeeRepository } from '../employee/employee.repository'` to `import { IEmployeeRepository } from '../employee'`.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-request/leave-request.service.ts
Line: 3
Offending code: `import { ILeaveBalanceRepository } from '../leave-balance/leave-balance.repository';`
Rule violated: dependency-rule-barrel-imports
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 3 in place to fix the `dependency-rule-barrel-imports` violation.
What the quality gate found — apply this: [dependency-rule-barrel-imports] ARCHITECTURE.md states: "Modules import from each other ONLY through their declared public entry point (index.ts)." The leave-balance module's public entry point is `src/modules/leave-balance/index.ts`, which exports `ILeaveBalanceRepository`. This import bypasses the barrel export and reaches directly into the internal `leave-balance.repository.ts` file. Should be: `import { ILeaveBalanceRepository } from '../leave-balance';`

- Site 2
File: src/modules/leave-request/leave-request.service.ts
Line: 4
Offending code: `import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository';`
Rule violated: dependency-rule-barrel-imports
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 4 in place to fix the `dependency-rule-barrel-imports` violation.
What the quality gate found — apply this: [dependency-rule-barrel-imports] ARCHITECTURE.md states: "Modules import from each other ONLY through their declared public entry point (index.ts)." The leave-policy module's public entry point is `src/modules/leave-policy/index.ts`, which exports `ILeavePolicyRepository`. This import bypasses the barrel export and reaches directly into the internal `leave-policy.repository.ts` file. Should be: `import { ILeavePolicyRepository } from '../leave-policy';`

- Site 3
File: src/modules/leave-request/leave-request.service.ts
Line: 5
Offending code: `import { IEmployeeRepository } from '../employee/employee.repository';`
Rule violated: dependency-rule-barrel-imports
Action (do this now): Edit `src/modules/leave-request/leave-request.service.ts` at line 5 in place to fix the `dependency-rule-barrel-imports` violation.
What the quality gate found — apply this: [dependency-rule-barrel-imports] ARCHITECTURE.md states: "Modules import from each other ONLY through their declared public entry point (index.ts)." The employee module's public entry point is `src/modules/employee/index.ts`, which exports `IEmployeeRepository`. This import bypasses the barrel export and reaches directly into the internal `employee.repository.ts` file. Should be: `import { IEmployeeRepository } from '../employee';`

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