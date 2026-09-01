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
src/modules/LeaveStatus/    — LeaveStatus module
src/modules/BaseEntity/    — BaseEntity module
src/modules/LeaveRequest/    — LeaveRequest module
src/modules/LeaveType/    — LeaveType module
src/modules/LeavePolicy/    — LeavePolicy module
src/modules/AuditLog/    — AuditLog module
src/modules/AuditRecord/    — AuditRecord module
src/modules/AuditServiceInterface/    — AuditServiceInterface module
src/shared/db connection.ts
src/shared/base repository.ts
src/shared/error types.ts
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against
- Models are plain interface/type declarations; repository interfaces
  live in `<name>.model.ts` alongside the entity, and service
  interfaces live in a sibling `<name>.service.interface.ts` file.
  Each module's `index.ts` barrel re-exports its model + interfaces
  using `export { X } from './file'` style.

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=b07feb33-7931-41ca-b4f7-c3dc02411147 START -->
## Leave Management Module — Reconciled Architecture

### Stack compliance
TypeScript, Fastify, PostgreSQL, modular monolith. All repository implementations use PostgreSQL via the shared `pg` Pool (`src/shared/db/connection.ts`).

### Canonical decisions
- Balance entity: `LeaveBalance` (not `Balance`).
- Leave request status enum: `LeaveRequestStatus` with values `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` (implemented in `src/shared/types/leave-request-status.ts`). NOTE: this supersedes the earlier reconciled name `LeaveStatus` with `DRAFT`/`SUBMITTED` — the implementation chose `LeaveRequestStatus` with `PENDING` as the initial state; `DRAFT`/`SUBMITTED` are not used.
- Audit entity: `AuditLog` (not `AuditRecord`/`Audit`), table `audit_logs`, repository `AuditLogRepository`/`PgAuditLogRepository`.
- Repository interfaces: `LeaveRequestRepository`, `LeaveBalanceRepository`, `EmployeeRepository`, `LeavePolicyRepository`, `AuditLogRepository`, `NotificationRepository`; concrete PostgreSQL implementations prefixed `Pg`.
- Table names are snake_case; domain entity attributes are camelCase.
- `leave_requests.leave_type_id` is a string enum value (`LeaveType`), not a foreign key to `leave_policies`; the governing policy is resolved by `leave_type` + `is_active`.

### Domain entities and lifecycle states
- `LeaveRequest`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
- `LeaveBalance`: `ACTIVE`, `CLOSED`
- `Employee`: `ACTIVE`, `INACTIVE`, `TERMINATED`
- `LeavePolicy`: `ACTIVE`, `INACTIVE`
- `Notification`: `PENDING`, `SENT`, `READ`, `ARCHIVED`
- `AuditLog`: no lifecycle states
- `LeaveType`: enum (`annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`)

### Business rules (binding)
- Leave duration is inclusive calendar days: `endDate - startDate + 1`.
- A leave request is valid only when `startDate <= endDate`.
- Approving a leave request deducts its inclusive day count from `LeaveBalance.usedDays` and `remainingDays` atomically with the status change, audit record, and notification.
- A leave request cannot be approved if the requested inclusive day count exceeds `remainingDays` for the applicable policy and fiscal year.
- Only the employee's manager (`Employee.managerId`) may approve or reject a leave request.
- Cancelling an `APPROVED` leave request restores the previously deducted days.
- Every state-changing operation on a leave domain entity writes an `AuditLog` record (GP-002).
- A leave request may only be submitted by an employee whose `employmentStatus` is `ACTIVE`.
- A leave request may only reference a `LeavePolicy` whose `isActive` is `true`.

### Conceptual tables
- `leave_requests`: id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at. PK id. FKs employee_id -> employees.id, approved_by -> employees.id. Indexes: employee_id, status, start_date, leave_type_id.
- `leave_balances`: id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at. PK id. FKs employee_id -> employees.id, policy_id -> leave_policies.id. Indexes: employee_id, policy_id, fiscal_year, unique (employee_id, policy_id, fiscal_year).
- `employees`: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at. PK id. FK manager_id -> employees.id. Indexes: manager_id, unique email, unique employee_number.
- `leave_policies`: id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at. PK id. Indexes: leave_type, is_active.
- `audit_logs`: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at. PK id. FK performed_by -> employees.id. Indexes: (entity_type, entity_id), performed_at.
- `notifications`: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at. PK id. FK recipient_id -> employees.id. Indexes: recipient_id, status.

### Modules and dependencies
- `shared-types` (`src/shared/types/`): cross-module enums and shared DTOs.
- `shared-db` (`src/shared/db/`): `IUnitOfWork`, `UnitOfWork`, connection pool.
- `leave` (`src/modules/leave/`): orchestrates approval flow; depends on balance, notification, audit, employee, policy, shared-types, shared-db.
- `balance` (`src/modules/balance/`): balance arithmetic; depends on audit, shared-types, shared-db.
- `employee` (`src/modules/employee/`): employee data; depends on shared-types, shared-db.
- `policy` (`src/modules/policy/`): policy rules; depends on shared-types, shared-db.
- `notification` (`src/modules/notification/`): notifications; depends on shared-types, shared-db.
- `audit` (`src/modules/audit/`): audit logging; depends on shared-types, shared-db.

### Cross-cutting contracts
- **Auth**: `request.user: { id: string; role: UserRole }` populated by a JWT bearer auth middleware (Fastify preHandler). `UserRole` is the enum `EMPLOYEE = 'employee' | MANAGER = 'manager' | HR_ADMIN = 'hr_admin'` (`src/shared/types/user-role.ts`, re-exported from `src/shared/types/index.ts`). RBAC is enforced by the route-level `requireRole(...allowed)` guard (`src/shared/http/require-role.ts`), which augments Fastify's `FastifyRequest` with an optional `user` and returns 401 (`UNAUTHORIZED`) when no user is present and 403 (`FORBIDDEN`) when the role is not allowed.
- **Transaction**: The leave approval flow is a multi-step atomic write: update `leave_requests.status` to `APPROVED`, deduct `used_days` from `leave_balances`, write an `audit_logs` record, and create a notification. Repository methods that must join a caller's transaction take an optional client/executor parameter (defaulting to the shared `pg` Pool when omitted). The service owns the unit of work: it acquires a client from the pool, issues `BEGIN`, passes that client to each repository call (`LeaveRequestRepository.updateStatus`, `LeaveBalanceRepository.deduct`, `AuditLogRepository.create`, `NotificationRepository.create`), then `COMMIT` on success or `ROLLBACK` on any failure.
- **Error response**: Standard error shape `{ error: string; code: string }`. Validation failure → HTTP 400 (`VALIDATION_ERROR`); authentication failure → 401 (`UNAUTHORIZED`); authorization failure → 403 (`FORBIDDEN`); not found → 404 (`NOT_FOUND`). All async errors caught and mapped (GP-006); no unhandled rejections.

### Recommended phases
1. **Shared foundations (types + unit of work)** — ✅ DONE. Established the shared enums/DTOs (`LeaveType`, `LeaveRequestStatus`, `NotificationType`, `AuditAction`, `EntityType`, `LeaveRequestSummary`, `BalanceSnapshot`, `countLeaveDays`) under `src/shared/types/` and the `IUnitOfWork`/`UnitOfWork` contract under `src/shared/db/`. Resolved the status-enum conflict in favor of `LeaveRequestStatus` (`PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`).
2. **Leaf modules: employee, policy, audit** — ✅ DONE (parts 1/3 + 2/3 + 3/3). Models + interfaces (part 1/3): `Employee`/`IEmployeeRepository` (`employee.model.ts`) + `IEmployeeService` (`employee.service.interface.ts`); `LeavePolicy`/`ILeavePolicyRepository` (`policy.model.ts`) + `IPolicyService` (`policy.service.interface.ts`); `AuditLog`/`IAuditLogRepository` (`audit.model.ts`) + `IAuditService` (`audit.service.interface.ts`). Repository + service implementations (part 2/3): `PgEmployeeRepository`/`EmployeeService`, `PgLeavePolicyRepository`/`PolicyService`, `PgAuditLogRepository`/`AuditService`. Routes + unit tests (part 3/3): `employeeRoutes`, `policyRoutes`, `auditRoutes` plus Jest specs for the three services.
3. **balance and notification** — balance ✅ DONE (parts 1/2 + 2/2); notification ✅ DONE (parts 1/2 + 2/2). Balance models + interfaces + repository + service + routes are complete (see implementation notes below). Notification models + interfaces + repository + service + routes are complete (see implementation notes below); Jest specs for both balance and notification services are complete (see implementation notes below).
4. **leave orchestration module** — composes balance, notification, audit, employee, and policy inside a single `IUnitOfWork` transaction. (6 files)

### Implementation notes (leaf modules, part 2/3)
- **Employee**: `PgEmployeeRepository` implements soft delete — `delete()` sets `deleted_at` (never a hard `DELETE`), and all reads filter `deleted_at IS NULL`. `EmployeeService.terminate`/`reactivate` enforce the lifecycle and throw `InvalidEmployeeTransitionError` on an illegal transition (e.g. terminating an already-`TERMINATED` employee). `update`/`terminate`/`reactivate` run through the injected `IUnitOfWork` (when no client is supplied); `create` writes directly through the repository without a transaction.
- **Policy**: `PolicyService.create` validates `leaveType` against the `LeaveType` enum and throws `InvalidLeaveTypeError` on an unknown value; `create`/`update` validate `entitlementDays` as a non-negative integer and throw `InvalidEntitlementDaysError` on violation. `activate`/`deactivate` toggle `isActive`. NOTE (divergence): the repository persists and filters on a `deleted_at` column (soft delete) even though the `LeavePolicy` model and the conceptual `leave_policies` table above do not declare a `deletedAt` field — the model omits it while the SQL layer adds it.
- **Audit**: `AuditService.record` generates `id`/`createdAt`/`updatedAt` and wraps the insert in `IUnitOfWork.withTransaction` when no client is supplied (joining a caller's transaction via the optional client otherwise); `PgAuditLogRepository.query` supports optional filters (`entityType`, `entityId`, `performedBy`, `from`, `to`). `oldValues`/`newValues` are `Record<string, unknown> | null`; `performedBy` is nullable.

### Implementation notes (leaf modules, part 3/3 — routes + RBAC)
- **Shared RBAC guard**: `requireRole(...allowed: UserRole[])` (`src/shared/http/require-role.ts`) is a Fastify `preHandler` factory. It reads `request.user` (typed via a `declare module 'fastify'` augmentation adding `user?: AuthenticatedUser`), returns 401 `UNAUTHORIZED` when absent, and 403 `FORBIDDEN` when `user.role` is not in `allowed`. `UserRole` is the enum `EMPLOYEE`/`MANAGER`/`HR_ADMIN` in `src/shared/types/user-role.ts`.
- **Route surface (as built)**: each route file instantiates its service with `new Pg*Repository()` + `new UnitOfWork()` and validates inputs with Zod schemas (`safeParse`), returning 400 `VALIDATION_ERROR` on failure. Endpoints and their RBAC:
  - `employeeRoutes`: `GET /employees` (HR_ADMIN), `GET /employees/:id` (HR_ADMIN, MANAGER), `POST /employees` (HR_ADMIN), `PUT /employees/:id` (HR_ADMIN). `InvalidEmployeeTransitionError` maps to 404 `NOT_FOUND`.
  - `policyRoutes`: `GET /policies`, `GET /policies/:id`, `POST /policies`, `PUT /policies/:id` — all HR_ADMIN. `InvalidLeaveTypeError`/`InvalidEntitlementDaysError` map to 400 `VALIDATION_ERROR`.
  - `auditRoutes`: `GET /audit-logs` (HR_ADMIN) with optional query filters (`entityType`, `entityId`, `performedBy`, `from`, `to`) validated by a Zod schema.
  - NOTE (divergence from the earlier cross-cutting RBAC sketch): the implemented leaf-module routes are more restrictive than the aspirational contract above — policy and audit reads are HR_ADMIN-only (not "employee (own) or hr_admin"), and employee reads are HR_ADMIN or MANAGER. The leave/balance/notification routes (which carry the employee-own-resource and manager-approval rules) are not yet built.
- **Tests**: Jest unit specs added for the three services — `tests/unit/modules/employee/employee.service.spec.ts`, `tests/unit/modules/policy/policy.service.spec.ts`, `tests/unit/modules/audit/audit.service.spec.ts`.

### Implementation notes (balance and notification, part 1/2 — models + interfaces + repositories)
- **Balance** (`src/modules/balance/`): `LeaveBalance` entity with `id`, `employeeId`, `policyId`, `totalEntitlement`, `usedDays`, `remainingDays`, `fiscalYear`, `status` (`ACTIVE`|`CLOSED`), `createdAt`, `updatedAt`. The derived-availability rule is encoded as the exported pure function `computeAvailableDays(totalEntitlement, usedDays, pendingDays)` returning `totalEntitlement - usedDays - pendingDays` — it is NEVER stored and MAY go negative (no clamping). NOTE (divergence from the spec's arithmetic text): `pendingDays` is a parameter to `computeAvailableDays` but is NOT a field on `LeaveBalance`; it is supplied by the leave module at approval time. The three stored NON-NEGATIVE counters are `totalEntitlement`, `usedDays`, `remainingDays`; a transition taking any of them below zero throws the typed `NegativeBalanceCounterError` (never a clamp).
- **Balance repository**: `PgLeaveBalanceRepository` implements `ILeaveBalanceRepository` with `create`, `findById`, `findByEmployee`, `deduct`, `restore`. `deduct` increments `used_days` and decrements `remaining_days` guarded by `WHERE remaining_days >= $2` (throws `NegativeBalanceCounterError` when the guard fails); `restore` is the inverse guarded by `WHERE used_days >= $2`. `create` asserts all three counters non-negative. All methods take an optional `PoolClient` last parameter and fall back to the shared `pool` when omitted. snake_case columns: `employee_id`, `policy_id`, `total_entitlement`, `used_days`, `remaining_days`, `fiscal_year`.
- **Notification** (`src/modules/notification/`): `Notification` entity with `id`, `recipientId`, `type` (typed `NotificationType` from `src/shared/types/`), `title`, `message`, `relatedEntityType` (`string | null`), `relatedEntityId` (`string | null`), `status` (`PENDING`|`SENT`|`READ`|`ARCHIVED`), `createdAt`, `readAt` (`Date | null`). `readAt` is only ever set on a transition into `READ`.
- **Notification repository**: `PgNotificationRepository` implements `INotificationRepository` with `create`, `findById`, `findByRecipient`, `markRead`. `markRead` transitions only `PENDING`/`SENT` → `READ` (guarded by `WHERE status IN ('PENDING','SENT')`) and stamps `read_at = NOW()`; any other status throws the typed `InvalidNotificationTransitionError`. snake_case columns: `recipient_id`, `related_entity_type`, `related_entity_id`, `read_at`.
- **Barrels**: `balance/index.ts` re-exports the entity types, `NegativeBalanceCounterError`, `computeAvailableDays`, and `PgLeaveBalanceRepository`; `notification/index.ts` re-exports the entity types, `InvalidNotificationTransitionError`, and `PgNotificationRepository`.

### Implementation notes (balance, part 2/2 — service + routes)
- **BalanceService** (`src/modules/balance/balance.service.ts`): implements `IBalanceService` with `create`, `findById`, `findByEmployee`, `deduct`, `restore`. `create` generates `id`/`createdAt`/`updatedAt` and delegates to the repository WITHOUT a transaction; `deduct`/`restore` wrap the repository call in `this.uow.withTransaction(...)`. `findById`/`findByEmployee` accept an optional `PoolClient` last param and pass it through to the repository. NOTE (divergence from the transaction contract): `deduct`/`restore` do NOT accept an optional client parameter — they match the declared `IBalanceService` interface exactly, so they cannot join a caller's (leave module's) transaction; each opens its own unit of work. This is the "keep the interface signature exactly" option from the phase ambiguity, not the `AuditService.record` precedent.
- **Balance routes** (`src/modules/balance/balance.routes.ts`): instantiates `BalanceService(new PgLeaveBalanceRepository(), new UnitOfWork())` and validates inputs with Zod `safeParse` (400 `VALIDATION_ERROR`). Endpoints and RBAC:
  - `GET /balances/:id` (HR_ADMIN, MANAGER) → 404 `NOT_FOUND` when absent.
  - `GET /employees/:employeeId/balances` (HR_ADMIN, MANAGER).
  - `POST /balances` (HR_ADMIN) → 201; `NegativeBalanceCounterError` maps to 400 `VALIDATION_ERROR`.
  - `POST /balances/:id/deduct` (HR_ADMIN) → 200; `NegativeBalanceCounterError` maps to 400.
  - `POST /balances/:id/restore` (HR_ADMIN) → 200; `NegativeBalanceCounterError` maps to 400.
  - NOTE (divergence from the reconciled auth contract): balance reads are HR_ADMIN or MANAGER, NOT "employee (own resource) or HR_ADMIN"; there is no own-resource scoping on the read endpoints. Writes are HR_ADMIN-only.
- **Barrel**: `balance/index.ts` now also re-exports `BalanceService` and `balanceRoutes`.
- **Divergence (GP-002 not realized)**: the balance→audit dependency declared in the reconciled architecture is NOT implemented in this phase. `BalanceService.deduct`/`restore`/`create` do NOT write `AuditLog` records — the service has no `IAuditService` dependency. The audit write for balance mutations remains deferred (the phase spec listed it as a constraint, but the committed implementation chose not to add it; the service constructor takes only `PgLeaveBalanceRepository` + `IUnitOfWork`).

### Implementation notes (notification, part 2/2 — service + routes)
- **NotificationService** (`src/modules/notification/notification.service.ts`): implements `INotificationService` with `create`, `markRead`, `findByRecipient`. `create` generates `id`/`createdAt`, sets `status` to `PENDING` and `readAt` to `null`, and delegates to the repository WITHOUT a transaction (mirroring `BalanceService.create`). `markRead` wraps the repository `markRead` call in `this.uow.withTransaction(...)`; an `InvalidNotificationTransitionError` raised by the repository propagates unchanged. `findByRecipient` accepts an optional `PoolClient` last param and passes it through to the repository (falling back to the shared pool when omitted). The constructor takes `PgNotificationRepository` + `IUnitOfWork` and never imports the pool or a pg client.
- **Notification routes** (`src/modules/notification/notification.routes.ts`): instantiates `NotificationService(new PgNotificationRepository(), new UnitOfWork())` and validates inputs with Zod `safeParse` (400 `VALIDATION_ERROR`). Endpoints and RBAC (resolved from the phase ambiguity to "mirror balance routes"):
  - `POST /notifications` (HR_ADMIN) → 201.
  - `POST /notifications/:id/read` (HR_ADMIN, MANAGER) → 200; `InvalidNotificationTransitionError` maps to 404 `NOT_FOUND`.
  - `GET /notifications/recipient/:recipientId` (HR_ADMIN, MANAGER) → 200 (empty result is a valid `[]`).
  - NOTE (divergence from the phase spec's error-semantics options): the spec allowed `InvalidNotificationTransitionError` to map to either 400 `VALIDATION_ERROR` or 404 `NOT_FOUND`; the implementation chose 404 `NOT_FOUND`.
- **Barrel**: `notification/index.ts` now also re-exports `NotificationService` and `notificationRoutes`.

### Implementation notes (balance and notification — unit tests)
- **Balance spec** (`tests/unit/modules/balance/balance.service.spec.ts`): covers `create` (assigns `id`/`createdAt`/`updatedAt`, delegates to `repo.create`), `findById`/`findByEmployee` (delegate with `undefined` client), `deduct`/`restore` (wrap the repository call in `uow.withTransaction` and pass the fake client), and `NegativeBalanceCounterError` propagation for both below-zero counters and negative `days`. Also covers `computeAvailableDays` directly: derivation `totalEntitlement - usedDays - pendingDays`, negative results are NOT clamped, and `pendingDays` participates in the deduction.
- **Notification spec** (`tests/unit/modules/notification/notification.service.spec.ts`): covers `create` (assigns `id`/`createdAt`, `status='PENDING'`, `readAt=null`, delegates to `repo.create`), `findByRecipient` (delegates with `undefined` client), `markRead` (wraps in `uow.withTransaction` and passes the fake client), and `InvalidNotificationTransitionError` propagation when the notification is not `PENDING`/`SENT`.
- **Conventions**: both specs use `jest.Mocked<I...Repository>` + `jest.Mocked<IUnitOfWork>`, `uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient))` with `fakeClient = {} as PoolClient`, construct services with mocks cast `as unknown as Pg...Repository`, and use relative imports from `tests/unit/modules/...` to `src/modules/...` and `src/shared/db/unit-of-work`. Neither spec references the leave module or `countLeaveDays` (neither service uses it).
- **Deferred**: notification route registration in `src/app.ts` remains out of scope for this phase.

### Open questions
See the reconciled `openQuestions` list for unresolved foundational semantics (partial-day granularity, remaining_days bounding, PLAN.md drift). The shared-types surface is now established by Phase 1.
<!-- gestalt:architecture feature=b07feb33-7931-41ca-b4f7-c3dc02411147 END -->
