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

**policy** — `LeavePolicy` model with the canonical fields (id, leaveTypeCode: LeaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom: Date, effectiveTo: Date|null, status). `IPolicyRepository` (create, findById, findAll) + `PgLeavePolicyRepository` (generates `id` via `randomUUID()`). `IPolicyService` (createLeavePolicy, getLeavePolicyById) + `PolicyService` validates numeric fields, effectiveFrom <= effectiveTo, and status; NotFoundError(404) on unknown id.

**Divergences from the plan worth noting:**
- `LeavePolicyStatus` (DRAFT | ACTIVE | SUPERSEDED) is declared as a **local enum in `policy.model.ts`**, not in `src/shared/types/index.ts` — unlike EmployeeRole/EmploymentStatus/LeaveTypeCode which live in shared types. The lifecycle states are canonical but the enum type itself is module-local.
- `PolicyService` takes an injected `ILeaveTypeService` (constructor dependency) and calls `getLeaveTypeByCode` to enforce the invariant that `leaveTypeCode` references an existing leave type — a cross-module dependency through the public entry point, throwing NotFoundError(404) when the code is unknown.
- No audit-log writes (GP-002) and no routes/controllers/RBAC for these modules — both are explicitly out of scope for this phase (audit is Phase 3; routes are deferred).
- Repositories accept an optional trailing `PoolClient` and fall back to the shared pool when omitted (per the AGENTS.md transaction-boundary decision), though none of these reference-data services open a transaction yet.

Jest unit tests under `tests/unit/modules/` cover each service with in-memory fake repositories (and a fake `ILeaveTypeService` for policy): create/retrieve happy paths plus ValidationError/ConflictError/NotFoundError semantics.

### Phase 3 delivered (audit and notification modules)

Two modules, each under `src/modules/<name>/` with the same split-file layout as Phase 2 (model, repository interface, repository, service interface, service, `index.ts`).

**audit** — `AuditLog` model (id, actorId, action: AuditAction, entityType, entityId, beforeState: `unknown | null`, afterState: `unknown | null`, occurredAt: Date). `CreateAuditLogInput = Omit<AuditLog, 'id' | 'occurredAt'>` — the repository generates `id` via `randomUUID()` and stamps `occurredAt`. `IAuditRepository` (create, findById) + `PgAuditLogRepository` (JSON-stringifies `beforeState`/`afterState` for the `before_state`/`after_state` columns, maps snake_case rows). `IAuditService` (record, getById) + `AuditService` validates non-empty `actorId`/`entityType`/`entityId` and `AuditAction` enum membership (ValidationError), throws NotFoundError(404) on unknown id.

**notification** — `Notification` model (id, recipientId, type, title, message, relatedEntityType: `string | null`, relatedEntityId: `string | null`, status: NotificationStatus, createdAt: Date, readAt: `Date | null`). `CreateNotificationInput = Omit<Notification, 'id' | 'status' | 'createdAt' | 'readAt'> & { status?: NotificationStatus }` — status defaults to PENDING when omitted. `INotificationRepository` (create, findById, updateStatus) + `PgNotificationRepository` (generates `id`/`createdAt`, defaults status to PENDING, `read_at` null on create). `INotificationService` (create, getById, markRead) + `NotificationService` validates required strings and status enum membership; `markRead` sets status READ and `readAt` to now, throwing NotFoundError(404) on unknown id.

**Divergences from the plan worth noting:**
- `beforeState`/`afterState` are typed `unknown | null` (not a specific shape) and `relatedEntityType`/`relatedEntityId` are nullable — the plan's field list did not specify nullability; the implementation chose nullable/unknown to reflect optional audit deltas and optional notification linkage.
- `NotificationService` adds a `markRead` operation (status → READ + `readAt`) beyond the plan's create/retrieve scope.
- Both repositories accept an optional trailing `PoolClient` (transaction-boundary support per AGENTS.md). `NotificationService.create` accepts and forwards an optional trailing `PoolClient` to the repository so the insert joins the caller's transaction; `AuditService.record` does not yet forward a client and remains single-step. Neither service opens BEGIN/COMMIT/ROLLBACK itself — that stays exclusively in PgUnitOfWork.
- No audit-log writes (GP-002) and no routes/controllers/RBAC for these modules — out of scope for this phase (routes deferred).

Jest unit tests under `tests/unit/modules/` cover each service with in-memory fake repositories: create/retrieve happy paths, ValidationError on empty/invalid fields, NotFoundError on unknown id, and (notification) `markRead` semantics plus client-forwarding on `create`.

### Open questions
Day-count calendar vs business days; accrual model; carry-forward cap; migration mechanism; controller layer; BullMQ for notifications.
<!-- gestalt:architecture feature=babd3932-368b-46a5-a4dc-6dccaafd84ba END -->
