# Implement this phase: Phase 4: LeaveBalance model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/be068fd3-a1c9-4eb0-ae38-156852fec5c5/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveBalance domain model and repository. This phase depends on Employee (Phase 2) and LeavePolicy (Phase 3) types for foreign-key references.

Create `src/modules/leave-balance/leave-balance.model.ts` with the LeaveBalance entity using the exact canonical fields: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status ('ACTIVE' | 'CLOSED' | 'FORECAST'), createdAt, updatedAt. Import Employee and LeavePolicy types from their respective modules for reference typing.

Create `src/modules/leave-balance/leave-balance.repository.ts` with:
- `ILeaveBalanceRepository` interface declaring: findById(id), findByEmployeeId(employeeId), findByEmployeeAndPolicy(employeeId, policyId), findByEmployeeAndFiscalYear(employeeId, fiscalYear), save(balance), update(id, partial), incrementUsedDays(id, days) — atomic increment for the materialized balance rule
- `PgLeaveBalanceRepository` class implementing ILeaveBalanceRepository using `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/leave-balance/`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all foundational questions:

1. Day counting (questions 1 and 3): Business days only — exclude weekends and public holidays from the count. days = number of business days between startDate and endDate inclusive. Apply this single rule everywhere a day count is derived from a date range: balance sufficiency validation, usedDays deduction, remainingDays computation, entitlement enforcement, and reporting.

2. Balance materialization: Materialized transactional. On each APPROVE, atomically increment leave_balances.used_days by the request's business-day count within the same transaction; on REJECT or CANCEL of a previously-approved request, atomically restore it. remaining_days = total_entitlement - used_days (computed, not stored). Deduction happens on approval (not on submission). Balances are never computed by live aggregate queries at read time.

Additional standing rules: whole days only (no partial/half days); leave year is the calendar year; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (an employee sees/acts only on their own requests; a manager/HR acts on their reports); validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only?; How are leave_balances.used_days and remaining_days computed — are they derived live from approved leave_requests (sum of day counts) or are they materialized and updated transactionally on each approval/rejection?; How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only? This affects balance sufficiency checks, balance deductions, entitlement comparisons, and reporting.; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveBalance` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - policyId: string
    - totalEntitlement: number
    - usedDays: number
    - remainingDays: number
    - fiscalYear: number
    - status: 'ACTIVE' | 'CLOSED' | 'FORECAST'
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveBalance entity shape must match the reconciled canonical attributes exactly (id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status, createdAt, updatedAt) and the status union ('ACTIVE' | 'CLOSED' | 'FORECAST') — do not add, rename, or omit fields. (see `.gestalt/architecture/reconciled.json`)
- The Employee type must be imported via the employee module's public entry point (index.ts), matching how leave-policy imports LeaveType from shared-types — never import directly from employee.model.ts. (see `src/modules/employee/index.ts`)
- The LeavePolicy type must be imported via the leave-policy module's public entry point (index.ts), consistent with the module-boundary rule that cross-module imports go through index.ts only. (see `src/modules/leave-policy/index.ts`)
- PgLeaveBalanceRepository must obtain its database connection from the shared pool exported by src/shared/db/connection.ts, matching the pattern established by PgEmployeeRepository and PgLeavePolicyRepository. (see `src/shared/db/connection.ts`)
- The repository must follow the established repository pattern: an interface (ILeaveBalanceRepository) paired with a Pg* implementation class, a private mapRow helper converting snake_case DB columns to camelCase entity fields, and update returning null on missing id — matching PgEmployeeRepository and PgLeavePolicyRepository conventions. (see `src/modules/employee/employee.repository.ts`)
- Unit tests must mock the shared db pool via jest.mock('shared/db/connection') and assert both the returned entity mapping and the SQL/parameters passed to pool.query, matching the test conventions in the employee and leave-policy repository test files. (see `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: A LeaveBalance row is unique per (employeeId, policyId, fiscalYear) combination — there is at most one balance row per employee per policy per fiscal year (reconciled schema unique constraint on employee_id + policy_id + fiscal_year).
- Reuse or extend `LeaveBalance`: remainingDays must equal totalEntitlement minus usedDays at all times — remaining_days is a computed/materialized value of total_entitlement - used_days, never independently set to an arbitrary value (binding business rule: materialized transactional balance).
- Reuse or extend `LeaveBalance`: status is constrained to the lifecycle states ACTIVE, CLOSED, or FORECAST; only ACTIVE balances are drawable, CLOSED are historical, FORECAST are future-year balances not yet usable.
- Reuse or extend `LeaveBalance`: usedDays must never exceed totalEntitlement (an employee cannot consume more leave than entitled) — the atomic increment must not drive used_days above total_entitlement.
- Reuse or extend `LeaveBalance`: employeeId references an existing Employee and policyId references an existing LeavePolicy (foreign keys to employees.id and leave_policies.id per the reconciled conceptual data model).
### Interface contract — expose these operations (their shape is yours)
- ILeaveBalanceRepository.findById(id) — Returns the matching LeaveBalance or null when no row exists; never throws on not-found.
- ILeaveBalanceRepository.findByEmployeeId(employeeId) — Returns an array (possibly empty) of all LeaveBalance rows for the employee; never null.
- ILeaveBalanceRepository.findByEmployeeAndPolicy(employeeId, policyId) — Returns the matching LeaveBalance or null; resolves the unique (employee, policy) lookup.
- ILeaveBalanceRepository.findByEmployeeAndFiscalYear(employeeId, fiscalYear) — Returns an array (possibly empty) of LeaveBalance rows for the employee in the given fiscal year.
- ILeaveBalanceRepository.save(balance) — Persists a new LeaveBalance row and returns the persisted entity; a duplicate (employeeId, policyId, fiscalYear) must be rejected rather than silently overwriting.
- ILeaveBalanceRepository.update(id, partial) — Applies a partial update to the existing balance, refreshes updatedAt, and returns the updated entity or null when the id does not exist.
- ILeaveBalanceRepository.incrementUsedDays(id, days) — Atomically increments used_days by the given delta (positive for deduction, negative for restoration) within a single statement, recomputes remaining_days = total_entitlement - used_days, and returns the updated balance or null when the id does not exist; must not allow used_days to exceed total_entitlement.
### Integration points — connect to these
- employee module (src/modules/employee/index.ts) — LeaveBalance.employeeId references Employee; the model imports the Employee type for reference typing and the repository's foreign-key semantics depend on employees.id existing.
- leave-policy module (src/modules/leave-policy/index.ts) — LeaveBalance.policyId references LeavePolicy; the model imports the LeavePolicy type for reference typing and the repository's foreign-key semantics depend on leave_policies.id existing.
- shared db connection (src/shared/db/connection.ts) — PgLeaveBalanceRepository executes SQL against PostgreSQL through the shared pool, the single permitted database access point.
- leave-request module (downstream, Phase 9) — The LeaveRequest service will consume ILeaveBalanceRepository.incrementUsedDays to atomically deduct and restore balance on approval/rejection/cancellation — this repository's atomic increment contract is the integration seam for the materialized balance rule.
- leave-balance service (downstream, Phase 8) — The future LeaveBalanceService will inject ILeaveBalanceRepository to implement getBalance, initializeBalance, getRemainingDays, and hasSufficientBalance — the repository interface defined this phase is the service's dependency seam.

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
- Modules import from each other ONLY through their declared public entry point (`index.ts`)
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