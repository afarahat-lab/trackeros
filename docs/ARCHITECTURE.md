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
src/modules/audit-log/audit-log.{model,repository}.ts
src/modules/employee/employee.{model,repository,service.interface,service}.ts
src/modules/leave-balance/leave-balance.{model,repository}.ts
src/modules/leave-policy/leave-policy.{model,repository,service.interface,service}.ts
src/modules/leave-request/leave-request.{model,repository}.ts
src/modules/notification/notification.{model,repository}.ts
src/modules/status/    — system status module (health-check)
src/modules/uptime/    — uptime module
src/shared/db/connection.ts
src/shared/types/leave.types.ts    — shared TypeScript enums (LeaveType, LeaveRequestStatus, AuditAction, NotificationType, NotificationStatus, EmploymentStatus, BalanceStatus)
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

<!-- gestalt:architecture feature=73542714-9897-4d99-9509-1a7bb9190c33 START -->
# Leave Management Module — Reconciled Architecture

## Domain Entities

- **LeaveRequest**: id, employeeId, leaveType (LeaveType), startDate, endDate, reason, status (LeaveRequestStatus), approvedBy, approvedAt, createdAt, updatedAt. Lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED); any non-terminal → CANCELLED.
- **LeavePolicy**: id, policyName, leaveType, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt. Lifecycle: ACTIVE ↔ INACTIVE.
- **LeaveBalance**: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status (ACTIVE | EXHAUSTED | CLOSED), createdAt, updatedAt. Lifecycle: ACTIVE → EXHAUSTED (when remainingDays=0); ACTIVE/EXHAUSTED → CLOSED (fiscal-year rollover).
- **Employee**: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus (ACTIVE | INACTIVE | TERMINATED), createdAt, updatedAt, deletedAt. Lifecycle: ACTIVE → INACTIVE → TERMINATED.
- **Notification**: id, recipientId, type (LEAVE_SUBMITTED | LEAVE_APPROVED | LEAVE_REJECTED | LEAVE_CANCELLED | BALANCE_EXHAUSTED), title, message, relatedEntityType, relatedEntityId, status (PENDING | SENT | READ | ARCHIVED), createdAt, readAt.
- **AuditLog**: id, entityType, entityId, action (AuditAction), oldValues, newValues, performedBy, performedAt, ipAddress, userAgent, createdAt. Immutable.
- **LeaveType**: enum (annual | sick | emergency | unpaid | maternity | paternity). Feature scope: annual, sick, emergency.

## Business Rules (binding)

1. Day count: `(endDate - startDate) + 1` calendar days, inclusive. Applied uniformly.
2. Submission requires employee ACTIVE status.
3. Approval requires approver = employee.managerId and MANAGER role; self-approval prohibited.
4. Approval requires ACTIVE LeaveBalance with remainingDays >= requested days.
5. On APPROVED: balance.usedDays += days, remainingDays -= days; if remainingDays=0 → EXHAUSTED.
6. On CANCELLED (from APPROVED): balance.usedDays -= days, remainingDays += days; if was EXHAUSTED → ACTIVE.
7. Rejection: no balance impact.
8. Cancellation allowed from DRAFT, SUBMITTED, APPROVED; only by employee.
9. Minimum notice: if policy.minimumNoticeDays set, (startDate - today) >= minimumNoticeDays (calendar days, today excluded).
10. Overlap prevention: no two SUBMITTED/APPROVED requests with overlapping date ranges.
11. Notifications triggered on: DRAFT→SUBMITTED (manager), SUBMITTED→APPROVED (employee), SUBMITTED→REJECTED (employee), any→CANCELLED (manager if previously SUBMITTED/APPROVED), balance→EXHAUSTED (employee).

## Module Boundaries

- **SharedTypes** (`src/shared/types/`): enums (LeaveType, LeaveRequestStatus, AuditAction, NotificationType, NotificationStatus, EmploymentStatus, BalanceStatus).
- **AuditLog** (`src/modules/audit-log/`): model, repository (PgAuditLogRepository), service.
- **Employee** (`src/modules/employee/`): model, repository (PgEmployeeRepository), service interface (IEmployeeService: findById, findByManagerId, isActive, getManagerId), service (EmployeeService — thin read-only wrapper over IEmployeeRepository; isActive checks employmentStatus === ACTIVE; getManagerId returns managerId verbatim or null).
- **LeavePolicy** (`src/modules/leave-policy/`): model, repository (PgLeavePolicyRepository), service interface (ILeavePolicyService: findByLeaveType, getEntitlement, requiresManagerApproval, getMinimumNoticeDays), service (LeavePolicyService — thin read-only wrapper over ILeavePolicyRepository; getEntitlement/requiresManagerApproval/getMinimumNoticeDays filter to isActive === true and return null when no active policy exists).
- **LeaveBalance** (`src/modules/leave-balance/`): model, repository (PgLeaveBalanceRepository), service.
- **LeaveRequest** (`src/modules/leave-request/`): model, repository (PgLeaveRequestRepository), service, controller, routes (Fastify). Sole API surface.
- **Notification** (`src/modules/notification/`): model, repository (PgNotificationRepository), service (fire-and-forget side effect).

## Dependency Map

- AuditLog → SharedTypes
- Employee → SharedTypes
- LeavePolicy → SharedTypes
- LeaveBalance → SharedTypes, LeavePolicy
- Notification → SharedTypes
- LeaveRequest → SharedTypes, LeavePolicy, LeaveBalance, AuditLog, Notification, Employee

## Conceptual Tables

- **leave_requests**: id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at. PK: id. FKs: employee_id→employees.id, approved_by→employees.id. Indexes: employee_id, status, (start_date, end_date), leave_type, (employee_id, status).
- **leave_balances**: id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at. PK: id. FKs: employee_id→employees.id, policy_id→leave_policies.id. Indexes: employee_id, (employee_id, fiscal_year), policy_id, (employee_id, policy_id, fiscal_year).
- **leave_policies**: id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at. PK: id. Indexes: leave_type, is_active.
- **employees**: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at. PK: id. FK: manager_id→employees.id. Indexes: employee_number, email, manager_id, employment_status, department.
- **audit_logs**: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at. PK: id. Indexes: (entity_type, entity_id), performed_by, performed_at, action.
- **notifications**: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at. PK: id. FK: recipient_id→employees.id. Indexes: recipient_id, status, type, created_at.

## Cross-Cutting Contracts

### Auth Contract
- Authenticated request shape: `request.user = { id: string; role: UserRole }`.
- `UserRole = 'employee' | 'manager' | 'hr_admin'`.
- Identity obtained via JWT bearer token verified by `verifyJwt` middleware.
- RBAC enforced by `requireRole(...)` route-level guard, never inline.
- Endpoint access:
  - `POST /leave-requests` → employee
  - `PATCH /leave-requests/:id/approve`, `PATCH /leave-requests/:id/reject` → manager
  - `GET /leave-requests/pending` → manager
  - `GET /leave-requests/team-calendar` → manager
  - `GET /leave-requests`, `GET /leave-requests/:id`, `DELETE /leave-requests/:id` → employee (own) or manager (team)
  - `GET /leave-balances`, `POST /leave-policies` → hr_admin

### Transaction Contract
Multi-step writes (e.g., approve: update leave_requests.status + update leave_balances.used_days/remaining_days) use a caller-controlled transaction pattern. Repository methods that may join a caller's transaction (`updateStatus` on ILeaveRequestRepository, `updateUsedDays` on ILeaveBalanceRepository) accept an optional `PoolClient` parameter. When omitted, the method acquires its own connection from the shared pool. The calling service owns the unit of work: it acquires a client from the pool, executes `BEGIN`, passes the client to each participating repository method, then executes `COMMIT` or `ROLLBACK`. The service must release the client back to the pool in a `finally` block.

### Error Response Contract
Standard error shape: `{ error: string; code: string; details?: unknown }`.
- Validation failure → HTTP 400 `{ error: "...", code: "VALIDATION_ERROR" }`
- Authentication failure → 401 `{ error: "Unauthorized", code: "AUTHENTICATION_REQUIRED" }`
- Authorization failure → 403 `{ error: "Forbidden", code: "INSUFFICIENT_ROLE" }`
- Not found → 404 `{ error: "Leave request not found", code: "NOT_FOUND" }`
- Business rule violation (insufficient balance, overlapping dates, policy max exceeded) → 409 `{ error: "...", code: "BUSINESS_RULE_VIOLATION" }`

## Build Progress

- **Phase 1: Shared types** — ✅ Complete. `src/shared/types/leave.types.ts` delivers all 7 enums (LeaveType, LeaveRequestStatus, AuditAction, NotificationType, NotificationStatus, EmploymentStatus, BalanceStatus).
- **Phase 2: Employee model + repository** — ✅ Complete. `src/modules/employee/employee.model.ts` defines the Employee interface with all fields (id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt). `src/modules/employee/employee.repository.ts` delivers `IEmployeeRepository` (findById, findByManagerId, findAll, create, update, softDelete) and `PgEmployeeRepository` backed by the shared pg pool. All repository methods accept an optional `PoolClient` for caller-controlled transactions. `UniqueConstraintViolationError` (code 23505) is surfaced as a typed error on create. Tests in `tests/unit/modules/employee/employee.repository.test.ts`.
- **Phase 3: LeavePolicy model + repository** — ✅ Complete. `src/modules/leave-policy/leave-policy.model.ts` defines the LeavePolicy interface with all fields (id, policyName, leaveType, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt). `src/modules/leave-policy/leave-policy.repository.ts` delivers `ILeavePolicyRepository` (findById, findByLeaveType, findAllActive) and `PgLeavePolicyRepository` backed by the shared pg pool. All repository methods accept an optional `PoolClient` for caller-controlled transactions. Read-only phase — no create/update/delete operations. Tests in `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`.
- **Phase 4: LeaveBalance model + repository** — ✅ Complete. `src/modules/leave-balance/leave-balance.model.ts` defines the LeaveBalance interface with all fields (id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status, createdAt, updatedAt). `src/modules/leave-balance/leave-balance.repository.ts` delivers `ILeaveBalanceRepository` (findByEmployeeAndPolicy, findByEmployeeAndFiscalYear, findByEmployeeId, create, update, deductDays, restoreDays) and `PgLeaveBalanceRepository` backed by the shared pg pool. All repository methods accept an optional `PoolClient` for caller-controlled transactions. `deductDays` atomically increments usedDays/decrements remainingDays and auto-transitions to EXHAUSTED when remaining reaches 0. `restoreDays` atomically decrements usedDays/increments remainingDays and auto-transitions from EXHAUSTED to ACTIVE when remaining becomes positive. `create` throws `UniqueConstraintViolationError` on duplicate (employee_id, policy_id, fiscal_year). `update` accepts partial updates on `totalEntitlement`, `fiscalYear`, and `status` only — day-count mutations go through `deductDays`/`restoreDays`. Tests in `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`.
- **Phase 5: LeaveRequest model + repository** — ✅ Complete. `src/modules/leave-request/leave-request.model.ts` defines the LeaveRequest interface with all fields (id, employeeId, leaveType, startDate, endDate, reason, status, approvedBy, approvedAt, createdAt, updatedAt). `src/modules/leave-request/leave-request.repository.ts` delivers `ILeaveRequestRepository` (findById, findByEmployeeId, findOverlapping, create, updateStatus, findAllPendingByManagerId) and `PgLeaveRequestRepository` backed by the shared pg pool. All repository methods accept an optional `PoolClient` for caller-controlled transactions. `findOverlapping` filters to SUBMITTED/APPROVED statuses and uses the standard overlap predicate (`start_date <= $endDate AND end_date >= $startDate`). `findAllPendingByManagerId` JOINs the employees table on `manager_id` to resolve direct reports with SUBMITTED requests. `create` maps `undefined` reason to SQL NULL and throws `UniqueConstraintViolationError` on code 23505. `updateStatus` updates only `status` and `updated_at` — it does NOT set `approved_by` or `approved_at` (those are left to the service layer to manage separately). Tests in `tests/unit/modules/leave-request/leave-request.repository.test.ts`.
- **Phase 6: Notification + AuditLog models and repositories** — ✅ Complete. `src/modules/notification/notification.model.ts` defines the Notification interface (id, recipientId, type, title, message, relatedEntityType, relatedEntityId, status, createdAt, readAt). `src/modules/notification/notification.repository.ts` delivers `INotificationRepository` (create, findByRecipientId, markAsSent, markAsRead) and `PgNotificationRepository` backed by the shared pg pool. All repository methods accept an optional `PoolClient` for caller-controlled transactions. `markAsSent` sets status to SENT; `markAsRead` sets status to READ and stamps `read_at` via `NOW()`. Both return `null` when no row matches. `src/modules/audit-log/audit-log.model.ts` defines the AuditLog interface (id, entityType, entityId, action, oldValues, newValues, performedBy, performedAt, ipAddress, userAgent, createdAt). `src/modules/audit-log/audit-log.repository.ts` delivers `IAuditLogRepository` (create, findByEntity, findByPerformedBy) and `PgAuditLogRepository` backed by the shared pg pool. All repository methods accept an optional `PoolClient` for caller-controlled transactions. `oldValues`/`newValues` are serialized to JSON strings on write and parsed back on read. Tests in `tests/unit/modules/notification/notification.repository.test.ts` and `tests/unit/modules/audit-log/audit-log.repository.test.ts`.
- **Phase 7: EmployeeService + LeavePolicyService** — ✅ Complete. `src/modules/employee/employee.service.interface.ts` defines `IEmployeeService` (findById, findByManagerId, isActive, getManagerId). `src/modules/employee/employee.service.ts` delivers `EmployeeService` — injects `IEmployeeRepository`, delegates all data access, never touches the pg pool. `isActive` returns true iff `employmentStatus === EmploymentStatus.ACTIVE`; returns false for not-found, INACTIVE, or TERMINATED employees. `getManagerId` returns the raw `managerId` (string | null) verbatim, including null for top-level employees and null when the employee is not found. No method throws on a missing id. `src/modules/leave-policy/leave-policy.service.interface.ts` defines `ILeavePolicyService` (findByLeaveType, getEntitlement, requiresManagerApproval, getMinimumNoticeDays). `src/modules/leave-policy/leave-policy.service.ts` delivers `LeavePolicyService` — injects `ILeavePolicyRepository`, delegates all data access, never touches the pg pool. `getEntitlement`, `requiresManagerApproval`, and `getMinimumNoticeDays` each filter `findByLeaveType` results to `isActive === true`, take the first match, and return a typed `null` when no active policy exists — they never throw on missing policy. `getMinimumNoticeDays` preserves `null` rather than coercing to 0. Both services are read-only lookups with no PoolClient parameters on their interface methods. Tests in `tests/unit/modules/employee/employee.service.test.ts` and `tests/unit/modules/leave-policy/leave-policy.service.test.ts`.
- **Phase 8: LeaveBalanceService** — pending
- **Phase 9: LeaveRequestService** — pending
- **Phase 10: LeaveRequestController, routes, and app wiring** — pending

## Open Questions

1. Fiscal year boundary definition (calendar vs configurable).
2. Cross-fiscal-year request handling (reject, split, or anchor to startDate's fiscal year).
3. Accrual model (upfront grant vs monthly accrual vs prorated).
4. Carry-over rules (forfeit vs cap at maxAccumulation).
5. Manager resolution strategy (Employee service, caller-provided, or JWT claim).
<!-- gestalt:architecture feature=73542714-9897-4d99-9509-1a7bb9190c33 END -->
