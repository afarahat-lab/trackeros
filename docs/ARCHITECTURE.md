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
src/modules/audit/audit.model.ts + index.ts
src/modules/balance/balance.model.ts + index.ts
src/modules/employee/employee.model.ts + index.ts
src/modules/leave-type/leave-type.model.ts + index.ts
src/modules/notification/    — notification module (model, repository, service, index)
src/modules/policy/policy.model.ts + index.ts
src/modules/status/    — status module (model, service interface, service)
src/modules/uptime/    — uptime module (model, routes, service interface, service)
src/shared/db/connection.ts
src/shared/types/    — shared-types module (enums, dtos, errors, index)
src/app.ts
src/index.ts
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

## Implemented — shared-types module (Phase 1)

The shared-types module is the dependency leaf every domain module
imports from. It lives at `src/shared/types/` and is implemented as
follows:

- `enums.ts` — `LeaveTypeCode`, `LeaveRequestStatus`, and `UserRole`,
  each declared as a `const` object with `as const` plus a matching
  string-literal union type (NOT TypeScript `enum` keyword, NOT numeric
  enums). Canonical members: `LeaveTypeCode` = annual | sick | emergency
  | unpaid | maternity | paternity; `LeaveRequestStatus` = DRAFT |
  SUBMITTED | APPROVED | REJECTED | CANCELLED (uppercase); `UserRole` =
  employee | manager | hr_admin.
- `dtos.ts` — `FiscalYear` (a plain integer calendar year, e.g. 2026 —
  no configurable start month, no carry-over, no accrual),
  `LeaveRequestDTO`, and `LeaveBalanceDTO`. `LeaveBalanceDTO` exposes the
  derived availability shape (`entitlementDays`, `usedDays`,
  `pendingDays`) plus `leaveTypeCode` and `fiscalYear`; it never exposes a
  stored `remainingDays` field.
- `errors.ts` — an `AppError` base class carrying `code` (an `ErrorCode`
  string-literal union), `statusCode`, and a `toResponse()` method
  returning the `{ error, code }` contract. Subclasses:
  `ValidationError` (400), `AuthenticationError` (401),
  `AuthorizationError` (403), `NotFoundError` (404),
  `InsufficientBalanceError` (422), `OverlapError` (422, code
  `POLICY_VIOLATION`).
- `index.ts` — the barrel / public entry point re-exporting all of the
  above (values and types).

The module has no dependencies on other modules (it is the leaf). Unit
tests live under `tests/unit/shared/types/` and cover the exact enum
member values, the DTO shapes (including the absence of `remainingDays`),
and the error contract.

## Implemented — leaf modules (Phase 2 part 1)

This phase built ONLY the entity models + repository/service interfaces
for the five leaf modules — no concrete repository/service
implementations, no controllers/routes, no tests (those are later
parts). Each module owns a single `*.model.ts` (entity + interfaces
co-located) plus an `index.ts` barrel that is its public entry point.

Every repository/service interface accepts an optional `PoolClient` as
its LAST parameter (the unit-of-work client); when omitted, concrete
implementations will use the shared pool from `src/shared/db/connection.ts`.

- `src/modules/employee/` — `EmploymentStatus` union
  (`'ACTIVE' | 'INACTIVE' | 'TERMINATED'`); `Employee` entity (id,
  employeeNumber, firstName, lastName, email, managerId `string|null`,
  department `string|null`, hireDate, terminationDate `Date|null`,
  employmentStatus); `CreateEmployeeInput` / `UpdateEmployeeInput`;
  `IEmployeeRepository` (create/update/findById/findByEmployeeNumber/
  findByEmail/list) and `IEmployeeService` (create/update/terminate/
  findById/findByEmployeeNumber).
- `src/modules/leave-type/` — `LeaveType` entity reusing the shared
  `LeaveTypeCode` type imported from `src/shared/types/` (not a
  redeclared literal); `ILeaveTypeRepository` (create/update/findById/
  findByCode/findActive).
- `src/modules/policy/` — `LeavePolicy` entity (policyName, leaveTypeId,
  entitlementDays, accrualRate `number|null`, maxAccumulation
  `number|null`, minimumNoticeDays `number|null`,
  requiresManagerApproval, isActive, createdAt, updatedAt);
  `CreateLeavePolicyInput` / `UpdateLeavePolicyInput`;
  `ILeavePolicyRepository` (create/update/findById/findByLeaveTypeId/
  findActive) and `IPolicyService` (create/update/findById/deactivate).
- `src/modules/balance/` — `BalanceStatus` union
  (`'ACTIVE' | 'EXHAUSTED' | 'CLOSED'`); `LeaveBalance` entity (id,
  employeeId, policyId, fiscalYear, totalEntitlement, usedDays,
  pendingDays, remainingDays, status, createdAt, updatedAt). The
  `remainingDays` field is documented as DERIVED
  (`totalEntitlement - usedDays - pendingDays`) and never independently
  persisted. `ILeaveBalanceRepository` (create/update/findById/
  findByEmployeePolicyAndYear/findByEmployeeAndYear) and `IBalanceService`
  (getAvailableDays/reserve/approve/reject/cancel — `cancel` takes the
  request status `'PENDING' | 'APPROVED'` to distinguish release vs
  restore).
- `src/modules/audit/` — `AuditAction` 7-value union
  (`'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CANCEL' |
  'SUBMIT'`); `AuditLog` entity (id, entityType, entityId, action,
  oldValues/newValues `Record<string, unknown> | null`, performedBy
  `string|null`, performedAt); `AuditLogInput`; `IAuditLogRepository`
  (create/findById/findByEntity) and `IAuditService` (record).

The five leaf modules depend only on `src/shared/types/` (and the `pg`
`PoolClient` type) — no cross-module imports in this phase.

Note on divergence: the phase spec's single-file-layout constraint said
"no barrels in this phase", but each module ships an `index.ts` barrel
because the project's module-boundary rule requires imports to go
through a module's public entry point. The barrels are the public
surface; the entity + interfaces still live together in the single
`*.model.ts` file as specified.

## Implemented — leaf modules (Phase 2 part 2): concrete repositories + services

This phase added the concrete repository + service implementations for
the five leaf modules (no controllers/routes, no tests — those are later
parts). Each module's `index.ts` barrel now also re-exports its concrete
classes.

**Data access shape (divergence note):** the concrete repositories use
raw `pg` parameterized SQL queries (via `pool.query`), NOT Knex. The
HARNESS description mentions "Knex migrations + a thin repository
layer", but the phase spec explicitly left the query-builder choice open
("either, as long as it goes through the repository layer"). The
implementation chose raw parameterized `pg` queries; all access still
goes through the repository layer (GP-001).

Every repository method accepts an optional `PoolClient` as its LAST
parameter and defaults to the shared `pool` from
`src/shared/db/connection.ts` when omitted. Each repository maps snake_case
DB rows to camelCase entities via a private `mapRow` helper and uses
`unknown`-style type guards (e.g. `isEmploymentStatus`,
`isLeaveTypeCode`, `isAuditAction`) rather than `any`.

- `src/modules/employee/` — `PgEmployeeRepository` (create/update/
  findById/findByEmployeeNumber/findByEmail/list) and `EmployeeService`.
  `EmployeeService.create` validates required fields and rejects a
  duplicate `employeeNumber`; `update` merges onto the current entity;
  `terminate` transitions to `TERMINATED` and records a `terminationDate`
  (defaulting to now).
- `src/modules/leave-type/` — `PgLeaveTypeRepository` only (no service in
  this phase). `code` is validated against the shared `LeaveTypeCode`
  values; unknown codes fall back to `UNPAID` on read.
- `src/modules/policy/` — `PgLeavePolicyRepository` and `PolicyService`.
  `create` validates `policyName`/`leaveTypeId` presence and
  `entitlementDays >= 0`; `deactivate` sets `isActive=false` without
  deleting.
- `src/modules/balance/` — `PgLeaveBalanceRepository` and `BalanceService`.
  The repository's `COLUMNS` list and INSERT/UPDATE statements omit
  `remaining_days` entirely — it is never persisted; `mapRow` derives it
  as `totalEntitlement - usedDays - pendingDays`.
- `src/modules/audit/` — `PgAuditLogRepository` and `AuditService`.
  `AuditService.record` sets `performedAt` at write time and allows
  `performedBy` to be null; the repository exposes only create/read
  (no update/delete) — the audit log is immutable.

**BalanceService counter semantics** (the binding rule, implemented in
exactly one place):

- `getAvailableDays(balance)` is a pure derivation
  `totalEntitlement - usedDays - pendingDays`; it never reads a stored
  `remainingDays`.
- `reserve(balanceId, days)` — `pendingDays += days`; throws
  `InsufficientBalanceError` if `days < 0` or `days > availableDays`
  (sufficiency is enforced at reserve time as well as at approval).
- `approve(balanceId, days)` — `pendingDays -= days`, `usedDays += days`;
  throws if `days < 0` or `pendingDays < days`.
- `reject(balanceId, days)` — `pendingDays -= days`; throws if `days < 0`
  or `pendingDays < days`.
- `cancel(balanceId, days, requestStatus)` — for `'PENDING'` releases
  `pendingDays -= days`; for `'APPROVED'` restores `usedDays -= days`;
  throws if the relevant counter would go below zero.
- No counter may go negative — a transition that would go below zero
  throws (never clamps). The negative guards live ONLY in `BalanceService`.
- On every write, `persist` recomputes `remainingDays` in memory and
  recomputes `status` (`CLOSED` is preserved; otherwise `EXHAUSTED` when
  `remainingDays <= 0`, else `ACTIVE`), then calls `repository.update`.

The five leaf modules still depend only on `src/shared/types/` and the
`pg` `PoolClient` type — no cross-module imports.

## Implemented — leaf modules (Phase 2 part 3): unit tests

This phase added the Jest unit tests for the five leaf modules'
repositories and services. Tests live under
`tests/unit/modules/{employee,leave-type,policy,balance,audit}/` and mock
the shared `pg` pool (`src/shared/db/connection.ts`) — no real database
access. `leave-type` has only a repository test (no service exists yet).

Repository tests assert the snake_case→camelCase `mapRow` contract and
the type-guard fallbacks on read: unknown `employment_status` → `ACTIVE`,
unknown `code` → `UNPAID`, unknown `action` → `UPDATE`. They also verify
the optional-client passthrough (a provided client is used instead of the
shared pool) and, for balance, that `remaining_days` is never a persisted
column and `remainingDays` is always recomputed from the counters.

Service tests cover the binding balance counter transitions
(`reserve`/`approve`/`reject`/`cancel` for both `PENDING` and `APPROVED`),
the derived availability formula, the negative-guard behavior (a
transition that would take a counter below zero throws
`InsufficientBalanceError`, never clamps), and status recomputation
(`EXHAUSTED` at zero availability, `CLOSED` preserved). They also cover
`EmployeeService` validation/duplicate rejection/termination,
`PolicyService` validation/merge/deactivate, and `AuditService`'s
`performedAt`-at-write-time behavior, null coercion, and the
immutability surface (only `create`/`findById`/`findByEntity` — no
`update`/`delete`).

## Implemented — notification module (Phase 3)

This phase built the notification module under `src/modules/notification/`
(model + repository + service + `index.ts` barrel) plus its Jest unit
tests under `tests/unit/modules/notification/`.

- `notification.model.ts` — `NotificationStatus` union
  (`'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'`); `Notification` entity
  (id, recipientId, type, title, message, relatedEntityType
  `string|null`, relatedEntityId `string|null`, status, createdAt,
  readAt `Date|null`); `NotificationInput` (recipientId, type, title,
  message, optional relatedEntityType/relatedEntityId);
  `INotificationRepository` (create/findById/findByRecipient/
  updateStatus) and `INotificationService` (notify).
- `notification.repository.ts` — `PgNotificationRepository` using raw
  parameterized `pg` SQL (same shape as the leaf repositories), optional
  `PoolClient` as the LAST parameter defaulting to the shared pool, a
  private `mapRow` snake_case→camelCase helper, and an
  `isNotificationStatus` type guard that falls back to `PENDING` on an
  unknown status. `updateStatus` sets `read_at = NOW()` only when
  transitioning to `READ` and throws `NotFoundError` when no row matches.
- `notification.service.ts` — `NotificationService` with a single
  `notify(input, client?)` method. It generates a `randomUUID()` id, sets
  `createdAt` at write time, forces `status = 'PENDING'` and
  `readAt = null`, and delegates to `repository.create` passing the
  client through. It enforces the related-entity invariant:
  `relatedEntityType` and `relatedEntityId` must be BOTH present or BOTH
  absent — a partially-set pair (exactly one provided) throws
  `ValidationError` (code `VALIDATION_ERROR`, 400) before persisting;
  otherwise absent fields are coerced to `null`. The service exposes only
  `notify` — the repository's `updateStatus`/`findByRecipient` are not
  yet surfaced through a service method.

The module depends only on `src/shared/types/` (for `NotFoundError` and
`ValidationError`) and `src/shared/db/connection.ts` — no cross-module
imports. Unit tests mock the shared `pg` pool and cover the `mapRow`
status fallback, the optional-client passthrough, `findByRecipient`
ordering + status filter, `updateStatus`'s `read_at` behavior and
`NotFoundError`, and the service's id/`createdAt` generation,
`PENDING`/`readAt=null` defaults, the both-or-null related-entity
validation (partial pairs rejected with `ValidationError`), and client
passthrough.

<!-- gestalt:architecture feature=dd1a6d9f-1b67-4054-9579-5cb7ccee58f3 START -->
# Leave Management Module — Reconciled Architecture

## Stack
TypeScript 20, Fastify, PostgreSQL, modular monolith, Jest. React Native consumes the API but is not part of this backend module.

## Domain Entities
- **Employee**: ACTIVE | INACTIVE | TERMINATED. Attributes: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus.
- **LeaveRequest**: DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED. Central aggregate. Attributes include employeeId, leaveTypeId, startDate, endDate, reason, status, approvedBy/At, rejectedBy/At/rejectionReason, cancelledBy/At, createdAt, updatedAt.
- **LeaveType**: ACTIVE | INACTIVE. code: annual | sick | emergency | unpaid | maternity | paternity; isPaid, requiresManagerApproval, isActive.
- **LeavePolicy**: ACTIVE | INACTIVE. policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive.
- **LeaveBalance**: ACTIVE | EXHAUSTED | CLOSED. employeeId, policyId, fiscalYear, totalEntitlement, usedDays, pendingDays, remainingDays, status.
- **Notification**: PENDING | SENT | READ | ARCHIVED.
- **AuditLog**: immutable, no lifecycle.

## Binding Rules
- Duration = endDate - startDate + 1 calendar days, inclusive, used uniformly for reservation/deduction/sufficiency.
- On SUBMITTED reserve durationDays in pendingDays; on APPROVED move pendingDays to usedDays; on REJECTED/CANCELLED release pendingDays.
- Sufficiency check: remainingDays >= durationDays; unpaid leave exempt.
- Manager-only approval (no self-approval); elevated hr_admin allowed.
- minimumNoticeDays applies except emergency leave.
- Cancellation allowed by employee in SUBMITTED or APPROVED; after APPROVED releases used days.
- Every state-changing operation writes AuditLog.
- Fiscal year identified by calendar year in which it ends; request fiscal year derived from startDate.

## Conceptual Tables
- employees (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at)
- leave_types (id, code, name, is_paid, requires_manager_approval, is_active, created_at, updated_at)
- leave_policies (id, policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
- leave_requests (id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, cancelled_by, cancelled_at, created_at, updated_at)
- leave_balances (id, employee_id, policy_id, fiscal_year, total_entitlement, used_days, pending_days, remaining_days, status, created_at, updated_at)
- audit_logs (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at)
- notifications (id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at)

## Modules
- shared-types: src/shared/types/
- leave: src/modules/leave/
- balance: src/modules/balance/
- employee: src/modules/employee/
- policy: src/modules/policy/
- leave-type: src/modules/leave-type/
- notification: src/modules/notification/
- audit: src/modules/audit/

## Dependency Map
leave -> balance, policy, employee, notification, audit, leave-type, shared-types
policy -> leave-type, shared-types
balance, employee, notification, audit, leave-type -> shared-types

## Cross-cutting Contracts
- **Auth**: request.user { id, role: UserRole }; UserRole = employee | manager | hr_admin; JWT bearer; requireRole guard.
- **Error**: { error, code }; 400 validation, 401 auth, 403 authorization, 404 not found, 422 insufficient balance/policy violation.
- **Transaction**: approval/rejection atomic across leave_requests, leave_balances, audit_logs; optional PoolClient param; service owns BEGIN/COMMIT/ROLLBACK.

## Phases
1. Shared types & value objects
2. Leaf modules: employee, leave-type, policy, balance, audit
3. Notification module
4. Leave module (orchestrator) + routes/controller

## Open Questions
See openQuestions field.
<!-- gestalt:architecture feature=dd1a6d9f-1b67-4054-9579-5cb7ccee58f3 END -->
