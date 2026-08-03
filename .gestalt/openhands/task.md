# Implement this phase: Phase 5: LeaveBalance module (model + repository + service interface)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/8177937e-ec7c-4649-b943-9d9104b82731/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the LeaveBalance domain model, repository, and service interface. This phase depends on `src/modules/employee/employee.model.ts` from Phase 2 and `src/modules/leave-policy/leave-policy.model.ts` from Phase 4 — read both before generating any code.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` interface with exact fields: id: string, employeeId: string, leavePolicyId: string, totalEntitlement: number, usedDays: number, fiscalYear: number, status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED', createdAt: Date, updatedAt: Date. Do NOT include a stored `remainingDays` field — it is always computed as `totalEntitlement - usedDays` at query time per the binding business rules.
- `src/modules/leave-balance/leave-balance.repository.ts` — Define `ILeaveBalanceRepository` interface with methods: findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>. Implement `LeaveBalanceRepository` class using the existing `pool` from `src/shared/db/connection.ts`. The repository must compute `remainingDays` in its read methods as `totalEntitlement - usedDays` and return it as a derived property on the result objects.
- `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService` interface with methods: getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance & { remainingDays: number }>, deductDays(employeeId: string, leavePolicyId: string, fiscalYear: number, days: number): Promise<void>, restoreDays(employeeId: string, leavePolicyId: string, fiscalYear: number, days: number): Promise<void>.
- `src/modules/leave-balance/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. A single shared countBusinessDays function + a `holidays` table (public-holiday calendar) is used by every call site (balance sufficiency check, deduction, restoration). Whole days only — no half-day/partial-day leave. Compare dates by CALENDAR-DATE equality in UTC (normalize each day/holiday/weekend check to UTC midnight; compare the YYYY-MM-DD triple), never by raw timestamp — so a holiday matches regardless of time-of-day/timezone.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth here; the controller only CONSUMES request.user (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid: startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole) and reject(..., approverRole). The controller reads request.user and passes id + role; the service enforces the business rule (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state read inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: How is used_days on leave_balances computed — derived live from approved leave_requests or stored counter incremented/decremented on state changes?; Are leave days always whole days, or does the system need to support half-day or hourly leave requests?; When should leave balance be deducted — at application time or at approval time?; How is used_days on leave_balances computed — is it derived live from approved leave_requests (SUM of day counts where status=APPROVED) or is it a stored counter incremented/decremented on approval/rejection/cancellation?; apply everywhere these apply, not in one place only]

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
- The LeaveBalanceRepository must follow the same structural conventions as the leave-policy repository: import { Pool, QueryResult } from 'pg' and { pool } from '../../shared/db/connection'; a module-level rowTo<Entity> helper mapping snake_case DB columns to camelCase model fields (with ?? null / ?? undefined for nullable columns); a class with private readonly db: Pool and constructor(dbPool: Pool = pool); try/catch in every method throwing 'Failed to <action>: <message>'; parameterized SQL via $1/$2; SELECT * pattern; empty rows return null/[]. (see `src/modules/leave-policy/leave-policy.repository.ts`)
- The leave-balance service interface file must be interface-only (signatures only, no implementation), importing the LeaveBalance model, matching the leave-policy service-interface file's shape and export style. (see `src/modules/leave-policy/leave-policy.service.interface.ts`)
- The leave-balance barrel (index.ts) must re-export the model, the repository interface and class, and the service interface, matching the leave-policy barrel's export surface and ordering convention. (see `src/modules/leave-policy/index.ts`)
- The leave-balance repository test must mirror the leave-policy repository test structure: jest.mock('pg') returning a Pool whose query is a shared jest.fn(); snake_case mock rows typed Record<string, unknown>; an expect<Entity>MatchesRow helper; beforeEach clearing mocks, creating a mocked Pool, extracting mockQuery, and instantiating the repo with the mock pool; each method tested for happy path, null/empty path, parameterized-query (SQL-injection) assertion, and error path rejecting with 'Failed to …: <msg>'. (see `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`)
- The LeaveBalance model and repository must align with the reconciled architecture's leave_balances conceptual schema (id, employee_id, leave_policy_id, total_entitlement, used_days, fiscal_year, status, created_at, updated_at; unique composite on employee_id, leave_policy_id, fiscal_year) with the binding deviation that remaining_days is NOT stored — it is computed as totalEntitlement - usedDays at query time per the settled business rules. (see `.gestalt/architecture/reconciled.json`)
- The leave-balance module's employeeId field must reference the Employee entity's id (string) as defined in the employee model; the repository's employeeId parameter and the leave_balances.employee_id FK conceptually target employees.id. (see `src/modules/employee/employee.model.ts`)
- The leave-balance module's leavePolicyId field must reference the LeavePolicy entity's id (string) as defined in the leave-policy model; the repository's leavePolicyId parameter and the leave_balances.leave_policy_id FK conceptually target leave_policies.id. (see `src/modules/leave-policy/leave-policy.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: A LeaveBalance is uniquely identified by the composite (employeeId, leavePolicyId, fiscalYear); at most one balance row exists per employee/policy/year. The repository's findByEmployeeAndPolicy lookup keys on this composite.
- Reuse or extend `LeaveBalance`: remainingDays is a derived, non-stored value equal to totalEntitlement - usedDays, computed at query time and present as a property on every object returned by repository read methods; it is never persisted and never written by any code path.
- Reuse or extend `LeaveBalance`: The status lifecycle is ACTIVE → EXHAUSTED → CLOSED; status is one of the three literal union values. A balance whose usedDays reaches totalEntitlement is EXHAUSTED; CLOSED is a terminal state. (Status transitions are enforced by the service in a later phase; this phase only models the union.)
- Reuse or extend `LeaveBalance`: usedDays is the denormalized source of truth for consumed leave and is the only mutable consumption field; it is incremented on submission and decremented on reject/cancel by the service layer. The repository exposes updateUsedDays as the single mutation primitive for consumption.
### Interface contract — expose these operations (their shape is yours)
- ILeaveBalanceRepository.findByEmployeeAndPolicy(employeeId, leavePolicyId, fiscalYear) — idempotent; Returns the matching LeaveBalance (with derived remainingDays) or null when no row matches the composite key; throws Error('Failed to …: <msg>') on DB failure.
- ILeaveBalanceRepository.findByEmployee(employeeId, fiscalYear) — idempotent; Returns all LeaveBalance rows for the employee in the given fiscal year (each carrying derived remainingDays), or an empty array when none exist; throws Error('Failed to …: <msg>') on DB failure.
- ILeaveBalanceRepository.create(balance: Omit<LeaveBalance,'id'|'createdAt'|'updatedAt'>) — Persists a new leave_balances row from the provided employeeId, leavePolicyId, totalEntitlement, usedDays, fiscalYear, status and returns the created LeaveBalance with generated id/createdAt/updatedAt plus derived remainingDays; throws Error('Failed to …: <msg>') on DB failure (including unique-constraint violation on the composite key).
- ILeaveBalanceRepository.updateUsedDays(id, usedDays) — Updates the used_days column for the given balance id and returns the updated LeaveBalance with recomputed derived remainingDays; throws Error('Failed to …: <msg>') on DB failure.
- ILeaveBalanceService.getBalance(employeeId, leavePolicyId, fiscalYear) — idempotent; Returns the balance augmented with remainingDays (LeaveBalance & { remainingDays: number }); behavior on missing balance is defined by the service implementation in a later phase.
- ILeaveBalanceService.deductDays(employeeId, leavePolicyId, fiscalYear, days) — Resolves void on success; the implementation (Phase 10) must reject when the deduction would drive remaining below zero. This phase only declares the signature.
- ILeaveBalanceService.restoreDays(employeeId, leavePolicyId, fiscalYear, days) — Resolves void on success; the implementation (Phase 10) must floor usedDays at zero. This phase only declares the signature.
### Integration points — connect to these
- src/shared/db/connection.ts — The LeaveBalanceRepository must obtain its pg Pool from the shared database connection (the exported `pool`), as the default constructor argument, matching the employee and leave-policy repositories.
- src/modules/leave-policy/leave-policy.model.ts — The LeaveBalance.leavePolicyId references a LeavePolicy by id; the leave-balance module depends on the leave-policy model (Phase 4) as a type/FK reference per the reconciled dependency map (leave-balance → leave-policy).
- src/modules/employee/employee.model.ts — The LeaveBalance.employeeId references an Employee by id; the leave-balance module depends on the employee model (Phase 2) as a type/FK reference per the reconciled dependency map.
- src/modules/leave-request/leave-request.service.ts (Phase 7) — The ILeaveBalanceService interface declared in this phase is consumed by the LeaveRequest orchestrator in Phase 7 for balance lookup, deduction on submission, and restoration on reject/cancel; this phase establishes the contract that later phases implement and consume.
- src/modules/leave-balance/leave-balance.service.ts (Phase 10) — The ILeaveBalanceService interface declared here is implemented in Phase 10 (LeaveBalanceService with deductDays/restoreDays business logic, balance-sufficiency checks, floor-at-zero); this phase defines the interface the implementation must satisfy.

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