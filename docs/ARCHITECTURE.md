# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest (API) / Vitest (web React + Vite SPA)
- Backend: Fastify
- Frontend: React + Vite
- Database: PostgreSQL

## Module structure

```
src/modules/leave/leave.{model,repository,service,controller,routes}.ts
src/modules/balance/balance.{model,repository,service,controller,routes}.ts
src/modules/employee/employee.{model,repository,service,controller,routes}.ts
src/modules/policy/policy.{model,repository,service,controller,routes}.ts
src/modules/notification/notification.{model,repository,service,controller,routes}.ts
src/shared/types/index.ts        — canonical enums, cross-module DTOs, requestedDays helper
src/shared/errors/index.ts       — AppError base + Validation/NotFound/Unauthorized/Forbidden/Conflict subclasses
src/shared/db/connection.ts      — the single pg Pool (DATABASE_URL, SSL in production)
src/shared/db/unit-of-work.ts    — IUnitOfWork + PgUnitOfWork (BEGIN/COMMIT/ROLLBACK)
src/shared/db/index.ts           — public entry point (pool, IUnitOfWork, PgUnitOfWork)
src/shared/date/accrual.ts       — startOfUtcDay, addMonths, periodContaining (pure UTC accrual helpers)
src/shared/date/index.ts         — public entry point re-exporting the three date helpers
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=babd3932-368b-46a5-a4dc-6dccaafd84ba START -->
## Leave Management Module — Reconciled Architecture

### Stack
TypeScript 20, Fastify, PostgreSQL, modular monolith, Jest. Frontend React Native is out of scope for this backend module.

### Canonical naming decisions
- EmployeeRole: EMPLOYEE | MANAGER | ADMIN (replaces hr_admin).
- LeaveTypeCode: annual | sick | emergency | unpaid | maternity | paternity (lowercase persisted values — supersedes the earlier ANNUAL|SICK|EMERGENCY-only position).
- EmploymentStatus: ACTIVE | TERMINATED | ON_LEAVE (drops INACTIVE).
- AuditRecord is canonicalized as AuditLog.
- LeaveType is a first-class entity with its own table and module.

### Domain entities and lifecycle states
- Employee: ACTIVE, TERMINATED, ON_LEAVE.
- LeaveType: ACTIVE, ARCHIVED.
- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- LeaveBalance: OPEN, CLOSED.
- LeavePolicy: DRAFT, ACTIVE, SUPERSEDED.
- AuditLog: RECORDED.
- Notification: PENDING, SENT, READ, ARCHIVED.

### Key business rules
- requestedDays = endDate - startDate + 1 (inclusive calendar days) is the single canonical day-count derivation.
- Sufficiency check: entitledDays - usedDays - pendingDays >= requestedDays.
- Reservation lifecycle: submit increments pendingDays; approve decrements pendingDays and increments usedDays; reject/cancel decrements pendingDays only.
- Approval authorization: MANAGER or ADMIN only, no self-approval, approver must be requester's manager or ADMIN.
- Notice: startDate >= today + minNoticeDays (calendar), EMERGENCY exempt.
- Max duration: requestedDays <= maxConsecutiveDays and <= maxRequestDays.
- Every state-changing operation writes an AuditLog.

### Conceptual tables
employees, leave_types, leave_policies, leave_requests, leave_balances, notifications, audit_logs. No SQL DDL; code agent generates migrations.

### Modules
shared-types, shared-db, shared-errors, employee, leave-type, policy, audit, notification, balance, validation, leave.

### Dependency direction
leave is the sole orchestrator and depends on balance, validation, policy, employee, audit, notification, leave-type, and shared foundations. No module depends back on leave.

### Phases
1 Shared foundations; 2 employee/leave-type/policy; 3 audit/notification; 4 balance; 5 validation; 6 leave.

### Cross-cutting contracts
- Auth: JWT bearer; request.user { id, role: EMPLOYEE|MANAGER|ADMIN }; requireRole guard; no self-approval.
- Error: { error, code }; 400/401/403/404/409.
- Transaction: service-owned IUnitOfWork.withTransaction; repositories accept optional PoolClient; BEGIN/COMMIT/ROLLBACK only in PgUnitOfWork.

### Phase 1 delivered (shared foundations)
- `src/shared/types/index.ts` — six canonical enums (LeaveStatus, LeaveTypeCode, AuditAction, NotificationStatus, EmploymentStatus, EmployeeRole) plus CreateLeaveRequestDto / UpdateLeaveRequestDto / LeaveRequestQueryParams. The canonical `requestedDays(startDate, endDate)` inclusive day-count helper is implemented HERE (not in the validation module as PLAN.md Phase 5 prescribed) so every later consumer imports it from the shared entry point.
- `src/shared/errors/index.ts` — AppError (message, statusCode, code) with subclasses ValidationError(400), UnauthorizedError(401), ForbiddenError(403), NotFoundError(404), ConflictError(409), each with a stable code string and correct `instanceof AppError`.
- `src/shared/db/unit-of-work.ts` — IUnitOfWork.withTransaction<T>(work: (tx: PoolClient) => Promise<T>) and PgUnitOfWork (acquires from the shared pool, BEGIN/COMMIT/ROLLBACK, always releases). `src/shared/db/index.ts` is the public entry point re-exporting `pool`, `IUnitOfWork`, `PgUnitOfWork`.
- Jest tests under `tests/unit/shared/` cover the error classes, enum member sets, the requestedDays helper, and PgUnitOfWork transaction semantics.

### Phase 2 delivered (employee, leave-type, policy reference-data modules)

Three reference-data modules, each under `src/modules/<name>/` with a public `index.ts` re-exporting model, repository interface, repository implementation, service interface, and service implementation.

**File layout (divergence from the single-file convention above):** each module is split into separate files — `<name>.model.ts`, `<name>.repository.interface.ts`, `<name>.repository.ts`, `<name>.service.interface.ts`, `<name>.service.ts`, plus `index.ts`. This matches the existing `uptime` module convention rather than the `employee.{model,repository,service}.ts` single-file shape shown in the module-structure block.

**employee** — `Employee` model with the canonical fields (id, employeeNumber, firstName, lastName, email, role: EmployeeRole, managerId: string|null, department, hireDate: Date, terminationDate: Date|null, employmentStatus: EmploymentStatus). `IEmployeeRepository` (create, findById, findByEmployeeNumber, findByEmail) + `PgEmployeeRepository` (generates `id` via `randomUUID()`, maps snake_case rows). `IEmployeeService` (createEmployee, getEmployeeById) + `EmployeeService` validates required strings, enum membership, and hireDate; rejects duplicate employeeNumber/email with ConflictError(409); throws NotFoundError(404) on unknown id.

**leave-type** — `LeaveType` model (code: LeaveTypeCode, name, requiresApproval, maxConsecutiveDays, isPaid); `code` is the natural key (no generated id). `ILeaveTypeRepository` (create, findByCode, findAll) + `PgLeaveTypeRepository`. `ILeaveTypeService` (createLeaveType, getLeaveTypeByCode) + `LeaveTypeService` validates code enum membership, non-empty name, positive-integer maxConsecutiveDays; rejects duplicate code with ConflictError(409); NotFoundError(404) on unknown code.

**policy** — `LeavePolicy` model with the canonical fields (id, leaveTypeCode: LeaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom: Date, effectiveTo: Date|null, status). `IPolicyRepository` (create, findById, findByLeaveTypeCode, findAll) + `PgLeavePolicyRepository` (generates `id` via `randomUUID()`). `IPolicyService` (createLeavePolicy, getLeavePolicyById, getPolicyByLeaveTypeCode) + `PolicyService` validates numeric fields, effectiveFrom <= effectiveTo, and status; NotFoundError(404) on unknown id. `getPolicyByLeaveTypeCode` throws NotFoundError(404) when no policy exists for the code (added in Phase 4 to serve the balance module).

**Divergences from the plan worth noting:**
- `LeavePolicyStatus` (DRAFT | ACTIVE | SUPERSEDED) is declared as a **local enum in `policy.model.ts`**, not in `src/shared/types/index.ts` — unlike EmployeeRole/EmploymentStatus/LeaveTypeCode which live in shared types. The lifecycle states are canonical but the enum type itself is module-local.
- `PolicyService` takes an injected `ILeaveTypeService` (constructor dependency) and calls `getLeaveTypeByCode` to enforce the invariant that `leaveTypeCode` references an existing leave type — a cross-module dependency through the public entry point, throwing NotFoundError(404) when the code is unknown.
- No audit-log writes (GP-002) and no routes/controllers/RBAC for these modules — both are explicitly out of scope for this phase (audit is Phase 3; routes are deferred).
- Repositories accept an optional trailing `PoolClient` and fall back to the shared pool when omitted (per the AGENTS.md transaction-boundary decision), though none of these reference-data services open a transaction yet.

Jest unit tests under `tests/unit/modules/` cover each service with in-memory fake repositories (and a fake `ILeaveTypeService` for policy): create/retrieve happy paths plus ValidationError/ConflictError/NotFoundError semantics.

### Phase 3 delivered (audit and notification modules)
**notification** — `Notification` model (id, recipientId, type, title, message, relatedEntityType: `string | null`, relatedEntityId: `string | null`, relatedEntityCode: `string | null`, status: NotificationStatus, createdAt: Date, readAt: `Date | null`). `CreateNotificationInput = Omit<Notification, 'id' | 'status' | 'createdAt' | 'readAt' | 'relatedEntityCode'> & { status?: NotificationStatus; relatedEntityCode?: string | null }` — status defaults to PENDING when omitted and `relatedEntityCode` is persisted as `null` when the call site omits it. `INotificationRepository` (create, findById, updateStatus) + `PgNotificationRepository` (generates `id`/`createdAt`, defaults status to PENDING, `read_at` null on create). `INotificationService` (create, getById, markRead) + `NotificationService` validates required strings and status enum membership; `markRead` sets status READ and `readAt` to now, throwing NotFoundError(404) on unknown id.

> Later extension: the "Notify the approver when a leave request is cancelled" feature's Phase 2 added `relatedEntityCode` end-to-end — the model field, the `NotificationRow`/`mapRow`/`COLUMNS` plumbing, and the `create` INSERT column + `input.relatedEntityCode ?? null` value. The column is generic (a code for whatever `relatedEntityType` names) and nullable; `INotificationService`/`NotificationService` are unchanged. See that feature's section for the built shape.
### Phase 4 delivered (balance module)

The balance module under `src/modules/balance/` with the split-file layout (model, repository, service, `index.ts` — no separate interface files; the repository and service interfaces are declared in the same file as their implementations).

**model** — `LeaveBalance` (id, employeeId, leaveTypeCode: LeaveTypeCode, periodStart: Date, periodEnd: Date, entitledDays, usedDays, pendingDays). `CreateLeaveBalanceInput = Omit<LeaveBalance, 'id'>`. OPEN vs CLOSED is **not stored** — it is inferred from `periodStart`/`periodEnd` relative to the current date (binding decision #2/#3).

**repository** — `IBalanceRepository` (create, findById, findByKey, update) + `PgLeaveBalanceRepository` (generates `id` via `randomUUID()`, maps snake_case rows, accepts an optional trailing `PoolClient`). `findByKey(employeeId, leaveTypeCode, periodStart, periodEnd)` enforces the at-most-one-row-per-key invariant. `update(id, changes)` builds a dynamic `SET` clause from a `FIELD_COLUMNS` map and throws NotFoundError(404) when the row is missing (both the empty-changes branch and the zero-affected-row branch).

**service** — `IBalanceService` (openPeriod, carryForward, getBalance, getBalanceById) + `BalanceService`. The constructor injects `IBalanceRepository`, `IEmployeeService`, `IPolicyService`, and `IUnitOfWork` (cross-module dependencies through the public entry points).

- `openPeriod` validates the input (non-empty employeeId, `LeaveTypeCode` enum membership, valid `Date` instances, `periodStart < periodEnd`), then runs its state-changing work inside `uow.withTransaction`: verifies the employee exists (`getEmployeeById`), fetches the policy via `getPolicyByLeaveTypeCode`, and **grants the FULL entitlement at period start (no pro-rata)** — `entitledDays = policy.annualEntitlementDays`, `usedDays = 0`, `pendingDays = 0`. Rejects a non-positive entitlement with ValidationError(400) and a duplicate key with ConflictError(409). The transaction's `PoolClient` is forwarded as the optional last argument to every `IBalanceRepository` call.
- `carryForward` validates `sourceBalanceId`, then runs inside `uow.withTransaction`: loads the source balance (NotFoundError(404) if missing), fetches the policy, and rejects a period that is not closable (`periodEnd > now`) with ValidationError(400). It computes `unused = entitledDays - usedDays - pendingDays` (rejecting negative counters), then carries `min(unused, policy.carryForwardDays)` — a **hard cap, days above the cap forfeited** — into the next period. The next period starts at `source.periodEnd` and ends `accrualPeriodMonths` later (via a private `addMonths` helper that clamps to the last day of the target month). If the next period already exists it adds the carry to its `entitledDays`; otherwise it creates a new balance with `entitledDays = annualEntitlementDays + carry`. The transaction's `PoolClient` is forwarded to every `IBalanceRepository` call.
- `getBalance`/`getBalanceById` are read-only lookups (the latter throws NotFoundError(404) on unknown id) and never open a transaction or forward a client.

**Policy module refactor (this phase):** the policy module's repository and service interfaces were extracted into `policy.repository.interface.ts` and `policy.service.interface.ts` (previously declared inline in `policy.repository.ts` / `policy.service.ts`), and `IPolicyService.getPolicyByLeaveTypeCode` was added to serve the balance module's entitlement and carry-forward lookups. This brings policy in line with the split-file convention the other reference-data modules already followed.

**Divergences from the plan worth noting:**
- The phase spec's split-file constraint prescribed separate `balance.repository.interface.ts` / `balance.service.interface.ts` files (matching employee/leave-type/policy/audit/notification); the implementation instead used single files (`balance.repository.ts` / `balance.service.ts` with the interfaces declared alongside the implementations), matching PLAN.md's single-file prescription. This diverges from the spec constraint and is inconsistent with the policy module, which was refactored to split-file in this same phase.
- `BalanceService` depends on `IEmployeeService` and `IPolicyService` (not just `LeaveTypeCode`/`carryForwardDays` values) — it resolves the entitlement and carry-forward cap from the live policy rather than receiving them as parameters.
- No audit-log writes (GP-002) and no routes/controllers/RBAC — out of scope for this phase (the leave orchestrator in Phase 6 owns the audit/notification side effects).

Jest unit tests under `tests/unit/modules/balance/` cover `openPeriod` (full-entitlement grant, invalid leaveTypeCode/entitlement/period-range, unknown employee/policy, duplicate key) and `carryForward` (min(unused, cap) with forfeiture, cap enforcement, zero carry, missing source, non-closable period) using in-memory fakes for the repository, employee service, policy service, and a fake `IUnitOfWork`.

### Phase 5 delivered (validation module)

The validation module under `src/modules/validation/` with a minimal split-file layout (model, service, `index.ts` — no repository, no separate interface files; `IValidationService` is declared alongside `ValidationService` in `validation.service.ts`).

**model** — `ValidationResult` (`{ valid: boolean; errors: string[] }`), a pure value object describing the outcome of a validation rule. It reports only pass/fail plus failure reasons; it performs no side effects and never throws. The service decides whether to surface a typed `AppError` from a failed result.

**service** — `IValidationService` (validateDateRange, validateSufficiency, validateLeaveRequest) + `ValidationService`. The service imports the canonical `requestedDays` helper directly from `src/shared/types/index.ts` (Phase 1) — it does **not** define or re-export a local day-count helper.

- `validateDateRange(startDate, endDate)` rejects a non-date argument or `startDate > endDate` with `ValidationError` (400).
- `validateSufficiency(balance, requestedDays)` rejects with `ConflictError` (409) when `entitledDays - usedDays - pendingDays < requestedDays`.
- `validateLeaveRequest(dto, balance)` composes input validation (non-empty `employeeId`, `LeaveTypeCode` enum membership), date-range validation, and the sufficiency check — deriving `requestedDays` via the shared `requestedDays(dto.startDate, dto.endDate)` helper before the sufficiency check.
- Two pure rule methods — `checkDateRange` and `checkSufficiency` — return a `ValidationResult` without throwing; the throwing wrappers funnel a failed result through a private `assert` helper that maps the result to the appropriate error type. A private `checkLeaveRequestInput` validates the DTO shape (object present, non-empty `employeeId`, `LeaveTypeCode` enum membership).

**Divergences from the plan worth noting:**
- PLAN.md Phase 5 prescribed implementing the binding day-count rule "ONCE as a shared helper" in the validation module (e.g. `calculateRequestedDays`). The canonical `requestedDays` helper was already implemented in `src/shared/types/index.ts` in Phase 1, so the validation module imports it directly rather than defining a local delegate — the single source of truth remains shared/types, and no `calculateRequestedDays` symbol exists.
- The plan did not specify error types for the sufficiency check; the implementation surfaces insufficiency as `ConflictError` (409) while date-range failures are `ValidationError` (400).
- `validateLeaveRequest` adds `employeeId`/`leaveTypeCode` input validation beyond the plan's date-range + sufficiency scope.
- No repository, no routes/controllers/RBAC, and no audit-log writes (GP-002) — out of scope for this phase (the leave orchestrator in Phase 6 owns the audit/notification side effects and consumes this module).

Jest unit tests under `tests/unit/modules/validation/` cover the shared `requestedDays` helper (single day, consecutive days, weekend span, month boundary), `validateDateRange`, `validateSufficiency` (including pendingDays accounting), and `validateLeaveRequest` (happy path, ConflictError on insufficient balance, ValidationError on inverted range).

### Phase 6a delivered (leave model + repository)

The leave module foundation under `src/modules/leave/` — this sub-phase delivers only the model and repository; the service, routes, public `index.ts`, and tests belong to sibling sub-phases 6b/6c and are intentionally absent.

**model** — `LeaveRequest` with the exact canonical 12-field shape (id, employeeId, leaveTypeCode: LeaveTypeCode, startDate: Date, endDate: Date, requestedDays: number, reason, status: LeaveStatus, approverId, approvalComment, submittedAt, decidedAt). `CreateLeaveRequestInput = Omit<LeaveRequest, 'id'>` — the repository generates `id`. Nullability: `reason`, `approverId`, `approvalComment`, `submittedAt`, and `decidedAt` are `string | null` / `Date | null` (a DRAFT request has no approver/decision yet); `requestedDays` is persisted as the value the service computed via the shared `requestedDays` helper — the model/repository do not re-derive it.

**repository** — `ILeaveRepository` (create, findById, update, findByQuery) + `PgLeaveRequestRepository`, declared **inline in `leave.repository.ts`** (the balance convention, not the separate `leave.repository.interface.ts` file used by audit/notification/employee/leave-type/policy). The repository obtains its connection from the shared pool in `src/shared/db/connection.ts` (constructor-injected `dbPool` defaulting to `defaultPool`), generates `id` via `randomUUID()`, and maps snake_case `leave_requests` columns ↔ camelCase fields via a `mapRow` helper and a `COLUMNS` constant. Every method accepts an optional trailing `PoolClient` and falls back to the shared pool when omitted (via a private `db(client)` helper) — the repository never opens BEGIN/COMMIT/ROLLBACK.

- `create` inserts all 12 columns and returns the persisted row.
- `findById` is read-only and returns `null` when absent (does not throw — the service decides error semantics).
- `update(id, changes: UpdateLeaveRequestDto)` builds a dynamic `SET` clause from a `FIELD_COLUMNS` map (`startDate`, `endDate`, `reason`, `status`, `approverId`, `decidedAt`); an empty changes object returns the existing row (throwing NotFoundError(404) if missing), and a zero-affected-row update throws NotFoundError(404).
- `findByQuery(params: LeaveRequestQueryParams)` honors the status/leaveTypeCode/date-range filters plus `limit`/`offset`, ordering by `start_date DESC`, and returns an array (possibly empty).

**Divergences from the plan worth noting:**
- PLAN.md Phase 6 prescribed a single phase delivering model + repository + service + routes + `index.ts`; the implementation split it into sub-phases, and this sub-phase (6a) delivers only the model and repository. No service, routes, `index.ts`, or tests exist yet.
- The repository interface is declared inline (balance convention) rather than in a separate `leave.repository.interface.ts` file — the spec listed this as an open ambiguity with both options valid.
- No audit-log writes (GP-002) and no routes/controllers/RBAC — out of scope for this sub-phase (the Phase 6b service owns the audit/notification side effects and the approve/reject unit of work).

### Phase 6b delivered (leave service + routes + index.ts)

This sub-phase completes the leave module: the orchestration service, the Fastify routes, and the public `index.ts` (the model and repository were delivered in 6a).

**service** — `LeaveActor` (`{ id: string; role: EmployeeRole }`), `ILeaveService` (create, submit, approve, reject), and `LeaveService`. The constructor injects eight collaborators: `ILeaveRepository`, `IBalanceRepository`, `IAuditService`, `INotificationService`, `IValidationService`, `IEmployeeService`, `IPolicyService`, and `IUnitOfWork` — all cross-module dependencies resolved through public entry points. A `createLeaveService()` factory wires the concrete PostgreSQL-backed collaborators (including `new PgUnitOfWork()`).

- `create(actor, input)` asserts the actor is authenticated, **forces `employeeId = actor.id`** (the requester always owns the request, ignoring any client-supplied id), resolves the balance for the requested period, runs `validateLeaveRequest`, computes `requestedDays` via the shared helper, and inserts a DRAFT row. It then records a CREATE audit entry. `create` does **not** open a transaction — the insert and audit write are not atomic.
- `submit(actor, requestId)` enforces owner-only (ForbiddenError) and DRAFT-only (ConflictError), then runs inside `uow.withTransaction`: resolves the balance, updates status → SUBMITTED, increments `pendingDays` by `requestedDays`, and records an UPDATE audit entry. No notification is sent on submit.
- `approve(actor, requestId)` enforces `assertCanDecide` (MANAGER/ADMIN only, no self-approval, a MANAGER must be the requester's direct manager via `employeeService.getEmployeeById`) and SUBMITTED-only, then runs inside `uow.withTransaction`: resolves the balance, asserts `pendingDays >= requestedDays` (ConflictError otherwise), updates status → APPROVED **with `approverId = actor.id` and `decidedAt = now`**, decrements `pendingDays` and increments `usedDays`, records an APPROVE audit entry, and inserts a synchronous notification to the requester.
- `reject(actor, requestId)` mirrors approve but decrements `pendingDays` only (no `usedDays` change), updates status → REJECTED **with `approverId = actor.id` and `decidedAt = now`**, records a REJECT audit entry, and sends a rejection notification.
- `resolveBalance(employeeId, leaveTypeCode, date, client?)` fetches the policy and employee, computes the accrual period containing `date` via private `periodContaining` (anchored on `employee.hireDate`, stepping `accrualPeriodMonths` at a time with a 10,000-iteration safety bound), and looks the balance up with `findByKey` (NotFoundError if absent). `periodContaining`/`startOfUtcDay`/`addMonths` are private UTC helpers.

**routes** — `leaveRoutes(fastify)` registers four endpoints with **no controller file** (routes call the service directly, per binding rule 5): `POST /leaves` (201), `POST /leaves/:id/submit`, `POST /leaves/:id/approve`, `POST /leaves/:id/reject` (all 200). A `resolveActor` helper extracts `request.user` and enforces role membership at the API boundary (GP-005), throwing UnauthorizedError on a missing/invalid actor. A `sendError` helper maps `AppError` to `{ error, code }` with the correct status, and any other throw to a 500. The service instance is resolved from `fastify.leaveService` if present, else `createLeaveService()`.

**index.ts** — re-exports `LeaveRequest`/`CreateLeaveRequestInput` (model), `ILeaveRepository`/`PgLeaveRequestRepository` (repository), `ILeaveService`/`LeaveService`/`LeaveActor`/`createLeaveService` (service), and `leaveRoutes` (routes).

**Divergences from the plan worth noting:**
- The canonical lifecycle includes CANCELLED, but no `cancel` operation or route is implemented — the service exposes only create/submit/approve/reject.
- The repository's `findByQuery` (list/query) is not surfaced by any route — there is no GET/list endpoint.
- `approvalComment` and `submittedAt` are never populated — they remain `null` even after submit/approve/reject (the `update` repository method does not support those fields). `approverId` and `decidedAt` ARE populated on approve/reject (added in a follow-up fix phase): the `UpdateLeaveRequestDto` gained `approverId?`/`decidedAt?`, the repository's `FIELD_COLUMNS` map gained `approverId: 'approver_id'` / `decidedAt: 'decided_at'`, and the service now sets both in the approve/reject transitions, so the audit `afterState` captures the approver identity and decision timestamp.
- `create` writes its audit entry outside a transaction (unlike submit/approve/reject), so a failed audit insert would leave the DRAFT row committed without its audit record.

### Phase 6c delivered (leave service unit tests)

This sub-phase adds the Jest unit tests for the `LeaveService` orchestration delivered in 6b, under `tests/unit/modules/leave/leave.service.test.ts`. No production source files were modified — the 6a/6b deliverables are treated as fixed contracts.

**Fakes** — eight in-memory fakes, one per injected collaborator, all imported through public entry points: `FakeLeaveRepository`, `FakeBalanceRepository`, `FakeAuditService`, `FakeNotificationService`, `FakeValidationService`, `FakeEmployeeService`, `FakePolicyService`, and `FakeUnitOfWork`. `FakeUnitOfWork` mirrors the balance test's pattern — `withTransaction` runs its callback with an opaque stub `PoolClient` (`{} as PoolClient`) and counts invocations, so transaction-boundary assertions are containment-based (all steps inside one callback, client forwarded) rather than rollback-simulation.

**Coverage** — the suite exercises all four operations and their guards:
- `create` — forces `employeeId = actor.id` (ignoring the client-supplied id), persists a DRAFT row with `requestedDays` from the shared helper, and records a CREATE audit entry; rejects a missing actor (UnauthorizedError), an invalid role (ForbiddenError), a missing balance (NotFoundError), and propagates ValidationError/ConflictError from `validateLeaveRequest`.
- `submit` — owner-only (ForbiddenError on non-owner), DRAFT-only (ConflictError on non-DRAFT), NotFoundError on unknown id; the happy path asserts status → SUBMITTED, `pendingDays` incremented by `requestedDays`, an UPDATE audit entry, and that all writes occur inside the single `withTransaction` callback with the stub client forwarded.
- `approve` — MANAGER/ADMIN only, no self-approval, a MANAGER must be the requester's direct manager (ADMIN exempt), SUBMITTED-only, and `pendingDays >= requestedDays` (all ForbiddenError/ConflictError otherwise); the happy path asserts status → APPROVED with `approverId = actor.id` and `decidedAt` set, `pendingDays` decremented and `usedDays` incremented, an APPROVE audit entry, and a synchronous notification to the requester — all inside one unit of work.
- `reject` — mirrors approve's guards but asserts `pendingDays` decremented only (`usedDays` untouched), status → REJECTED with `approverId`/`decidedAt` set, a REJECT audit entry, and a rejection notification, all inside one unit of work.

**Divergences from the plan worth noting:**
- The spec's atomicity ambiguity (rollback-simulation vs containment) was resolved in favor of containment: the tests assert all four steps occur within the single `withTransaction` callback and that the stub client is forwarded to each repository/service call, rather than simulating a mid-transaction throw.
- The spec's client-forwarding ambiguity was resolved in favor of the opaque stub client (matching the balance test), but the tests still assert the stub client is forwarded to repository/service calls via recorded `client` fields on the fakes.
- The CANCELLED lifecycle state and the repository's `findByQuery`/list behavior are explicitly out of scope (no `cancel` operation or GET endpoint exists to test).

### Open questions
Day-count calendar vs business days; accrual model; carry-forward cap; migration mechanism; controller layer; BullMQ for notifications.
<!-- gestalt:architecture feature=babd3932-368b-46a5-a4dc-6dccaafd84ba END -->

<!-- gestalt:architecture feature=621bb1fd-0965-415a-bf2e-ec2c42b15f04 START -->
## Feature: Leave cancellation flow

> Superseded in part by **"Feature: Notify the approver when a leave request is cancelled"** (below): the `notifications` table gains the nullable `related_entity_code` column, and a SUBMITTED/APPROVED cancellation now notifies the approver as well as the affected employee. The `notifications` shape and the cancellation notification contract in this section reflect the original flow only.

### Stack compliance
TypeScript 20, Fastify, PostgreSQL via pg, modular monolith. No stack deviations.

### Domain entities
- **LeaveRequest** — lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. Gains `cancelledBy` and `cancelledAt` (null until cancelled).
- **LeaveBalance** — lifecycle: OPEN, CLOSED. Cancellation mutates `pendingDays` (DRAFT/SUBMITTED) or `usedDays` (APPROVED).
- **AuditLog** — lifecycle: RECORDED. Immutable record; cancellation writes action CANCEL.
- **Notification** — lifecycle: PENDING, SENT, READ, ARCHIVED. Notifies affected employee.

### Conceptual tables (no DDL)
- **leave_requests**: id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id, status, (leave_type_code, start_date).
- **leave_balances**: id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Unique index (employee_id, leave_type_code, period_start, period_end); index employee_id.
- **audit_logs**: id, actor_id, action, entity_type, entity_id, before_state, after_state, occurred_at. PK id. FK actor_id -> employees.id. Indexes (entity_type, entity_id), actor_id.
- **notifications**: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at. PK id. FK recipient_id -> employees.id. Indexes recipient_id, status.

### Repositories
- ILeaveRepository -> PgLeaveRequestRepository: create, findById, update, findByQuery
- IBalanceRepository -> PgLeaveBalanceRepository: create, findById, findByKey, update
- IAuditRepository -> PgAuditLogRepository: create, findById
- INotificationRepository -> PgNotificationRepository: create, findById, updateStatus

### Modules
- **leave** (`src/modules/leave/`) owns ILeaveService.cancel + LeaveService.cancel orchestration, cancellation authorization, balance release, POST /leaves/:id/cancel, CANCEL audit + notification.
- **shared-types** (`src/shared/types/`) owns AuditAction.CANCEL enum value.

### Dependency map
leave -> shared-types, balance, audit, notification, employee, validation, policy, shared-db, shared-errors.

### Cross-cutting contracts
- **Auth**: request.user: { id: string; role: EmployeeRole } where EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'. JWT bearer verified by auth middleware; resolveActor validates presence/role at API boundary; RBAC enforced in service (owner DRAFT/SUBMITTED, direct-manager APPROVED), never inline in route.
- **Error**: Errors return { error: string; code: string }. Validation -> 400 ValidationError; auth -> 401 UnauthorizedError; authorization -> 403 ForbiddenError; not found -> 404 NotFoundError; invalid state transition -> 409 ConflictError; other -> 500.
- **Transaction**: Cancellation is atomic via IUnitOfWork.withTransaction (PgUnitOfWork: PoolClient, BEGIN, callback, COMMIT/ROLLBACK, release). Repository/service methods that join a caller transaction take optional trailing PoolClient; cancel passes client to ILeaveRepository.update, IBalanceRepository.update, IAuditService.record, INotificationService.create. Balance reads before write use findByKey with forUpdate=true.

### Resolved conflicts
- Added `cancelled_by` and `cancelled_at` to leave_requests to match LeaveRequest.cancelledBy/cancelledAt.
- Added AuditAction.CANCEL to shared-types (resolves data open question).
- Balance release uses canonical inclusive day count: requestedDays = endDate - startDate + 1.

### Recommended phases
1. Add AuditAction.CANCEL to shared-types.
2. Add cancel to ILeaveService + LeaveService.
3. Add POST /leaves/:id/cancel route.
4. LeaveService cancel unit tests.

### Phase 1 delivered (AuditAction.CANCEL enum member)

This phase delivered only the shared-enum change (recommended phase 1); the cancel service, route, and tests (phases 2–4) are not yet implemented.

- `src/shared/types/index.ts` — `AuditAction` gained `CANCEL = 'CANCEL'`, appended after `REJECT` in the existing member order, so the enum is now exactly `CREATE, UPDATE, DELETE, APPROVE, REJECT, CANCEL` (each an uppercase string-literal value equal to its member name). No other enum or DTO changed.
- `tests/unit/shared/types.test.ts` — the existing `AuditAction` member-list assertion was extended to expect the six-member order `['CREATE','UPDATE','DELETE','APPROVE','REJECT','CANCEL']` (the test description was updated to match).

**Divergences from the plan worth noting:**
- PLAN.md Phase 1 prescribed searching for consumers that switch exhaustively on `AuditAction` and updating them so the new CANCEL case is handled. No such switch exists: `src/modules/audit/audit.service.ts` validates via `Object.values(AuditAction).includes(input.action)`, which accepts the new member without modification, and the leave service references `AuditAction` only by value. No consumer changes were required.
- The `UpdateLeaveRequestDto` / `FIELD_COLUMNS` map do **not** yet carry `cancelledBy`/`cancelledAt` — those belong to the Phase 2 service/repository work and are intentionally absent here.

### Phase 2 delivered (cancel service, model/repository support, and unit tests)

This phase completes the cancellation flow's service, persistence, and test layers. The `POST /leaves/:id/cancel` route (recommended phase 3) was **not** added in this phase — it was delivered in Phase 3 (see below).

**model** — `LeaveRequest` gained `cancelledBy: string | null` and `cancelledAt: Date | null` (both null until cancelled), bringing the entity to 14 fields. `CreateLeaveRequestInput` is unchanged in shape (still `Omit<LeaveRequest, 'id'>`), so `create` now supplies both new fields as `null`.

**shared-types** — `UpdateLeaveRequestDto` gained `cancelledBy?: string` and `cancelledAt?: Date` (the only shared-types change this phase; `AuditAction.CANCEL` was already added in Phase 1).

**repository** — `PgLeaveRequestRepository` gained the two new columns end-to-end: `COLUMNS` now selects `cancelled_by, cancelled_at`; `LeaveRequestRow`/`mapRow` carry them; `create` inserts 14 values; and `FIELD_COLUMNS` maps `cancelledBy: 'cancelled_by'` / `cancelledAt: 'cancelled_at'` so `update` can set them.

**service** — `ILeaveService` gained `cancel(actor, requestId)`; `LeaveService.cancel` implements it plus a private `assertCanCancel` helper.

- `assertCanCancel` authorization: the owner may cancel their own DRAFT or SUBMITTED request; otherwise only an APPROVED request may be cancelled, by the direct manager (`employee.managerId === actor.id`) or an ADMIN (exempt from the direct-manager check). All other combinations throw ForbiddenError.
- Timing guard: cancellation is blocked once `startDate <= today` (UTC day comparison) with ConflictError — this is what removes any need to pro-rate the released balance.
- Balance release (full `requestedDays`, no pro-rating): DRAFT → no balance read or write; SUBMITTED → `pendingDays -= requestedDays`; APPROVED → `usedDays -= requestedDays`. The balance row is read with `forUpdate = true` (row lock) before the write, exactly as submit/approve/reject.
- Status transition: `status → CANCELLED` with `cancelledBy = actor.id` and `cancelledAt = now`.
- Side effects: a CANCEL audit entry (`AuditAction.CANCEL`) and a synchronous cancellation notification to the requester.
- Atomicity: the whole operation runs inside one `uow.withTransaction`, with the client threaded through every repository/service call.

**tests** — the `cancel` describe block in `tests/unit/modules/leave/leave.service.test.ts` covers owner-cancels-DRAFT (no balance touch), owner-cancels-SUBMITTED (pendingDays release), direct-manager-cancels-APPROVED (usedDays release), ADMIN-cancels-APPROVED, the ForbiddenError guards (non-owner, owner-cancels-own-APPROVED, non-direct-manager), the timing ConflictError, and NotFoundError — all with containment-based transaction assertions (single `withTransaction` callback, stub client forwarded).

**Divergences from the plan worth noting:**
- The plan's phase 2 prescribed "no tests in this phase" (tests were phase 4); the implementation delivered the service and the tests together, deferring the route to Phase 3.
- The plan prescribed reading the balance row with the row lock "exactly as submit/approve/reject do"; the implementation skips the balance read entirely for DRAFT (which reserved nothing), reading/locking only for SUBMITTED and APPROVED.

### Phase 3 delivered (POST /leaves/:id/cancel route)

This phase adds the HTTP surface for cancellation, completing the four recommended phases.

**routes** — `leaveRoutes(fastify)` in `src/modules/leave/leave.routes.ts` gained a fifth endpoint, `POST /leaves/:id/cancel` (200), following the existing conventions exactly: no controller file (the route calls `leaveService.cancel(actor, request.params.id)` directly), `resolveActor` extracts `request.user` and enforces role membership at the API boundary (UnauthorizedError on missing/invalid actor), `sendError` maps `AppError` to `{ error, code }` with the correct status and any other throw to 500, and the service instance is resolved from `fastify.leaveService` if present, else `createLeaveService()`. The endpoint mirrors the submit/approve/reject handlers (try/catch → `request.log.error` → `sendError`).

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 3 exactly (one file, `leave.routes.ts`, no service logic, no tests).

### Phase 4 delivered (cancel unit tests)

This phase adds the Jest unit tests for `LeaveService.cancel` to `tests/unit/modules/leave/leave.service.test.ts`, extending the existing suite. No production source files were modified — the Phase 1–3 deliverables (`AuditAction.CANCEL`, the cancel service, and the route) are treated as fixed contracts.

**Coverage** — a new `cancel` describe block exercises the operation's authorization, timing guard, balance release, status transition, side effects, and atomicity, reusing the existing eight in-memory fakes and fixtures (`makeRequest`, `makeActor`, `makeBalance`, `makeEmployee`, `makePolicy`) and their recorded-call arrays:

- **Owner cancels DRAFT** — status → CANCELLED with `cancelledBy = actor.id` and `cancelledAt` set; asserts **zero** balance reads/writes (`findByKeyCalls` and `updateCalls` remain empty), exactly one CANCEL audit entry (`AuditAction.CANCEL`, `entityType 'leave_request'`, `entityId = request id`), one synchronous cancellation notification to the requester, and `uow.callCount === 1` with the stub client forwarded to every participating call.
- **Owner cancels SUBMITTED** — releases the full `requestedDays` by decrementing `pendingDays` (leaving `usedDays` untouched), asserting the balance row was read with `forUpdate = true` before the write.
- **Direct manager cancels APPROVED** — releases the full `requestedDays` by decrementing `usedDays` (leaving `pendingDays` untouched), with the `forUpdate` row lock asserted.
- **ADMIN cancels APPROVED** — an ADMIN cancels an APPROVED request for anyone (exempt from the direct-manager check).
- **Authorization guards** — ForbiddenError for a non-owner cancelling a DRAFT, the owner cancelling their own APPROVED request, and a non-direct manager cancelling an APPROVED request.
- **Timing guard** — ConflictError when `startDate` is today or in the past (a past start and a same-UTC-day start); success paths use future startDate fixtures relative to `Date.now()`.
- **Actor validation** — UnauthorizedError on a missing actor, ForbiddenError on an invalid role.
- **NotFoundError** — unknown request id.

**Divergences from the plan worth noting:**
- The plan's Phase 4 coverage is matched, plus two extra actor-validation cases (missing actor → UnauthorizedError, invalid role → ForbiddenError) and an explicit "starts today" timing case beyond the single past-date case.
- The Phase 2 delivered section above noted the cancel tests were delivered together with the service; the committed diff for this phase shows the test file as the sole production change, so the cancel tests are consolidated here (Phase 4), matching the plan's phase split.

### Open questions
- ADMIN cancellation authority for APPROVED requests — **resolved**: ADMIN may cancel an APPROVED request for anyone (exempt from the direct-manager check).
- Whether APPROVED cancellation is allowed after startDate/endDate has passed — **resolved**: blocked once `startDate <= today` (ConflictError).
- Whether usedDays release is full or pro-rated when leave has partially elapsed — **resolved**: full release, no pro-rating, because the timing guard makes cancellation possible only before the leave starts.
<!-- gestalt:architecture feature=621bb1fd-0965-415a-bf2e-ec2c42b15f04 END -->

<!-- gestalt:architecture feature=e8c586bc-23c0-4c59-9111-ee280659da9a START -->
## Authentication and read endpoints (v3) — Reconciled Architecture

### Stack compliance
TypeScript 20, Fastify, PostgreSQL, modular monolith, Jest. No controller layer is introduced; routes call services directly (open question Q1).

### Domain entities and lifecycle states
- **Employee**: id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, passwordHash. Lifecycle: ACTIVE, TERMINATED, ON_LEAVE.
- **AuthToken**: sub, role, expiresIn. Lifecycle: ISSUED, EXPIRED.
- **LeaveRequest**: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt. Lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **LeaveBalance**: id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available (computed). Lifecycle: OPEN, CLOSED.
- **LeavePolicy**: id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status. Lifecycle: DRAFT, ACTIVE, SUPERSEDED.
- **LeaveType**: code, name, requiresApproval, maxConsecutiveDays, isPaid. Lifecycle: none (static catalog).

### Binding business rules
- requestedDays = endDate - startDate + 1 (inclusive calendar days, whole-day UTC, no weekend/holiday exclusion) is the single canonical day-count derivation.
- Date-range filtering is inclusive on both edges: startDateFrom <= startDate <= startDateTo and endDateFrom <= endDate <= endDateTo.
- Leave visibility is role-scoped: EMPLOYEE sees only their own requests; MANAGER sees their own plus direct reports (employee.managerId === actor.id), one level only, not transitive; ADMIN sees all. Same rule for list and single-read.
- Manager visibility is status-unrestricted; visibility and decide authority are separate (decide stays SUBMITTED-only).
- Unauthorized single-read returns the same 404 as a nonexistent id (no id probing).
- Login: wrong email vs wrong password indistinguishable; passwordHash never in any response.
- Accrual-period derivation shared (startOfUtcDay/addMonths/periodContaining, pure UTC, anchored on hireDate) — one implementation reused by leave and balance paths.
- Effective policy selection: at most one per leaveTypeCode (ACTIVE, effectiveFrom <= asOf, effectiveTo null or >= asOf; tie-break latest effectiveFrom).
- No balance row for a policy's current period → omit that leave type; no open periods → empty list (200), never an error.
- available = entitledDays - usedDays - pendingDays.
- Actor always resolved from the verified token, never a client-supplied id.

### Conceptual tables
- **employees**: fields id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: email unique, employee_number unique, manager_id.
- **leave_requests**: fields id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id, status, (leave_type_code, start_date).
- **leave_balances**: fields id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Indexes: (employee_id, leave_type_code, period_start, period_end) unique, employee_id.
- **leave_policies**: fields id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months, carry_forward_days, min_notice_days, max_request_days, requires_manager_approval, effective_from, effective_to, status. PK id. FK leave_type_code -> leave_types.code. Index: leave_type_code.
- **leave_types**: fields code, name, requires_approval, max_consecutive_days, is_paid. PK code. Index: code natural key.

Migration note: add nullable `password_hash` to `employees` using `t.text(...)` per initial-schema convention; date columns are UTC-parsed by `src/shared/db/connection.ts`.

### Repositories
- **IEmployeeRepository / PgEmployeeRepository**: create, findById, findByEmployeeNumber, findByEmail, findByManagerId.
- **ILeaveRepository / PgLeaveRequestRepository**: create, findById, update, findByQuery.
- **IPolicyRepository / PgLeavePolicyRepository**: create, findById, findByLeaveTypeCode, findAll.
- **IBalanceRepository / PgLeaveBalanceRepository**: create, findById, findByKey, update.
- **ILeaveTypeRepository / PgLeaveTypeRepository** (existing, referenced by policy): findById/findByCode.

### Modules and boundaries
- **shared-date** (`src/shared/date/`): startOfUtcDay, addMonths, periodContaining, index.ts.
- **shared-types** (`src/shared/types/`): EmployeeProfile, LeaveRequestQueryParams.employeeIds, canonical enums, requestedDays.
- **shared-auth** (`src/shared/auth/`): registerAuth, signToken, verifyToken, public path set.
- **shared-errors** (`src/shared/errors/`): AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError.
- **shared-db** (`src/shared/db/`): connection.ts, pg Pool, IUnitOfWork.
- **validation** (`src/shared/validation/`): validation helpers.
- **audit** (`src/modules/audit/`): audit logging.
- **notification** (`src/modules/notification/`): notification dispatch.
- **leave-type** (`src/modules/leave-type/`): LeaveType, ILeaveTypeRepository, PgLeaveTypeRepository, LeaveTypeService.
- **auth** (`src/modules/auth/`): IAuthService, AuthService, authRoutes (POST /auth/login), login flow (bcrypt compare + signToken).
- **employee** (`src/modules/employee/`): Employee (incl passwordHash), IEmployeeRepository (+findByManagerId), PgEmployeeRepository, IEmployeeService (+getEmployeeByEmail, getEmployeesByManagerId, getEmployeeProfileById), EmployeeService, employeeRoutes (GET /employees/me), toEmployeeProfile mapping.
- **policy** (`src/modules/policy/`): LeavePolicy, IPolicyRepository, PgLeavePolicyRepository, IPolicyService (+getAllPolicies), PolicyService.
- **balance** (`src/modules/balance/`): LeaveBalance, IBalanceRepository, PgLeaveBalanceRepository, IBalanceService (+getCurrentBalances), BalanceService, balanceRoutes (GET /balances/me).
- **leave** (`src/modules/leave/`): LeaveRequest, ILeaveRepository, PgLeaveRequestRepository, ILeaveService (+list, getById), LeaveService, leaveRoutes (+GET /leaves, GET /leaves/:id).

### Dependency map
- auth -> employee, shared-auth, shared-types, shared-errors
# `shared-auth` is here for the `AuthUser` type employee.routes.ts reads off the request.
- employee -> shared-auth, shared-types, shared-errors, shared-db
- policy -> leave-type, shared-types, shared-errors
- balance -> employee, policy, shared-date, shared-types, shared-errors, shared-db
- leave -> balance, validation, policy, employee, audit, notification, leave-type, shared-date, shared-types, shared-errors, shared-db
# `shared-errors` is here because accrual.ts throws ConflictError on an out-of-range date.
- shared-date -> shared-errors, shared-types
- shared-auth -> shared-types, shared-errors

#### The web build (`web/src/`)

This repository holds TWO builds. The service above lives under `src/`; the React app lives
under `web/src/` with its own `package.json` and its own module boundaries. They are declared
as separate application roots in `HARNESS.json` (`qualityGate.applicationRoots`), and the web
root carries the `web-` prefix — without it the two builds' `leave` modules would collide in
this one flat map, which is how a frontend came to be checked against the backend's
allow-list and had every import reported as a violation (run `ecef04ad`).

Module names are DERIVED from the path, not chosen: `<prefix><name>` under the `modules`
container, `<prefix><container>-<name>` under any other. A name that does not derive this way
is not merely odd — the dependency check resolves the file, finds no entry, and stays silent.
This map previously carried `api-client` and `presentation-pages`, which matched nothing, so
the entire frontend was checked by nothing at all.

The direction is: presentation -> modules -> infrastructure -> shared. `web-approvals`
deliberately does NOT reach `web-infrastructure-api` directly; it goes through the
`web-leave` and `web-employee` services, and that is the layering this map exists to hold.

- web-infrastructure-api -> web-shared-types
- web-auth -> web-infrastructure-api, web-shared-types
- web-employee -> web-infrastructure-api, web-shared-types
- web-leave -> web-infrastructure-api, web-shared-types
- web-approvals -> web-employee, web-leave, web-shared-types
- web-presentation-components -> web-auth
# `web-leave` is here for ONE import: `canApproveLeave`. A route guard asking the module
# that owns the authorization rule is the point — the guard used to carry its own inverted
# copy (`role === EMPLOYEE -> deny`), which fails OPEN the day a fourth role exists.
- web-presentation-guards -> web-auth, web-leave, web-shared-types
- web-presentation-pages -> web-approvals, web-auth, web-employee, web-leave, web-presentation-components, web-shared-date, web-shared-types

### Recommended phases
1. **Shared foundations: date helpers + shared types** — extract accrual helpers and add shared types. (3 files)
2. **Employee: password_hash, findByManagerId, profile mapping** — migration, repository/service extensions, toEmployeeProfile. (6 files)
3. **Policy: getAllPolicies exposure** — add IPolicyService.getAllPolicies() calling existing findAll(). (2 files)
4. **Auth module: POST /auth/login** — bcrypt.compare + signToken, indistinguishable error, public path. (4 files)
5. **Balance: getCurrentBalances + GET /balances/me** — iterate active policies, derive period, omit missing rows. (3 files)
6. **Leave reads: list/getById + GET /leaves, GET /leaves/:id** — extend findByQuery with employeeIds, role scoping, 404-equivalence. (4 files)
7. **GET /employees/me route + smoke/unit tests** — wire profile route, extend smoke.js, add unit tests. (5 files)

### Cross-cutting contracts
- **Auth**: `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity/role obtained from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`. RBAC enforced at the API boundary by `resolveActor` and in services (role-scoped visibility), never inline in routes. `POST /auth/login` is added to the public path set; all other new endpoints require a valid token.
- **Error**: errors return `{ error: string; code: string }`. Validation failure -> HTTP 400 (ValidationError); authentication failure -> 401 (UnauthorizedError); authorization failure -> 403 (ForbiddenError); not found -> 404 (NotFoundError); invalid state transition -> 409 (ConflictError); other -> 500. `POST /auth/login` returns the SAME status and message for wrong email and wrong password (401 UnauthorizedError). `GET /leaves/:id` returns the SAME 404 NotFoundError for a request the caller may not see as for one that does not exist.
- **Transaction**: none required — this feature is read-only plus a single non-persistent login write; read endpoints must not open a transaction.

### Phase 1 delivered (shared date helpers + shared types)

This phase delivered only the shared foundations (recommended phase 1); the employee/policy/auth/balance/leave-read work (phases 2–7) is not yet implemented.

- `src/shared/date/accrual.ts` — three pure UTC helpers copied verbatim from the private implementations in `src/modules/leave/leave.service.ts` (`startOfUtcDay`, `addMonths`, `periodContaining`) and `src/modules/balance/balance.service.ts` (`addMonths`), with unchanged arithmetic, error messages, and the 10,000-iteration safety bound. `startOfUtcDay` returns `Date.UTC(y,m,d)` of the input's UTC components; `addMonths` clones, sets UTC date to 1, adds months via `setUTCMonth`, and clamps the day to the last day of the target month; `periodContaining` steps `accrualMonths` periods from the anchor's UTC day start and throws `ConflictError` when `date < anchor` ('Requested date precedes the accrual anchor') or when no period resolves within the bound ('Unable to resolve accrual period'). `ConflictError` is imported from `src/shared/errors`.
- `src/shared/date/index.ts` — public entry point re-exporting `startOfUtcDay`, `addMonths`, `periodContaining`.
- `src/shared/types/index.ts` — added `EmployeeProfile` (id, employeeNumber, firstName, lastName, email, role: EmployeeRole, managerId: string | null, department, hireDate: Date, employmentStatus: EmploymentStatus — **no** passwordHash or terminationDate, reusing the existing enums) and added `employeeIds?: string[]` to `LeaveRequestQueryParams`. No other enum or DTO changed.
- `tests/unit/shared/date.test.ts` — Jest coverage for `startOfUtcDay` (UTC midnight, no input mutation), `addMonths` (advance, month-end clamping incl. leap-year February, negative offsets, no mutation), `periodContaining` (period containment, anchor-day start, multi-month periods, month-end clamp, ConflictError on date-before-anchor), plus a describe block setting `process.env.TZ = 'Asia/Riyadh'` proving the helpers are unaffected by the host timezone.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 1 and the phase spec exactly. The three helpers are behaviorally identical to their private sources, `EmployeeProfile` omits `passwordHash`/`terminationDate`, and `leave.service.ts`/`balance.service.ts` were **not** refactored to import the shared helpers (deferred to a later phase, per the spec's out-of-scope constraint).

### Phase 2 delivered (employee password_hash, findByManagerId, profile mapping)

This phase delivers the employee credential column and read surface (recommended phase 2); the policy/auth/balance/leave-read work (phases 3–7) is not yet implemented.

- `migrations/20260913000001_add_password_hash_to_employees.js` — `exports.up` runs `knex.schema.alterTable('employees', (t) => { t.text('password_hash'); })` (nullable, `t.text` not `t.json`); `exports.down` drops the column. The migration comment documents that `password_hash` is nullable (null = no credential issued) and never synthesized/defaulted by the repository or service.
- `src/modules/employee/employee.model.ts` — `Employee` gained `passwordHash: string | null` (canonical field, appended last). `CreateEmployeeInput` is unchanged in shape (still `Omit<Employee, 'id'>`), so `create` now supplies `passwordHash` from input.
- `src/modules/employee/employee.repository.interface.ts` — `IEmployeeRepository` gained `findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>`.
- `src/modules/employee/employee.repository.ts` — `EmployeeRow`/`mapRow` gained `password_hash`; every SELECT list and the INSERT column/value list now carry `password_hash` (create persists `input.passwordHash`); `findByManagerId` implemented with `WHERE manager_id = $1` returning `result.rows.map(mapRow)`.
- `src/modules/employee/employee.service.interface.ts` — `IEmployeeService` gained `getEmployeeByEmail(email: string): Promise<Employee>`, `getEmployeesByManagerId(managerId: string): Promise<Employee[]>`, and `getEmployeeProfileById(id: string): Promise<EmployeeProfile>`.
- `src/modules/employee/employee.service.ts` — implemented the three methods plus a module-local `toEmployeeProfile(employee)` helper that maps an `Employee` to `EmployeeProfile`, **omitting `passwordHash` and `terminationDate`**. `getEmployeeByEmail` throws NotFoundError(404) on unknown email; `getEmployeeProfileById` throws NotFoundError(404) on unknown id; `getEmployeesByManagerId` delegates to `repository.findByManagerId` (returns `[]` for an unknown manager).
- `tests/unit/modules/employee.service.test.ts` — new `getEmployeeByEmail`, `getEmployeesByManagerId`, and `getEmployeeProfileById` describe blocks (plus the existing create/getById coverage): `getEmployeeByEmail` happy path + NotFoundError; `getEmployeesByManagerId` returns direct reports and `[]` for an unknown manager; `getEmployeeProfileById` asserts the profile equals the expected shape and `not.toHaveProperty('passwordHash')` / `not.toHaveProperty('terminationDate')`, plus NotFoundError. The `FakeEmployeeRepository` gained `findByManagerId` and `makeInput` gained `passwordHash: null`.

**Divergences from the plan worth noting:**
- PLAN.md Phase 2 item (7) prescribed editing `src/modules/employee/index.ts` to "re-export nothing new (types already exported) but confirm `EmployeeProfile` is imported from shared-types, not re-declared." No change was needed: `index.ts` already re-exports the model/repository/service types, and `EmployeeProfile` is imported from `src/shared/types` in `employee.service.ts` (not re-declared), so `index.ts` was left untouched.
- The plan's file count (~6) did not account for the two existing test fakes that implement `IEmployeeService` — `tests/unit/modules/balance/balance.service.test.ts` and `tests/unit/modules/leave/leave.service.test.ts` — which had to gain the three new methods (`getEmployeeByEmail`, `getEmployeesByManagerId`, `getEmployeeProfileById`) to keep satisfying the expanded interface. Those fakes were updated in this phase (the balance/leave fakes now implement the new methods, with `getEmployeeProfileById` throwing `Not implemented`).

### Phase 3 delivered (policy getAllPolicies exposure)

This phase delivers the policy read-through (recommended phase 3); the auth/balance/leave-read work (phases 4–7) is not yet implemented.

- `src/modules/policy/policy.service.interface.ts` — `IPolicyService` gained `getAllPolicies(): Promise<LeavePolicy[]>`.
- `src/modules/policy/policy.service.ts` — `PolicyService.getAllPolicies()` delegates verbatim to `this.repository.findAll()` with no filtering, sorting, transformation, or validation; it returns the repository's rows unchanged (any status, repository ordering) and returns `[]` when empty (never throws). No repository method was added or modified, and no new files, imports, or barrel changes were made.
- `tests/unit/modules/balance/balance.service.test.ts` and `tests/unit/modules/leave/leave.service.test.ts` — the `FakePolicyService` fakes gained `getAllPolicies(): Promise<LeavePolicy[]>` (returning `this.rows`) to keep satisfying the expanded `IPolicyService` interface. No new test file was added; the method is a plain read-through with no behavior of its own to assert beyond the existing fakes.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 3 and the phase spec exactly: a two-file service-layer change (interface + implementation) delegating to the existing `IPolicyRepository.findAll()`, with no filtering (the ACTIVE/effective-date/latest-effectiveFrom selection remains deferred to Phase 5) and no balance -> leave-type dependency.

### Phase 4 delivered (auth module: POST /auth/login)

This phase delivers the auth module and login endpoint (recommended phase 4); the balance/leave-read/employee-route work (phases 5–7) is not yet implemented.

- `src/modules/auth/auth.service.ts` — `IAuthService` with `login(email, password): Promise<{ token: string; profile: EmployeeProfile }>` and `AuthService`. The constructor injects `IEmployeeService` (from `../employee`). `login` calls `employeeService.getEmployeeByEmail(email)` inside a try/catch that maps `NotFoundError` to `UnauthorizedError('Invalid email or password')` (indistinguishable from a failed compare), then `bcrypt.compare(password, employee.passwordHash ?? '')` — a failed compare throws the SAME `UnauthorizedError('Invalid email or password')`. On success it builds the `EmployeeProfile` inline (an object literal, NOT the employee module's `toEmployeeProfile` helper — omitting `passwordHash` and `terminationDate`) and returns `{ token: signToken({ id: employee.id, role: employee.role }), profile }`. A `createAuthService()` factory wires `new AuthService(new EmployeeService(new PgEmployeeRepository()))`.
- `src/modules/auth/auth.routes.ts` — `authRoutes(fastify)` registers `POST /auth/login` (200). `parseLoginBody` rejects a non-string `email`/`password` with `ValidationError` (400). The handler calls `authService.login` and returns `{ token, profile }`; a local `sendError` maps `AppError` to `{ error, code }` with the correct status and any other throw to 500 (the same shape as `leave.routes.ts`, but a local copy — no `resolveActor` is used since login is public). The service instance is resolved from `fastify.authService` if present, else `createAuthService()`.
- `src/modules/auth/index.ts` — re-exports `IAuthService`, `AuthService`, `createAuthService`, and `authRoutes`.
- `src/shared/auth/index.ts` — added `'/auth/login'` to the `PUBLIC_PATHS` set so the endpoint is reachable WITHOUT a bearer token.
- `src/app.ts` — `app.register(authRoutes)` (after `leaveRoutes`, and after `registerAuth` so the public-path exemption applies).

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 4 and the phase spec exactly: bcrypt.compare + signToken, indistinguishable wrong-email/wrong-password (both `UnauthorizedError('Invalid email or password')`), no controller file, no transaction/audit/repository access in the auth module, and the profile mapper is defined inline in the service (not the employee module's `toEmployeeProfile`).

### Phase 5 delivered (balance getCurrentBalances + GET /balances/me)

This phase delivers the balance read service and route (recommended phase 5); the leave-read and employee-route work (phases 6–7) is not yet implemented.

- `src/modules/balance/balance.service.ts` — `IBalanceService` gained `getCurrentBalances(employeeId: string): Promise<Array<LeaveBalance & { available: number }>>` and `BalanceService` implements it. The service now imports `periodContaining` from `../../shared/date` (Phase 1) and `LeavePolicyStatus` from `../policy` (the public entry point, never a bare `'ACTIVE'` string). `getCurrentBalances` is **read-only** — it never opens a transaction and never forwards a client:
  - Fetches the employee via `employeeService.getEmployeeById` (surfacing NotFoundError(404) for an unknown employee).
  - Fetches ALL policies via `policyService.getAllPolicies()` (Phase 3).
  - Selects at most one effective policy per `leaveTypeCode` into a `Map<LeaveTypeCode, LeavePolicy>`: `status === LeavePolicyStatus.ACTIVE`, `effectiveFrom <= asOf`, `effectiveTo === null || effectiveTo >= asOf`, tie-broken by the latest `effectiveFrom` (a later policy overwrites an earlier one in the map).
  - For each selected policy, computes the current accrual period via `periodContaining(employee.hireDate, policy.accrualPeriodMonths, asOf)` and looks the balance up with `repository.findByKey(employeeId, policy.leaveTypeCode, period.start, period.end)`.
  - Omits any leave type whose current period has no balance row (never throws, never synthesizes); when none match, returns `[]`.
  - Each returned entry spreads the stored balance and adds the computed `available = entitledDays - usedDays - pendingDays` (never persisted, never mutates the stored row).
- `src/modules/balance/balance.routes.ts` — NEW file. `balanceRoutes(fastify)` registers `GET /balances/me` (200). It carries **local copies** of `resolveActor` (extracts `request.user`, enforces `id` presence and `EmployeeRole` membership, throwing UnauthorizedError on a missing/invalid actor) and `sendError` (maps `AppError` to `{ error, code }` with its status, any other throw to 500) — the same shape as `leave.routes.ts`/`auth.routes.ts`, but not imported from them. The handler resolves the actor, calls `balanceService.getCurrentBalances(actor.id)`, and returns the list. The service instance is resolved from `fastify.balanceService` if present, else `createBalanceService()`.
- `src/modules/balance/index.ts` — re-exports `balanceRoutes`.
- `src/app.ts` — `app.register(balanceRoutes)` (after `leaveRoutes`, before `authRoutes`).

**Divergences from the plan worth noting:**
- The spec's consistency requirement said to "reuse the resolveActor/sendError helper shape ... exactly as implemented in the leave routes." The implementation uses local copies of both helpers (matching the `auth.routes.ts` precedent) rather than importing them from `leave.routes.ts` — the shape is identical, but there is no shared helper module.
- The private `addMonths` helper remains in `balance.service.ts` (still used by `carryForward`) and was **not** refactored to import the shared `addMonths` from `src/shared/date` — consistent with the spec's out-of-scope constraint deferring that refactor. Only `periodContaining` is imported from the shared entry point (the new read path needs it; `carryForward`'s private `addMonths` is untouched).

### Phase 6 delivered (leave reads: list/getById + GET /leaves, GET /leaves/:id)

This phase delivers the leave read surface (recommended phase 6); the employee-route and smoke/unit-test work (phase 7) is not yet implemented.

**repository** — `PgLeaveRequestRepository.findByQuery` gained the `employeeIds` filter: when `params.employeeIds` is present and non-empty it pushes `employee_id = ANY($n)` with the array bound as a single parameter; when absent/empty it applies no employee filter (ADMIN sees all). No other repository method changed.

**service** — `ILeaveService` gained `list(actor, params)` and `getById(actor, requestId)`; `LeaveService` implements both. Both are read-only (no `uow.withTransaction`, no client forwarding, no writes/audit/notifications).

- `list` copies `params`, then scopes `employeeIds` by role: EMPLOYEE → `[actor.id]`; MANAGER → `[actor.id, ...(await employeeService.getEmployeesByManagerId(actor.id)).map(e => e.id)]` (direct reports plus self, one level only); ADMIN → no `employeeIds` filter (sees all). It then delegates to `repository.findByQuery(query)` — no SQL in the service.
- `getById` loads via `repository.findById` (NotFoundError on a nonexistent id), returns immediately for ADMIN, and otherwise builds `visibleIds = [actor.id]` (plus direct reports for MANAGER) and throws `NotFoundError('Leave request not found')` when `request.employeeId` is not in the set — byte-identical to the nonexistent-id case, so the endpoint cannot probe ids. Reads are status-unrestricted (no status filter or rejection).

**routes** — `leaveRoutes(fastify)` gained `GET /leaves` (200) and `GET /leaves/:id` (200), following the existing conventions (no controller, `resolveActor` at the API boundary, `sendError` mapping). A new `parseQuery` helper converts wire query params to `LeaveRequestQueryParams`: `status`/`leaveTypeCode` validated against their enums (invalid → ValidationError), `startDateFrom`/`startDateTo`/`endDateFrom`/`endDateTo` converted from strings to `Date` via the same `new Date(value)` + `Number.isNaN(parsed.getTime())` pattern as `parseCreateBody` (invalid → ValidationError), and `limit`/`offset` parsed as integers (non-integer → ValidationError). The handlers resolve the actor, call `leaveService.list`/`leaveService.getById`, and return the result.

**Divergences from the plan worth noting:**
- The spec's out-of-scope constraint said state-changing operations (create/submit/approve/reject/cancel) are untouched this phase. The implementation also made `create` transactional: the DRAFT insert and its CREATE audit entry now run inside a single `uow.withTransaction` (with the client forwarded to both `repository.create` and `auditService.record`), closing the previously-documented gap where a failed audit insert left a committed DRAFT row with no audit trail. This is a deliberate fix beyond the read-only scope, not a regression.
- No tests were delivered this phase — the plan's Phase 6 prescribed only the repository/service/routes edits (tests belong to Phase 7), and the committed diff contains exactly those three files (`leave.repository.ts`, `leave.service.ts`, `leave.routes.ts`); `leave/index.ts` was correctly left untouched (no new exports needed).

### Phase 7 delivered (GET /employees/me route + leave read-route tests)

This phase delivers the employee profile route and the leave read-route unit tests (recommended phase 7). The `scripts/smoke.js` extension and the `auth.service.test.ts` unit tests prescribed by PLAN.md Phase 7 items (4) and (5) were **not** delivered this phase.

- `src/modules/employee/employee.routes.ts` — NEW file. `employeeRoutes(fastify)` registers `GET /employees/me` (200). It carries **local copies** of `resolveActor` (extracts `request.user`, enforces `id` presence and `EmployeeRole` membership, throwing UnauthorizedError on a missing/invalid actor) and `sendError` (maps `AppError` to `{ error, code }` with its status, any other throw to 500) — the same shape as `leave.routes.ts`/`balance.routes.ts`/`auth.routes.ts`, but not imported from them. The handler resolves the actor, calls `employeeService.getEmployeeProfileById(actor.id)`, and returns the profile (which never contains `passwordHash`). The service instance is resolved from `fastify.employeeService` if present, else `new EmployeeService(new PgEmployeeRepository())` — there is no `createEmployeeService()` factory (unlike `createLeaveService`/`createBalanceService`/`createAuthService`).
- `src/modules/employee/index.ts` — re-exports `employeeRoutes`.
- `src/app.ts` — `app.register(employeeRoutes)` (after `authRoutes`).
- `tests/unit/modules/leave/leave.routes.test.ts` — added a `GET /leaves and GET /leaves/:id role scoping` describe block exercising the Phase 6 read endpoints at the HTTP boundary with an in-memory `ILeaveService` fake (decorated on the Fastify instance via the existing `leaveService` seam): `GET /leaves` scopes visible requests per role (EMPLOYEE → 1, MANAGER → 2, ADMIN → 3); `GET /leaves/:id` returns a visible request for its owner; and `GET /leaves/:id` returns a byte-identical 404 (`code: 'NOT_FOUND'`) for both a not-visible id and a nonexistent id (asserting `invisible.json()` equals `missing.json()`).

**Divergences from the plan worth noting:**
- PLAN.md Phase 7 item (4) — extending `scripts/smoke.js` with login + authenticated read probes — was **not** delivered in this phase; it was delivered in a later sub-phase (see "Phase 9 delivered" below).
- PLAN.md Phase 7 item (5) — the `tests/unit/modules/auth/auth.service.test.ts` unit tests (login success/failure, indistinguishable wrong-email vs wrong-password) were **not** delivered in this phase; they were delivered in a later sub-phase (see "Phase 11 delivered" below).
- The plan prescribed "reuse resolveActor/sendError shape from `src/modules/leave/leave.routes.ts`"; the implementation uses local copies (matching the `balance.routes.ts`/`auth.routes.ts` precedent) rather than importing from `leave.routes.ts` — the shape is identical, but there is no shared helper module.
- The plan's Phase 7 item (5) also prescribed a profile-route unit test; the profile route (`GET /employees/me`) had no dedicated route test in this phase — it was delivered in a later sub-phase (see "Phase 11 delivered" below).

### Phase 8 delivered (leave read-route test fix)

This phase is a test-only fix confined to `tests/unit/modules/leave/leave.routes.test.ts`; no production source changed.

- The `getById` mock in `buildApp` was corrected to enforce the same role-based visibility as the real `LeaveService.getById`: ADMIN sees any request; MANAGER sees `actor.id` plus direct reports; EMPLOYEE sees only `actor.id`; any other request throws `NotFoundError`. Previously the mock was a naive find-by-id that returned any found request regardless of visibility, so the "not visible" test failed (the invisible request was returned with 200 instead of 404).
- The invisible-request and nonexistent-id responses are now byte-identical (404, `{ code: 'NOT_FOUND' }`), preserving the information-hiding contract the test asserts.

**Divergences from the plan worth noting:**
- None — this phase matches the spec exactly (test-only, no production changes).

### Phase 9 delivered (smoke.js e2e extension)

This phase delivers the `scripts/smoke.js` extension prescribed by PLAN.md Phase 7 item (4) — the login + authenticated read probes previously documented as not delivered. No production source changed; the only project file touched is `scripts/smoke.js`.

**Seed block (stage 3d, Postgres mode only)** — the seed now mints the seeded employee's `password_hash` via `bcrypt.hashSync(SMOKE_PASSWORD, 10)` (plaintext from `process.env.SMOKE_PASSWORD`, defaulting to `'smoke-check-password'` — no credential string hardcoded, per no-hardcoded-secrets), and seeds a second leave type (`LeaveTypeCode.SICK`) with an effective ACTIVE policy (`pol-2`) but **no** `leave_balances` row — the fixture that proves `getCurrentBalances` omits an effective policy lacking a balance.

**New stages (4–8, Postgres mode only; skipped with the existing caveat in sqlite mode):**
- **Stage 4 — login**: `POST /auth/login` with the seeded email + `SMOKE_PASSWORD`; asserts 200, a non-empty `token`, and a `profile` whose `id`/`email` match the seeded employee (the full 10-field profile assertion was added in Phase 10). The returned token is a genuine login token (minted under the same `JWT_SECRET` `registerAuth` verifies), not the hand-minted `signToken` used by stages 3b/3c.
- **Stage 5 — profile**: `GET /employees/me` with the login token; asserts the exact 10-field `EmployeeProfile` (id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate serialized as UTC midnight, employmentStatus) and that `passwordHash`/`terminationDate` are absent.
- **Stage 6 — list**: `GET /leaves` with the login token; asserts the request created in stage 3d is present (EMPLOYEE role scoping to `employeeIds=[actor.id]`).
- **Stage 7 — getById**: `GET /leaves/:id` using the id captured from the stage 3d `POST /leaves` response body (not predicted — the repository generates it via `randomUUID()`); asserts the seeded request is returned.
- **Stage 8 — balances**: re-keys the seeded `bal-1` balance to the CURRENT accrual period via `periodContaining(hireDate, 12, new Date())` (imported from `src/shared/date`, the same helper `getCurrentBalances` uses — never a hand-written date), then `GET /balances/me`; asserts exactly one balance (the ANNUAL one), with `leaveTypeCode === ANNUAL`, the current-period `periodStart`/`periodEnd`, and `available === 25` (a new request reserves nothing, so pendingDays stays 0). The SICK leave type (effective policy, no balance row) is omitted.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 7 item (4) and the phase spec's six success criteria exactly: the second leave type + password_hash seeding, the login/profile/list/getById/balances stages, real-value assertions (not just status codes), Postgres-only gating, and the `periodContaining`-derived current-period re-key.

### Phase 10 delivered (smoke.js stage 4 login assertion strengthening)

This phase is a test-only change confined to `scripts/smoke.js`; no production source changed. It strengthens the stage 4 login assertion (previously only a non-empty token + `id`/`email` match) to verify the full 10-field `EmployeeProfile` returned by `POST /auth/login`.

- The stage 4 login assertion now builds an `expectedLoginProfile` object literal with all 10 `EmployeeProfile` fields (id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, employmentStatus) and asserts each field equals the seeded employee's value: id `'smoke-employee'`, employeeNumber `'E-0001'`, firstName `'Smoke'`, lastName `'Test'`, email `'smoke@example.com'`, role `EmployeeRole.EMPLOYEE`, managerId `null`, department `'Engineering'`, hireDate `'2020-01-01T00:00:00.000Z'` (the JSON wire form of the Date, not the raw seed string `'2020-01-01'`), employmentStatus `EmploymentStatus.ACTIVE`.
- It asserts `passwordHash` and `terminationDate` are absent from the login profile (`'passwordHash' in loginProfile || 'terminationDate' in loginProfile` throws).
- The existing token assertion (non-empty string) and the 200 status check remain intact — the change extends, not weakens, the login stage. Stages 1–3d and 5–8 are untouched.
- `EmployeeRole` and `EmploymentStatus` are reused from the existing stage 3 import line (not re-imported or hardcoded as bare strings).

**Divergences from the plan worth noting:**
- The phase spec's success criterion #4 described the login profile's `department` as `null`; the implementation asserts `department: 'Engineering'` — the value the stage 3d seed actually inserts (and the same value stage 5's `/employees/me` assertion checks). `managerId` remains `null` as the seed leaves it unset. This is a divergence from the spec's stated value, not a regression: the assertion matches the seeded row and the stage 5 profile assertion.

### Phase 11 delivered (auth + employee route unit tests)

This phase is a test-only phase confined to two NEW test files; no production source changed. It delivers the `auth.service.test.ts` and profile-route unit tests that PLAN.md Phase 7 item (5) prescribed and that the Phase 7 delivered section documented as not yet delivered.

- `tests/unit/modules/auth/auth.service.test.ts` — NEW. Jest coverage for `AuthService.login` using the real `bcrypt` and `signToken` dependencies (not mocks): a `makeEmployee` fixture seeds `passwordHash` via `bcrypt.hashSync(CORRECT_PASSWORD, 4)` (low cost, test-only); `beforeAll` sets `process.env.JWT_SECRET = 'unit-test-jwt-secret'`. Four tests: (1) correct credentials return `{ token, profile }` with a non-empty string token and a profile carrying id/employeeNumber/email/role/managerId but `not.toHaveProperty('passwordHash')` / `not.toHaveProperty('terminationDate')`; (2) unknown email → `UnauthorizedError` (the fake `getEmployeeByEmail` throws `NotFoundError`, which `login` maps); (3) wrong password → `UnauthorizedError`; (4) wrong-email and wrong-password failures are indistinguishable (both `UnauthorizedError` with the identical message `'Invalid email or password'`).
- `tests/unit/modules/employee/employee.routes.test.ts` — NEW. Route-level tests for `GET /employees/me` using the established route-test seam (build a Fastify instance, decorate the `employeeService` seam with a `jest.fn` fake cast `as unknown as IEmployeeService`, `decorateRequest('user', undefined)`, a `preHandler` hook setting `request.user = actor`, register `employeeRoutes`, `app.ready()`, then `app.inject`). Four tests: (1) 200 returns the profile and asserts `receivedId === actor.id` plus `not.toHaveProperty('passwordHash')` / `not.toHaveProperty('terminationDate')`; (2) 401 (`{ code: 'UNAUTHORIZED' }`) when there is no authenticated user; (3) 401 when the actor has an invalid role (`'SUPERUSER'`); (4) 404 (`{ code: 'NOT_FOUND' }`) when the actor has no employee profile (the stubbed `getEmployeeProfileById` throws `NotFoundError`).

**Divergences from the plan worth noting (superseded by Phase 12):**
- The phase spec's constraint that "a fake IEmployeeService must implement all five methods" was initially **not** followed: the auth test's fake provided only `getEmployeeByEmail` (cast `as unknown as IEmployeeService`), and the employee route test's fake provided only `getEmployeeProfileById`. A follow-up phase (Phase 12) expanded the auth test's fake to the full five-method interface; the employee route test still uses the partial `as IEmployeeService` seam.
- The phase spec's constraint that the success-path test "set process.env.JWT_SECRET before the test and restore it afterward" was initially **partially** followed (`beforeAll` set it but nothing restored it). A follow-up phase (Phase 12) added the `afterAll` restore.

### Phase 12 delivered (follow-up hardening: type swap + test corrections)

This phase is a set of small follow-up fixes and test-strengthening changes delivered after Phase 11; no new production behavior was introduced.

- `src/modules/employee/employee.routes.ts` — **AuthUser type swap**: the local `interface AuthUser { id: string; role: EmployeeRole }` declaration was removed and replaced with an import of the canonical `AuthUser` from `../../shared/auth`. `resolveActor`'s return type and the `EmployeeAuthRequest` alias now resolve to the shared type (no behavioral change). `leave.routes.ts` and `balance.routes.ts` still declare their own local `AuthUser` interfaces — this swap was scoped to the employee module only.
- `tests/unit/modules/auth/auth.service.test.ts` — **JWT_SECRET restore + full fake**: the suite now captures `process.env.JWT_SECRET` before `beforeAll` sets `'unit-test-jwt-secret'` and restores it in `afterAll`, so the test secret no longer leaks into sibling suites. The `IEmployeeService` fake was expanded from a partial `as unknown as IEmployeeService` object to a full five-method implementation (the four methods `login` does not call are throwing stubs), removing the `as unknown as` cast.
- `tests/unit/modules/leave/leave.routes.test.ts` — **explicit nonexistent-id test**: added a `GET /leaves/:id` test asserting a genuinely nonexistent id returns 404 `{ code: 'NOT_FOUND' }` for an ADMIN actor (distinct from the existing not-visible case), so the information-hiding contract is asserted from both directions.
- `tests/unit/shared/date.test.ts` — **additional coverage**: added `addMonths` 31→30-day clamping cases (Jan 31 + 3 → Apr 30; Mar 31 + 1 → Apr 30), a `periodContaining` loop-exhaustion case (`accrualMonths = 0` → `ConflictError('Unable to resolve accrual period')`), and a `ConflictError` statusCode/code assertion (409 / `CONFLICT`) for the date-before-anchor path.

**Divergences from the plan worth noting:**
- None of these changes were prescribed by PLAN.md Phase 7; they are follow-up hardening fixes that correct the two divergences documented in Phase 11 (the missing JWT_SECRET restore and the partial fake) and add the explicit nonexistent-id/date-clamp coverage the review flagged.

### Phase 13 delivered (employee route test full-fake hardening)

This phase is a test-only hardening change confined to `tests/unit/modules/employee/employee.routes.test.ts`; no production source changed. It resolves the divergence documented in Phase 11/12 — the employee route test's `IEmployeeService` fake was a partial object behind an `as IEmployeeService` cast.

- `tests/unit/modules/employee/employee.routes.test.ts` — the `IEmployeeService` fake passed to the `employeeService` decoration seam is now a complete five-method object (`createEmployee`, `getEmployeeById`, `getEmployeeByEmail`, `getEmployeesByManagerId`, `getEmployeeProfileById`) with the exact signatures from `src/modules/employee/employee.service.interface.ts`. The four methods the route does not call are throwing stubs (each throws an `Error` naming the method), so any accidental invocation fails loudly rather than silently returning `undefined`. The `as IEmployeeService` partial-object cast is removed. The route under test, the `employeeService` seam, the `decorateRequest('user', undefined)` + preHandler actor hook, the `EmployeeProfile` fixture, and all four existing tests (200 profile, 401 no user, 401 invalid role, 404 no profile) and their assertions are unchanged.
- `tests/unit/modules/auth/auth.service.test.ts` — verified already compliant (full five-method `IEmployeeService` fake with throwing stubs, and `JWT_SECRET` captured before `beforeAll` and restored in `afterAll`); no modification required per the spec.

**Divergences from the plan worth noting:**
- None — this phase matches the spec exactly: test-only, single file in scope, the fake satisfies `IEmployeeService` structurally with throwing stubs for the unused methods, and no existing assertion or seam was altered.

### Open questions
- Q1: Should a controller layer be introduced, or continue with routes calling services directly? (candidates: continue routes-call-services; introduce controllers)
- Q2: Should LeavePolicyStatus be promoted into src/shared/types as a canonical enum? (candidates: promote to shared/types; keep module-local and import via policy index.ts)
<!-- gestalt:architecture feature=e8c586bc-23c0-4c59-9111-ee280659da9a END -->

<!-- gestalt:architecture feature=5710baba-c42d-4743-bc05-ce5effb0f951 START -->
## Feature: Deduplicate the UTC accrual date helpers (v2)

### Status
Reconciled architecture — pure refactor, no behavior change.

### Domain
- **AccrualPeriod** (value object): `{ start: Date (UTC midnight, inclusive), end: Date (UTC midnight, exclusive) }`. Half-open accrual window `[start, end)` produced by `periodContaining`. No lifecycle states.
- Binding rules:
  - `startOfUtcDay` derives UTC midnight from UTC calendar fields (`getUTCFullYear/getUTCMonth/getUTCDate`), never local fields.
  - `addMonths` advances calendar month and clamps day-of-month to target month's last day; does not mutate input.
  - `periodContaining` returns half-open `[start, end)`; rejects dates before anchor with `ConflictError('Requested date precedes the accrual anchor')`; steps at most 10,000 periods and throws `ConflictError('Unable to resolve accrual period')`.
  - All three helpers are pure UTC functions independent of host TZ.
  - Exactly one definition of each helper exists in `src/shared/date/accrual.ts`; leave and balance import from shared entry point.

### Modules
- `shared-date` (`src/shared/date/`) owns `startOfUtcDay`, `addMonths`, `periodContaining`, `index.ts`.
- `leave` (`src/modules/leave/`) owns `LeaveService`; deletes private copies, imports all three from `../../shared/date`.
- `balance` (`src/modules/balance/`) owns `BalanceService`; deletes private `addMonths`, adds to existing shared import.

### Dependency map
- `leave -> shared-date`
- `balance -> shared-date`
No new cross-module imports. Pre-existing `balance -> ../leave-type` remains out of scope.

### Data
No schema changes. Existing tables (`leave_requests`, `leave_balances`, etc.) and repositories (`PgLeaveRequestRepository`, `PgLeaveBalanceRepository`, etc.) untouched. No new repository interfaces or implementations. No transaction contract.

### Contracts
- Auth: none (no API surface).
- Error response: none (no API surface).
- Transaction: none (no writes).

### Phases
1. Phase 1 — Deduplicate leave.service.ts date helpers (1 file)
2. Phase 2 — Deduplicate balance.service.ts addMonths (1 file)
3. Phase 3 — Deduplication pin test (1 file)

### Verification
- `npm run build` clean.
- Full unit suite (178 tests) and `npm run smoke` pass unchanged.
- New test pins shared helpers at a period boundary under `TZ=Asia/Riyadh`.

### Acceptance
Exactly one definition of `startOfUtcDay`, `addMonths`, `periodContaining`; both services import from `src/shared/date`; build, unit suite, smoke pass unchanged.

### Phase 1 delivered (leave.service.ts date-helper deduplication)

This phase delivered only recommended Phase 1 (the `leave.service.ts` dedup); Phase 2 (`balance.service.ts` `addMonths`) and Phase 3 (the deduplication pin test) are not yet implemented.

- `src/modules/leave/leave.service.ts` — added `import { startOfUtcDay, addMonths, periodContaining } from '../../shared/date';` and deleted the three private methods (`private startOfUtcDay`, `private addMonths`, `private periodContaining`) from the `LeaveService` class. Call sites were updated to drop the `this.` prefix: `cancel()` now calls `startOfUtcDay(request.startDate)` and `startOfUtcDay(new Date())`; `resolveBalance()` now calls `periodContaining(employee.hireDate, policy.accrualPeriodMonths, date)`. No arithmetic changed — a pure move, no behavior change.

**Divergences from the plan worth noting:**
- `addMonths` is imported but never called in `leave.service.ts` (the file only uses `startOfUtcDay` and `periodContaining`); the plan prescribed importing all three helpers, and the implementation followed that literally, leaving `addMonths` as an unused import.
- Phase 2 (`balance.service.ts`) and Phase 3 (the deduplication pin test) were **not** delivered this phase — `balance.service.ts` still declares its own `private addMonths` and calls `this.addMonths(...)` in `carryForward()`, and no `date.deduplication.test.ts` exists.

### Phase 2 delivered (balance.service.ts addMonths deduplication)

This phase delivered recommended Phase 2 (the `balance.service.ts` `addMonths` dedup); Phase 3 (the deduplication pin test) is not yet implemented.

- `src/modules/balance/balance.service.ts` — extended the existing shared-date import to `import { periodContaining, addMonths } from '../../shared/date';` and deleted the `private addMonths` method from the `BalanceService` class. The single call site in `carryForward()` now calls `addMonths(source.periodEnd, policy.accrualPeriodMonths)` (dropped the `this.` prefix). No arithmetic changed — a pure move, no behavior change. The unrelated `../leave-type` import (`LeaveTypeService`, `PgLeaveTypeRepository`) was left exactly as it was, per the plan's out-of-scope constraint.

**Divergences from the plan worth noting:**
- Phase 3 (the deduplication pin test) was **not** delivered this phase — no `date.deduplication.test.ts` exists, and the source-level "exactly one definition" pin assertion has not yet been added.

### Phase 3 delivered (deduplication pin test)

This phase delivers recommended Phase 3 — the deduplication pin test — completing the three recommended phases. No production source changed; the only project file touched is `tests/unit/shared/date.deduplication.test.ts` (NEW).

- `tests/unit/shared/date.deduplication.test.ts` — NEW. Two describe blocks:
  - **"shared helpers at a period boundary under a non-UTC timezone"** — captures `process.env.TZ` before `beforeAll` sets it to `'Asia/Riyadh'` and restores it in `afterAll` (matching the existing `date.test.ts` pattern). One test asserts the three helpers produce the expected UTC instants at a boundary: `startOfUtcDay(new Date(Date.UTC(2023, 0, 10)))` → `Date.UTC(2023, 0, 10)`; `addMonths(anchor, 1)` → `Date.UTC(2023, 1, 10)`; and `periodContaining(anchor, 1, new Date(Date.UTC(2023, 1, 10)))` — a date exactly at the period end — rolls into the next period `{ start: Date.UTC(2023, 1, 10), end: Date.UTC(2023, 2, 10) }`, proving the UTC accessors are load-bearing and unaffected by the process timezone.
  - **"exactly one definition of each helper exists"** — reads `src/modules/leave/leave.service.ts` and `src/modules/balance/balance.service.ts` via `fs.readFileSync` (path resolved with `join(__dirname, '..', '..', '..', 'src', ...)`) and asserts neither contains the tokens `private startOfUtcDay`, `private addMonths`, or `private periodContaining`, so a future re-introduced private copy is caught at the source level rather than merely discouraged.
- The helpers are imported from `../../../src/shared/date` (the public entry point), not from `accrual.ts` directly.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 3 and the phase spec exactly: the TZ save/restore, the boundary assertions under `TZ=Asia/Riyadh`, the source-level "exactly one definition" pin via `fs` reads of both service files, and the import from the public entry point. No production source was modified.

### Open questions
None.
<!-- gestalt:architecture feature=5710baba-c42d-4743-bc05-ce5effb0f951 END -->

<!-- gestalt:architecture feature=7dc62161-0bad-4567-84a9-bea333846c6b START -->
## Feature: Remove balance -> leave-type dependency via policy composition factory

### Summary
Composition-only refactor. Adds `createPolicyService()` to the policy module, exports it from the policy public entry point, and rewires `createBalanceService()` and `createLeaveService()` to call it instead of constructing `PolicyService` themselves. Removes the undocumented `balance -> leave-type` and `leave -> leave-type` imports. No runtime behaviour, constructor signatures, or public interfaces change.

### Module boundaries
- `policy` owns `createPolicyService()` and exports it from `src/modules/policy/index.ts`. The factory constructs `PolicyService` with `PgLeavePolicyRepository` and `LeaveTypeService(PgLeaveTypeRepository)`.
- `balance` and `leave` no longer import from `../leave-type`; they import `createPolicyService` from `../policy`.
- `leave-type` remains unchanged and is depended on only by `policy`.

### Dependency map (changed/owned edges)
- policy -> leave-type
- policy -> shared-types
- policy -> shared-errors
- policy -> shared-db
- balance -> policy
- leave -> policy

### Repository interfaces and concrete implementations
- `IPolicyRepository` -> `PgLeavePolicyRepository` (PostgreSQL via shared/db Pool; optional trailing PoolClient for caller-owned transactions)
- `ILeaveTypeRepository` -> `PgLeaveTypeRepository` (PostgreSQL via shared/db Pool; optional trailing PoolClient for caller-owned transactions)
- Existing `IBalanceRepository` -> `PgLeaveBalanceRepository` and `ILeaveRepository` -> `PgLeaveRequestRepository` are unchanged.

### Lifecycle states
No lifecycle states introduced or changed. Existing states remain: Employee ACTIVE|TERMINATED|ON_LEAVE; LeaveType static; LeavePolicy DRAFT|ACTIVE|SUPERSEDED; LeaveRequest DRAFT|SUBMITTED|APPROVED|REJECTED|CANCELLED; LeaveBalance OPEN|CLOSED; AuditLog RECORDED; Notification PENDING|SENT|READ|ARCHIVED.

### Cross-cutting contracts
- Auth contract: unchanged; no new API surface or role-gated access.
- Error/response contract: unchanged; no new endpoints.
- Transaction contract: none for this feature; no writes or new data-access paths.

### Phases
1. Add `createPolicyService()` to the policy module and export it.
2. Rewire `createBalanceService()` to call it; remove the `../leave-type` import.
3. Rewire `createLeaveService()` to call it; remove the `../leave-type` import.

### Acceptance
`npm run build` clean, existing tests pass, `npm run smoke` green, and no file under `src/modules/balance` or `src/modules/leave` imports from `../leave-type`.

### Phase 1 delivered (createPolicyService factory)

This phase delivered only recommended Phase 1 (the policy composition factory); Phases 2 and 3 (rewiring `createBalanceService()` and `createLeaveService()`) are not yet implemented.

- `src/modules/policy/policy.service.ts` — added an exported `createPolicyService(): IPolicyService` factory function (alongside the existing `PolicyService` class). It constructs and returns `new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))`. The `PolicyService` class, its constructor signature, and its runtime behaviour are unchanged — the factory is additive only. No new imports were required: `PgLeavePolicyRepository` was already imported from `./policy.repository`, and `LeaveTypeService`/`PgLeaveTypeRepository` were already imported from `../leave-type` (the policy -> leave-type edge is allowed by the dependency map).
- `src/modules/policy/index.ts` — added `createPolicyService` to the existing `./policy.service` re-export (`export { PolicyService, createPolicyService } from './policy.service';`). All existing exports are preserved.

**Divergences from the plan worth noting:**
- Phases 2 and 3 were **not** delivered this phase — `src/modules/balance/balance.service.ts` and `src/modules/leave/leave.service.ts` still construct `PolicyService` inline (`new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))`) and still import `LeaveTypeService`/`PgLeaveTypeRepository` from `../leave-type`. The `balance -> leave-type` and `leave -> leave-type` edges remain until those phases land.

### Phase 1b delivered (leave-type import false-positive resolution)

This phase is a correction (corr cecc750b) resolving a false-positive dependency finding on the `policy -> leave-type` edge. The only production change is `src/modules/policy/policy.service.ts`.

- The leave-type import was changed from named imports (`import { ILeaveTypeService, LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';`) to a namespace import (`import * as leaveType from '../leave-type';`), and the three usages updated to `leaveType.ILeaveTypeService` (the `PolicyService` constructor parameter type), `leaveType.LeaveTypeService`, and `leaveType.PgLeaveTypeRepository` (inside `createPolicyService()`). Both forms resolve to the public entry point `src/modules/leave-type/index.ts`; the namespace form makes the public-entry-point re-export explicit so the dependency analyzer no longer flags the edge as a bare internal import.

**Divergences from the plan worth noting:**
- Phase 3 of the parent feature (rewiring `createLeaveService()`) remains undelivered — `src/modules/leave/leave.service.ts` still constructs `PolicyService` inline and still imports from `../leave-type`. Phase 2 (`createBalanceService()`) was delivered in the following phase.

### Phase 2 delivered (createBalanceService rewire)

This phase delivered recommended Phase 2 (rewiring `createBalanceService()`); Phase 3 (rewiring `createLeaveService()`) is not yet implemented.

- `src/modules/balance/balance.service.ts` — `createBalanceService()` now passes `createPolicyService()` as the `IPolicyService` argument instead of constructing `PolicyService` inline. The `../policy` import gained `createPolicyService` and dropped `PolicyService`/`PgLeavePolicyRepository`; the entire `import { LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';` line was removed. The `BalanceService` class, its constructor signature, and its runtime behaviour are unchanged — a pure composition change. The `balance -> leave-type` edge is now gone; `balance` depends on `policy` only.

**Divergences from the plan worth noting:**
- Phase 3 (`createLeaveService()`) was **not** delivered this phase — `src/modules/leave/leave.service.ts` still constructs `PolicyService` inline and still imports `PolicyService`/`PgLeavePolicyRepository` from `../policy` and `PgLeaveTypeRepository`/`LeaveTypeService` from `../leave-type`. The `leave -> leave-type` edge remains until Phase 3 lands.
<!-- gestalt:architecture feature=7dc62161-0bad-4567-84a9-bea333846c6b END -->

<!-- gestalt:architecture feature=ecef04ad-9a9b-43d8-bac9-03098d9c566a START -->
## Web Frontend (React + Vite) — Login and Read-Only Employee Leave View

### Scope
New top-level `web/` directory, separate from the `src/` Fastify backend. React + TypeScript + Vite SPA. Dependencies: React, React DOM, React Router, Vite, TypeScript, Vitest, Testing Library. No UI component library, no state-management library.

### Domain entities (client-side)
- **AuthSession** — token, profile, status. Lifecycle: `LOGGED_OUT` → `LOGGED_IN` → `EXPIRED` → `LOGGED_OUT`. Created on login, cleared on logout or any 401.
- **EmployeeProfile** — read-only signed-in employee; never carries `passwordHash` or `terminationDate`.
- **LeaveBalanceView** — read-only balance; `available = entitledDays - usedDays - pendingDays` (display only, never persisted). Lifecycle: `OPEN`, `CLOSED`.
- **LeaveRequestView** — read-only leave request. Lifecycle displayed only: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`. Carries `reversesRequestId: string | null` (the GP-008 reversal linkage): `null` on an original row, the original's id on a CANCELLED reversal row. Read-only projection — no lifecycle transitions and no client-side reversal behaviour.
### Module boundaries
- `shared-types` — `web/src/shared/types/` — `EmployeeProfile`, `LeaveBalanceView`, `LeaveRequestView`, `LoginResponse`, enums (`EmployeeRole`, `LeaveTypeCode`, `LeaveStatus`, `EmploymentStatus`, `AuthSessionStatus`).
- `shared-date` — `web/src/shared/date/` — `formatUtcDate`, `parseUtcDate`.
- `api-client` — `web/src/infrastructure/api/` — `IApiClient`/`ApiClient`, `ITokenStorage`/`TokenStorage`, `ApiError`.
- `auth` — `web/src/modules/auth/` — `IAuthService`/`AuthService`, `AuthProvider`/`useAuth`, `AuthSession`.
- `employee` — `web/src/modules/employee/` — `IEmployeeService`/`EmployeeService`.
- `leave` — `web/src/modules/leave/` — `ILeaveService`/`LeaveService`, `IBalanceService`/`BalanceService`.
- `presentation` — `web/src/presentation/` — App router, `LoginPage`, `DashboardPage`, `LeaveListPage`, `LeaveDetailPage`, shared UI components.

### Dependency map
`presentation` → `auth`, `employee`, `leave`, `shared-types`, `shared-date`; `auth` → `api-client`, `shared-types`; `employee` → `api-client`, `shared-types`; `leave` → `api-client`, `shared-types`; `api-client` → `shared-types`; `shared-date` → `shared-types`. No circular edges.

### Cross-cutting contracts
- **Auth**: consumes backend contract; `request.user = { id: string; role: EmployeeRole }`, `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`; JWT bearer verified server-side; frontend sends `Authorization: Bearer <token>`, stores token, redirects to login on any 401.
- **Error**: `{ error: string; code: string }`; 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 other. Login failure shows server message verbatim; no email enumeration.
- **Transaction**: none — read-only; login is a single non-persistent write.

### Data
No new SQL schemas, tables, or repositories. Existing backend tables (`employees`, `leave_requests`, `leave_balances`, `leave_types`, `leave_policies`) are consumed via HTTP and remain unchanged.

### Binding rules
- All API dates render in UTC; never shift by browser local timezone.
- Every authenticated call sends bearer token; any 401 clears token and returns to login.
- Login failure must not reveal whether email exists.
- `available` is display-only, never persisted or mutated.
- Frontend is read-only for leave requests: no create/submit/approve/reject/cancel.

### Phases
1. `web/` scaffold + shared foundations
2. Infrastructure API client + token storage
3. Auth module
4. Employee + leave + balance services
5. Presentation: router, pages, guards
6. Component tests + README

### Open questions
- Token storage mechanism (localStorage/sessionStorage/in-memory)
- Proactive JWT expiry detection vs server 401 only
- UTC date rendering implementation (Date.UTC/getUTC*, Intl timeZone UTC, raw YYYY-MM-DD substring)

### Done when
- `npm run build` in `web/` produces a production bundle with zero TypeScript errors.
- Component tests cover login success/failure, 401 redirect, and bearer-token sending.
- Existing backend build and its 181 tests still pass, untouched.
- README documents how to run the frontend against a local API.
<!-- gestalt:architecture feature=ecef04ad-9a9b-43d8-bac9-03098d9c566a END -->

<!-- gestalt:architecture feature=b020624d-f000-464a-871e-edfa5e57ac4e START -->
## Runnable End-to-End: Seeded Demo Account and Dev Run

### Context
Feature adds development-only seed data, a dev runner, npm scripts, and documentation. No API contract or route changes.

### Domain Entities
- **DemoAccount** (aggregate; no table): manager, employee, leaveTypes, leavePolicies, leaveBalances, leaveRequests, demoCredentials. Lifecycle: none.
- **Employee**: id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, passwordHash. Lifecycle: ACTIVE | TERMINATED | ON_LEAVE.
- **LeaveRequest**: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt. Lifecycle: DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED.
- **LeaveBalance**: id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays. Lifecycle: OPEN | CLOSED.
- **LeavePolicy**: id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status. Lifecycle: DRAFT | ACTIVE | SUPERSEDED.
- **LeaveType**: code, name, requiresApproval, maxConsecutiveDays, isPaid. Static catalog; no lifecycle.

### Conceptual Tables
- **employees**: fields id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: email unique (login lookup, seed idempotency), employee_number unique (natural key, seed idempotency), manager_id (direct-report lookups).
- **leave_types**: fields code, name, requires_approval, max_consecutive_days, is_paid. PK code. Index: code (natural key, seed idempotency, policy FK lookups).
- **leave_policies**: fields id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months, carry_forward_days, min_notice_days, max_request_days, requires_manager_approval, effective_from, effective_to, status. PK id. FK leave_type_code -> leave_types.code. Indexes: leave_type_code (policy lookup by type), id (seed idempotency by stable seed id).
- **leave_balances**: fields id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Unique index (employee_id, leave_type_code, period_start, period_end) for findByKey and seed idempotency. Index employee_id for balance reads.
- **leave_requests**: fields id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id (owner scoping), status (filtering), (leave_type_code, start_date) (date-range/type queries), (employee_id, leave_type_code, start_date) (seed idempotency composite key).

### Module Boundaries and Dependencies
- **seed** (`seeds/`): owns demo dataset, idempotency, balance-counter consistency, knex entry. Depends on shared-types and shared-date.
- **dev-runner** (`scripts/dev.js`): spawns API and web dev server, forwards output/exit codes, signal handling.
- **shared-types** (`src/shared/types`): existing enums and requestedDays helper.
- **shared-date** (`src/shared/date`): existing startOfUtcDay and periodContaining helpers.

### Repository Interfaces
No new repository interfaces are introduced. Existing concrete implementations remain: PgEmployeeRepository, PgLeaveTypeRepository, PgLeavePolicyRepository, PgLeaveBalanceRepository, PgLeaveRequestRepository (PostgreSQL via shared pg Pool). The seed writes directly through the knex instance (standard knex seed mechanism), not through application repositories.

### Contracts
- **authContract**: none — no API endpoints or role-gated access.
- **errorResponseContract**: none — no API endpoints.
- **transactionContract**: none — seed is idempotent and re-runnable; no runtime multi-step atomic write.

### Business Rules
- Seed idempotency: skip already-seeded rows by composite key; never delete or truncate. Keys: employees by email/employee_number; leave_types by code; leave_policies by stable seed id; leave_balances by (employee_id, leave_type_code, period_start, period_end); leave_requests by (employee_id, leave_type_code, start_date).
- Balance counters: SUBMITTED requestedDays -> pending_days; APPROVED requestedDays -> used_days; DRAFT/REJECTED/CANCELLED reserve nothing.
- Seed is development-only; never runs as part of migrate; wired only into knexfile.js development seeds config.
- requestedDays = endDate - startDate + 1 inclusive whole-day UTC, derived only via shared requestedDays helper.
- All seeded dates use UTC discipline via startOfUtcDay/periodContaining anchored on hireDate.
- Demo passwordHash minted with bcrypt.hashSync(plaintext, 10), the same call AuthService verifies.

### Phases
1. Seed module + knex wiring + npm run seed (4 files)
2. Dev runner + npm run dev (2 files)
3. web test script fix: vitest -> vitest run (1 file)
4. README documentation (1 file)

### Open Questions
- Demo credentials: hardcoded vs env-driven with defaults.
- Test framework: declared stack lists Jest, but web uses Vitest and feature requires vitest run; confirm whether Vitest is accepted for the Vite SPA or web should migrate to Jest.

### Stack Compliance Note
API/backend uses Jest per declared stack; web subproject retains Vitest (existing) with `vitest run` per feature requirement. This deviation is surfaced as an open question.
<!-- gestalt:architecture feature=b020624d-f000-464a-871e-edfa5e57ac4e END -->

<!-- gestalt:architecture feature=7d61f09d-b7fc-45d9-8704-fa055d377b19 START -->
## Feature: Leave workflow in web app (request, submit, approve, reject, cancel)

### Scope
Client-side only under `web/`. No changes to backend or `src/`. Consumes existing backend endpoints: POST /leaves, POST /leaves/:id/submit, POST /leaves/:id/approve, POST /leaves/:id/reject, POST /leaves/:id/cancel.

### Domain entities
- **LeaveRequest** — lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED, plus CANCELLED. Attributes: id, employeeId, leaveTypeCode, startDate (ISO string), endDate (ISO string), requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt.
- **Employee** — role awareness only; lifecycle: ACTIVE, TERMINATED, ON_LEAVE. Attributes: id, role (EMPLOYEE | MANAGER | ADMIN), managerId.
- **LeaveType** — static catalog; no lifecycle. Attributes: code, name.

### Conceptual table specifications
None. No new persistence in `web/`; existing backend tables (`leave_requests`, `leave_balances`, `audit_logs`, `notifications`, `employees`, `leave_types`, `leave_policies`) are unchanged and out of scope.

### Repository interfaces and concrete implementations
None in `web/`. Transport is `IApiClient`/`ApiClient`; no database repositories are introduced.

### Module boundaries
- `shared-types` — `web/src/shared/types/` — CreateLeaveRequestInput DTO, LeaveTypeCode, LeaveStatus, EmployeeRole, LeaveRequestView, EmployeeProfile.
- `api-client` — `web/src/infrastructure/api/` — IApiClient (extended with createLeave/submitLeave/approveLeave/rejectLeave/cancelLeave), ApiClient, ApiError, ITokenStorage/TokenStorage.
- `leave` — `web/src/modules/leave/` — ILeaveService (extended with create/submit/approve/reject/cancel), LeaveService, getAvailableLeaveActions, validateLeaveRequestInput, IBalanceService/BalanceService.
- `employee` — `web/src/modules/employee/` — IEmployeeService.getMe(), EmployeeService.
- `presentation-pages` — `web/src/presentation/pages/` — RequestLeavePage, LeaveDetailPage, LeaveListPage, DashboardPage.
- `presentation-guards` — `web/src/presentation/guards/` — RequireAuth.

### Dependency map
- leave → api-client, shared-types
- employee → api-client, shared-types
- api-client → shared-types
- presentation-pages → leave, employee, shared-types, presentation-guards

### Cross-cutting contracts
- **Auth**: Existing session contract reused; no new API surface. AuthSession { token, profile: EmployeeProfile, status } held in AuthContext. Identity/role come from profile.role (EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN') fetched via GET /employees/me; JWT is never decoded in the browser. ApiClient attaches bearer token from ITokenStorage and clears it on 401. Route-level access enforced by RequireAuth; action-level visibility enforced by getAvailableLeaveActions(status, role, isOwner) in pages — forbidden actions are never rendered.
- **Error/response**: ApiError { error: string; code: string } mapped from non-2xx bodies. Validation failure → 400; authentication → 401; authorization → 403; not found → 404; conflict → 409. RequestLeavePage and LeaveDetailPage display ApiError.message (the backend's own error text, e.g. insufficient balance) rather than a generic failure. Client-side validation failures (missing dates, end < start, no type) are caught before any network call and shown inline.
- **Transaction**: None. Each write action is a single HTTP call to an existing backend endpoint; atomicity is owned by the backend's IUnitOfWork/PgUnitOfWork contract, out of scope for this web/ change.

### Lifecycle states
- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- Employee: ACTIVE, TERMINATED, ON_LEAVE
- LeaveType: static (no lifecycle)

### Business rules
- Dates cross the wire as ISO strings, never Date objects; the web client serializes startDate/endDate as ISO strings and parses server responses back to strings for display.
- requestedDays = endDate - startDate + 1 inclusive calendar days, whole-day UTC, no weekend/holiday exclusion; never re-derived client-side.
- A leave request may be created only when endDate is not before startDate, both dates are present, and a leave type is chosen; validated client-side before any network call.
- Action availability is a pure function of (request.status, actor.role, actor.id vs request.employeeId):
  - Owner (request.employeeId === profile.id): submit available when status DRAFT; cancel available when status DRAFT or SUBMITTED.
  - Manager/Admin (profile.role === 'MANAGER' || 'ADMIN'): approve/reject available when status SUBMITTED. The backend enforces the direct-manager rule; the client renders based on role+status and surfaces any 403 as an error.
  - Forbidden actions are never rendered.
- Role awareness comes exclusively from GET /employees/me; the JWT is never decoded in the browser.
- When the backend rejects a create/action, the API's own error message is surfaced verbatim (e.g. insufficient balance), never replaced by a generic failure.
- After a successful action, the leave detail page re-fetches the request and reflects the new status without a manual reload.

### Recommended phases
1. **Phase 1 — Extend IApiClient + ApiClient with write endpoints** (2 files): Add createLeave/submitLeave/approveLeave/rejectLeave/cancelLeave using existing request<T> pattern (bearer token, ApiError mapping, ISO-string dates).
2. **Phase 2 — Extend ILeaveService + LeaveService with write methods** (2 files): Add create/submit/approve/reject/cancel plus pure getAvailableLeaveActions and validateLeaveRequestInput helpers.
3. **Phase 3 — RequestLeavePage form + route wiring** (3 files): New form capturing leave type, start/end dates; client-side validation; surfaces API error on rejection; navigates to detail on success.
4. **Phase 4 — LeaveDetailPage actions + role awareness** (2 files): Render submit/cancel (owner) and approve/reject (manager) only when available; refresh status after action without reload; forbidden actions never rendered.
5. **Phase 5 — LeaveListPage link + composition root wiring** (3 files): Add 'Request leave' link; wire new page into App routes and main.tsx.

### Stack compliance note
Web tests use Vitest (existing web test runner; required by feature done criteria `vitest run`). The declared project stack lists Jest for backend tests; this web-only feature does not alter backend test tooling.

### Open questions
See openQuestions field.
<!-- gestalt:architecture feature=7d61f09d-b7fc-45d9-8704-fa055d377b19 END -->

<!-- gestalt:architecture feature=e04c2d94-ea14-4e1c-bf05-aec38b138bb0 START -->
## Feature: Manager approvals queue (web only)

### Domain entities
- **ApprovalsQueueItem** — derived read-model projection of a LeaveRequest awaiting decision. Attributes: requestId, employeeId, employeeName (nullable), leaveTypeCode, startDate, endDate, status (always SUBMITTED while in queue). Lifecycle: AWAITING_DECISION -> RESOLVED.
- **LeaveRequest** — existing source-of-truth entity. Attributes: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, status, approverId, decidedAt. Lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **EmployeeProfile** — signed-in viewer identity/role from GET /employees/me. Attributes: id, role (EMPLOYEE | MANAGER | ADMIN), firstName, lastName. No lifecycle.

### Business rules
- Queue membership: status === SUBMITTED AND employeeId !== viewer.id AND viewer.role ∈ {MANAGER, ADMIN}. Backend GET /leaves already scopes by role; queue applies SUBMITTED + not-self client-side.
- Visibility role-gated at route boundary: only MANAGER/ADMIN; EMPLOYEE neither sees dashboard link nor can reach /approvals.
- Decision authority reuses getAvailableLeaveActions(status, role, isOwner) — no second copy.
- Decision transitions request out of SUBMITTED, removing it from queue without manual reload.
- Empty queue is explicit normal state, distinct from loading/error.
- Role derived only from EmployeeProfile; JWT never decoded in browser.

### Conceptual tables (pre-existing, unchanged)
- **leave_requests**: id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: status (queue filter), employee_id (direct reports), (leave_type_code, start_date) (list/date-range).
- **employees**: id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: manager_id (direct reports), email (unique login), employee_number (unique lookup).

No new tables, columns, or repositories.

### Repository interfaces / data access
No new repository interfaces. Existing web data-access boundary is IApiClient/ApiClient (HTTP fetch), with LeaveService/EmployeeService delegating to it. ApprovalsService reuses getLeaves(), approveLeave(), rejectLeave(), and getAvailableLeaveActions().

**Updated by the pending-decisions feature (Phase 7).** One new transport method now exists: `IApiClient.getPendingDecisions(): Promise<PendingDecisionView[]>` (`GET /leaves/pending-decisions`, no query parameters), with `PendingDecisionView` added to `web/src/shared/types/index.ts`. `ILeaveService.listPendingDecisions()` is a verbatim pass-through to it, and `IApprovalsService.getPendingDecisions()` delegates to that — so `web-approvals` still reaches the API only through `web-leave` and no `web-approvals -> web-infrastructure-api` edge was added. The pre-existing `getQueue()` path (client-side SUBMITTED + not-self filter over `getLeaves()`, returning `ApprovalsQueueItem`) is unchanged and still what `ApprovalsPage` consumes; the module now exposes two queue reads. See ADR-005 in `docs/DECISIONS.md`.
### Module boundaries
- `web/src/modules/approvals/` — IApprovalsService, ApprovalsService, index.ts. Methods: listPending(profile), approve(id), reject(id).
- `web/src/presentation/guards/` — RequireApprover (MANAGER|ADMIN only, else redirect).
- `web/src/presentation/pages/` — ApprovalsPage (list, approve/reject, empty state, drill-in link), DashboardPage (role-gated approvals link).
- `web/src/presentation/App.tsx` — /approvals route wrapped in RequireAuth + RequireApprover.

Dependencies flow inward: presentation -> modules -> infrastructure. Approvals depends on leave, employee, shared-types. No circular edges.

### Cross-cutting contracts
- **Auth**: Identity/role from EmployeeProfile (GET /employees/me) held in auth session; EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'. /approvals wrapped in RequireAuth + RequireApprover; non-MANAGER/ADMIN redirected.
- **Error**: No new API endpoints; page surfaces existing ApiError failures (message + optional code) from reused api-client methods. Rejected decision rendered inline without manual reload; empty queue distinct non-error state.
- **Transaction**: EMPTY — read-only queue plus single existing API writes; atomicity owned by backend.

### Recommended phases
1. Phase 1 — Approvals service module (3 files)
2. Phase 2 — Approvals service unit tests (1 file)
3. Phase 3 — RequireApprover route guard (2 files)
4. Phase 4 — ApprovalsPage + route wiring (2 files)
5. Phase 5 — ApprovalsPage tests + dashboard link (3 files)

### Open question
- Employee column rendering: API exposes employeeId but no employee name; web employee service only getMe(). Options: render employeeId as-is, omit column, or resolve from existing list (none exists).
<!-- gestalt:architecture feature=e04c2d94-ea14-4e1c-bf05-aec38b138bb0 END -->

<!-- gestalt:architecture feature=957fb3ff-3b3a-4d0e-9273-8b37869e315c START -->
## Dashboard Leave Balances: Full Breakdown and Empty State

### Scope
Frontend-only change confined to `web/src/presentation/pages/DashboardPage.tsx` and its test. No backend, API contract, route, or page changes. Existing `GET /balances/me` and `balanceService.getBalances()` are reused unchanged.

### Domain Entities
- **LeaveBalance** (existing canonical): id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available (computed, never persisted). Lifecycle: OPEN, CLOSED.
- **LeaveBalanceView** (existing wire projection): id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available. Immutable read-only view; no lifecycle.
- **DashboardBalanceDisplay** (new presentation state): balances: LeaveBalanceView[], loading: boolean, error: string | null. Lifecycle: LOADING, ERROR, EMPTY, POPULATED (mutually exclusive).

### Business Rules
- `available = entitledDays - usedDays - pendingDays` is the single canonical derivation, computed server-side; the dashboard displays it verbatim and never recomputes locally.
- Full breakdown per leave type: entitledDays, usedDays, pendingDays, available, in that order, with period dates via `formatUtcDate`.
- Dashboard has exactly four mutually exclusive states: LOADING, ERROR, EMPTY, POPULATED. EMPTY is a normal outcome (e.g. new joiner with no accrual period) and must be visibly distinct from LOADING and ERROR.
- Profile and balances fetches are independent. A balances-only failure must resolve to ERROR, never a perpetual loading state. The loading condition must not be `employee === null || balances === null`; use an explicit `loading` boolean set false in both `.then` and `.catch`.
- An empty balances array is a valid non-error result rendered as an explicit empty state.

### Module Boundaries
- `web-presentation-pages` (`web/src/presentation/pages/`) owns `DashboardPage` and its test. It depends on `web-shared-types`, `web-shared-date`, `web-leave`, `web-employee`, `web-auth`, `web-presentation-components`. No new modules or services.

### Dependency Map
- `web-presentation-pages` -> `web-shared-types`
- `web-presentation-pages` -> `web-shared-date`
- `web-presentation-pages` -> `web-leave`
- `web-presentation-pages` -> `web-employee`
- `web-presentation-pages` -> `web-auth`
- `web-presentation-pages` -> `web-presentation-components`

### Persistence
No new tables, repositories, or repository implementations. Existing backend tables (employees, leave_types, leave_policies, leave_balances, leave_requests, audit_logs, notifications) are reused unchanged. No SQL DDL.

### Cross-Cutting Contracts
- **Auth**: No new API surface or role-gated access; dashboard already behind existing authenticated session. Contract intentionally empty.
- **Error response**: No new endpoints; existing `GET /balances/me` unchanged. Contract intentionally empty.
- **Transaction**: Read-only feature; no multi-step writes. Contract intentionally empty.

### Testing
Web tests use Vitest (project-specific instruction); backend test framework remains Jest per declared stack.

### Recommended Phases
1. **Phase 1 — DashboardPage rendering: full breakdown, empty state, decoupled loading** (1 file): Add explicit `loading` boolean set false in both `.then` and `.catch`; render entitled/used/pending/available per leave type with `formatUtcDate`; add explicit empty state when `balances.length === 0`.
2. **Phase 2 — DashboardPage tests: empty case, balances-fetch error, full breakdown** (1 file): Extend `DashboardPage.test.tsx` (Vitest) covering empty balances, balances-fetch rejection, and full breakdown rendering.

### Open Questions
None.
<!-- gestalt:architecture feature=957fb3ff-3b3a-4d0e-9273-8b37869e315c END -->

<!-- gestalt:architecture feature=79f682f0-f52a-4751-b803-2b0059522cdd START -->
## GP-008 Reversal — Leave Lifecycle Immutability
### Purpose
Bring the leave lifecycle into line with GP-008 ("Approval workflows are immutable once completed"): a completed approval must not be modified, and a reversal creates a NEW instance that references the original. **Delivered** — `LeaveService.cancel` no longer mutates an APPROVED request in place to CANCELLED; it inserts a new CANCELLED reversal row (see "Phase 2 delivered" below). The persistence foundation (`reverses_request_id` column, model field, repository plumbing) was delivered in Phase 1.

### Domain entities

| Entity | Table | Lifecycle states |
| --- | --- | --- |
| `LeaveRequest` | `leave_requests` | DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED |
| `LeaveRequestReversal` (domain ROLE of `LeaveRequest`, not a separate table) | `leave_requests` (row with `reverses_request_id` non-null) | CANCELLED |
| `LeaveBalance` | `leave_balances` | OPEN, CLOSED |
| `AuditLog` | `audit_logs` | RECORDED |
| `Notification` | `notifications` | PENDING, SENT, READ |
| `LeaveRequestView` (read projection) | — | (none) |

**Lifecycle semantics introduced / newly load-bearing:**
- `LeaveRequest`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED (unchanged set). New binding semantics: **APPROVED is a TERMINAL, IMMUTABLE state (GP-008)** — `status`, `approverId`, `approvalComment`, `decidedAt` may never be updated once APPROVED. DRAFT and SUBMITTED remain mutable and are cancelled in place.
- `LeaveRequestReversal`: **CANCELLED** (single state; born CANCELLED, never transitions). Terminal and inert: no submit/approve/reject/cancel, no reservation, never itself reversed.
- `LeaveBalance`: OPEN, CLOSED (unchanged). Cancellation of an APPROVED request releases `requestedDays` from `usedDays` exactly once, in the same unit of work as the reversal insert.
- `AuditLog`: RECORDED (unchanged). One CANCEL record per approved cancellation, written in the same unit of work.
- `LeaveRequestView`: no lifecycle; gains `reversesRequestId` on the wire.

**Named transitions:**
- `cancelInPlace`: DRAFT -> CANCELLED and SUBMITTED -> CANCELLED (mutates the same row; SUBMITTED also releases `pendingDays`).
- `reverseApproved`: APPROVED -> (original row unchanged) + new `LeaveRequestReversal` row in CANCELLED with `reversesRequestId` = original id; releases `usedDays` on the balance; writes CANCEL audit; notifies requester.

### Business rules
1. **GP-008 immutability** — once a `LeaveRequest` reaches APPROVED, `status`/`approverId`/`approvalComment`/`decidedAt` are immutable. Cancellation of an APPROVED request must not write to the original row at all.
2. **Reversal creates a NEW instance** — cancelling an APPROVED request inserts a new `leave_requests` row with status CANCELLED and `reverses_request_id` = the original id. The original APPROVED row is left byte-identical. The reversal row is born in CANCELLED and never transitions again.
3. **In-place cancellation preserved for non-completed states** — cancelling DRAFT or SUBMITTED mutates that same row to CANCELLED (with `cancelledBy`/`cancelledAt`) exactly as today; no reversal row is created.
4. **Balance release is exactly-once and unchanged in amount** — the original request's `requestedDays` is returned to `usedDays` (`usedDays -= requestedDays`, no pro-rating) exactly once, inside the same unit of work as the reversal insert. It must not be skipped and must not be applied twice.
5. **Canonical day count** — `requestedDays = endDate - startDate + 1` (inclusive calendar days, whole-day UTC, no weekend/holiday exclusion), computed once via the shared `requestedDays` helper. The reversal row copies the original's `requestedDays` verbatim and never re-derives it; the balance release consumes that same copied value.
6. **Audit** — the cancellation of an APPROVED request writes exactly one `AuditLog` record with action CANCEL, `entityType` 'leave_request', `entityId` = the ORIGINAL APPROVED request id, `beforeState` = the original APPROVED request, `afterState` = the reversal row — inside the same unit of work as the reversal insert and the balance release (GP-002).
7. **Wire honesty** — because a cancelled-after-approval request is two rows, the read model (GET /leaves, GET /leaves/:id) must expose `reversesRequestId` so a client can distinguish the original APPROVED row (`reversesRequestId` = null) from the reversal CANCELLED row (`reversesRequestId` = original id). A client must never infer the pairing from matching dates or `employeeId`.
8. **Authorization and timing guards unchanged** — the owner may cancel their own DRAFT/SUBMITTED request; only the direct manager or an ADMIN may cancel an APPROVED request; cancellation is blocked once `startDate <= today` (UTC day comparison) with `ConflictError`. The reversal row inherits the original's `employeeId`, so role-scoped visibility (EMPLOYEE self, MANAGER self + direct reports, ADMIN all) applies to it identically.
9. **Reversal row is terminal and inert** — it reserves nothing, cannot be submitted/approved/rejected/cancelled again, and is never the target of a second reversal. Only the original APPROVED row's `requestedDays` drives the single balance release.
10. **Double-cancel guard** — a second cancel of the same APPROVED original is rejected: the service calls `findByReversesRequestId` inside the transaction and throws `ConflictError`; the UNIQUE index on `reverses_request_id` is the database backstop.

### Conceptual table specifications (no DDL)

**`leave_requests`** — fields: `id`, `employee_id`, `leave_type_code`, `start_date`, `end_date`, `requested_days`, `reason`, `status`, `approver_id`, `approval_comment`, `submitted_at`, `decided_at`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`, `approver_id -> employees.id`, `cancelled_by -> employees.id`, `reverses_request_id -> leave_requests.id`. Indexes: `id` (PK); `reverses_request_id` UNIQUE nullable — the DB backstop for exactly-once release and the `findByReversesRequestId` lookup; `employee_id, status` composite — role-scoped list queries and owner/status guards; `leave_type_code, start_date` — type filter, inclusive date-range filter, `ORDER BY start_date DESC`; `status` — status-filtered lists and the existing-reversal scan; `employee_id` — FK lookups and per-employee history.

**`leave_balances`** — fields: `id`, `employee_id`, `leave_type_code`, `period_start`, `period_end`, `entitled_days`, `used_days`, `pending_days`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`. Indexes: `id` (PK, release update target); `employee_id, leave_type_code, period_start, period_end` UNIQUE — `findByKey` resolves exactly one row and is the `forUpdate` lock target; `employee_id` — per-employee balance reads.

**`audit_logs`** — fields: `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, `occurred_at`. PK `id`. FK: `actor_id -> employees.id`. Indexes: `id` (PK); `entity_type, entity_id` — the trail for one leave request, with the reversal's CANCEL entry written against the ORIGINAL request id; `actor_id` — actor-history queries.

**`notifications`** — fields: `id`, `recipient_id`, `type`, `title`, `message`, `related_entity_type`, `related_entity_id`, `status`, `created_at`, `read_at`. PK `id`. FK: `recipient_id -> employees.id`. Indexes: `id` (PK); `recipient_id, status` — inbox read pattern; `related_entity_type, related_entity_id` — the cancellation notification points at the ORIGINAL request id.

### Repository interfaces and concrete implementations

- **`ILeaveRepository` / `PgLeaveRequestRepository`** (PostgreSQL via the shared pg Pool, `src/shared/db/connection.ts`; every method takes an optional trailing `PoolClient` and falls back to the shared pool; the repository never opens BEGIN/COMMIT/ROLLBACK):
  - `create(input, client?)` — inserts all 15 columns including `reverses_request_id`; used for the NEW CANCELLED reversal row.
  - `findById(id, client?)` — returns null when absent.
  - `findByReversesRequestId(reversesRequestId, client?)` — resolves the reversal row for an original id so the service can detect an already-reversed APPROVED request before releasing the balance a second time.
  - `update(id, changes, client?)` — dynamic SET from FIELD_COLUMNS; used ONLY for the in-place DRAFT/SUBMITTED cancellation. MUST NOT be called with the id of an APPROVED row (GP-008).
  - `findByQuery(params, client?)` — status/leaveTypeCode/date-range/employeeIds filters plus limit/offset, `ORDER BY start_date DESC`; returns both the original APPROVED row and its CANCELLED reversal row, each carrying `reverses_request_id`.
- **`IBalanceRepository` / `PgLeaveBalanceRepository`**: `findByKey(employeeId, leaveTypeCode, periodStart, periodEnd, client?, forUpdate?)` (release path passes `forUpdate=true`), `update(id, changes, client?)` (the single write that releases `requestedDays` back to `usedDays` or decrements `pendingDays`), `findById`, `create`.
- **`IAuditRepository` / `PgAuditLogRepository`**: `create(input, client?)` (generates id via `randomUUID()`, stamps `occurredAt`, JSON-stringifies before/after state; the reversal writes action CANCEL with `entityId` = the ORIGINAL request id), `findById`.
- **`INotificationRepository` / `PgNotificationRepository`**: `create(input, client?)` (`relatedEntityId` = the ORIGINAL request id), `findById`, `updateStatus`.

### Module boundaries

- **Presentation** — `src/modules/*/*.routes.ts` (Fastify route handlers; no controller layer). Routes do boundary parsing, `resolveActor`, and `sendError`; no business logic, no SQL.
- **Application** — `src/modules/*/*.service.ts` (`ILeaveService`, `IBalanceService`, `IAuditService`, `INotificationService`, `IEmployeeService`, `IPolicyService`, `IValidationService`). Services own the transaction boundary via `IUnitOfWork.withTransaction` and orchestrate repositories. `leave` is the sole orchestrator.
- **Domain** — `src/modules/*/*.model.ts` (entities + `Create*Input` types) and `src/shared/types/index.ts` (canonical enums, cross-module DTOs, `requestedDays`).
- **Infrastructure** — `src/modules/*/*.repository.ts` (`Pg*Repository`), `src/shared/db/` (pool, `PgUnitOfWork`), `migrations/`.

Every public service method is declared on an interface before its implementation. No implementation is referenced by a consumer except through its interface plus a composition factory (`createLeaveService`, `createPolicyService`).

`reversesRequestId` is a field on the `LeaveRequest` entity, consumed by exactly one backend module (`leave`), so it stays in `src/modules/leave/leave.model.ts` and is NOT promoted to `src/shared/types/`. On the web root, `LeaveRequestView` is imported by `web-leave`, `web-approvals` and `web-presentation-pages`, so the new field is added to `web/src/shared/types/index.ts`.

### Dependency map

`leave -> {shared-types, shared-db, shared-errors, shared-date, balance, audit, notification, validation, employee, policy}`; `balance -> {policy, employee, shared-db, shared-date, shared-types}`; `policy -> {leave-type, shared-types, shared-db}`; `audit`/`notification`/`employee`/`validation` -> shared foundations only. No module depends back on `leave`. Web root: `web-presentation-pages -> web-approvals -> web-leave -> web-infrastructure-api -> web-shared-types`. Every edge is one-directional; no cycle exists.

### Cross-cutting contracts

**Auth** — `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity and role come from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`; only `/auth/login` is in `PUBLIC_PATHS`. RBAC is enforced at the API boundary by the route-level `resolveActor` helper (throws `UnauthorizedError` on a missing/invalid actor) and in the service by `assertAuthenticated`/`assertCanCancel`/`assertCanDecide` — never inline in a route handler. This feature adds no new endpoint and no new role: `POST /leaves/:id/cancel` keeps its existing authorization, and the reversal row inherits the original's `employeeId`, so role-scoped visibility applies to it unchanged.

**Error response** — errors return `{ error: string; code: string }`. Validation failure -> HTTP 400 (`ValidationError`, code `VALIDATION`); authentication failure -> 401 (`UnauthorizedError`, code `UNAUTHORIZED`); authorization failure -> 403 (`ForbiddenError`, code `FORBIDDEN`); not found -> 404 (`NotFoundError`, code `NOT_FOUND`); invalid state transition -> 409 (`ConflictError`, code `CONFLICT`); any other throw -> 500 `{ error: 'Internal Server Error' }`. `GET /leaves/:id` returns the same 404 for a request the caller may not see as for one that does not exist. This feature adds no new status code: cancelling an APPROVED request still returns 200 with the new CANCELLED reversal row, and the existing guards keep their current 409/403 responses.

**Transaction / unit of work** — cancelling an APPROVED request performs, in one unit of work: (a) insert the new CANCELLED reversal row, (b) release `requestedDays` from `used_days` on the balance row, (c) write the CANCEL audit entry, (d) insert the cancellation notification. Repository and service methods that must join a caller's transaction take an OPTIONAL trailing `client?: PoolClient` parameter, defaulting to the shared pool (`src/shared/db/connection.ts`) when omitted. The calling service owns the unit of work: `LeaveService.cancel` calls `this.uow.withTransaction(async (client) => { ... })` (`PgUnitOfWork` acquires a client from the shared pool, BEGIN, runs the callback, COMMIT on resolve / ROLLBACK on throw, always releases). Inside the callback the same `client` is threaded to every participating call: `repository.findByReversesRequestId(originalId, client)`, `repository.create(reversalInput, client)`, `balanceRepository.findByKey(..., client, true)` (row lock) then `balanceRepository.update(balanceId, { usedDays: ... }, client)`, `auditService.record(entry, client)`, `notificationService.create(input, client)`. BEGIN/COMMIT/ROLLBACK appear only in `PgUnitOfWork` — never in a repository or service. The DRAFT/SUBMITTED in-place cancellation uses the same contract. Read paths (`list`, `getById`) open no transaction and forward no client.

### Recommended phases

1. **Phase 1 — `reverses_request_id` column, model field, repository plumbing** (3 files). New knex migration (PostgreSQL) adds nullable `reverses_request_id` with a self-referencing FK and a UNIQUE index. `LeaveRequest` gains `reversesRequestId: string | null`; `PgLeaveRequestRepository` carries it end-to-end and gains `findByReversesRequestId`. **Delivered.**
2. **Phase 2 — `LeaveService.cancel` reversal branch (GP-008)** (1 file). DRAFT/SUBMITTED keep the in-place `update` path; APPROVED inserts a NEW CANCELLED row via `create` and never writes the original. Balance release, CANCEL audit and notification stay exactly-once inside one `withTransaction`. A pre-insert `findByReversesRequestId` check throws `ConflictError` on a repeat cancel. **Delivered — see below.**
3. **Phase 3 — expose `reversesRequestId` on the read model (wire + web)** (2 files). Backend read path needs no change; `web/src/shared/types/index.ts` `LeaveRequestView` gains `reversesRequestId: string | null` and the API client passes it through. **Delivered — see below.**
4. **Phase 4 — tests: reversal unit test + smoke assertion** (2 files). Unit test proves the original stays APPROVED, exactly one CANCELLED reversal row references it, `usedDays` released exactly once, one CANCEL audit entry and one notification, all in a single `withTransaction`. Smoke stage approves then cancels against real Postgres and asserts two rows with the original still APPROVED. **Delivered — see below.**

### Phase 2 delivered (LeaveService.cancel reversal branch)
This phase implements the GP-008 reversal branch in `src/modules/leave/leave.service.ts` — the sole file changed. The Phase 1 persistence foundation (`reverses_request_id` column, `LeaveRequest.reversesRequestId`, `ILeaveRepository.findByReversesRequestId`) was already in place and is consumed as a fixed contract.

**`LeaveService.cancel(actor, requestId)`** now branches on the request's current status inside the single `uow.withTransaction` callback:

- **APPROVED (reversal path)** — the original row is never written. The service:
  1. calls `repository.findByReversesRequestId(request.id, client)` and throws `ConflictError('This leave request has already been reversed')` when a reversal already exists (the double-cancel guard; the UNIQUE index on `reverses_request_id` is the DB backstop);
  2. resolves the balance via `resolveBalance(employeeId, leaveTypeCode, startDate, client, true)` (row lock) and releases the full `requestedDays` with `balanceRepository.update(balance.id, { usedDays: balance.usedDays - request.requestedDays }, client)` — no pro-rating;
  3. inserts a NEW row via `repository.create(...)` with `status: LeaveStatus.CANCELLED`, `reversesRequestId: request.id`, `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`requestedDays`/`reason` copied verbatim from the original, `approverId`/`approvalComment`/`submittedAt`/`decidedAt` all `null` (the reversal was never approved), and `cancelledBy: actor.id` / `cancelledAt: now`;
  4. writes exactly one `AuditAction.CANCEL` entry with `entityId: request.id` (the ORIGINAL), `beforeState: request`, `afterState: reversal`;
  5. creates exactly one cancellation notification to the requester (`relatedEntityId: requestId`);
  6. returns the reversal row (the route responds 200 with it).

- **SUBMITTED (in-place path)** — unchanged behaviour: resolve the balance with `forUpdate = true`, `pendingDays -= requestedDays`, then `repository.update(id, { status: CANCELLED, cancelledBy: actor.id, cancelledAt: now }, client)`.
- **DRAFT (in-place path)** — unchanged behaviour: no balance read or write at all; `repository.update(id, { status: CANCELLED, cancelledBy: actor.id, cancelledAt: now }, client)`.

`now` is hoisted once per call (`const now = new Date()`) and reused for both the reversal's `cancelledAt` and the in-place `cancelledAt`. Authorization (`assertCanCancel`) and the timing guard (`startDate <= today` -> `ConflictError`) are unchanged and run before the transaction.

**Divergences from the plan worth noting:**
- The plan described the DRAFT/SUBMITTED path as "byte-identical"; the implementation restructured the branch (APPROVED handled first, then a single `if (request.status === SUBMITTED)` block) rather than keeping the original `if (status !== DRAFT) { ... if SUBMITTED ... else ... }` nesting. Observable behaviour is identical — DRAFT still touches no balance, SUBMITTED still releases `pendingDays` — but the code shape differs from the pre-existing structure.
- The plan's Phase 2 was scoped to production code only ("no test file changes this phase"); the committed diff for this phase likewise touches no test file. The reversal unit test and smoke assertion were delivered in Phase 4 (see below).

### Phase 3 delivered (expose `reversesRequestId` on the web read model)
This phase delivers recommended Phase 3 — surfacing the reversal linkage on the web read model. The backend read path needed no change: `src/modules/leave/leave.routes.ts` is untouched (the repository's `mapRow` already supplies `reversesRequestId` and the routes pass the service's `LeaveRequest` objects through unchanged), resolving the phase's open ambiguity in favour of "leave the route untouched" rather than adding a route-level mapping.

**`web/src/shared/types/index.ts`** — `LeaveRequestView` gains `reversesRequestId: string | null` as its LAST field, positioned after `cancelledAt`. No other field of the interface is added, renamed, split, reordered, or retyped; `EmployeeProfile`, `LeaveBalanceView`, `LoginResponse`, `CreateLeaveRequestInput` and the enums are untouched. The field name, type and nullability mirror the backend `LeaveRequest.reversesRequestId` exactly, so the read model stays a faithful projection of the service's returned object. No client-side reversal logic is introduced: `leave.service.ts` (`ILeaveService`/`LeaveService`), `leave.actions.ts` and `leave.validation.ts` keep their existing method set and behaviour — the field only flows through the type, and the API client passes it through unchanged.

**Divergence from the plan worth noting:** the phase spec asserted "no test file changes this phase", but the committed diff also updates five existing test files — `web/src/modules/approvals/approvals.service.test.ts`, `web/src/modules/leave/leave.service.test.ts`, and `web/src/presentation/pages/{ApprovalsPage,LeaveDetailPage,LeaveListPage,RequestLeavePage}.test.tsx` — each adding `reversesRequestId: null` to its `LeaveRequestView` fixture builder. These are mechanical fixture completions forced by the new required field (the fixtures are typed as `LeaveRequestView`), not new test cases: no test file is added or deleted and no assertion changes. Without them `tsc` would fail on the web root.

**Read-path behaviour (unchanged, now consumable):** `GET /leaves` and `GET /leaves/:id` continue to return both the original APPROVED row (`reversesRequestId` = null) and its CANCELLED reversal row (`reversesRequestId` = the original's id) as two independent entries, with role scoping and error semantics unchanged. The client pairs them via `reversesRequestId`; neither row is suppressed, collapsed, or filtered. No query parameter or route-level mapping was added. The "GET /leaves list shape" open question remains open: every existing consumer (LeaveListPage, ApprovalsPage, DashboardPage) still renders two rows unless it learns to filter on `reversesRequestId`.

### Phase 4 delivered (reversal unit test + smoke assertion)
This phase delivers recommended Phase 4 — the GP-008 reversal test coverage. Two files changed, both test-only; no production source was touched (the Phase 1–3 deliverables are fixed contracts).

**Unit test — `tests/unit/modules/leave/leave.service.test.ts`.** A new `describe('cancel (APPROVED reversal)')` block extends the existing suite, reusing the eight in-memory fakes and fixtures. `FakeLeaveRepository.findByReversesRequestId` now records its calls (`findReversesCalls`) and forwards the optional `client`, so the reversal lookup is assertable. The block's own `beforeEach` seeds an APPROVED request with `usedDays = REQUESTED_DAYS` (the existing cancel `beforeEach` seeds `usedDays: 0`, which would not exercise the release path) and clears the recorded-call arrays before each case. Cases:
- **Original immutability** — `repository.updateCalls` is empty; the stored original is the same object and still reads APPROVED with `approverId`/`approvalComment`/`decidedAt` byte-identical; no update call targets the original id.
- **Reversal shape** — exactly one `repository.create` call; the new row is CANCELLED with `reversesRequestId === original.id`, copies `employeeId`/`leaveTypeCode`/`startDate`/`endDate`/`requestedDays`/`reason` verbatim, nulls `approverId`/`approvalComment`/`submittedAt`/`decidedAt`, and sets `cancelledBy = actor.id` with `cancelledAt` a `Date`.
- **Exactly-once release** — exactly one balance update, `usedDays` back to 0, `pendingDays` `undefined` in the change set.
- **Audit** — exactly one `AuditAction.CANCEL` record with `entityId = original.id`, `beforeState = original`, `afterState = reversal`.
- **Notification** — exactly one cancellation notification (`type 'leave_request'`, title `'Leave request cancelled'`, recipient the requester, `relatedEntityId = 'lr-1'`).
- **Transaction containment** — `uow.callCount === 1`; `findByReversesRequestId`, `create`, the balance read (`forUpdate` true) and write, the audit record and the notification create all receive the single stub `PoolClient`.
- **Double-cancel guard** — with a pre-existing reversal row, `cancel` throws `ConflictError` (asserted `statusCode: 409`) and performs no insert, no balance write, no audit and no notification.
- **DRAFT/SUBMITTED unchanged** — both cancel in place (`repository.update` on the same id), create no reversal row, and leave `reversesRequestId` null.

**Smoke — `scripts/smoke.js` (Postgres mode).** A new **stage 7b** drives the full reversal flow against real Postgres: it mints an ADMIN token via the existing `signToken` helper, submits then approves the seeded request, then cancels it. It asserts the cancel response is a NEW CANCELLED row whose `reversesRequestId` equals the original id (and whose id differs from the original), that `GET /leaves/:id` still returns the original as APPROVED with its `approverId`/`decidedAt` unchanged, that `GET /leaves` includes a CANCELLED row referencing the original, and that the reversal row is independently readable by id (`GET /leaves/:id` on the NEW row returns CANCELLED with `reversesRequestId` still pointing at the original). A second cancel of the already-reversed original is asserted to return **409**. The balance release is checked by reading `leave_balances` directly: the stage captures `used_days` immediately after approval (asserting it equals the original's `requestedDays`), then after cancellation asserts `used_days === usedDaysAfterApprove - originalRequestedDays` — i.e. released exactly once, back to its pre-approval value — with `pending_days` untouched. The stage runs **before** stage 8 re-keys `bal-1` to the current period, because after the re-key no balance exists for the request's 2030 period and the release would fail with `NotFoundError`. The seed block now inserts a second `employees` row (`smoke-admin`, `EmployeeRole.ADMIN`) alongside the seeded employee, because approving/cancelling writes `actor.id` into `approver_id`, which is FK-constrained to `employees`; one ADMIN may both approve and cancel. The existing stages and the sqlite-mode skip caveat are untouched.

**Follow-up hardening (later sub-phase, `scripts/smoke.js` only).** Stage 7b was subsequently strengthened without touching production source or the unit test. The balance-release assertion no longer compares `used_days` to a bare literal `0`: it captures `used_days` after approval and asserts it equals the original's `requestedDays` (proving approval moved exactly that many days into `usedDays`), then asserts the post-cancel value is `usedDaysAfterApprove - originalRequestedDays`, so "released exactly once" is proven against the original's own `requestedDays` rather than an assumed starting value. The stage also gained two assertions: the reversal row is read back independently via `GET /leaves/:id` (exercising the read path on the NEW row, where stage 7 covered the original), and a second `POST /leaves/:id/cancel` on the already-reversed original must return **409**. The stage still runs before stage 8's re-key and still reads `leave_balances` directly via the per-run-schema knex connection.

**Divergences from the plan worth noting:**
- The plan scoped Phase 4 to "2 files"; the committed diff matches (the unit test and `scripts/smoke.js`).
- The plan's unit-test constraint required the reversal tests to seed `usedDays = REQUESTED_DAYS`; the implementation does so in the block's own `beforeEach` while leaving the existing cancel `beforeEach` (`usedDays: 0`) intact.
- The plan required the smoke actor to be an ADMIN; the implementation seeds a dedicated ADMIN employee row rather than reusing the seeded employee (whose `manager_id` is null, so no direct manager exists), and reuses the existing `SMOKE_PASSWORD`/`signToken` pattern with no hardcoded credential.
- The plan's success criterion described the balance check as "`usedDays` back to its pre-approval value"; the follow-up hardening makes that literal — it captures the post-approval value and subtracts the original's `requestedDays` instead of asserting a hardcoded `0`.
### Open questions

1. **CANCEL audit `entityId` target** — **resolved by the implementation**: `entityId` = the ORIGINAL APPROVED request id, `beforeState` = the original, `afterState` = the reversal row.
2. **Reversal-row approval provenance** — **resolved by the implementation**: the reversal row carries null `approverId`/`approvalComment`/`submittedAt`/`decidedAt`; provenance is reached via `reversesRequestId`. A reader filtering on `approverId`/`decidedAt` will not see the reversal.
3. **GET /leaves list shape** — still open: the read path returns both rows unchanged, paired by `reversesRequestId`. Every existing consumer (LeaveListPage, ApprovalsPage, DashboardPage) will render two rows unless it learns to filter.
4. **[RESOLVED — BINDING RULE] Aggregation double-counting** — the reversal row copies `requestedDays`/dates from the original (never re-derived, never zeroed). Any aggregation that sums `requestedDays` MUST filter on `reverses_request_id IS NULL`, or the original APPROVED row and its reversal row are double-counted. This rule is binding feature-wide, not a comment on one call site.
5. **Double-cancel guard** — **resolved by the implementation**: the service `findByReversesRequestId` check throws `ConflictError` (409) before any write, with the UNIQUE index as the DB backstop.

### Stack compliance

TypeScript on Node 20, npm, Jest, Fastify, React (Vite SPA), PostgreSQL, modular monolith. The migration targets PostgreSQL (the declared database); the smoke check runs against real Postgres. No framework outside the declared stack is used.

<!-- gestalt:architecture feature=ed7419c9-c171-4d5d-9d12-62ba16e78d54 START -->
## Feature: Honour the PORT environment variable

### Reconciliation summary

- **Canonical resolver seam.** `IPortResolver.resolvePort(rawPort: string | undefined): ResolvedHttpPort` — the app slice's interface, declared before its implementation. The domain slice's `PortEnvironmentInput` is the value object describing the observed environment entry; its `rawValue` is exactly the `rawPort` argument. One method name, one input type, one output type across all three slices.
- **Canonical fallback constant.** `DEFAULT_PORT = 3000`, owned by `shared-config`. No second literal `3000` may exist anywhere in the codebase.
- **Canonical file convention.** `src/shared/config/port-resolver.interface.ts` + `port-resolver.ts` + `index.ts` (the `shared/` foundation convention, matching `shared/db/unit-of-work.ts` and `shared/date/accrual.ts`), NOT the `<name>.service.ts` convention. The app slice flagged the two conventions; one is chosen and applied consistently.
- **Validity predicate.** Strict — trim, `/^[0-9]+$/`, `1 <= n <= 65535`. Adopted from the domain slice's binding rule; the data slice's lenient `parseInt`/`Number` alternatives are rejected. Surfaced as OQ-1 for confirmation.
- **Out-of-range ports.** `> 65535` is INVALID and falls back to 3000 (domain binding rule), so `shared-config` never throws and has **no** dependency on `shared-errors`. The app slice's `shared-config -> shared-errors` edge is therefore dropped; `shared-config` is a leaf.
- **Test seam.** A pure resolver in `shared-config`, unit-tested directly with no socket and no `process.env` mutation; `src/index.ts` stays a thin composition root. This settles the test-seam question raised by all three slices.
- **Stack compliance.** TypeScript / Node 20 / npm / Jest / Fastify / PostgreSQL / modular-monolith — all three slices comply. No non-stack framework appears; no React/Vite surface is touched; no SQL is introduced.

### Domain entities

**PortEnvironmentInput** — the immutable snapshot of the process environment's PORT entry, taken once at startup. Attributes: `rawValue: string | undefined` (the exact observed value, passed as `rawPort`), `presence: PortPresence` (ABSENT | PRESENT), `observedAt: Date`.

**ResolvedHttpPort** — the single authoritative port the process will bind to. Attributes: `port: number` (always a positive integer 1..65535 by construction), `source: PortSource` (ENV | DEFAULT), `rawValue: string | undefined` (diagnostics only; never logged verbatim).

### Lifecycle states

**PortEnvironmentInput**
- `ABSENT` — PORT is not present in the environment (`rawValue === undefined`). Resolution must select the default port.
- `PRESENT` — PORT is present as a string, which may be empty, whitespace-only, non-numeric, zero, negative, fractional, or a valid positive integer. Resolution must classify it via the canonical validity predicate.
- No transitions: the snapshot is taken once and never mutated. ABSENT and PRESENT are terminal observations, not a progression.

**ResolvedHttpPort**
- `RESOLVED` — the port has been derived from the snapshot; the only entry state. Resolution is a pure, total function, so there is no failure state and no transition into it.
- `BOUND` — the resolved port was handed to the HTTP listener and accepted. Reached only from `RESOLVED`, exactly once per process.
- `LISTEN_FAILED` — the listener rejected the bind (e.g. port in use). Reached only from `RESOLVED`; terminal for the process (existing behaviour: log the error, exit non-zero).
- No transition from `BOUND` back to `RESOLVED`: the port is resolved once and never re-read.

No existing lifecycle state changes. Employee, LeaveType, LeavePolicy, LeaveRequest, LeaveBalance, AuditLog and Notification lifecycles are untouched.

### Conceptual table specifications

**None.** This feature creates, reads, updates or deletes no domain state. No new table, column, index or migration is required. Inventing a `server_config` / `app_settings` row holding the port would contradict the feature's contract (the port comes from the environment, not the database) and would add a DB dependency to process startup, which currently has none. The existing conceptual tables (employees, leave_types, leave_policies, leave_requests, leave_balances, notifications, audit_logs) are unchanged and remain specified once, elsewhere in this document.

### Repository interfaces and implementations

**None.** No repository interface and therefore no concrete implementation. GP-001 is not engaged because there is no DB access. The existing `IEmployeeRepository`/`PgEmployeeRepository`, `ILeaveRepository`/`PgLeaveRequestRepository`, `IBalanceRepository`/`PgLeaveBalanceRepository`, `IPolicyRepository`/`PgLeavePolicyRepository`, `ILeaveTypeRepository`/`PgLeaveTypeRepository`, `IAuditRepository`/`PgAuditLogRepository` and `INotificationRepository`/`PgNotificationRepository` (all PostgreSQL via the shared `pg` Pool in `src/shared/db/connection.ts`) are untouched.

### Module boundaries

- **`shared-config`** (`src/shared/config/`) — owns `IPortResolver`, `PortResolver`, `DEFAULT_PORT = 3000`, `PortSource`, the canonical validity predicate, and the public `index.ts` entry point. Pure: no Fastify, no app instance, no `process.env` read (the caller passes the raw value).
- **`bootstrap`** (`src/`) — owns `src/index.ts`, the composition root: reads `process.env.PORT`, resolves it through `IPortResolver`, calls `app.listen({ port, host: '0.0.0.0' })`, emits the startup log line, and owns the failure path (`app.log.error` + `process.exit(1)`).
- **`app`** (`src/app.ts`) — Fastify instance construction, plugin and route registration. Unchanged by this feature.

### Dependency map

- bootstrap -> shared-config
- bootstrap -> app
- shared-config -> (none)

All edges point inward toward shared foundations; nothing depends on `bootstrap`, and `shared-config` depends on no domain module. No cycles.

### Cross-cutting contracts

- **authContract: EMPTY.** No endpoint, no role-gated access, no identity is read or enforced.
- **errorResponseContract: EMPTY.** No API surface is added or changed.
- **transactionContract: EMPTY.** Zero writes, so there is no multi-step write to make atomic and no unit of work to own. The existing contract (service-owned `IUnitOfWork.withTransaction`; repositories accept an optional trailing `PoolClient` defaulting to the shared pool) is unaffected and must not be extended to cover startup.

### Business rules (binding)

1. The HTTP port is supplied by exactly one source: the `PORT` environment variable, resolved once at process bootstrap. No literal port number may be passed to the HTTP listener anywhere else, and no other environment variable may override or supplement `PORT`. The name is matched exactly and case-sensitively.
2. Canonical validity predicate — a PORT value is VALID iff it is a non-empty string that, after trimming leading/trailing whitespace, matches `/^[0-9]+$/` AND whose numeric value is `>= 1` and `<= 65535`. Every other value is INVALID. No call site may apply a looser or stricter test.
3. Fallback rule — when PORT is ABSENT, or PRESENT but INVALID, the resolved port is `DEFAULT_PORT` (3000) with source DEFAULT. The fallback is silent: it never throws, never aborts startup, and never emits a warning or error.
4. Single-resolution / single-source-of-truth — the port is resolved exactly once per process, and `ResolvedHttpPort.port` is the ONLY value used for both the listen call and the startup log line. Re-reading `process.env.PORT` after resolution is forbidden.
5. Resolution is a pure, total function of the environment snapshot: `resolvePort(rawPort) -> ResolvedHttpPort`. No I/O, no global state beyond the argument, no failure mode. Callable in a unit test without starting a server, binding a socket, or mutating `process.env`.
6. The resolved port is a positive integer in 1..65535 inclusive. Zero, negative, fractional and out-of-range values are INVALID and fall back to 3000. Port 0 (OS-assigned ephemeral) is deliberately NOT honoured via PORT, because the startup log line must report a concrete port; tests needing an ephemeral port bind port 0 directly on the Fastify instance (the existing `scripts/smoke.js` pattern).
7. The startup log line keeps its existing exact shape and wording — `Server is running on http://localhost:${port}` — with the resolved port interpolated. The host stays the literal `localhost` even though the listener binds `0.0.0.0`; the message is a developer convenience, not a statement of the bind address.
8. The raw PORT string is never logged, echoed in an error message, or returned in any response. Only the resolved numeric port (and at most the `PortSource` classification) may appear in logs (GP-004).
9. Port resolution is a bootstrap concern only: it writes no audit record (GP-002 does not apply), requires no authentication or role check (GP-005 does not apply), and opens no transaction. It must not be routed through the repository layer (GP-001 does not apply — there is no persisted entity).

### Recommended phases

1. **Phase 1 — `shared-config` module** (`IPortResolver` + `PortResolver` + `DEFAULT_PORT`). 3 files. The only phase introducing new symbols.
2. **Phase 2 — wire `src/index.ts`** to the resolver and keep the startup log accurate. 1 file.
3. **Phase 3 — unit tests** for the PORT resolution rule (three required cases plus the boundary cases the predicate implies). 1 file.

### Open questions

- **OQ-1 — Confirm the strict validity predicate** (trim, `/^[0-9]+$`, 1..65535). The domain slice records this as a binding rule; the data and app slices recorded it as undecided and offered lenient `parseInt`/`Number` alternatives. Reconciliation adopts strict; confirm before implementation.
- **OQ-2 — Silent fallback vs warning** when PORT is present but invalid. The domain binding rule currently mandates silence; the operability concern (a typo'd PORT becomes invisible) remains.
- **OQ-3 — Log sink** for the startup line: keep `console.log` (current) or move to `app.log.info`.
- **OQ-4 — Scope of `shared-config`**: PORT only now (adopted), or migrate `DATABASE_URL` and `JWT_SECRET` into it in this feature.

These four are new and distinct from the pre-existing open questions in this document (day-count calendar vs business days, accrual model, carry-forward cap, migration mechanism, controller layer, BullMQ). Do not merge them into that list without labelling them as this feature's.
<!-- gestalt:architecture feature=ed7419c9-c171-4d5d-9d12-62ba16e78d54 END -->

<!-- gestalt:architecture feature=dfc85052-311e-4b5d-b9d5-a4e1ec28165e START -->
## Readiness endpoint with a database connectivity check (`GET /ready`)

**Status:** reconciled across the domain, data, and application slices.
**Module:** `src/modules/uptime/` (extended — no new module, no shared health abstraction).
**Stack compliance:** TypeScript / Node 20 / npm / Jest / Fastify / PostgreSQL / modular monolith. No new dependency, no ORM, no second pool, no new framework. Compliant.

### 1. Domain entities
| Entity | Kind | Attributes | Lifecycle states |
|---|---|---|---|
| `ReadinessStatus` | value object | `status: ReadinessState` — the sole field; the wire body is exactly `{status:'ready'}` or `{status:'not-ready'}` | carries `ReadinessState` |
| `ReadinessState` | enum | `READY = 'ready'`, `NOT_READY = 'not-ready'` | `READY`, `NOT_READY` |
| `ReadinessResult` | discriminated result (internal, not a wire type) | `{ ok: true }` \| `{ ok: false; error: unknown }` — the service's return value | none (not a lifecycle entity) |
| `ReadinessProbe` | transient, per-request | `id`, `startedAt`, `completedAt`, `outcome`, `failureReason` | `PENDING`, `SUCCEEDED`, `FAILED` |

**Lifecycle states introduced by this feature (all reflected here):**

- `ReadinessState.READY` — the connectivity probe resolved. Terminal for the probe; maps to HTTP 200 `{status:'ready'}`.
- `ReadinessState.NOT_READY` — the connectivity probe rejected. Terminal for the probe; maps to HTTP 503 `{status:'not-ready'}`.
- `ReadinessProbe.PENDING` — the probe has been created and the connectivity query is in flight; `completedAt` and `outcome` are null.
- `ReadinessProbe.SUCCEEDED` — the query resolved; `outcome = READY`, `completedAt` stamped.
- `ReadinessProbe.FAILED` — the query rejected; `outcome = NOT_READY`, `completedAt` stamped, `failureReason` populated (domain-internal only).

Transitions, all named: `PENDING → SUCCEEDED` (probe resolves), `PENDING → FAILED` (probe rejects). Both are terminal; a probe is never re-entered, retried, cached, or reused. `SUCCEEDED`/`FAILED` are the only states that produce a `ReadinessStatus`.

`ReadinessResult` is not a lifecycle entity: it is the internal, per-call outcome the service hands the route, discriminated on `ok`. It is declared in `uptime.model.ts` alongside the other uptime types, re-exported from the module barrel, and never promoted to `src/shared/types/`. Its `error` field is typed `unknown` (no `any`) and is never serialized — the route passes it to `request.log.error` and replies with `ReadinessStatus`.
### 2. Business rules (binding)

1. The readiness predicate is exactly one thing: a trivial connectivity query against the configured PostgreSQL pool succeeds. Nothing else is checked — not disk, not memory, not downstream services, not migrations, not schema version. DECIDED, not open.
2. The probe is binary and total: resolves → `READY`; rejects → `NOT_READY`. No third outcome, no partial readiness, no degraded state. Any rejection (connection refused, auth failure, timeout, pool exhaustion) maps to `NOT_READY` without discrimination.
3. The probe is stateless and per-request: it opens no new pool, adds no dependency, caches no result, and holds no state between requests. It uses the existing shared pool from `src/shared/db/connection.ts`.
3a. The probe is **bounded in time**: the connectivity query carries an explicit 2000ms timeout owned by the readiness check itself, declared as the module-level named constant `READINESS_QUERY_TIMEOUT_MS` in `uptime.repository.ts`. It does not rely on the pool's `connectionTimeoutMillis` or the caller's deadline — a hung pool must not hang the probe. On timeout the rejection is identical to a rejected query and maps to `NOT_READY`.
3b. A successful **round trip** is required: acquiring a client from the pool is not sufficient, the query must return. A pool that hands out a client to an unreachable database is exactly the state readiness exists to detect.
4. The response body is fixed and carries no diagnostic detail: `READY` → HTTP 200 with exactly `{status:'ready'}`; `NOT_READY` → HTTP 503 with exactly `{status:'not-ready'}`. No other fields, no error message, no code, no stack, no raw error. The failure reason never crosses the HTTP boundary.
5. On a failed probe the error is logged through the existing Fastify request logger (`request.log.error`), exactly as the existing `/uptime` route does. No new logging mechanism. The raw error is logged, never returned in the body.
6. Readiness is a pure observation and is NOT a state-changing operation: it writes no audit record (GP-002 does not apply), mutates no entity, and opens no transaction. It must not be routed through `IUnitOfWork`.
7. The readiness endpoint is unauthenticated: it is a probe consumed by orchestrators that hold no bearer token. It is added to the `PUBLIC_PATHS` set in `src/shared/auth/index.ts` alongside `/uptime` and `/health`. GP-005 (RBAC) does not apply — there is no actor and no protected resource.
8. Liveness and readiness are distinct and must not be conflated: `/uptime` reports process uptime and never touches the database; `/ready` reports database connectivity and never reports uptime. The existing `/uptime` endpoint is not migrated, changed, or made to depend on the pool.
9. The probe's connectivity query is trivial and read-only: it must not read or write any domain table, must not depend on any table existing, and must not be a domain repository call. It is a bare pool-level round trip (`SELECT 1`).

### 3. Persistence

**No tables.** This feature persists no state. `sqlSchemas` is intentionally empty and the code agent has no migration to generate. No `readiness_checks` / probe-history / audit table is introduced — GP-002 binds state-changing operations, and a probe changes no state (an audit row per probe would also make readiness depend on a writable DB and turn a health path into a write path). No existing table is altered or redefined here; `employees`, `leave_requests`, `leave_balances`, `leave_policies`, `leave_types`, `audit_logs`, `notifications` remain defined once, in the earlier features' specs.

### 4. Repository

| Interface | Concrete | Method | Backing |
|---|---|---|---|
| `IReadinessRepository` | `PgReadinessRepository` | `check(): Promise<void>` — issues the trivial connectivity query (`SELECT 1`) against the shared pool; resolves when the round trip succeeds, rejects with the underlying pg error otherwise. No retry, no error swallowing, no logging (the route owns `request.log.error`). | PostgreSQL via the existing shared `pg` Pool exported from `src/shared/db/connection.ts` (constructor-injected `dbPool: Pool = defaultPool`), exactly as `PgLeaveRequestRepository` / `PgLeaveBalanceRepository` do. No new pool, no new dependency, no ORM. |

Declared in `src/modules/uptime/uptime.repository.interface.ts`, implemented in `src/modules/uptime/uptime.repository.ts`, both re-exported from `src/modules/uptime/index.ts`.

**Deliberate divergence (flagged, not silently taken):** `check()` takes NO optional trailing `PoolClient`, unlike every other repository in this codebase. The optional-client convention exists so a write can join a caller's transaction; a connectivity probe that joined a caller's transaction would test that transaction rather than the pool, and could report ready while the pool is exhausted. The probe must always acquire from the shared pool.

### 5. Module boundaries
- **Presentation** — `uptime.routes.ts`. `GET /ready` handler only: calls the service, reads the result's `ok` discriminator, maps it to 200/503 with a `ReadinessStatus` body, and logs the carried error via `request.log.error` on the failed check. No SQL, no business logic, no data access.
- **Application** — `UptimeService.checkReadiness()`. Owns the readiness predicate and the failure: probe resolves → `{ ok: true }`; probe rejects → `{ ok: false, error }` (the caught rejection, or the timeout `Error` when the 2000ms bound fired). It never throws and never logs — it hands the route something to log. Mapping the discriminator onto `ReadinessStatus` is the route's job.
- **Domain** — `ReadinessStatus` / `ReadinessState` / `ReadinessResult` in `uptime.model.ts`. Pure value types consumed by exactly one module, so per the placement rule they stay module-local and are NOT promoted to `src/shared/types/`.
- **Infrastructure** — `IReadinessRepository` / `PgReadinessRepository`. The only place the connectivity query is written; holds the shared pool from `src/shared/db`. Dependencies flow inward: routes → service → repository interface → shared-db.

`UptimeService` gains a **constructor-injected `IReadinessRepository` defaulting to `PgReadinessRepository`**, so the existing `new UptimeService()` call site in `uptime.routes.ts` keeps compiling and `/uptime` is untouched. This is also the seam the unit tests use.
### 6. Dependency map

- `uptime` -> `shared-db`
- `app` -> `uptime`
- `app` -> `shared-auth`
- `shared-auth` -> `shared-errors`

### 7. Cross-cutting contracts

**Auth / identity.** `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`, populated by the existing `registerAuth` preHandler in `src/shared/auth/index.ts` (JWT bearer verified via `jwt.verify`, `payload.sub` → id, `payload.role` → role). RBAC is enforced by route-level guards, never inline. **This feature's endpoint is the documented exception:** `GET /ready` is an unauthenticated infrastructure probe, so it is added to the `PUBLIC_PATHS` set alongside the existing `/uptime`, `/health`, and `/auth/login`, and carries no `resolveActor` call and no role guard. GP-005 is therefore not applied to `/ready` — the same exemption the existing `/uptime` liveness endpoint already relies on. No new role, no new token claim, no change to the identity shape.

**Error / response.** `GET /ready` uses a **fixed body with no error envelope**. Success: HTTP 200 `{ status: 'ready' }`. Not ready: HTTP 503 `{ status: 'not-ready' }` — 503 is the readiness signal, not an error response, and it carries no error detail, no message, and no code field. The raw probe error is never placed in the body; it is logged via `request.log.error(error)` exactly as `/uptime` does. An unexpected throw outside the probe path falls through to the app-level handler as HTTP 500 `{ error: 'Internal Server Error' }`, matching the existing `/uptime` behaviour. The standard `{ error, code }` envelope and the 400/401/403/404 cases do not apply: the endpoint takes no input (no validation failure), is unauthenticated (no 401/403), and addresses no resource (no 404).

**Transaction / unit of work.** None. Readiness is a single trivial read-only query with no writes, so no transaction is opened and `IUnitOfWork` is not involved. The repository's `check()` deliberately takes no optional `PoolClient` so the probe can never join a caller's transaction.

### 8. Recommended phases
1. **Phase 1 — Readiness probe + `UptimeService.checkReadiness`** (6 files). Adds `ReadinessStatus`/`ReadinessState` to `uptime.model.ts`; adds `checkReadiness()` to `IUptimeService`; adds `IReadinessRepository` (`check(): Promise<void>`) and `PgReadinessRepository`; `UptimeService` gains the constructor-injected repository defaulting to `PgReadinessRepository`; `index.ts` re-exports the new symbols. No HTTP surface, so it is unit-testable in isolation. DELIVERED — see section 11.
2. **Phase 2 — `GET /ready` route + public-path exemption** (planned as 2 files; delivered as 6). `uptime.routes.ts` gains the handler (200/503, `request.log.error` on failure, no error detail, `/uptime` byte-identical) and `src/shared/auth/index.ts` adds `'/ready'` to `PUBLIC_PATHS`. These must land together or the endpoint 401s. Depends on Phase 1 only. DELIVERED — the extra four files are the ones the new `ReadinessResult` type and the service-signature change force; see section 11.
3. **Phase 3 — `UptimeService.checkReadiness` unit tests** (1 file). `tests/unit/modules/uptime/uptime.service.test.ts`, in-memory fake implementing `IReadinessRepository`, no `jest.mock` of the pg driver. Two cases: probe resolves → `{ ok: true }`; probe rejects → `{ ok: false, error }` carrying the rejection, and does not throw. A third assertion pins that the probe was called exactly once. Depends on Phase 1; independent of Phase 2. DELIVERED — 9 cases, all against the post-Phase-2 service contract (`ReadinessResult`), not the original `ReadinessStatus` return; see section 11.
### 9. Reconciliation decisions

- **Canonical data-access name:** `IReadinessRepository` / `PgReadinessRepository` with `check(): Promise<void>` (the data slice's naming) supersedes the application slice's `IDatabaseProbe` / `PgDatabaseProbe` with `ping()`. Rationale: it keeps the connectivity query behind a repository interface per GP-001 and inside the established `uptime.repository.interface.ts` / `uptime.repository.ts` convention, which resolves the application slice's own GP-001 open question rather than carrying it forward. The deliberate divergence (no optional trailing `PoolClient`) is retained.
- **Canonical service method:** `checkReadiness()` on `IUptimeService` / `UptimeService` (application slice). No competing name existed.
- **`src/modules/status/`** is NOT used, extended, or reconciled. It is a second, unused health-shaped concept (`SystemStatus`, `StatusService.getStatus()`), unregistered in `src/app.ts`. Flagged as a dead-code decision, not a boundary to reconcile.
- **`docs/DOMAIN.md`** is stale relative to this document (it still records `LeaveRequest.leaveTypeId`, `approvedBy`/`approvedAt`, and `EmploymentStatus.INACTIVE`). The readiness entities above should be added under a `system`/`uptime` section rather than appended to the stale `system` block.

### 10. Open questions
1. **Probe time bound** — RESOLVED (Phase 1): the bound is the module-level named constant `READINESS_QUERY_TIMEOUT_MS` (2000ms) owned by `PgReadinessRepository.check()`, raced against the query so a hung pool rejects indistinguishably from a failed query.
2. **Round trip vs client acquisition** — RESOLVED (Phase 1): a successful round trip is required; acquiring a client from the pool is not sufficient.
3. **Caching / memoization** — the binding rule says no caching; a future TTL would introduce a staleness bound and a third probe concern. Still open as a future concern only — the delivered path caches nothing, and Phase 3 pins this with a test asserting a fresh `check()` on every call (two calls → probe called twice).
4. **`/ready` auth exemption** — RESOLVED (Phase 2): `'/ready'` is an exact string entry in the module-private `PUBLIC_PATHS` set in `src/shared/auth/index.ts`; the set is not exported or widened, and default-deny is unchanged for every other path. The consequence stands: database availability is publicly observable.
5. **`src/modules/status/` dead code** — remove, leave, or reconcile (reconciling would create the shared health abstraction the feature forbids). RESOLVED: left untouched, out of scope for this feature; unreconciled by decision, not by omission.
6. **Readiness-path request-log volume** — the app runs Fastify's request logging globally, so a probe polled on a short interval emits a log line per poll. No per-route logging configuration or sampling was added; the existing global behaviour is accepted. Open as an operational concern.
### 11. Delivery record
**Phase 1 — Readiness probe + `UptimeService.checkReadiness` (DELIVERED).** Six files, all under `src/modules/uptime/`; no new module, no shared health abstraction, `src/modules/status/` untouched. No test file added or modified; `uptime.routes.ts` and `src/shared/auth/index.ts` untouched.

- `uptime.model.ts` — `ReadinessState` (`READY='ready'`, `NOT_READY='not-ready'`, exactly two members), `ReadinessStatus` (`{ status }`), `ReadinessProbe` (`id`, `startedAt`, `completedAt`, `outcome`, `failureReason`) added alongside the unchanged `UptimeStatus`.
- `uptime.repository.interface.ts` — NEW. `IReadinessRepository` with the single method `check(): Promise<void>`; no optional trailing `PoolClient`.
- `uptime.repository.ts` — NEW. `PgReadinessRepository implements IReadinessRepository`, constructor-injected `dbPool: Pool = defaultPool` consumed through the shared `src/shared/db` entry point (`import { pool as defaultPool } from '../../shared/db'`). The only place `SELECT 1` is written. The 2000ms bound is the module-level named constant `READINESS_QUERY_TIMEOUT_MS`; the query is raced against that timer so the bound is owned by the check rather than inherited from the pool. A successful round trip is required; on timeout the rejection is identical to a rejected query. No caching, no memoization.
- `uptime.service.interface.ts` — `checkReadiness(): Promise<ReadinessStatus>` added to `IUptimeService`; `getUptime()` unchanged. (Return type superseded by Phase 2 below.)
- `uptime.service.ts` — `checkReadiness()` awaits `probe.check()`, maps resolution to `{ status: 'ready' }` and any rejection to `{ status: 'not-ready' }`; it never throws and never puts the raw error in the returned value. Constructor takes the injected `IReadinessRepository` defaulting to `new PgReadinessRepository()`, so the service never imports the pool. `getUptime()` unchanged. (Mapping superseded by Phase 2 below.)
- `index.ts` — re-exports the model additions, `IReadinessRepository`, `PgReadinessRepository`, and the pre-existing `UptimeStatus` / `IUptimeService` / `UptimeService` / `uptimeRoutes`.

**Divergences and resolutions recorded against the plan (code as built):**

- **Timeout enforcement mechanism** — the plan left the mechanism open (driver `query_timeout` vs a race in the repository). The implementation chose a `Promise.race` against a `setTimeout` in `PgReadinessRepository.check()`, with the timer cleared in a `finally`. The observable requirement (a hung query rejects indistinguishably from a failed query, constant module-level and named) is met.
- **`ReadinessProbe` is declared but never materialised** — `checkReadiness()` maps probe resolution/rejection straight to the result type; no `ReadinessProbe` object is constructed, and `failureReason` is therefore never populated. The type exists with the exact prescribed shape and never reaches the HTTP body. Its `PENDING`/`SUCCEEDED`/`FAILED` states remain derived from `completedAt`/`outcome` nullness, not from extra `ReadinessState` members.
- **`check()` takes no optional trailing `PoolClient`** — a deliberate, flagged divergence from every other repository in the codebase, documented in the repository interface's own doc comment and in section 4 above.

`GET /ready`, the `PUBLIC_PATHS` exemption, and the unit tests are Phases 2 and 3 and are not part of this delivery.

**Phase 2 — `GET /ready` route + public-path exemption (DELIVERED).** Six files touched: the two presentation/boundary files named in the plan (`uptime.routes.ts`, `src/shared/auth/index.ts`) plus the four the new result type and the service-signature change force (`uptime.model.ts`, `uptime.service.interface.ts`, `uptime.service.ts`, `index.ts`). `src/modules/status/` untouched and unreconciled (decision 5 above); `src/app.ts` unchanged — no new registration call, no prefix change.

- `uptime.model.ts` — `ReadinessResult = { ok: true } | { ok: false; error: unknown }` added alongside the existing model types. Module-local (per the placement rule), never promoted to `src/shared/types/`, never thrown, never logged by the service, and never serialized — the route reads only the `ok` discriminator and hands `error` to the request logger.
- `uptime.service.interface.ts` / `uptime.service.ts` — the one Phase 1 signature change this phase requires: `checkReadiness()` now returns `Promise<ReadinessResult>` instead of `Promise<ReadinessStatus>`. The service maps probe resolution to `{ ok: true }` and any rejection (including the 2000ms timeout rejection) to `{ ok: false, error }`; it still never throws, never logs, never caches, and still consumes the probe only through the injected `IReadinessRepository` (never the pool). `getUptime()` unchanged.
- `uptime.routes.ts` — `GET /ready` added to the existing `uptimeRoutes(fastify)` function, mirroring the liveness handler's shape (service constructed inside the `try`, caught error passed to `request.log.error`, `500 { error: 'Internal Server Error' }` fallback). `result.ok` → 200 `{ status: 'ready' }`; `!result.ok` → `request.log.error(result.error)` then 503 `{ status: 'not-ready' }`. The body is typed as the existing `ReadinessStatus`/`ReadinessState` (now imported into the route file); no error detail and no raw error ever reaches the body. The `/uptime` handler is byte-for-byte unchanged and `uptimeRoutes` keeps its signature.
- `index.ts` — `ReadinessResult` added to the model re-export; every pre-existing uptime symbol still re-exported under its own name.
- `src/shared/auth/index.ts` — `'/ready'` added as an exact string entry to the module-private `PUBLIC_PATHS` set. Matched the way the preHandler already matches (request URL with the query string stripped); the set is not exported, not widened to prefix/glob matching, no second exemption mechanism, and the default-deny branch is unchanged.

**Divergence from the plan's prescribed shape (resolved by clarification; code as built).** The plan had the service return the wire-body type and the route derive the body from it. The delivered service instead returns the internal discriminated `ReadinessResult`, so the service keeps ownership of the failure and the route keeps ownership of the logging: on `{ ok: false }` the route calls `request.log.error(result.error)` and replies 503 with the unchanged `{status:'not-ready'}` body. No new module, no change to `IReadinessRepository`, and no data access from the route. The HTTP contract is exactly as specified — the error is logged, never serialised.

**Verification.** `npm run build` (`tsc --noEmit`) clean; `npm test` 208/208 passing. Runtime check against a real Fastify instance with `registerAuth` + `uptimeRoutes` mounted: `GET /ready` with no bearer token → 503 `{"status":"not-ready"}` (probe unreachable) and 200 `{"status":"ready"}` (probe resolves) — never 401; `GET /uptime` → 200 `{"uptimeSeconds":0}`; a non-exempt path (`GET /leave`) still → 401 `{"error":"Missing bearer token"}`, confirming default-deny is intact.

**Phase 3 — `UptimeService.checkReadiness` unit tests (DELIVERED).** One file, `tests/unit/modules/uptime/uptime.service.test.ts` (136 lines, NEW). No production file touched — the module is treated as a fixed contract. The suite imports `IReadinessRepository`, `ReadinessResult`, `ReadinessState`, `ReadinessStatus`, and `UptimeService` from the module barrel (`../../../../src/modules/uptime`), so it exercises the public surface rather than internal paths.

- **Fake, not a mock of the driver.** `class FakeReadinessRepository implements IReadinessRepository { check = jest.fn<Promise<void>, []>(); }` — an in-memory fake whose `check` is a bare `jest.fn`. No `jest.mock` of `pg`, no pool, no database: whether `check()` resolves or rejects IS the database being reachable or not. The service is constructed as `new UptimeService(repository)` in `beforeEach`, using the Phase 1 constructor seam.
- **`getUptime()` (2 cases).** `jest.spyOn(process, 'uptime').mockReturnValue(123.7)` → `{ uptimeSeconds: 123 }`, pinning whole-second truncation via `Math.floor` and asserting `Object.keys(status)` is exactly `['uptimeSeconds']` (no extra field). A second case asserts the value is a non-negative integer without stubbing, so it holds for any real process uptime.
- **`checkReadiness()` (7 cases).** Resolve → `{ ok: true }` with `Object.keys(result)` exactly `['ok']` and `check` called once; reject → `{ ok: false, error: failure }` carrying the *same* rejection object, with `Object.keys(result).sort()` exactly `['error','ok']`, and no throw; a fresh check on every call (two calls → `check` called twice, no caching/memoization); a database that goes away between calls (`mockResolvedValueOnce` then `mockRejectedValueOnce` → ready then not-ready); and a bounded-timeout rejection (`new Error('Readiness query timed out after 2000ms')`) treated as not ready.
- **Wire-body pinning without touching production code.** A local `toReadinessBody(result: ReadinessResult): ReadinessStatus` helper mirrors the route's mapping (`result.ok ? READY : NOT_READY`) and is asserted to produce exactly `{ status: 'not-ready' }` / `{ status: 'ready' }` with `Object.keys(body)` exactly `['status']`. This pins the "no error detail on the wire" rule (section 2, rule 4) from the test side, since the route owns that mapping. The same cases assert `ReadinessState.READY === 'ready'` and `ReadinessState.NOT_READY === 'not-ready'`, pinning the enum's string values as the wire contract.

**Divergence from the plan's prescribed shape (code as built).** The plan specified three cases; the delivered suite has nine. The additions are all assertions of already-binding rules rather than new behaviour: whole-second truncation and the single-field `UptimeStatus` shape, the single-field `ReadinessStatus` body, the absence of caching, the transition from ready to not-ready across calls, and the timeout rejection mapping to `NOT_READY`. The plan's three required cases (resolve → `{ ok: true }`; reject → `{ ok: false, error }` carrying the rejection and not throwing; `check` called exactly once) are all present. The plan's "no `jest.mock` of the pg driver" constraint is honoured — the fake is hand-written and the driver is never imported.

**Verification.** `npm test` — the new suite passes; the full API suite is green. No production file changed, so `npm run build` (`tsc --noEmit`) is unaffected by this phase.

**All three phases of this feature are now delivered.** No phase of the readiness feature remains outstanding.

<!-- gestalt:architecture feature=594d4d13-f841-45ca-9302-ff8e3c249e07 START -->
## Audit trail for a single leave request
**Endpoint:** `GET /leaves/:id/history` — returns one leave request's audit entries, oldest first.
**Scope:** read-only. No new table, no new column, no new index, no migration. The feature opens an existing access path on an existing table.

### Stack compliance
All three slices comply with the declared stack: TypeScript on Node 20, npm, Jest, Fastify routes, PostgreSQL via the shared `pg` Pool, modular-monolith layout under `src/modules/*` + `src/shared/*`. No ORM, no second pool, no framework outside the declared stack. No frontend module is touched by this feature.

### Domain entities

**AuditLog** (existing, unchanged shape) — `id`, `actorId`, `action` (AuditAction: CREATE | UPDATE | DELETE | APPROVE | REJECT | CANCEL), `entityType`, `entityId`, `beforeState`, `afterState`, `occurredAt`.
Lifecycle: **RECORDED** — terminal and immutable; reached exactly once at insert, inside the unit of work of the operation it describes. An entry is never updated, deleted, or re-recorded.

**AuditTrail** (new read model / projection — no id, no table, no persistence) — `entityType`, `entityId`, `entries: AuditLog[]`, `entryCount`.
Lifecycle: **EMPTY** — the entity exists and is visible to the caller but no AuditLog row matches `(entityType, entityId)`; a normal, successful outcome (200 with `[]`), never 404, never an error. **POPULATED** — one or more matching entries, ordered oldest first. There is no partial or error state: a failed read throws rather than producing a trail.

**LeaveRequest** (existing, unchanged) — `id`, `employeeId`, `leaveTypeCode`, `startDate`, `endDate`, `requestedDays`, `reason`, `status`, `approverId`, `approvalComment`, `submittedAt`, `decidedAt`, `cancelledBy`, `cancelledAt`, `reversesRequestId`.
Lifecycle: **DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED**. No state is added, removed, or changed by this feature. A GP-008 reversal row is born CANCELLED, is terminal and inert, and has no audit trail of its own.

### Conceptual table specifications

**`audit_logs`** — the only table this feature reads.
Fields: `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, `occurred_at`. PK `id`. FK `actor_id -> employees.id`.
Indexes: `id` (PK; serves the existing `findById` lookup by audit id — the only read path today, and the reason the trail is unreachable). `(entity_type, entity_id)` — the composite index that makes the new `findByEntity` query a bounded index scan instead of a full table scan; this is the access path the feature exists to open, and it is also what the GP-008 reversal relies on (the CANCEL entry for a cancelled-after-approval request is written against the ORIGINAL request id). `actor_id` — actor-history queries; not used by this feature. `(entity_type, entity_id, occurred_at)` is NOT present today; extending the index is an open question (see below). `before_state`/`after_state` are TEXT holding JSON strings (deliberate: the repository stringifies on write and parses on read, so a real json/jsonb column would break `mapRow`); the new query MUST reuse the existing `mapRow`/`parseState` helpers so history entries are structurally identical to what `findById` already returns.

**`leave_requests`** — UNCHANGED and referenced by name only; defined once in the earlier leave/cancellation/GP-008 specs. This feature adds no column and no index.
Fields: `id`, `employee_id`, `leave_type_code`, `start_date`, `end_date`, `requested_days`, `reason`, `status`, `approver_id`, `approval_comment`, `submitted_at`, `decided_at`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. PK `id`. FKs: `employee_id -> employees.id`, `leave_type_code -> leave_types.code`, `approver_id -> employees.id`, `cancelled_by -> employees.id`, `reverses_request_id -> leave_requests.id`.
Indexes: `id` (PK; the lookup the history endpoint performs FIRST, via the existing `LeaveService.getById(actor, requestId)`, before any audit row is read — visibility is established here, not in the audit module). `employee_id` — the column the leave module's visibility rule reads; the audit module never reads it. `(employee_id, status)` — role-scoped list queries; not used by the history endpoint. `reverses_request_id` (UNIQUE, nullable) — the GP-008 linkage; a cancelled-after-approval request is TWO rows and the CANCEL audit entry is keyed to the ORIGINAL id, so the endpoint returns the trail of the row whose id was requested and does not merge the two.

### Repository interfaces and concrete implementations

**`IAuditRepository` -> `PgAuditLogRepository`** (PostgreSQL via the shared `pg` Pool from `src/shared/db/connection.ts`, constructor-injected `dbPool: Pool = defaultPool`). Declared in `src/modules/audit/audit.repository.interface.ts`, implemented in `src/modules/audit/audit.repository.ts`, both re-exported from `src/modules/audit/index.ts`.
- `create(input, client?)` — EXISTING, unchanged. Generates `id` via `randomUUID()`, stamps `occurredAt`, JSON-stringifies `beforeState`/`afterState`.
- `findById(id, client?)` — EXISTING, unchanged. Returns `null` when absent.
- `findByEntity(entityType, entityId)` — **NEW, DELIVERED (Phase 1)**. Takes NO optional trailing `PoolClient`: this read path opens no transaction and joins none, so it queries through the existing private `db(client?)` accessor with no client argument. `SELECT` the existing COLUMNS list `FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY occurred_at ASC, id ASC`. Returns an array, possibly empty — never `null`, never throws on no rows. Ordering is owned by the repository's SQL, not by the caller; no caller may re-sort. Reuses `mapRow`/`parseState`. No LIMIT/OFFSET, no date or action filter.

**`IAuditService` -> `AuditService`** (backed by `IAuditRepository`/`PgAuditLogRepository`; constructed as `new AuditService(new PgAuditLogRepository())`). Declared in `src/modules/audit/audit.service.interface.ts`, implemented in `src/modules/audit/audit.service.ts`, both re-exported from `src/modules/audit/index.ts`.
- `record(input, client?)` — EXISTING, unchanged. Validates non-empty `actorId`/`entityType`/`entityId` and AuditAction membership (ValidationError), then delegates with the optional client forwarded so the insert joins the caller's transaction.
- `getById(id)` — EXISTING, unchanged. `NotFoundError` (404) on unknown id.
- `getByEntity(entityType, entityId)` — **NEW, DELIVERED (Phase 1)**. Validates that `entityType` and `entityId` are non-empty strings (ValidationError) and delegates to `repository.findByEntity`. Returns the array unchanged, including an EMPTY array — an entity with no audit rows is a valid 200-with-`[]` outcome, never a `NotFoundError`. Takes NO optional `PoolClient`: this is a read path, it opens no transaction and joins none. It performs NO authorization and NO role check — `EmployeeRole` is an owned decision of the leave and web-leave modules, and the audit module must not branch on it.

**`ILeaveRepository` -> `PgLeaveRequestRepository`** (PostgreSQL via the shared `pg` Pool; declared inline in `src/modules/leave/leave.repository.ts`, re-exported from `src/modules/leave/index.ts`). UNCHANGED — no method added, no column added. Listed only to make the transitive read dependency explicit: `LeaveService.getHistory` calls the EXISTING `LeaveService.getById(actor, requestId)`, which calls `findById` and then applies the leave module's visibility rule. The audit module never calls this repository, and the history endpoint never queries `leave_requests` directly.

**`ILeaveService` -> `LeaveService`** (`src/modules/leave/leave.service.ts`). Gains ONE method (NOT yet built — Phase 2):
- `getHistory(actor, requestId)` — **NEW**. Calls the EXISTING `this.getById(actor, requestId)` FIRST and lets it throw (so an invisible request yields the SAME 404 as a nonexistent one, never a 403), then calls `this.auditService.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, requestId)` and returns the entries oldest-first. Read-only: no `uow.withTransaction`, no client forwarding, no writes. It does NOT re-derive visibility and does NOT branch on `EmployeeRole`.

### Module boundaries

- **Presentation** — `src/modules/leave/leave.routes.ts`. `GET /leaves/:id/history` handler only: `resolveActor`, `request.params.id`, call the service, `reply.status(200).send(entries)`, `try/catch -> request.log.error -> sendError`. No controller file. No SQL, no business logic, no role branch.
- **Application** — `LeaveService.getHistory(actor, requestId)` (orchestration + visibility) and `AuditService.getByEntity(entityType, entityId)` (entity-scoped read). Both declared on their interfaces before implementation.
- **Domain** — `AuditLog` (audit, lifecycle RECORDED), `AuditTrail` (audit, EMPTY | POPULATED), `LeaveRequest` (leave). No new domain type is introduced.
- **Infrastructure** — `PgAuditLogRepository.findByEntity` (the only place the entity query is written), `PgLeaveRequestRepository` (unchanged), `src/shared/db` pool.

Dependencies flow inward: routes -> service interfaces -> repository interfaces -> shared-db. No new edge is added by this feature; every edge in the dependency map already exists.

### Ownership (the load-bearing constraint)

The visibility rule (ADMIN sees all; MANAGER sees own plus direct reports, one level only; anyone else only own) is owned by `leave` and expressed in exactly one place: the existing `LeaveService.getById`. `getHistory` calls it first and lets it throw. The audit module gains a purely mechanical `entityType + entityId` query and **never** branches on `EmployeeRole` — HARNESS.json declares `EmployeeRole` an owned decision whose owners are `leave` and `web-leave`. The route adds no role guard either: authorization is the service's `getById` call, and the 404 it already produces is the response for both invisible and nonexistent ids (no 403, no existence leak).

### Dependency map

- leave -> audit, employee, balance, notification, validation, policy, shared-types, shared-errors, shared-db, shared-auth
- audit -> shared-types, shared-errors, shared-db
- employee -> shared-types, shared-errors, shared-db
- balance -> shared-types, shared-errors, shared-db
- notification -> shared-types, shared-errors, shared-db
- validation -> shared-types, shared-errors
- policy -> shared-types, shared-errors
- shared-auth -> shared-types, shared-errors
- shared-types ->
- shared-errors ->
- shared-db ->

### Cross-cutting contracts

**Auth.** `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity and role come from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`; only `/auth/login` is in `PUBLIC_PATHS`, so `GET /leaves/:id/history` requires a valid token. The route-level `resolveActor` helper (reused unchanged from `leave.routes.ts`) extracts `request.user` and enforces id presence plus `EmployeeRole` membership at the API boundary, throwing `UnauthorizedError` on a missing/invalid actor. RBAC is NOT enforced inline in the route and no role guard is added: the endpoint's authorization is the service's existing `LeaveService.getById(actor, requestId)` call, which owns the visibility rule and throws `NotFoundError` for a request the caller may not see. No new role, no new claim, no change to the identity shape.

**Error response.** Errors return `{ error: string; code: string }` via the existing `sendError` helper (`AppError` -> its `statusCode` + `code`; any other throw -> 500 `{ error: 'Internal Server Error' }`). For `GET /leaves/:id/history`: validation failure -> 400 (`ValidationError`, code `VALIDATION`) for a malformed `entityType`/`entityId` reaching the audit service; authentication failure -> 401 (`UnauthorizedError`, code `UNAUTHORIZED`) for a missing or invalid actor; authorization failure -> 403 (`ForbiddenError`, code `FORBIDDEN`) is NOT produced by this endpoint — a caller who may not see the request receives the SAME 404 as a nonexistent id, so existence is never leaked; not found -> 404 (`NotFoundError`, code `NOT_FOUND`) for both an invisible and a nonexistent request, byte-identical. Success: 200 with an array of `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }` ordered oldest first; an existing, visible request with no audit rows returns 200 with `[]` (never 404). No 409 is produced (read-only).

**Transaction.** EMPTY — this feature is read-only. It writes no audit record, opens no transaction, and forwards no `PoolClient`. The existing `IUnitOfWork` contract is untouched; GP-002 is not engaged by a read.

### Binding rules

1. A trail is identified by the PAIR `(entityType, entityId)`, never by `entityId` alone. `entityType` is the exact, case-sensitive literal `'leave_request'` for a leave request.
2. A trail is ordered by `occurredAt` ASCENDING (oldest first) — the canonical order for every trail read, everywhere. No consumer may reverse it for display. Ties are broken on `id` ASCENDING so repeated reads are deterministic.
3. Who may see a leave request's history is EXACTLY who may see the leave request itself, established by calling the existing `getById(actor, requestId)` first and letting it throw. It must not be re-expressed anywhere, and the audit module must stay role-blind.
4. A caller who may not see the request receives the SAME 404 (`NotFoundError`, code `NOT_FOUND`, byte-identical body) as a caller asking for a request that does not exist. Never 403, never 401, never an empty trail.
5. An empty trail is a SUCCESS, not an error: 200 with an empty array, never 404.
6. A GP-008 reversal row has NO audit entries of its own — its CANCEL entry carries the ORIGINAL request id — so `GET /leaves/:reversalId/history` legitimately returns an empty trail. Provenance is reached via `reversesRequestId`, not inferred from the trail.
7. The trail is append-only and read-only. Reading a trail writes nothing; no entry is ever updated or deleted.
8. Every state-changing leave operation writes exactly one AuditLog entry against the row it changed, except the GP-008 reversal (which targets the original).
9. A trail read returns ALL matching entries — no limit, offset, date filter, or action filter.
10. Each entry is projected as exactly `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }` — the entity, not a summary. No field added, renamed, or dropped.

### Phase 1 delivered (audit entity query: `findByEntity` / `getByEntity`)
Four source files under `src/modules/audit/`, plus the two existing test fakes. No migration, no DDL, no index change, no new file under `src/shared/`, no change to any other module, no route.

- `src/modules/audit/audit.repository.interface.ts` — `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>` added in place; `create`/`findById` left byte-identical.
- `src/modules/audit/audit.repository.ts` — `PgAuditLogRepository.findByEntity` issues exactly one entity-scoped SELECT, reusing the existing `COLUMNS` constant and the existing `mapRow`/`parseState` helpers (so `beforeState`/`afterState` come back parsed — null column -> `null`, JSON column -> parsed value — and `occurredAt` is a `Date`):
  `SELECT ${COLUMNS} FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY occurred_at ASC, id ASC`
  It queries through the existing private `db(client?)` accessor with no client argument (the injected-pool test seam is unchanged) and returns `result.rows.map(mapRow)` — an empty array for zero matching rows, never `null`, never a throw. No LIMIT/OFFSET, no pagination, no date or action filter.
- `src/modules/audit/audit.service.interface.ts` — `getByEntity(entityType: string, entityId: string): Promise<AuditLog[]>` added in place; `record`/`getById` unchanged.
- `src/modules/audit/audit.service.ts` — `AuditService.getByEntity` calls a new private `validateEntityRef(entityType, entityId)` (the same `requiredStrings` loop idiom as the existing `validate()`: non-string or whitespace-only -> `ValidationError('Invalid entityType')` / `ValidationError('Invalid entityId')`, with the repository NOT reached), then returns `this.repository.findByEntity(entityType, entityId)` verbatim. An empty array is returned as a successful result and is never converted into `NotFoundError`. No `PoolClient` parameter, no transaction, no `EmployeeRole` import, no role branch, no literal `'leave_request'` anywhere in the module.
- `src/modules/audit/index.ts` — unchanged; the same six symbols (`AuditLog`, `CreateAuditLogInput`, `IAuditRepository`, `PgAuditLogRepository`, `IAuditService`, `AuditService`) are still exported.
- **Test fakes (divergence from the plan's "no tests in this phase"):** `tests/unit/modules/audit.service.test.ts` (`FakeAuditRepository.findByEntity`, filtering the in-memory rows on `entityType`/`entityId`) and `tests/unit/modules/leave/leave.service.test.ts` (`FakeAuditService.getByEntity`, filtering its recorded entries) each gained the new interface member so the fakes still satisfy `IAuditRepository`/`IAuditService` and both suites typecheck. No new test cases, no new assertions, and no test of ordering, tie-break, empty result, or validation were added — Phase 4 still owns those.
- **Signature divergence, resolved in favour of the code:** the reconciled architecture originally specified `findByEntity(entityType, entityId, client?)` with an optional trailing `PoolClient` for symmetry with `create`/`findById`. The implementation takes NO client parameter — the read path opens no transaction and joins none — and the repository-interfaces subsection above has been corrected to the built signature.
- Not built in this phase (Phase 2 has since delivered the first two — see below): `LeaveService.getHistory`, the `LEAVE_REQUEST_ENTITY_TYPE` constant, the `GET /leaves/:id/history` route, and the entity-query tests.

### Phase 2 delivered (`LeaveService.getHistory` + `LEAVE_REQUEST_ENTITY_TYPE`)
Two source files, both under `src/modules/leave/`. No route, no test file, no migration, no DDL, no change to `src/modules/audit/` or `src/shared/`.

- `src/modules/leave/leave.model.ts` — declares and exports the module-local constant `LEAVE_REQUEST_ENTITY_TYPE = 'leave_request'` (exact name, exact case-sensitive value), alongside `LeaveRequest`/`CreateLeaveRequestInput`. It is NOT promoted to `src/shared/types/`, NOT re-declared in `leave.service.ts`, and NOT re-exported from `src/modules/leave/index.ts` — the module's public surface is unchanged (`LeaveRequest`, `CreateLeaveRequestInput`, `ILeaveRepository`, `PgLeaveRequestRepository`, `ILeaveService`, `LeaveService`, `LeaveActor`, `createLeaveService`, `leaveRoutes`). The audit module never imports or references it; it stays keyed generically on `(entityType, entityId)`.
- `src/modules/leave/leave.service.ts` — every audit `entityType` argument on the write path now passes `LEAVE_REQUEST_ENTITY_TYPE`: `create`, `submit`, `approve`, `reject`, and BOTH `cancel` branches (the DRAFT cancel and the GP-008 reversal, whose entry stays keyed to the ORIGINAL request id). No bare `'leave_request'` literal remains as an audit `entityType` in the file. The notification `type`/`relatedEntityType` literals (`'leave_request'` in approve/reject/cancel) were deliberately left untouched — they are a different concern from the audit discriminator.
- `ILeaveService` gained `getHistory(actor: LeaveActor, requestId: string): Promise<AuditLog[]>`; `AuditLog` is imported from the audit module's public entry point (`../audit`). No leave-owned projection or history-entry type is declared.
- `LeaveService.getHistory` is exactly two statements: `await this.getById(actor, requestId)` FIRST (the single owner of the visibility rule, allowed to throw its `NotFoundError` unchanged — no catch, no wrap, no translation, no `EmployeeRole` branch, no `ForbiddenError`), then `return this.auditService.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, requestId)` — the array returned verbatim, same order, no re-sort, no mapping, no filter, no cap. Read-only: no `uow.withTransaction`, no `PoolClient` accepted or forwarded, no write of any kind, no new constructor dependency. A visible request with zero matching audit rows resolves to `[]`, never a `NotFoundError`.
- **Divergence from the reconciled read model, resolved in favour of the code:** the feature's `AuditTrail` (`entityType`, `entityId`, `entries`, `entryCount`) is a CONCEPTUAL read model only — no `AuditTrail` type is declared anywhere. `getHistory` returns the audit-owned `AuditLog[]` directly, which is what binding rule 10 and the interface constraint require; the `entries`/`entryCount` wrapper was not built.
- **Open questions closed by this phase:** #6 (`entity_type` literal ownership) — the leave module owns `LEAVE_REQUEST_ENTITY_TYPE`, defined once in `leave.model.ts` and referenced by both the write path and the history read, so writer and reader cannot disagree; #7 (`getHistory` return type) — the audit-owned `AuditLog` entity as-is, not a leave-owned projection. #2 (GP-008 reversal trail), #3 (`beforeState`/`afterState` exposure), #4 (index extension), #5 (`occurred_at` clock authority) and #8 (unbounded response size) remain open.
- **Superseded markers elsewhere in this feature's section:** the `ILeaveService` bullet under "Repository interfaces and concrete implementations" still reads "Gains ONE method (NOT yet built — Phase 2)", and the "Recommended phases" list still shows Phase 2 as pending. Both are superseded by this subsection. Phase 3 (`GET /leaves/:id/history`) and Phase 4 (tests) remain unbuilt.
- Not built in this phase: the `GET /leaves/:id/history` route, and every test of the trail read path (entity-query ordering/tie-break, endpoint visibility, byte-identical 404, empty history, response-field assertions). No test file under `tests/` was modified: the existing leave service/routes doubles cast through `as unknown as ILeaveService`, so the new interface member does not break their typecheck.

### Phase 3 delivered (`GET /leaves/:id/history` route)
One source file: `src/modules/leave/leave.routes.ts`. No service change, no repository change, no audit-module change, no test file, no migration, no DDL, no new file, no new helper, no controller file, no change to `src/modules/leave/index.ts`.

- The handler is registered inside the existing `leaveRoutes(fastify)` function, immediately after the existing `GET /leaves/:id` handler and before `POST /leaves/:id/submit`, and mirrors `GET /leaves/:id` in shape: `resolveActor(request)` → `const { id } = request.params as { id: string }` → `await leaveService.getHistory(actor, id)` → `reply.status(200).send(history)`; on throw `request.log.error(error)` then `return sendError(reply, error)`. Both existing helpers are reused unchanged — no new helper was introduced and nothing is imported from another module's routes file.
- No role guard, no `EmployeeRole` branch, no SQL, no business logic, and no visibility re-derivation in the route: authorization is entirely the service's `getById` call inside `getHistory`, and the `NotFoundError` it throws is what `sendError` maps to the 404. The route adds no `ForbiddenError` path, so an invisible id and a nonexistent id produce the same 404 body.
- The service instance is resolved through the existing `fastify.leaveService` decoration seam (`?? createLeaveService()`), unchanged — the route is exercisable with an in-memory `ILeaveService` fake without touching module wiring.
- The response body is the array returned by `getHistory` verbatim — the audit-owned `AuditLog[]` (`{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }`), oldest first, with no wrapper, no re-sort, no mapping, no filter, no cap. An existing, visible request with no audit rows returns 200 with `[]`.
- With this route the feature's stated purpose is met end-to-end: the `(entity_type, entity_id)` access path opened in Phase 1 is now reachable over HTTP, and the endpoint is registered on the same Fastify instance as the rest of the leave routes (so it inherits the existing `registerAuth` preHandler and is not in `PUBLIC_PATHS`).
- **Superseded markers elsewhere in this feature's section:** the "Module boundaries" presentation bullet and the "Repository interfaces and concrete implementations" `ILeaveService` bullet ("Gains ONE method (NOT yet built — Phase 2)") are now fully delivered, and the "Recommended phases" list still shows Phase 3 as pending. All are superseded by this subsection.
- Not built in this phase: every test of the trail read path. No test file under `tests/` was modified, so entity-query ordering/tie-break, endpoint visibility (owner, MANAGER reading a direct report, a caller who may not see the request), the byte-identical 404, the empty-history 200-with-`[]` case, and the response-field projection remain unasserted. Phase 4 still owns them.

### Phase 4 delivered (audit entity-query + history endpoint unit tests)

Two test files — one new, one extended additively. **No file under `src/` was touched**: the phase's diff lists only `tests/unit/modules/audit/audit.repository.test.ts` (new) and `tests/unit/modules/leave/leave.routes.test.ts` (extended). Phases 1–3 are asserted as fixed contracts, not adjusted. No migration, no DDL, no new dependency, no `jest.mock` of the `pg` driver, no real `Pool`, no database connection.

- `tests/unit/modules/audit/audit.repository.test.ts` — **NEW**, the first file under `tests/unit/modules/audit/` (the directory did not exist). Discovered by the existing `jest.config.js` `testMatch` `**/tests/**/*.test.(ts|js)`; ts-jest is its only typecheck gate (`tsconfig.json` excludes `tests`), so it compiles under strict mode with typed doubles (`as unknown as Pool`), never `any`. Two describe blocks:
  - **`PgAuditLogRepository.findByEntity — the entity-scoped trail read`** (7 cases). A fake `Pool` is injected through the repository's EXISTING `dbPool` constructor seam and captures the SQL text and params the repository actually sends. Asserts: exactly one query, `FROM audit_logs`, `WHERE entity_type = $1 AND entity_id = $2`, `ORDER BY occurred_at ASC, id ASC`, the shared `COLUMNS` projection, and params exactly `[LEAVE_REQUEST_ENTITY_TYPE, 'req-1']`; `PgAuditLogRepository.prototype.findByEntity.length === 2` (no trailing `PoolClient` — the read path opens no transaction and joins none); row mapping through the existing `mapRow`/`parseState` (a JSON `TEXT` column → the parsed value, a null column → `null` in both directions, `occurredAt` a `Date`); the returned entry is structurally identical to `findById`'s (the same eight keys, no extra); ascending `id` order for rows sharing an `occurredAt`, plus stability on a repeat call; no re-sort (rows come back in the order the query returned them, proven with descending ids against ascending timestamps); `[]` for an entity with no rows rather than a throw.
  - **`AuditService.getByEntity — the service-level trail read`** (3 cases) against an in-memory `FakeAuditRepository` implementing the full `IAuditRepository` (`create`, `findById`, `findByEntity`). Asserts: the repository's rows are returned verbatim — no filter, no re-sort, no cap; an empty result is `[]`, never `NotFoundError`; a whitespace-only `entityType` or an empty `entityId` rejects with `ValidationError` WITHOUT reaching the repository (`findByEntityCalls` stays empty). This closes the ambiguity the plan left open — service-level `getByEntity` was unasserted anywhere before this phase.
- `tests/unit/modules/leave/leave.routes.test.ts` — **EXTENDED additively** with a `leave routes — GET /leaves/:id/history` describe block (7 cases); every pre-existing case is unchanged. It reuses the file's established harness: a Fastify instance with the `leaveService` seam decorated by an in-memory `ILeaveService` fake cast `as unknown as ILeaveService` (never `any`), `decorateRequest('user', undefined)` plus a `preHandler` hook setting `request.user`, `app.register(leaveRoutes)`, `app.ready()`, `app.inject(...)`, `app.close()`. The fake mirrors the production contract — `getHistory`'s ONLY authorization is `getById`'s visibility rule, called first and allowed to throw — and the fixtures key `entityType` on the imported `LEAVE_REQUEST_ENTITY_TYPE` constant, so a writer/reader literal divergence cannot hide behind a matching hardcoded string. Asserts: 200 with the entries for the request's own employee; a MANAGER reading a direct report's history gets 200; a visible request with no audit rows gets 200 with `[]`, not 404; an invisible request and a nonexistent id get the SAME 404 — `invisible.json()` `toEqual` `missing.json()`, `code: 'NOT_FOUND'`, and explicitly `not.toBe(403)`; a missing actor gets 401 `UNAUTHORIZED` without leaking the trail; and the request id plus the authenticated actor are routed through to `getHistory` unchanged (`toHaveBeenCalledWith({ id: 'emp-1', role: EmployeeRole.MANAGER }, 'lr-2')`).
- **Response projection asserted exactly, not partially:** both suites compare the full sorted key set `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }` — the audit-owned `AuditLog` entity imported from the audit module's public entry point, with no leave-owned projection or DTO. `beforeState`/`afterState` are exposed verbatim and parsed (not re-encoded); the route returns a bare array, not the conceptual `AuditTrail` wrapper.
- **Divergence from the plan, resolved in favour of the code:** the plan left the leave-side test file open between `leave.routes.test.ts` and `leave.service.test.ts`. The implementation extended `leave.routes.test.ts` ONLY — the route seam is the only place the endpoint visibility, byte-identical-404, empty-history and response-field criteria are assertable — and added no `getHistory` delegation cases to `leave.service.test.ts`. The plan's "no tests in this phase" framing for Phase 1 was already superseded by the two fakes added then; this phase adds the real coverage.
- **Superseded markers elsewhere in this feature's section:** the "Recommended phases" list still shows Phases 2–4 as pending, and the Phase 1/2/3 subsections' "Not built in this phase" notes about unasserted trail behaviour are now discharged. All are superseded by this subsection. The feature is complete: Phases 1–4 are all delivered.
- **Open questions still open after this phase:** #2 (GP-008 reversal trail semantics — deliberately unasserted; the empty-trail contract is covered generically by the empty-history case), #3 (`beforeState`/`afterState` redaction), #4 (index extension), #5 (`occurred_at` clock authority), #8 (unbounded response size). Pagination, filtering, LIMIT/OFFSET and index extension remain unasserted by design.
- **Known doc drift, not corrected here:** `docs/DOMAIN.md`'s `audit` section still describes `Audit`/`AuditLog`/`AuditRecord`/`AuditServiceInterface` with `oldValues`/`newValues`/`performedBy`/`performedAt` fields. The built entity — and the shape these tests pin exactly — is `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }`. The drift predates this phase and is recorded here so the next reader of DOMAIN.md is not misled.
### Phase 4 delivered (audit entity-query + history endpoint unit tests)

Two test files — one new, one extended additively. **No file under `src/` was touched**: the phase's diff lists only `tests/unit/modules/audit/audit.repository.test.ts` (new) and `tests/unit/modules/leave/leave.routes.test.ts` (extended). Phases 1–3 are asserted as fixed contracts, not adjusted. No migration, no DDL, no new dependency, no `jest.mock` of the `pg` driver, no real `Pool`, no database connection.

- `tests/unit/modules/audit/audit.repository.test.ts` — **NEW**, the first file under `tests/unit/modules/audit/` (the directory did not exist). Discovered by the existing `jest.config.js` `testMatch` `**/tests/**/*.test.(ts|js)`; ts-jest is its only typecheck gate (`tsconfig.json` excludes `tests`), so it compiles under strict mode with typed doubles (`as unknown as Pool`), never `any`. Two describe blocks:
  - **`PgAuditLogRepository.findByEntity — the entity-scoped trail read`** (7 cases). A fake `Pool` is injected through the repository's EXISTING `dbPool` constructor seam and captures the SQL text and params the repository actually sends. Asserts: exactly one query, `FROM audit_logs`, `WHERE entity_type = $1 AND entity_id = $2`, `ORDER BY occurred_at ASC, id ASC`, the shared `COLUMNS` projection, and params exactly `[LEAVE_REQUEST_ENTITY_TYPE, 'req-1']`; `PgAuditLogRepository.prototype.findByEntity.length === 2` (no trailing `PoolClient` — the read path opens no transaction and joins none); row mapping through the existing `mapRow`/`parseState` (a JSON `TEXT` column → the parsed value, a null column → `null` in both directions, `occurredAt` a `Date`); the returned entry is structurally identical to `findById`'s (the same eight keys, no extra); ascending `id` order for rows sharing an `occurredAt`, plus stability on a repeat call; no re-sort (rows come back in the order the query returned them, proven with descending ids against ascending timestamps); `[]` for an entity with no rows rather than a throw.
  - **`AuditService.getByEntity — the service-level trail read`** (3 cases) against an in-memory `FakeAuditRepository` implementing the full `IAuditRepository` (`create`, `findById`, `findByEntity`). Asserts: the repository's rows are returned verbatim — no filter, no re-sort, no cap; an empty result is `[]`, never `NotFoundError`; a whitespace-only `entityType` or an empty `entityId` rejects with `ValidationError` WITHOUT reaching the repository (`findByEntityCalls` stays empty). This closes the ambiguity the plan left open — service-level `getByEntity` was unasserted anywhere before this phase.
- `tests/unit/modules/leave/leave.routes.test.ts` — **EXTENDED additively** with a `leave routes — GET /leaves/:id/history` describe block (7 cases); every pre-existing case is unchanged. It reuses the file's established harness: a Fastify instance with the `leaveService` seam decorated by an in-memory `ILeaveService` fake cast `as unknown as ILeaveService` (never `any`), `decorateRequest('user', undefined)` plus a `preHandler` hook setting `request.user`, `app.register(leaveRoutes)`, `app.ready()`, `app.inject(...)`, `app.close()`. The fake mirrors the production contract — `getHistory`'s ONLY authorization is `getById`'s visibility rule, called first and allowed to throw — and the fixtures key `entityType` on the imported `LEAVE_REQUEST_ENTITY_TYPE` constant, so a writer/reader literal divergence cannot hide behind a matching hardcoded string. Asserts: 200 with the entries for the request's own employee; a MANAGER reading a direct report's history gets 200; a visible request with no audit rows gets 200 with `[]`, not 404; an invisible request and a nonexistent id get the SAME 404 — `invisible.json()` `toEqual` `missing.json()`, `code: 'NOT_FOUND'`, and explicitly `not.toBe(403)`; a missing actor gets 401 `UNAUTHORIZED` without leaking the trail; and the request id plus the authenticated actor are routed through to `getHistory` unchanged (`toHaveBeenCalledWith({ id: 'emp-1', role: EmployeeRole.MANAGER }, 'lr-2')`).
- **Response projection asserted exactly, not partially:** both suites compare the full sorted key set `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }` — the audit-owned `AuditLog` entity imported from the audit module's public entry point, with no leave-owned projection or DTO. `beforeState`/`afterState` are exposed verbatim and parsed (not re-encoded); the route returns a bare array, not the conceptual `AuditTrail` wrapper.
- **Divergence from the plan, resolved in favour of the code:** the plan left the leave-side test file open between `leave.routes.test.ts` and `leave.service.test.ts`. The implementation extended `leave.routes.test.ts` ONLY — the route seam is the only place the endpoint visibility, byte-identical-404, empty-history and response-field criteria are assertable — and added no `getHistory` delegation cases to `leave.service.test.ts`. The plan's "no tests in this phase" framing for Phase 1 was already superseded by the two fakes added then; this phase adds the real coverage.
- **Superseded markers elsewhere in this feature's section:** the "Recommended phases" list still shows Phases 2–4 as pending, and the Phase 1/2/3 subsections' "Not built in this phase" notes about unasserted trail behaviour are now discharged. All are superseded by this subsection. The feature is complete: Phases 1–4 are all delivered.
- **Open questions still open after this phase:** #2 (GP-008 reversal trail semantics — deliberately unasserted; the empty-trail contract is covered generically by the empty-history case), #3 (`beforeState`/`afterState` redaction), #4 (index extension), #5 (`occurred_at` clock authority), #8 (unbounded response size). Pagination, filtering, LIMIT/OFFSET and index extension remain unasserted by design.
- **Known doc drift, not corrected here:** `docs/DOMAIN.md`'s `audit` section still describes `Audit`/`AuditLog`/`AuditRecord`/`AuditServiceInterface` with `oldValues`/`newValues`/`performedBy`/`performedAt` fields. The built entity — and the shape these tests pin exactly — is `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }`. The drift predates this phase and is recorded here so the next reader of DOMAIN.md is not misled.
### Recommended phases

1. **Phase 1 — audit entity query (`findByEntity` / `getByEntity`)** (4 files). Innermost dependency; unit-testable in isolation with an in-memory fake repository. No route, no leave change, no new module, no shared-types change. **DELIVERED** (see above).
2. **Phase 2 — `LeaveService.getHistory`** (1 file). Depends on Phase 1. Visibility via the existing `getById`; read-only; no `EmployeeRole` branch.
3. **Phase 3 — `GET /leaves/:id/history` route** (1 file). Depends on Phase 2. Reuses `resolveActor` and `sendError`; no role guard; invisible and nonexistent ids produce byte-identical 404s.
4. **Phase 4 — tests** (2 files). Depends on Phases 1–3: entity-query ordering; the request's own employee; a MANAGER reading a direct report's history; a requester who may not see the request getting 404; the empty-history case.

### Open questions

1. **Ordering tie-break** — RESOLVED by Phase 1: the repository SQL is `ORDER BY occurred_at ASC, id ASC`, so same-millisecond entries are deterministically ordered and repeated reads are stable. The tie-break is binding for every consumer of `findByEntity`, not just this endpoint.
2. **GP-008 reversal trail** — should a reversal row have a non-empty trail of its own, or is the empty trail correct (the reversal is an event in the ORIGINAL's history)?
3. **`beforeState`/`afterState` exposure** — the trail is visible to exactly the callers who may see the request, but it makes full snapshots bulk-readable and reveals the `actorId` of every actor who touched the request. Redaction must be decided now if wanted, because the projection rule is binding feature-wide.
4. **Index extension** — should `(entity_type, entity_id)` be extended with `occurred_at` (and `id`) so the ordered scan is index-served? A migration decision that must be made once for the table.
5. **`occurred_at` clock authority** — app-stamped `new Date()` vs the column's DB default `now()`; the DB default is currently dead code for every row the repository inserts.
6. **`entity_type` literal ownership** — the leave module owns `LEAVE_REQUEST_ENTITY_TYPE` (defined once in `src/modules/leave/leave.model.ts` and imported by both the write path and the history read); a divergence would silently return an empty array, which this contract treats as a valid 200.
7. **`getHistory` return type** — the audit-owned `AuditLog` entity as-is (leading option; it must not be promoted to `src/shared/types/` and must not be re-declared in leave) vs a leave-owned projection.
8. **Unbounded response size** — pagination and filtering are out of scope, so the endpoint returns the full trail with no cap.

### Documentation note
`docs/ARCHITECTURE.md` previously recorded the audit module's repository/service interfaces as `create`/`findById` and `record`/`getById` only. Phase 1 of this feature extends both interfaces (`findByEntity`, `getByEntity`), so the audit module's documented surface is updated in the same change — the doc is the contract the dependency check and later features read. The documented `findByEntity` signature was also corrected from the planned `(entityType, entityId, client?)` to the built `(entityType, entityId)`: the read path takes no `PoolClient`.

Phase 4 adds the tests that pin the built behaviour — `tests/unit/modules/audit/audit.repository.test.ts` (new) and the additive `GET /leaves/:id/history` block in `tests/unit/modules/leave/leave.routes.test.ts` — with no change under `src/`. The feature's four phases are now all delivered; the "Recommended phases" list above is updated accordingly.

**Known drift, not corrected by this phase:** `docs/DOMAIN.md`'s `audit` section still describes `Audit`/`AuditLog`/`AuditRecord`/`AuditServiceInterface` with `oldValues`/`newValues`/`performedBy`/`performedAt` fields. The built entity — and the shape the Phase 4 tests pin exactly — is `{ id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt }`. The drift predates this phase and is recorded here so the next reader of DOMAIN.md is not misled.

<!-- gestalt:architecture feature=93f4284a-e320-4118-8414-2e6818ef21e0 START -->
## Feature: Notify the approver when a leave request is cancelled
When an employee cancels a leave request that was already SUBMITTED or APPROVED, the manager who would have decided it (or did decide it) is notified, inside the same unit of work as the status change. A DRAFT cancellation notifies no approver, matching the existing rule that a DRAFT cancellation touches no balance. The approver's own view, `GET /leaves/pending-decisions`, stops listing a request once it is cancelled. The existing CANCEL audit entry is unchanged.

### Domain entities

| Entity | Kind | Notes |
| --- | --- | --- |
| `LeaveRequest` | aggregate root, table `leave_requests` | 15 fields, unchanged shape. `approverId` becomes load-bearing as the APPROVED-cancellation recipient. |
| `LeaveRequestReversal` | domain ROLE of `LeaveRequest` (non-null `reversesRequestId`) — NOT a table or type | Born CANCELLED, terminal and inert; reserves no balance. |
| `Notification` | entity, table `notifications` | Reused; gains `relatedEntityCode` (the leave type) so the approver can act without a second lookup. |
| `Employee` | entity, table `employees` | Unchanged; `managerId` becomes load-bearing on the cancellation and queue paths. |
| `AuditLog` | entity, table `audit_logs` | Unchanged by explicit requirement. |
| `PendingDecision` | read-model projection — no id, no table | Membership is derived from `LeaveRequest.status` on every read. |

### Lifecycle states

- **LeaveRequest**: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`. `APPROVED` is terminal/immutable (GP-008); `DRAFT` and `SUBMITTED` are cancelled in place.
- **LeaveRequestReversal**: `CANCELLED` — single state, born CANCELLED, never transitions.
- **Notification**: `PENDING`, `SENT`, `READ`, `ARCHIVED`. A cancellation notification is created `PENDING` and is NOT advanced by this feature — there is no delivery step; `PENDING` is the honest state for a recorded-but-undelivered notification.
- **AuditLog**: `RECORDED` — terminal, immutable.
- **Employee**: `ACTIVE`, `TERMINATED`, `ON_LEAVE`. A TERMINATED recorded approver is still the notification recipient.
- **PendingDecision**: `AWAITING_DECISION` (status SUBMITTED), `RESOLVED` (left the queue — by decision or by cancellation). `CANCELLED` is never a member state.

Named transitions: `cancelInPlace` (`DRAFT -> CANCELLED`, no balance touch, no approver notification; `SUBMITTED -> CANCELLED`, releases `pendingDays`, emits the approver notification); `reverseApproved` (`APPROVED -> original row byte-identical + new LeaveRequestReversal in CANCELLED`, releases `usedDays`, emits the approver notification keyed to the ORIGINAL id); `PendingDecision` `AWAITING_DECISION -> RESOLVED` on cancellation or on any decision.

### Conceptual tables

- **`notifications`** (EXTENDED) — `id`, `recipient_id`, `type`, `title`, `message`, `related_entity_type`, `related_entity_id`, `related_entity_code` (NEW, nullable), `status`, `created_at`, `read_at`. PK `id`; FK `recipient_id -> employees.id`. Indexes: `id` (PK, findById/updateStatus); `(recipient_id, status)` (inbox read, existing); `(related_entity_type, related_entity_id)` (entity correlation — documented in GP-008 but absent from the initial migration, added here); `related_entity_code` deliberately unindexed. `related_entity_code` is generic (a code for whatever `related_entity_type` names), not leave-specific, so the single notifications table stays one concept.
- **`leave_requests`** (UNCHANGED, referenced by name) — already carries `status`, `approver_id`, `cancelled_by`, `cancelled_at`, `reverses_request_id`. New indexes: standalone `status` (the existing `(employee_id, status)` cannot serve a status-only predicate — this is the first status-only access path in the codebase) and `approver_id` (recipient resolution for a cancelled APPROVED request). The queue query MUST also exclude `reverses_request_id IS NOT NULL`: a cancelled-after-approval request is TWO rows, so without that predicate the reversal row is a spurious second queue entry. **NOT delivered as of Phase 1** — the delivered migration adds no `leave_requests` DDL at all; see *Phase 1 delivered* below.
- **`employees`** (UNCHANGED, referenced by name) — `manager_id` resolves the SUBMITTED recipient and scopes the MANAGER queue predicate.
- **`audit_logs`** and **`leave_balances`** are unchanged and participate only in the cancellation unit of work.

### Repository interfaces and concrete implementations

| Interface | Concrete | Backing |
| --- | --- | --- |
| `ILeaveRepository` | `PgLeaveRequestRepository` | PostgreSQL via the shared pg Pool (`src/shared/db/connection.ts`), constructor-injected `dbPool` |
| `INotificationRepository` | `PgNotificationRepository` | same |
| `IAuditRepository` | `PgAuditLogRepository` | same |
| `IBalanceRepository` | `PgLeaveBalanceRepository` | same |
| `IEmployeeRepository` | `PgEmployeeRepository` | same |

New / changed methods:

- `ILeaveRepository.findPendingDecisions(actorId: string, actorRole: EmployeeRole, client?: PoolClient): Promise<LeaveRequest[]>` — NEW. Returns the requests still awaiting this actor's decision: `status = SUBMITTED` AND `reverses_request_id IS NULL`, scoped by role (ADMIN: all; MANAGER: the requester's `employees.manager_id = actorId`; EMPLOYEE: none). `ORDER BY start_date ASC, id ASC`. Read-only: no `forUpdate`, no transaction, returns an array (possibly empty), never null. `CANCELLED` is excluded by construction, which is what makes a cancelled request stop being listed.
- `INotificationRepository.create(input, client?)` — EXISTING, EXTENDED end-to-end for `related_entity_code` (COLUMNS, `NotificationRow`, `mapRow`, INSERT). The optional `client` is forwarded so the insert joins the caller's transaction — the mechanism by which a failed notification insert rolls back the cancellation.
- `ILeaveRepository.create/findById/findByReversesRequestId/update/findByQuery`, `IAuditRepository.create/findById/findByEntity`, `IBalanceRepository.findByKey/update/findById/create`, `IEmployeeRepository.findById/findByManagerId/create/findByEmployeeNumber/findByEmail` — EXISTING, unchanged.

Every method takes an optional trailing `PoolClient` defaulting to the shared pool; no repository opens `BEGIN`/`COMMIT`/`ROLLBACK`.

### Module boundaries

- **Presentation** — `src/modules/leave/leave.routes.ts`. Adds one handler, `GET /leaves/pending-decisions`, mirroring the existing `GET /leaves` handler exactly: `resolveActor` -> service -> `reply.status(200).send(rows)`, `try/catch -> request.log.error -> sendError`. No controller file, no SQL, no role branch, no business logic.
- **Application** — `LeaveService.cancel` (extended) and `LeaveService.listPendingDecisions` (new), both declared on `ILeaveService` before implementation. `cancel` keeps ownership of the unit of work; the approver notification is one more step inside the two existing `uow.withTransaction` callbacks, with the same `client` threaded through. `listPendingDecisions` is read-only.
- **Domain** — `LeaveRequest`, `Notification`, `LeaveStatus`, `LeaveTypeCode`, `EmployeeRole`, `AuditAction` in `src/shared/types/`. No new type is introduced: the approver notification payload is composed inline in `leave`, exactly as the existing approve/reject/cancel notifications are, and `listPendingDecisions` takes no query DTO.
- **Infrastructure** — `PgLeaveRequestRepository.findPendingDecisions` (the only new SQL), `PgNotificationRepository` (extended for `related_entity_code`), `src/shared/db` pool + `PgUnitOfWork`.

### Dependency map

- leave -> notification, employee, audit, balance, validation, policy, shared-types, shared-errors, shared-db, shared-auth
- notification -> shared-types, shared-errors, shared-db
- employee -> shared-types, shared-errors, shared-db
- audit -> shared-types, shared-errors, shared-db
- balance -> policy, employee, shared-db, shared-types, shared-errors
- validation -> shared-types, shared-errors
- policy -> leave-type, shared-types, shared-errors, shared-db
- leave-type -> shared-types, shared-errors, shared-db
- shared-auth -> shared-types, shared-errors
- app -> leave, shared-auth
- web-leave -> web-infrastructure-api, web-shared-types
- web-approvals -> web-leave, web-employee, web-infrastructure-api, web-shared-types
- web-presentation-pages -> web-approvals, web-leave, web-shared-types, web-presentation-guards

`leave` remains the sole orchestrator and the only module that changes. Every edge this feature uses already exists; no new edge is added and no cycle is introduced. No module depends back on `leave`.

### Cross-cutting contracts

**Auth.** `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity and role come from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`; only `/auth/login` is in `PUBLIC_PATHS`. `GET /leaves/pending-decisions` is NOT added to `PUBLIC_PATHS`, so it requires a valid token. The route-level `resolveActor` helper (reused unchanged) extracts `request.user` and enforces id presence plus `EmployeeRole` membership at the API boundary, throwing `UnauthorizedError` on a missing/invalid actor. RBAC is enforced in the service, never inline in the route: `listPendingDecisions` calls `assertAuthenticated` and scopes the queue to `actor.id`/`actor.role`; `cancel` keeps its existing `assertCanCancel` (owner for DRAFT/SUBMITTED; direct manager or ADMIN for APPROVED). The approver notification recipient is resolved server-side from the request row and is never taken from the caller.

**Transaction.** Cancelling a SUBMITTED or APPROVED request performs, in ONE unit of work: (a) the status change — an in-place `update` to CANCELLED for SUBMITTED, or the GP-008 insert of a NEW CANCELLED reversal row for APPROVED; (b) the balance release — `pendingDays -= requestedDays` for SUBMITTED, `usedDays -= requestedDays` for APPROVED; (c) the CANCEL audit entry (unchanged in shape); (d) the approver notification insert. Repository and service methods that must join a caller's transaction take an OPTIONAL trailing `client?: PoolClient` defaulting to the shared pool. `LeaveService.cancel` calls `this.uow.withTransaction(async (client) => { ... })`; `PgUnitOfWork` acquires a client, issues BEGIN, runs the callback, COMMITs on resolve / ROLLBACKs on throw, and always releases the client. Inside the callback the SAME `client` is threaded to every participating call. `BEGIN`/`COMMIT`/`ROLLBACK` appear ONLY in `PgUnitOfWork`. The approver is resolved before the notification insert and inside the same callback: for an APPROVED request, `request.approverId` read from the ORIGINAL row (the reversal row's `approverId` is null by construction); for a SUBMITTED request, `employeeService.getEmployeeById(request.employeeId).managerId`. A DRAFT cancellation notifies nobody and performs no balance read or write. `GET /leaves/pending-decisions` is read-only: it opens NO transaction and forwards NO client.

**Errors.** Errors return `{ error: string; code: string }` via the existing `sendError` helper (`AppError` -> its `statusCode` + `code`; any other throw -> 500 `{ error: 'Internal Server Error' }`). For `GET /leaves/pending-decisions`: 401 (`UnauthorizedError`, code `UNAUTHORIZED`) for a missing or invalid actor; 200 with an array of `LeaveRequest` rows (possibly empty) on success — an empty queue is a valid 200 with `[]`, not a 404. For `POST /leaves/:id/cancel` the existing contract is unchanged: 400 validation, 401 missing/invalid actor, 403 `ForbiddenError` from `assertCanCancel`, 404 `NotFoundError` for an unknown id, 409 `ConflictError` for an already-begun leave or an already-reversed APPROVED request, 200 with the cancelled (or reversal) row on success. A failure to insert the approver notification is not mapped to a new status: it throws inside the unit of work, the transaction rolls back, and the caller receives the underlying error (500) — the cancelled request is never left committed without its notification record.

### Business rules (reconciled)

1. The approver recipient is resolved from the request's status and nothing else: APPROVED -> the request's recorded `approverId`; SUBMITTED -> the requester's direct manager (`employee.managerId` at the moment of cancellation); DRAFT -> none. The current manager is never substituted for a recorded `approverId`, and `approverId` is never used for a SUBMITTED request (it is null there by construction).
2. Exactly one approver notification per cancellation, and only for a request cancelled from SUBMITTED or APPROVED. DRAFT notifies no approver. The notification is not duplicated per approver candidate, not sent to both the recorded approver and the current manager, and not re-sent on a retry (a repeat cancel fails its state guard and emits nothing).
3. The notification carries the request id and the leave type: the request id in `relatedEntityId` (with `relatedEntityType = 'leave_request'`) and both values in `message`; the leave type additionally in `relatedEntityCode` as the canonical lowercase `leaveTypeCode`. On the APPROVED reversal path the leave type is the reversal row's `leaveTypeCode` (copied verbatim) and the request id is the ORIGINAL request id.
4. The approver notification is written inside the SAME unit of work as the status change. A failure to notify rolls back the cancellation itself. The notification must not be emitted after commit, must not be fire-and-forget, and must not be moved to an out-of-band queue in this feature.
5. A cancellation writes exactly one CANCEL `AuditLog` entry and, for a SUBMITTED or APPROVED cancellation, two `Notification` rows: one to the requester (existing behaviour, unchanged) and one to the approver (new). The approver notification is ADDITIONAL — it does not replace, merge with, or alter the requester notification, and it does not alter the audit entry (same action CANCEL, same entityType `'leave_request'`, same entityId = the ORIGINAL request id, same before/after state).
6. A request is a member of the approver's pending-decisions queue if and only if its status is SUBMITTED. CANCELLED is never a member state, so a request leaves the queue the instant it is cancelled. Membership is derived from the request's current status on every read; there is no separate queue record, tombstone, or cached membership.
7. Queue visibility reuses the module's existing role-scoped rule: an ADMIN sees every SUBMITTED request; a MANAGER sees the SUBMITTED requests of their own direct reports (one level, not transitive) and not their own; an EMPLOYEE sees none. Queue membership and decide authority are separate concerns — the existing decide guards remain the sole authority on whether a decision may be taken.
8. When a SUBMITTED request is cancelled and the requester's `managerId` is null, the cancellation still succeeds and the requester notification is still written; only the approver notification is skipped. The notification is never addressed to the requester, the cancelling actor, or an arbitrary ADMIN as a fallback.
9. Self-notification is not suppressed: when the cancelling actor is the resolved recipient, the notification is still written. The exactly-one rule holds regardless of actor identity.
10. An ADMIN may cancel an APPROVED request for anyone; the recipient is still the request's recorded `approverId`, not the ADMIN.
11. For a SUBMITTED cancellation the recipient is the requester's manager AS OF the cancellation, resolved live from `employee.managerId` inside the unit of work. No historical manager snapshot is stored or consulted.
12. For an APPROVED cancellation the recipient is the recorded `approverId` even if that employee has since been TERMINATED or is ON_LEAVE.
13. Self-approval is forbidden by the existing decide guards, so the requester and the approver are always distinct people and no call site needs to de-duplicate recipients.
14. The SUBMITTED recipient is the requester's `managerId` regardless of that employee's `role`. No role check is applied when resolving the recipient.
15. A cancellation notification is created `PENDING` and is never advanced to `SENT` by the cancellation operation. There is no delivery step in this feature; the notification's existence inside the committed unit of work IS the record of the notification attempt. Advancing `PENDING -> SENT` is a separate, out-of-band concern owned by the notification module.
16. The approver notification reuses the existing `type` literal `'leave_request'` and introduces no new type value, enum member, or discriminator. It is distinguished by recipient and message text.
17. This feature changes no authorization and no timing rule. Who may cancel is unchanged: the owner may cancel their own DRAFT or SUBMITTED request; only the requester's direct manager or an ADMIN may cancel an APPROVED request; cancellation is blocked once `startDate <= today` (UTC day comparison) with `ConflictError`. A rejected cancellation emits no notification of any kind.

### Recommended phases

1. Migration: `notifications.related_entity_code` + `leave_requests` status/approver_id indexes (1 file).
2. Repositories: `findPendingDecisions` + `related_entity_code` plumbing (2 files).
3. `LeaveService.cancel`: notify the approver inside the existing unit of work (1 file).
4. `LeaveService.listPendingDecisions` (1 file).
5. `GET /leaves/pending-decisions` route (1 file).
6. Tests: approver notification + pending-decisions read (2 files).
7. (optional) Web approvals queue consumes the new endpoint (2 files).

### Phase 1 delivered (notifications.related_entity_code migration)
Phase 1 of the recommended list is delivered: ONE new knex migration, `migrations/20260915000000_add_related_entity_code_to_notifications.js`. No source file, repository, service, route, or test changed in that phase. Phases 2, 3, 4, 5 and 6 are also delivered (see ADR-002/ADR-003/ADR-004 in `docs/DECISIONS.md`, the *Repository interfaces* / *Business rules* sections above, and *Phase 5 delivered* / *Phase 6 delivered* below); phase 7 — the optional web approvals queue — is ALSO delivered (see *Phase 7 delivered* below).

- `exports.up` does exactly two things on `notifications`: `t.text('related_entity_code')` (nullable, no default, no backfill, no NOT NULL) and `t.index(['related_entity_type', 'related_entity_id'], 'notifications_related_entity_type_related_entity_id_index')`. `exports.down` drops the index first, then the column.
- The index is added HERE, in the same migration as the column, because the entity linkage on `notifications` is load-bearing for the first time in this feature and the initial migration (`20260913000000_initial_schema.js`) creates only `(recipient_id, status)`. Only that drift is fixed; the rest of the initial migration is left as-is.
- The column is generic (a code for whatever `related_entity_type` names), not leave-specific, so the single `notifications` table stays one concept and no new table is introduced. The request id continues to live in `related_entity_id`; the leave type is not derivable from it without the join the requirement forbids, and free text is not machine-readable.
- Nullable with no backfill: notifications unrelated to a coded entity, and every row written before this migration, legitimately carry no code. The repository/service never synthesize a non-null value.
- Follows the existing migration conventions (`exports.up` / `exports.down`, `knex.schema.alterTable`), targets PostgreSQL, and is reversible.

### Phase 7 delivered (web approvals queue consumes GET /leaves/pending-decisions)

Phase 7 of the recommended list — the optional web consumer — is delivered. FOUR source files and THIRTEEN test files changed; no file under `src/` was touched, and no new file was created.

- **`web/src/shared/types/index.ts`** — new `PendingDecisionView` interface, the read-only wire projection of `GET /leaves/pending-decisions`: `requestId`, `employeeId`, `leaveTypeCode`, `startDate`, `endDate`, `requestedDays`, `status` — exactly the seven fields of the backend `PendingDecision`. No existing type was renamed or retyped.
- **`web/src/infrastructure/api/api-client.ts`** — `getPendingDecisions(): Promise<PendingDecisionView[]>` added to `IApiClient` and `ApiClient`, following the file's existing `request<T>` pattern (`authenticated: true`, bearer token from `ITokenStorage`, `ApiError` mapping from non-2xx bodies). No query parameters — the endpoint takes no input.
- **`web/src/modules/leave/leave.service.ts`** — `listPendingDecisions()` added to `ILeaveService` and `LeaveService` as a verbatim pass-through to `apiClient.getPendingDecisions()`.
- **`web/src/modules/approvals/approvals.service.ts`** — `getPendingDecisions()` added to `IApprovalsService` and `ApprovalsService`, delegating to `leaveService.listPendingDecisions()` and returning the array exactly as received: no client-side sort, filter, or status predicate, and an empty queue is a normal `[]`, not an error. The layering constraint held — `web-approvals` still reaches the API only through `web-leave`, and no `web-approvals -> web-infrastructure-api` edge was added.
- **Additive, not a replacement.** The pre-existing `getQueue()` (client-side SUBMITTED + not-self filter over `GET /leaves`, returning `ApprovalsQueueItem`) is unchanged and still present; `ApprovalsPage` and its tests still consume it. The approvals module now exposes two queue reads — see ADR-005 in `docs/DECISIONS.md`.
- **Tests.** `web/src/modules/approvals/approvals.service.test.ts` gains three cases: the queue is returned as-is with backend order preserved (`expect(result).toBe(queue)` — identity, so no copy and no re-sort), an empty queue resolves to `[]`, and a rejection propagates unchanged. Twelve further test files were touched mechanically, not behaviourally: `web/src/modules/{auth/auth,employee/employee,leave/balance,leave/leave}.service.test.ts` and `web/src/presentation/{guards/RequireAuth,guards/RequireApprover,pages/ApprovalsPage,pages/DashboardPage,pages/LeaveDetailPage,pages/LeaveListPage,pages/LoginPage,pages/RequestLeavePage}.test.tsx` each add the new method to a fake `IApiClient`/`ILeaveService` builder. These are fixture completions forced by the widened interfaces (the fakes are typed as `IApiClient`/`ILeaveService`), not new cases: no assertion changes, no test file added or deleted. Without them `tsc` fails on the web root.
- **Divergence from the plan worth noting:** the phase spec said "Do NOT touch `web/src/presentation/`". No presentation SOURCE file changed — but eight presentation TEST files did, for the mechanical reason above. The spec's intent (pages and guards unchanged) holds; its literal wording does not. The spec's "approximately 2 files" estimate likewise understates the fixture fallout of widening two interfaces.
- **Stale text left in place:** this block's *Dependency map* still lists `web-infrastructure-api` as a `web-approvals` dependency. The built edge set is `web-approvals -> web-leave, web-employee, web-shared-types` (see *The web build (`web/src/`)*); the extra edge was never added and that line is stale.
### Phase 7 delivered (web approvals queue consumes GET /leaves/pending-decisions)

Phase 7 of the recommended list — the optional web consumer — is delivered. FOUR source files and THIRTEEN test files changed; no file under `src/` was touched, and no new file was created.

- **`web/src/shared/types/index.ts`** — new `PendingDecisionView` interface, the read-only wire projection of `GET /leaves/pending-decisions`: `requestId`, `employeeId`, `leaveTypeCode`, `startDate`, `endDate`, `requestedDays`, `status` — exactly the seven fields of the backend `PendingDecision`. No existing type was renamed or retyped.
- **`web/src/infrastructure/api/api-client.ts`** — `getPendingDecisions(): Promise<PendingDecisionView[]>` added to `IApiClient` and `ApiClient`, following the file's existing `request<T>` pattern (`authenticated: true`, bearer token from `ITokenStorage`, `ApiError` mapping from non-2xx bodies). No query parameters — the endpoint takes no input.
- **`web/src/modules/leave/leave.service.ts`** — `listPendingDecisions()` added to `ILeaveService` and `LeaveService` as a verbatim pass-through to `apiClient.getPendingDecisions()`.
- **`web/src/modules/approvals/approvals.service.ts`** — `getPendingDecisions()` added to `IApprovalsService` and `ApprovalsService`, delegating to `leaveService.listPendingDecisions()` and returning the array exactly as received: no client-side sort, filter, or status predicate, and an empty queue is a normal `[]`, not an error. The layering constraint held — `web-approvals` still reaches the API only through `web-leave`, and no `web-approvals -> web-infrastructure-api` edge was added.
- **Additive, not a replacement.** The pre-existing `getQueue()` (client-side SUBMITTED + not-self filter over `GET /leaves`, returning `ApprovalsQueueItem`) is unchanged and still present; `ApprovalsPage` and its tests still consume it. The approvals module now exposes two queue reads — see ADR-005 in `docs/DECISIONS.md`.
- **Tests.** `web/src/modules/approvals/approvals.service.test.ts` gains three cases: the queue is returned as-is with backend order preserved (`expect(result).toBe(queue)` — identity, so no copy and no re-sort), an empty queue resolves to `[]`, and a rejection propagates unchanged. Twelve further test files were touched mechanically, not behaviourally: `web/src/modules/{auth/auth,employee/employee,leave/balance,leave/leave}.service.test.ts` and `web/src/presentation/{guards/RequireAuth,guards/RequireApprover,pages/ApprovalsPage,pages/DashboardPage,pages/LeaveDetailPage,pages/LeaveListPage,pages/LoginPage,pages/RequestLeavePage}.test.tsx` each add the new method to a fake `IApiClient`/`ILeaveService` builder. These are fixture completions forced by the widened interfaces (the fakes are typed as `IApiClient`/`ILeaveService`), not new cases: no assertion changes, no test file added or deleted. Without them `tsc` fails on the web root.
- **Divergence from the plan worth noting:** the phase spec said "Do NOT touch `web/src/presentation/`". No presentation SOURCE file changed — but eight presentation TEST files did, for the mechanical reason above. The spec's intent (pages and guards unchanged) holds; its literal wording does not. The spec's "approximately 2 files" estimate likewise understates the fixture fallout of widening two interfaces.
- **Stale text left in place:** this block's *Dependency map* still lists `web-infrastructure-api` as a `web-approvals` dependency. The built edge set is `web-approvals -> web-leave, web-employee, web-shared-types` (see *The web build (`web/src/`)*); the extra edge was never added and that line is stale.
### Open questions

See the reconciled `openQuestions` list: null `managerId` on a SUBMITTED cancellation; null `approverId` on a legacy APPROVED row; whether the approver notification accompanies or replaces the existing requester notification; confirmation of the `related_entity_code` schema decision; queue membership (SUBMITTED-only vs SUBMITTED+APPROVED); ADMIN queue scope; self-notification suppression; the reversal path's notification keying; and the documented-vs-built `(related_entity_type, related_entity_id)` index drift.

### Stack compliance

TypeScript on Node 20, npm, Jest, Fastify, React (Vite SPA), PostgreSQL, modular monolith. All three specialist slices comply: Fastify routes and preHandlers, `pg` Pool with a `PoolClient`-threaded unit of work, Jest unit tests over the existing `dbPool`/service seams, and a React SPA consumer in the optional Phase 7. No non-stack framework appears in any slice.
<!-- gestalt:architecture feature=93f4284a-e320-4118-8414-2e6818ef21e0 END -->
