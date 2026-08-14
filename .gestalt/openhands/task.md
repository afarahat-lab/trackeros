# Implement this phase: Phase 4: LeaveBalance model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/73542714-9897-4d99-9509-1a7bb9190c33/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/leave-balance/leave-balance.model.ts with the LeaveBalance interface (id: string, employeeId: string, policyId: string, totalEntitlement: number, usedDays: number, remainingDays: number, fiscalYear: number, status: BalanceStatus, createdAt: Date, updatedAt: Date). Import BalanceStatus from src/shared/types/leave.types.ts. Create src/modules/leave-balance/leave-balance.repository.ts with ILeaveBalanceRepository interface (findByEmployeeAndPolicy, findByEmployeeAndFiscalYear, findByEmployeeId, create, update, deductDays, restoreDays) and PgLeaveBalanceRepository implementation using src/shared/db/connection.ts. Include Jest unit tests in tests/unit/modules/leave-balance/leave-balance.repository.test.ts.

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
- `LeaveBalance` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - policyId: string
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
- The LeaveBalance model must be a plain exported interface importing BalanceStatus from the shared types file, matching the pattern established by employee.model.ts and leave-policy.model.ts (plain interface, enum imported from shared types, no class or runtime logic). (see `src/modules/employee/employee.model.ts`)
- The BalanceStatus enum (ACTIVE, EXHAUSTED, CLOSED) must be imported from the shared types file; the model and repository must not redefine or re-declare this enum locally. (see `src/shared/types/leave.types.ts`)
- The repository must import the shared pg pool from the db connection module and use the `const db = client ?? pool` pattern with an optional PoolClient last parameter, matching the convention in employee.repository.ts and leave-policy.repository.ts. (see `src/shared/db/connection.ts`)
- The create method's input type must be Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> and use INSERT ... RETURNING *, and the update method must build a dynamic SET clause from a camelCase-to-snake_case field map with updated_at = NOW() appended — matching the exact pattern in employee.repository.ts. (see `src/modules/employee/employee.repository.ts`)
- UniqueConstraintViolationError must be defined and thrown on pg code 23505 with the same class shape (name property set, cause field preserved) as established in employee.repository.ts; if the employee repository exports it, the leave-balance repository may import it rather than redefining it. (see `src/modules/employee/employee.repository.ts`)
- The row-to-entity mapper must follow the private rowTo* method convention: snake_case column keys mapped to camelCase entity fields, date columns cast via new Date(), and the `?? null` pattern for nullable fields — matching rowToEmployee and rowToLeavePolicy. (see `src/modules/leave-policy/leave-policy.repository.ts`)
- The unit test file must follow the established test structure: jest.mock the db connection module before importing pool, makeRow/makeEntity helpers with snake_case row overrides, describe/it per method, beforeEach mockReset, and assertions for exact SQL+params, null/empty cases, PoolClient delegation, Date casting, and UniqueConstraintViolationError — matching employee.repository.test.ts and leave-policy.repository.test.ts. (see `tests/unit/modules/employee/employee.repository.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: The balance invariant must always hold: remainingDays = totalEntitlement - usedDays. deductDays and restoreDays must preserve this relationship by adjusting usedDays and remainingDays by equal and opposite amounts.
- Reuse or extend `LeaveBalance`: Lifecycle: ACTIVE → EXHAUSTED (when remainingDays reaches 0); EXHAUSTED → ACTIVE (when days are restored and remainingDays becomes positive again); ACTIVE/EXHAUSTED → CLOSED (fiscal-year rollover, deferred to Phase 8). The repository's deductDays and restoreDays must enforce the ACTIVE↔EXHAUSTED transitions per business rules 5 and 6.
- Reuse or extend `LeaveBalance`: Uniqueness: at most one balance row exists per (employeeId, policyId, fiscalYear) combination, enforced by the DB uniqueness index; create must surface a violation of this constraint as a typed UniqueConstraintViolationError.
### Interface contract — expose these operations (their shape is yours)
- findByEmployeeAndPolicy(employeeId, policyId, fiscalYear?, client?) — returns the single LeaveBalance matching the employee+policy (and fiscal year when provided) or null. — idempotent; Returns null when no row matches; never throws on not-found.
- findByEmployeeAndFiscalYear(employeeId, fiscalYear, client?) — returns the single balance or list of balances for an employee in a given fiscal year, or null/empty when none exist. — idempotent; Returns null (single-row) or empty array (list) when no rows match; never throws on not-found.
- findByEmployeeId(employeeId, client?) — returns all LeaveBalance rows for an employee across all fiscal years as an array (empty when none). — idempotent; Returns an empty array when no rows match; never throws on not-found.
- create(input, client?) — persists a new leave_balances row from the input (excluding id/createdAt/updatedAt) and returns the fully-mapped entity. — Throws UniqueConstraintViolationError (pg code 23505) when the (employee_id, policy_id, fiscal_year) uniqueness constraint is violated; re-throws all other errors unchanged.
- update(id, updates, client?) — applies a dynamic subset of mutable fields, advances updated_at, and returns the refreshed entity or null when the row does not exist. — idempotent; Returns null when the target row does not exist; never throws on not-found.
- deductDays(id, days, client?) — atomically increments usedDays and decrements remainingDays by `days`, transitioning status to EXHAUSTED when remainingDays reaches 0; returns the updated entity or null when not found. — Returns null when the target balance row does not exist; the usedDays/remainingDays adjustment and status transition must be persisted in a single UPDATE so they are atomic within the caller's transaction when a client is supplied.
- restoreDays(id, days, client?) — atomically decrements usedDays and increments remainingDays by `days`, transitioning status from EXHAUSTED to ACTIVE when the balance was previously exhausted; returns the updated entity or null when not found. — Returns null when the target balance row does not exist; the usedDays/remainingDays adjustment and status transition must be persisted in a single UPDATE so they are atomic within the caller's transaction when a client is supplied.
### Integration points — connect to these
- src/shared/types/leave.types.ts (BalanceStatus enum) — The LeaveBalance model imports BalanceStatus from the shared types module; this is the sole external type dependency for the model.
- src/shared/db/connection.ts (pg pool) — The PgLeaveBalanceRepository resolves its database connection from the shared pool (or a caller-supplied PoolClient), matching all other repository implementations.
- src/modules/leave-policy/leave-policy.repository.ts (ILeavePolicyRepository) — Per the reconciled architecture dependency map, LeaveBalance depends on LeavePolicy; the repository itself does not call the policy repository in this phase, but the module boundary declares this dependency for the downstream LeaveBalanceService (Phase 8) which will initialize balances from policy entitlements.
- Future LeaveRequestService approve/cancel transaction (Phase 9) — deductDays and restoreDays are the transaction-contract methods that the LeaveRequestService will invoke within a caller-controlled BEGIN/COMMIT unit of work when approving or cancelling a leave request; the optional PoolClient parameter exists to support this delegation.

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