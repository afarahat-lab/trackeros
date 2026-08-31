# PLAN.md

## Phase 1: Phase 1 — Shared foundations (types + unit of work)

Build the shared foundations under the exact module paths declared in the Module Boundaries.

Create src/shared/types/ with the cross-module enums and shared value types, each in its own file, plus an index.ts barrel re-exporting all of them:
- LeaveType enum: annual, sick, emergency, unpaid, maternity, paternity (src/shared/types/leave-type.ts)
- LeaveRequestStatus enum: PENDING, APPROVED, REJECTED, CANCELLED (src/shared/types/leave-request-status.ts) — NOTE: the canonical name is LeaveRequestStatus, NOT LeaveStatus.
- NotificationType enum (src/shared/types/notification-type.ts)
- AuditAction enum (src/shared/types/audit-action.ts)
- EntityType enum (src/shared/types/entity-type.ts)
- LeaveRequestSummary and BalanceSnapshot shared DTO/value types (src/shared/types/leave-request-summary.ts, src/shared/types/balance-snapshot.ts)
- index.ts barrel re-exporting every symbol above.

Also create the shared day-count helper EXACTLY ONCE as a shared exported function countLeaveDays(start: Date, end: Date): number implementing the binding rule days = endDate - startDate + 1 (whole calendar days, inclusive of both ends, no weekend/holiday exclusion, integer result). Place it at src/shared/types/leave-days.ts and re-export from index.ts. No call site may re-derive this inline.

Create the unit-of-work contract and implementation in src/shared/db/:
- src/shared/db/unit-of-work.ts: define IUnitOfWork interface with withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>.
- src/shared/db/unit-of-work.impl.ts: UnitOfWork implementation that opens a client from the existing pool in src/shared/db/connection.ts, runs BEGIN/COMMIT/ROLLBACK, and always releases the client. Read src/shared/db/connection.ts (already exists) before generating — it exports `pool`.

This phase depends on the existing src/shared/db/connection.ts (read it before generating). Include Jest unit tests for countLeaveDays in tests/unit/shared/types/leave-days.spec.ts.

## Phase 2: Phase 2 — Leaf modules: employee, policy, audit (part 1/3)

Build ONLY the models + interfaces (layer 1) for the employee, policy, and audit modules. Do NOT build repositories, services, routes, or tests in this part — those are deferred to parts 2/3.

Create the model files with the canonical entity field shapes (exact field names/types, camelCase in TypeScript):
- src/modules/employee/employee.model.ts: Employee entity with id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus ('ACTIVE'|'INACTIVE'|'TERMINATED'), createdAt, updatedAt, deletedAt. Also define IEmployeeRepository and IEmployeeService interfaces here (or in sibling interface files under src/modules/employee/).
- src/modules/policy/policy.model.ts: LeavePolicy entity with id, policyName, leaveType (import LeaveType from src/shared/types/), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt. Also define ILeavePolicyRepository and IPolicyService interfaces.
- src/modules/audit/audit.model.ts: AuditLog entity (canonical name AuditLog, NOT Audit/AuditRecord) with id, entityType (import EntityType from src/shared/types/), entityId, action (import AuditAction from src/shared/types/), oldValues, newValues, performedBy, performedAt, createdAt, updatedAt. Also define IAuditLogRepository and IAuditService interfaces.

Each module also gets an index.ts barrel exporting its model + interfaces.

This phase depends on Phase 1's src/shared/types/index.ts (for LeaveType, EntityType, AuditAction) — read it before generating any import. Do not reference any repository/service implementation files.

## Phase 3: Phase 2 — Leaf modules: employee, policy, audit (part 2/3)

Build ONLY the concrete repository + service implementations (layer 2) for the employee, policy, and audit modules. Do NOT build routes or tests in this part.

Create:
- src/modules/employee/employee.repository.ts: PgEmployeeRepository implementing IEmployeeRepository. Map camelCase TypeScript fields to snake_case DB columns (employee_number, first_name, last_name, manager_id, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at). All SQL goes through the repository only.
- src/modules/employee/employee.service.ts: EmployeeService implementing IEmployeeService.
- src/modules/policy/policy.repository.ts: PgLeavePolicyRepository implementing ILeavePolicyRepository (snake_case columns: policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active).
- src/modules/policy/policy.service.ts: PolicyService implementing IPolicyService.
- src/modules/audit/audit.repository.ts: PgAuditLogRepository implementing IAuditLogRepository (persisted table audit_logs; snake_case columns: entity_type, entity_id, old_values, new_values, performed_by, performed_at).
- src/modules/audit/audit.service.ts: AuditService implementing IAuditService.

Update each module's index.ts barrel to export the new implementations.

This phase depends on Phase 2 part 1/3 model/interface files (src/modules/employee/employee.model.ts, src/modules/policy/policy.model.ts, src/modules/audit/audit.model.ts) — read them before generating so field names match exactly. Also depends on Phase 1's src/shared/db/unit-of-work.ts and src/shared/db/connection.ts for DB access. Do not reference route files.

## Phase 4: Phase 2 — Leaf modules: employee, policy, audit (part 3/3)

Build ONLY the routes + unit tests (layer 3) for the employee, policy, and audit modules.

Create Fastify route files:
- src/modules/employee/employee.routes.ts: register employee endpoints (list/get/create/update) wired to EmployeeService.
- src/modules/policy/policy.routes.ts: register policy endpoints wired to PolicyService.
- src/modules/audit/audit.routes.ts: register audit-log query endpoints wired to AuditService.

Update each module's index.ts barrel to export the routes.

Include Jest unit tests:
- tests/unit/modules/employee/employee.service.spec.ts
- tests/unit/modules/policy/policy.service.spec.ts
- tests/unit/modules/audit/audit.service.spec.ts

This phase depends on Phase 2 parts 1/3 and 2/3 (model, repository, service files under src/modules/employee/, src/modules/policy/, src/modules/audit/) — read them before generating routes/tests so signatures match exactly. Do not reference the leave, balance, or notification modules.

## Phase 5: Phase 3 — balance and notification (part 1/2)

Build ONLY the models + interfaces + repositories (layer 1) for the balance and notification modules. Do NOT build services, routes, or tests in this part.

Create model files with canonical field shapes:
- src/modules/balance/balance.model.ts: LeaveBalance entity (canonical name LeaveBalance, NOT Balance) with id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status ('ACTIVE'|'CLOSED'), createdAt, updatedAt. Define ILeaveBalanceRepository and IBalanceService interfaces. Include the balance arithmetic rules: availableDays = entitlementDays - usedDays - pendingDays is DERIVED (never stored) and MAY go negative (do NOT clamp); the three stored counters are NON-NEGATIVE and a transition taking usedDays/pendingDays below zero is an ERROR.
- src/modules/notification/notification.model.ts: Notification entity with id, recipientId, type (import NotificationType from src/shared/types/), title, message, relatedEntityType, relatedEntityId, status ('PENDING'|'SENT'|'READ'|'ARCHIVED'), createdAt, readAt. Define INotificationRepository and INotificationService interfaces.

Create repository implementations:
- src/modules/balance/balance.repository.ts: PgLeaveBalanceRepository implementing ILeaveBalanceRepository (snake_case columns: employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year).
- src/modules/notification/notification.repository.ts: PgNotificationRepository implementing INotificationRepository (snake_case columns: recipient_id, related_entity_type, related_entity_id, read_at).

Each module gets an index.ts barrel exporting its model + interfaces + repository.

This phase depends on Phase 1's src/shared/types/index.ts (NotificationType) and src/shared/db/unit-of-work.ts + connection.ts. Read them before generating. Do not reference service/route files.

## Phase 6: Phase 3 — balance and notification (part 2/2)

Build ONLY the services + routes + unit tests (layer 2) for the balance and notification modules.

Create:
- src/modules/balance/balance.service.ts: BalanceService implementing IBalanceService. Enforce the binding rules: availableDays is derived (entitlementDays - usedDays - pendingDays), never stored, may go negative (no clamping); stored counters non-negative; a transition taking usedDays/pendingDays below zero throws an error. Use countLeaveDays from src/shared/types/ for any day counting.
- src/modules/balance/balance.routes.ts: register balance endpoints wired to BalanceService.
- src/modules/notification/notification.service.ts: NotificationService implementing INotificationService.
- src/modules/notification/notification.routes.ts: register notification endpoints wired to NotificationService.

Update each module's index.ts barrel to export services + routes.

Include Jest unit tests:
- tests/unit/modules/balance/balance.service.spec.ts (cover derived availableDays, negative-balance behavior, non-negative counter error)
- tests/unit/modules/notification/notification.service.spec.ts

This phase depends on Phase 3 part 1/2 (balance.model.ts, balance.repository.ts, notification.model.ts, notification.repository.ts) — read them before generating so signatures match exactly. Also depends on Phase 1's src/shared/types/index.ts for countLeaveDays and NotificationType. Do not reference the leave module.

## Phase 7: Phase 4 — leave orchestration module

Build the leave orchestration module, which coordinates the other modules.

Create:
- src/modules/leave/leave.model.ts: LeaveRequest entity with canonical fields id, employeeId, leaveTypeId, startDate, endDate, reason, status (typed LeaveRequestStatus, imported from src/shared/types/), approvedBy, approvedAt, createdAt, updatedAt. Define ILeaveRequestRepository and ILeaveService interfaces.
- src/modules/leave/leave.repository.ts: PgLeaveRequestRepository implementing ILeaveRequestRepository (snake_case columns: employee_id, leave_type_id, start_date, end_date, approved_by, approved_at, created_at, updated_at).
- src/modules/leave/leave.service.ts: LeaveService implementing ILeaveService. Enforce the binding lifecycle: PENDING -> APPROVED | REJECTED, and PENDING | APPROVED -> CANCELLED. At APPROVAL time enforce (a) sufficiency check n <= availableDays (derived, may be negative) and (b) no overlapping APPROVED leave per employee regardless of type. Use countLeaveDays from src/shared/types/ for day counts (whole inclusive calendar days, no weekend/holiday exclusion). The SERVICE owns the unit of work via injected IUnitOfWork.withTransaction(fn); services never touch the pool; participating methods take the client as an optional LAST parameter.
- src/modules/leave/leave.routes.ts: register leave endpoints (apply, approve, reject, cancel, list) wired to LeaveService.
- src/modules/leave/index.ts: barrel exporting model, repository, service, routes.

Include Jest unit tests in tests/unit/modules/leave/leave.service.spec.ts covering the lifecycle transitions, sufficiency check, and overlap check.

This phase depends on Phase 1 (src/shared/types/index.ts for LeaveRequestStatus + countLeaveDays, src/shared/db/unit-of-work.ts), Phase 2 (employee + policy + audit models/repositories), and Phase 3 (balance + notification models/repositories) — read those files before generating so field names and repository signatures match exactly. Do not reference any future-phase files.
