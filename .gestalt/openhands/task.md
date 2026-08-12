# Implement this phase: Phase 4: Balance module — model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/7f3a8cc3-b777-42b1-b2e3-a0c62205ede1/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the balance module at `src/modules/balance/`. This phase depends on `src/shared/types/index.ts` from Phase 1 and `src/modules/employee/employee.model.ts` from Phase 2 — read both before generating.

Files to create:
- `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` interface with canonical fields: id, employeeId, policyId, fiscalYear (number), totalEntitlement (number), usedDays (number), remainingDays (number), status ('ACTIVE' | 'EXHAUSTED' | 'CLOSED'), createdAt, updatedAt.
- `src/modules/balance/balance.repository.ts` — Define `ILeaveBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `create(data: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`, `update(id: string, data: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance>`. Implement `LeaveBalanceRepository` using the pg pool from `src/shared/db/connection.ts` with parameterized queries.
- `src/modules/balance/index.ts` — Barrel export.
- `tests/unit/modules/balance/balance.repository.test.ts` — Jest unit tests mocking the db layer.

Approximately 4 files.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers:
1. Fiscal/leave year: calendar year (Jan 1 to Dec 31), keyed off the leave startDate.
2. Overlapping leave requests: PREVENTED. Reject a new SUBMITTED or APPROVED request whose date range overlaps (inclusive) any existing SUBMITTED or APPROVED request for the same employee. Adjacent non-overlapping ranges are allowed.
3. Cross-fiscal-year request: deduct the whole request from a single fiscal year (the fiscal year of startDate). Do not split across years.
4. Balance initialization: auto-create balances for ALL leave types on employee creation (not lazily).
5 & 6. Balance deduction timing: deduct on APPROVAL (finalize). On submission the days are counted as PENDING (a reservation, not a deduction); on approval move pending to used; on reject or cancel release the reservation. Available balance = entitled - (used + pending).

Standard rules that apply throughout:
- Count business days only (exclude weekends); whole days only.
- Separate emergency leave pool from annual/sick.
- Every endpoint enforces RBAC (employees act on their own records; managers approve/reject their reports) plus input validation.
- When an employee has no manager, approval escalates to HR.
- Use-it-or-lose-it: no carryover of unused balance across leave years. [BINDING RULE — operator decision resolving: Should the fiscal year be calendar year (Jan 1 – Dec 31) or a configurable period (e.g., Apr 1 – Mar 31)? The current domain rule uses calendar year of startDate.; Should overlapping leave requests be prevented? E.g., an employee with an existing APPROVED or SUBMITTED request for Jan 5–10 should not be allowed to submit another for Jan 8–12.; When a leave request spans two fiscal years (e.g., Dec 28 – Jan 3), should the balance be deducted from a single fiscal year (the year of startDate) or split across both years?; How are leave balances initialized for new employees — auto-created for all leave types on employee creation, or created lazily on first leave application?; When should leave balance be deducted — on submission (reserve/hold) or on approval (finalize)? The domain rule already specifies deduction on approval, but the application architect raised this as an open question.; When should leave balance be deducted — on submission (reserve/hold) or on approval (finalize)?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The balance repository must follow the same raw pool.query pattern as the policy repository: import { pool } from the shared db connection, use parameterized $1/$2/… placeholders with a values array, define a snake_case *Row interface plus a rowTo* mapper function, and have the concrete class implement its interface — not the Knex query-builder pattern used by the employee repository. (see `src/modules/policy/policy.repository.ts`)
- The LeaveBalance model must be a plain `export interface` with camelCase field names and no imports (FK references are plain string fields), matching the style of the LeavePolicy model — not a class and not decorated. (see `src/modules/policy/policy.model.ts`)
- The balance barrel (src/modules/balance/index.ts) must re-export the model type and the repository interface + concrete class as named exports, matching the policy module's barrel export shape (export { Model } from './model'; export { IRepo, Repo } from './repository'). (see `src/modules/policy/index.ts`)
- The balance repository test must mirror the policy repository test's mocking approach: jest.mock the shared db connection to expose { pool: { query: jest.fn() } }, use a mockQueryResult<T> helper returning { rows }, clear mocks and construct a fresh repo in beforeEach, and for create mock the INSERT call ({ rows: [] }) then the SELECT call ({ rows: [insertedRow] }) — avoiding the any-based Knex chain mocking the employee test requires. (see `tests/unit/modules/policy/policy.repository.test.ts`)
- The LeaveBalance field set and the leave_balances table columns must match the reconciled architecture exactly: model fields id, employeeId, policyId, fiscalYear (number), totalEntitlement, usedDays, remainingDays, status ('ACTIVE'|'EXHAUSTED'|'CLOSED'), createdAt, updatedAt; table columns id, employee_id (FK→employees.id), policy_id (FK→leave_policies.id), fiscal_year, total_entitlement, used_days, remaining_days, status, created_at, updated_at with PK id and unique composite index (employee_id, policy_id, fiscal_year). (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: A LeaveBalance is uniquely identified by the composite key (employeeId, policyId, fiscalYear) — at most one balance record exists per employee per policy per fiscal year, enforced by the unique composite index on leave_balances.
- Reuse or extend `LeaveBalance`: A LeaveBalance is never soft-deleted — there is no deletedAt field and no soft-delete lifecycle; balances are persisted and updated in place for the duration of their fiscal year.
- Reuse or extend `LeaveBalance`: The status field is constrained to the lifecycle union 'ACTIVE' | 'EXHAUSTED' | 'CLOSED'; a balance is ACTIVE while it has remaining entitlement, transitions toward EXHAUSTED as days are consumed, and CLOSED at fiscal-year end (status transitions are a service-layer concern, but the type union is fixed here).
- Reuse or extend `LeaveBalance`: The id, createdAt, and updatedAt fields are system-generated and immutable from the caller's perspective — create accepts Omit<LeaveBalance,'id'|'createdAt'|'updatedAt'> and update accepts Partial<Omit<LeaveBalance,'id'|'createdAt'|'updatedAt'>>, so callers can never supply or mutate identity/audit timestamps.
### Interface contract — expose these operations (their shape is yours)
- findById(id) — single-row lookup by primary key — idempotent; Returns null when no row matches the id (not an error); propagates underlying pool errors to the caller without swallowing.
- findByEmployeeAndPolicy(employeeId, policyId, fiscalYear) — single-row lookup by the unique composite key — idempotent; Returns null when no row matches the composite key (not an error); propagates underlying pool errors to the caller without swallowing.
- findByEmployee(employeeId, fiscalYear) — multi-row lookup returning all balances for an employee in a fiscal year — idempotent; Returns an empty array when no rows match (not an error); never returns null for the collection; propagates underlying pool errors to the caller without swallowing.
- create(data) — persist a new leave_balances row — Generates id + timestamps, executes INSERT then SELECT to return the persisted row; a unique-constraint violation on the (employeeId, policyId, fiscalYear) composite propagates as a pool error to the caller — the repository does not catch or translate it in this phase.
- update(id, data) — partial update of an existing leave_balances row — Applies only the supplied mutable fields via a dynamic partial UPDATE then SELECT to return the updated row; behavior when no row matches the id is not prescribed at this layer (the repository returns the re-read row; a not-found condition surfaces as whatever the SELECT yields and is handled by the calling service in a later phase).
### Integration points — connect to these
- src/shared/db/connection.ts (pg Pool) — The balance repository imports the shared pool to execute parameterized SQL against the leave_balances table — the sole data-access dependency for this phase.
- src/modules/policy/ (repository pattern + model style) — The balance repository and model are structurally modeled on the policy module (raw pool.query, snake_case Row + mapper, plain interface model, barrel shape) as the closest analog using the same data-access pattern.
- Phase 7 EmployeeService + Phase 8 BalanceService (future consumers) — The ILeaveBalanceRepository interface and LeaveBalance type exported here are the contract that the later EmployeeService (auto-create balances on employee creation) and BalanceService (reserve/finalize/release deduction logic) will depend on; this phase must expose them via the barrel so later phases import only from src/modules/balance/index.ts.

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