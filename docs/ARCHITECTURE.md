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

Two modules, each under `src/modules/<name>/` with the same split-file layout as Phase 2 (model, repository interface, repository, service interface, service, `index.ts`).

**audit** — `AuditLog` model (id, actorId, action: AuditAction, entityType, entityId, beforeState: `unknown | null`, afterState: `unknown | null`, occurredAt: Date). `CreateAuditLogInput = Omit<AuditLog, 'id' | 'occurredAt'>` — the repository generates `id` via `randomUUID()` and stamps `occurredAt`. `IAuditRepository` (create, findById) + `PgAuditLogRepository` (JSON-stringifies `beforeState`/`afterState` for the `before_state`/`after_state` columns on write; `mapRow` parses them back via a guarded `parseState` helper — null column → null, non-null → `JSON.parse` — so `findById` returns structurally equal values, preserving the `unknown | null` contract). `IAuditService` (record, getById) + `AuditService` validates non-empty `actorId`/`entityType`/`entityId` and `AuditAction` enum membership (ValidationError), throws NotFoundError(404) on unknown id.

**notification** — `Notification` model (id, recipientId, type, title, message, relatedEntityType: `string | null`, relatedEntityId: `string | null`, status: NotificationStatus, createdAt: Date, readAt: `Date | null`). `CreateNotificationInput = Omit<Notification, 'id' | 'status' | 'createdAt' | 'readAt'> & { status?: NotificationStatus }` — status defaults to PENDING when omitted. `INotificationRepository` (create, findById, updateStatus) + `PgNotificationRepository` (generates `id`/`createdAt`, defaults status to PENDING, `read_at` null on create). `INotificationService` (create, getById, markRead) + `NotificationService` validates required strings and status enum membership; `markRead` sets status READ and `readAt` to now, throwing NotFoundError(404) on unknown id.

**Divergences from the plan worth noting:**
- `beforeState`/`afterState` are typed `unknown | null` (not a specific shape) and `relatedEntityType`/`relatedEntityId` are nullable — the plan's field list did not specify nullability; the implementation chose nullable/unknown to reflect optional audit deltas and optional notification linkage.
- `NotificationService` adds a `markRead` operation (status → READ + `readAt`) beyond the plan's create/retrieve scope.
- Both repositories accept an optional trailing `PoolClient` (transaction-boundary support per AGENTS.md). Both `NotificationService.create` and `AuditService.record` accept and forward an optional trailing `PoolClient` to their repositories so the insert joins the caller's transaction. Neither service opens BEGIN/COMMIT/ROLLBACK itself — that stays exclusively in PgUnitOfWork.
- No audit-log writes (GP-002) and no routes/controllers/RBAC for these modules — out of scope for this phase (routes deferred).

Jest unit tests under `tests/unit/modules/` cover each service with in-memory fake repositories: create/retrieve happy paths, ValidationError on empty/invalid fields, NotFoundError on unknown id, and (notification) `markRead` semantics plus client-forwarding on `create`.

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
- employee -> shared-types, shared-errors, shared-db
- policy -> leave-type, shared-types, shared-errors
- balance -> employee, policy, shared-date, shared-types, shared-errors, shared-db
- leave -> balance, validation, policy, employee, audit, notification, leave-type, shared-date, shared-types, shared-errors, shared-db
- shared-date -> shared-types
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
- web-presentation-guards -> web-auth, web-shared-types
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
- **LeaveRequestView** — read-only leave request. Lifecycle displayed only: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`.

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
No new repository interfaces. Existing web data-access boundary is IApiClient/ApiClient (HTTP fetch), with LeaveService/EmployeeService delegating to it. ApprovalsService reuses getLeaves(), approveLeave(), rejectLeave(), and getAvailableLeaveActions(); no new transport methods.

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
