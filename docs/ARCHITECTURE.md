# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest
- Backend: Fastify
- Frontend: React Native
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

**service** — `IValidationService` (validateDateRange, validateSufficiency, validateLeaveRequest) + `ValidationService`. The module also exports a standalone `calculateRequestedDays(startDate, endDate)` helper.

- `calculateRequestedDays` is a **thin delegate** to the canonical `requestedDays` helper in `src/shared/types/index.ts` (Phase 1) — it does not re-derive the rule. The inclusive day-count (`endDate - startDate + 1`, whole-day only, no weekend/holiday exclusion) lives in shared/types, and every consumer imports it from there.
- `validateDateRange(startDate, endDate)` rejects a non-date argument or `startDate > endDate` with `ValidationError` (400).
- `validateSufficiency(balance, requestedDays)` rejects with `ConflictError` (409) when `entitledDays - usedDays - pendingDays < requestedDays`.
- `validateLeaveRequest(dto, balance)` composes input validation (non-empty `employeeId`, `LeaveTypeCode` enum membership), date-range validation, and the sufficiency check — deriving `requestedDays` via `calculateRequestedDays` before the sufficiency check.
- Two pure rule methods — `checkDateRange` and `checkSufficiency` — return a `ValidationResult` without throwing; the throwing wrappers funnel a failed result through a private `assert` helper that maps the result to the appropriate error type.

**Divergences from the plan worth noting:**
- PLAN.md Phase 5 prescribed implementing the binding day-count rule "ONCE as a shared helper" in the validation module. The canonical `requestedDays` helper was already implemented in `src/shared/types/index.ts` in Phase 1, so `calculateRequestedDays` here is a delegate rather than the canonical definition — the single source of truth remains shared/types.
- The plan did not specify error types for the sufficiency check; the implementation surfaces insufficiency as `ConflictError` (409) while date-range failures are `ValidationError` (400).
- `validateLeaveRequest` adds `employeeId`/`leaveTypeCode` input validation beyond the plan's date-range + sufficiency scope.
- No repository, no routes/controllers/RBAC, and no audit-log writes (GP-002) — out of scope for this phase (the leave orchestrator in Phase 6 owns the audit/notification side effects and consumes this module).

Jest unit tests under `tests/unit/modules/validation/` cover `calculateRequestedDays` (single day, consecutive days, weekend span, month boundary), `validateDateRange`, `validateSufficiency` (including pendingDays accounting), and `validateLeaveRequest` (happy path, ConflictError on insufficient balance, ValidationError on inverted range).

### Open questions
Day-count calendar vs business days; accrual model; carry-forward cap; migration mechanism; controller layer; BullMQ for notifications.
<!-- gestalt:architecture feature=babd3932-368b-46a5-a4dc-6dccaafd84ba END -->
