# Implement this phase: Phase 4: LeaveBalance model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/76d847b2-5905-40af-b702-36710232b1e4/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave-balance module at `src/modules/leave-balance/`. This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts` from Phase 3 — read all three before generating any code.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` entity interface with exact fields: id (string), employeeId (string), leavePolicyId (string), totalEntitlement (number), usedDays (number), remainingDays (number), fiscalYear (number), status ('ACTIVE' | 'EXHAUSTED' | 'CLOSED'), createdAt (Date), updatedAt (Date).
- `src/modules/leave-balance/leave-balance.repository.ts` — Define `ILeaveBalanceRepository` interface with methods: findById(id: string): Promise<LeaveBalance | null>, findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployeeId(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>. Provide a stub `LeaveBalanceRepository` class.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.model.test.ts` and `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveBalance` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leavePolicyId: string
    - totalEntitlement: number
    - usedDays: number
    - remainingDays: number
    - fiscalYear: number
    - status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED'
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The stub `LeaveBalanceRepository` class MUST follow the same pattern as `EmployeeRepository` (Phase 2) and `LeavePolicyRepository` (Phase 3): every method body is `throw new Error('not implemented')`, and all unused parameters are prefixed with underscore to suppress TypeScript/ESLint warnings. (see `src/modules/employee/employee.repository.ts`)
- The barrel export `src/modules/leave-balance/index.ts` MUST follow the same pattern as `src/modules/employee/index.ts` and `src/modules/leave-policy/index.ts`: re-export the model interface and the repository interface + stub class. (see `src/modules/employee/index.ts`)
- The model test file MUST follow the same pattern as `tests/unit/modules/employee/employee.model.test.ts` and `tests/unit/modules/leave-policy/leave-policy.model.test.ts`: verify field values, nullable/union values, exact field names (sorted comparison), and field count. (see `tests/unit/modules/employee/employee.model.test.ts`)
- The repository test file MUST follow the same pattern as `tests/unit/modules/employee/employee.repository.test.ts` and `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`: verify each method throws `'not implemented'`, verify `create` accepts correct input shape, verify `update` accepts partial and empty updates, verify interface contract has all required methods as functions. (see `tests/unit/modules/employee/employee.repository.test.ts`)
- Tests MUST import from the barrel path (e.g., `../../../../src/modules/leave-balance`) — matching the pattern used by existing tests which resolve via Jest's `moduleDirectories: ['node_modules', 'src']` configuration. (see `tests/unit/modules/employee/employee.model.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: Lifecycle: ACTIVE → EXHAUSTED → CLOSED. A balance starts ACTIVE when initialized. It transitions to EXHAUSTED when `remainingDays` reaches 0. It transitions to CLOSED at the end of the fiscal year (calendar year: Jan 1 – Dec 31). Once CLOSED, no further mutations to `usedDays` or `remainingDays` are permitted.
- Reuse or extend `LeaveBalance`: Composite uniqueness: at most one `LeaveBalance` row may exist for a given `(employeeId, leavePolicyId, fiscalYear)` tuple. This is enforced by a unique composite index on the conceptual table.
- Reuse or extend `LeaveBalance`: Derived-field consistency: `remainingDays` MUST equal `totalEntitlement - usedDays` at all times. Any mutation to `usedDays` MUST recalculate `remainingDays` accordingly.
### Interface contract — expose these operations (their shape is yours)
- ILeaveBalanceRepository.findByEmployeeAndPolicy — idempotent; Returns null when no balance exists for the given (employeeId, leavePolicyId, fiscalYear) tuple — this is not an error condition.
- ILeaveBalanceRepository.create — Accepts `Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>` — the repository (or database) is responsible for generating `id`, `createdAt`, and `updatedAt`. The caller must supply `employeeId`, `leavePolicyId`, `totalEntitlement`, `usedDays`, `remainingDays`, `fiscalYear`, and `status`.
- ILeaveBalanceRepository.update — Accepts `Partial<LeaveBalance>` — any subset of fields may be provided. Returns the updated `LeaveBalance` or `null` if no balance with the given `id` exists.
### Integration points — connect to these
- src/shared/types/index.ts (Phase 1) — The LeaveBalance entity does not directly import shared types (its status is a local string union, not the shared LeaveStatus enum), but the module exists within the same codebase and future phases (Phase 8, Phase 10) will wire LeaveBalance to shared types via the service layer.
- src/modules/employee/employee.model.ts (Phase 2) — LeaveBalance.employeeId references an Employee by string ID. The service layer (Phase 10) will validate this reference against the Employee repository.
- src/modules/leave-policy/leave-policy.model.ts (Phase 3) — LeaveBalance.leavePolicyId references a LeavePolicy by string ID. The service layer (Phase 10) will use the policy's entitlementDays to initialize balances.

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

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
Before writing code, read the referenced files below (those present in the working directory) to learn the project's language, framework, test runner, and conventions, and the cross-cutting rules your code must satisfy — then follow the existing repository conventions:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

## Verify before you finish (MANDATORY)
The code you write MUST compile and its tests MUST pass — a compilation or type error must NEVER be left for CI to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`.
- Install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`) for the files this phase touches.
- FIX every compilation error, type error, and failing test you introduced — including in test files — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.