# Implement this phase: Phase 3: LeavePolicy model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/73542714-9897-4d99-9509-1a7bb9190c33/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/leave-policy/leave-policy.model.ts with the LeavePolicy interface (id: string, policyName: string, leaveType: LeaveType, entitlementDays: number, accrualRate: number | null, maxAccumulation: number | null, minimumNoticeDays: number | null, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date). Import LeaveType from src/shared/types/leave.types.ts. Create src/modules/leave-policy/leave-policy.repository.ts with ILeavePolicyRepository interface (findById, findByLeaveType, findAllActive) and PgLeavePolicyRepository implementation using src/shared/db/connection.ts. Include Jest unit tests in tests/unit/modules/leave-policy/leave-policy.repository.test.ts.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers for the leave management module:

1/7. Fiscal (leave) year: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave startDate. Not a configurable fiscal year, not hire-date anniversary.

2. Cross-fiscal-year request (e.g. Dec to Jan): deduct the WHOLE request from a single fiscal year — the fiscal year of startDate. Do not split across years.

3. Accrual: full entitlement granted UPFRONT at the start of the fiscal year (annual lump-sum), not accrued over time. Mid-year hires: pro-rate the first year by the whole months remaining from the hire date (rounded down).

4/8. Carryover + balance: USE-IT-OR-LOSE-IT — unused days do NOT carry over across fiscal years (no carryover limit needed). Balance: available = entitled - (used + pending). Deduct on APPROVAL (on submission the days are held as PENDING/reservation; on approval pending -> used; on reject/cancel release the reservation).

5/9. Manager resolution + employee data: the LeaveRequest service obtains employee data (managerId, employmentStatus, hireDate) via an IEmployeeRepository interface (dependency-injected), backed by an employees table — the SAME repository-interface pattern the other modules use. The JWT / request context provides ONLY the caller identity (employeeId) and role for RBAC; the manager relationship, hire date, and employment status are looked up via IEmployeeRepository (do NOT read them from the JWT). Approvals/notifications route to the target employees managerId; if managerId is null, escalate to HR (a user with role hr_admin). Managers may act only on their direct reports.

6. Day counting: BUSINESS/WORKING DAYS only — exclude weekends (Sat/Sun) and public holidays. Both startDate and endDate are INCLUSIVE. WHOLE DAYS ONLY — no half-days (a half-day request is not supported; minimum 1 day).

Cross-cutting rules throughout:
- Overlapping leave requests are prevented (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- Balances auto-created for all leave types on employee creation.
- Emergency leave is a SEPARATE pool (distinct from annual/sick) and bypasses the advance-notice requirement, but still requires approval and deducts from its own balance.
- Every endpoint enforces RBAC (employees on their own records; managers approve/reject direct reports) plus input validation.
- Only ACTIVE employees may submit leave. [BINDING RULE — operator decision resolving: How is the fiscal year determined for LeaveBalance assignment? Is it calendar year (Jan 1 – Dec 31), a company-specific fiscal year (e.g., Apr 1 – Mar 31), or configurable per policy?; What happens when a LeaveRequest spans two fiscal years (e.g., startDate in December, endDate in January)?; How does accrual work for annual leave? Is the full entitlement granted upfront at the start of the fiscal year, or does it accrue over time?; Do unused leave days carry over to the next fiscal year, and if so, up to what limit?; How is an employee's manager resolved for routing approvals and notifications?; How are leave days counted for balance deduction — calendar days (inclusive start..end) or working/business days? Does a half-day leave consume 0.5 or 1 day?; What defines the fiscal_year boundary for leave balances — calendar year, a configurable fiscal year (e.g. Apr–Mar), or employee hire-date anniversary?; How is leave balance computed — simple remaining = allocated - used, or does it involve accrual rules (e.g. pro-rata monthly accrual, carry-over from prior year)?; How is an employee's manager resolved? The LeaveRequest service needs a managerId for routing approvals and notifications.; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveType: LeaveType
    - entitlementDays: number
    - accrualRate: number | null
    - maxAccumulation: number | null
    - minimumNoticeDays: number | null
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeavePolicy model must follow the same structural convention as the Employee model: a bare `export interface` with no class, no runtime code, no default exports, importing its enum (LeaveType) from the shared types module via the same relative-path import style (`../../shared/types/leave.types`). (see `src/modules/employee/employee.model.ts`)
- The leave-policy repository must match the employee repository's transaction-participation pattern: every method accepts an optional `client?: PoolClient`, resolves the connection via `const db = client ?? pool;`, imports `PoolClient` from `pg` and `pool` from `../../shared/db/connection`, and uses a private `rowToLeavePolicy` mapper that casts `Record<string, unknown>` row fields to the entity (snake_case→camelCase, enum cast for leaveType, `new Date()` for date fields, null preserved for nullable fields). (see `src/modules/employee/employee.repository.ts`)
- The leave-policy repository test must mirror the employee repository test structure: `jest.mock` of the shared db connection before importing `pool`, `mockQuery.mockReset()` in `beforeEach`, `makeRow()`/`makeLeavePolicy()` factory helpers accepting `Partial` overrides, per-method `describe`/`it` blocks asserting both returned entity and exact SQL/args, and a test verifying a provided PoolClient is used instead of the pool. (see `tests/unit/modules/employee/employee.repository.test.ts`)
- The LeavePolicy model must import LeaveType from the existing shared types module (Phase 1) rather than redefining it; the leaveType field must be typed as the imported LeaveType enum, and the row mapper must cast the database `leave_type` column value to LeaveType. (see `src/shared/types/leave.types.ts`)
- The leave_policies table column names and indexes must match the reconciled architecture: snake_case columns (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at) with indexes on leave_type and is_active; the repository queries must target this table and column naming. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A LeavePolicy is associated with exactly one LeaveType; the leaveType field must be a valid member of the LeaveType enum (annual, sick, emergency, unpaid, maternity, paternity) and is never null.
- Reuse or extend `LeavePolicy`: A LeavePolicy's lifecycle is ACTIVE ↔ INACTIVE governed by the isActive boolean flag; the repository's findAllActive operation returns only policies where isActive is true, and findById/findByLeaveType return policies regardless of active state.
- Reuse or extend `LeavePolicy`: The optional policy constraints accrualRate, maxAccumulation, and minimumNoticeDays are genuinely nullable — a null value means "no constraint configured" and must be preserved as null through the row mapper rather than defaulted to zero or undefined.
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyRepository.findById(id, client?) — idempotent; Returns the LeavePolicy entity when a row matches the given id, or null when no row is found (result.rows.length === 0). Read-only: no state change, no audit record required. Database errors propagate as thrown errors (no swallowing).
- ILeavePolicyRepository.findByLeaveType(leaveType, client?) — idempotent; Returns an array of LeavePolicy entities matching the given LeaveType (empty array when none match). Read-only: no state change, no audit record required. Database errors propagate as thrown errors.
- ILeavePolicyRepository.findAllActive(client?) — idempotent; Returns an array of only active LeavePolicy entities (isActive = true), empty array when none exist. Read-only: no state change, no audit record required. Database errors propagate as thrown errors.
### Integration points — connect to these
- src/shared/types/leave.types.ts (LeaveType enum) — The LeavePolicy model imports LeaveType to type its leaveType field; the repository row mapper casts the DB leave_type column to this enum. This is the sole external dependency of the leave-policy module this phase (LeavePolicy → SharedTypes per the dependency map).
- src/shared/db/connection.ts (pool) — The PgLeavePolicyRepository imports the shared pg Pool to execute queries against the leave_policies table when no caller-supplied PoolClient is provided, matching the repository-pattern requirement that all DB access flows through repositories backed by the shared pool.
- src/modules/leave-balance/ (Phase 4) and src/modules/leave-request/ (Phase 5) — Downstream consumers: LeaveBalance depends on LeavePolicy (to know entitlement per leave type when initializing balances), and LeaveRequest depends on LeavePolicy (for minimumNoticeDays, requiresManagerApproval, entitlement validation). The read-only repository surface established this phase is the contract those later phases will inject and call.

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