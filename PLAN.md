# PLAN.md

## Phase 1: Phase 1 — Shared types & value objects (~3 files)

Create the shared-types module under src/shared/types/ (the exact path the architecture's Module Boundaries declare for this module). Create three files:

1. src/shared/types/enums.ts — define and export the enums with EXACT canonical names and members: LeaveTypeCode ('annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'), LeaveRequestStatus ('DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'), UserRole ('employee' | 'manager' | 'hr_admin').

2. src/shared/types/dtos.ts — define and export LeaveRequestDTO, LeaveBalanceDTO, and the FiscalYear value type. FiscalYear is a plain integer calendar year (e.g. 2026) — there is NO configurable fiscal-year start month (binding rule 2). LeaveBalanceDTO must expose the derived availability shape (entitlementDays, usedDays, pendingDays) — never a stored remainingDays field.

3. src/shared/types/errors.ts — define and export shared error types (e.g. NotFoundError, ValidationError, InsufficientBalanceError, OverlapError) used across modules.

No dependencies on other modules. Include Jest unit tests in tests/unit/shared/types/ covering enum values and DTO shape.

## Phase 2: Phase 2 — Leaf modules: employee, leave-type, policy, balance, audit (part 1/3)

Build ONLY the entity models + repository/service interfaces for the five leaf modules (no concrete implementations, no tests — those are parts 2 and 3). Create each file under the exact directory its module declares in the Module Boundaries.

- src/modules/employee/employee.model.ts — Employee entity with EXACT fields: id, employeeNumber, firstName, lastName, email, managerId (string|null), department (string|null), hireDate (Date), terminationDate (Date|null), employmentStatus ('ACTIVE'|'INACTIVE'|'TERMINATED'). Also declare IEmployeeRepository and IEmployeeService interfaces.
- src/modules/leave-type/leave-type.model.ts — LeaveType entity: id, code ('annual'|'sick'|'emergency'|'unpaid'|'maternity'|'paternity'), name, isPaid, requiresManagerApproval, isActive. Also ILeaveTypeRepository.
- src/modules/policy/policy.model.ts — LeavePolicy entity: id, policyName, leaveTypeId, entitlementDays, accrualRate (number|null), maxAccumulation (number|null), minimumNoticeDays (number|null), requiresManagerApproval, isActive, createdAt, updatedAt. Also ILeavePolicyRepository and IPolicyService.
- src/modules/balance/balance.model.ts — LeaveBalance entity: id, employeeId, policyId, fiscalYear (number), totalEntitlement, usedDays, pendingDays, remainingDays, status (BalanceStatus), createdAt, updatedAt. Also BalanceStatus type, ILeaveBalanceRepository, IBalanceService.
- src/modules/audit/audit.model.ts — AuditLog entity: id, entityType, entityId, action ('CREATE'|'UPDATE'|'DELETE'|'APPROVE'|'REJECT'|'CANCEL'|'SUBMIT'), oldValues (Record|null), newValues (Record|null), performedBy (string|null), performedAt. Also IAuditLogRepository and IAuditService.

This phase depends on src/shared/types/enums.ts, src/shared/types/dtos.ts, src/shared/types/errors.ts from Phase 1 — read them before generating any code that references those types. Import every shared type from src/shared/types/ (never a generic location).

## Phase 3: Phase 2 — Leaf modules: employee, leave-type, policy, balance, audit (part 2/3)

Build ONLY the concrete repository + service implementations for the five leaf modules (no tests — part 3). Each file lives in its module's declared directory.

- src/modules/employee/employee.repository.ts (PgEmployeeRepository) + employee.service.ts (EmployeeService).
- src/modules/leave-type/leave-type.repository.ts (PgLeaveTypeRepository).
- src/modules/policy/policy.repository.ts (PgLeavePolicyRepository) + policy.service.ts (PolicyService).
- src/modules/balance/balance.repository.ts (PgLeaveBalanceRepository) + balance.service.ts (BalanceService).
- src/modules/audit/audit.repository.ts (PgAuditLogRepository) + audit.service.ts (AuditService).

BalanceService MUST implement the binding counter semantics: availableDays = entitlementDays - usedDays - pendingDays (ALWAYS derived, never stored). Only permitted writes: SUBMIT n -> pendingDays += n; APPROVE -> pendingDays -= n, usedDays += n; REJECT pending -> pendingDays -= n; CANCEL pending -> pendingDays -= n; CANCEL approved -> usedDays -= n. No counter may go negative — a transition that would go below zero throws an error (never clamps). Negative guards live ONLY in BalanceService. Balance service methods accept the day count n as a parameter (the caller computes n via the shared countLeaveDays helper in the leave module, Phase 4). Repository and service methods take an optional client (unit-of-work) as the LAST parameter and pass it through; when omitted use the shared pool from src/shared/db/connection.ts.

This phase depends on the model/interface files from part 1 (src/modules/employee/employee.model.ts, src/modules/leave-type/leave-type.model.ts, src/modules/policy/policy.model.ts, src/modules/balance/balance.model.ts, src/modules/audit/audit.model.ts) and src/shared/db/connection.ts — read them before generating any code that references their types.

## Phase 4: Phase 2 — Leaf modules: employee, leave-type, policy, balance, audit (part 3/3)

Build ONLY the Jest unit tests for the five leaf modules' repositories and services. Place tests under tests/unit/modules/employee/, tests/unit/modules/leave-type/, tests/unit/modules/policy/, tests/unit/modules/balance/, tests/unit/modules/audit/.

Coverage must include the binding balance counter transitions: reserve on SUBMIT (pendingDays += n), approve (pendingDays -= n, usedDays += n), reject pending (pendingDays -= n), cancel pending (pendingDays -= n), cancel approved (usedDays -= n); the derived availability formula (availableDays = entitlementDays - usedDays - pendingDays); and the negative-guard behavior (a transition that would take a counter below zero throws, never clamps). Mock the pg pool (src/shared/db/connection.ts) — no real database access.

This phase depends on the concrete implementations from part 2 (src/modules/employee/employee.repository.ts + employee.service.ts, src/modules/leave-type/leave-type.repository.ts, src/modules/policy/policy.repository.ts + policy.service.ts, src/modules/balance/balance.repository.ts + balance.service.ts, src/modules/audit/audit.repository.ts + audit.service.ts) — read them before writing tests so assertions match the actual method signatures.

## Phase 5: Phase 3 — Notification module (~3 files)

Create the notification module under src/modules/notification/ (the exact path its Module Boundary declares).

- src/modules/notification/notification.model.ts — Notification entity with EXACT fields: id, recipientId, type, title, message, relatedEntityType (string|null), relatedEntityId (string|null), status ('PENDING'|'SENT'|'READ'|'ARCHIVED'), createdAt, readAt (Date|null). Also declare INotificationRepository and INotificationService interfaces.
- src/modules/notification/notification.repository.ts — PgNotificationRepository implementing INotificationRepository, using the shared pool from src/shared/db/connection.ts (optional client param as last argument).
- src/modules/notification/notification.service.ts — NotificationService implementing INotificationService.

Include Jest unit tests in tests/unit/modules/notification/ (mock the pg pool). This phase depends on src/shared/db/connection.ts and src/shared/types/errors.ts from Phase 1 — read them before generating code.

## Phase 6: Phase 4 — Leave module (orchestrator) + routes/controller (~6 files)

Create the leave module (the orchestrator) under src/modules/leave/ plus its controller and routes.

- src/modules/leave/leave.model.ts — LeaveRequest entity with EXACT fields: id, employeeId, leaveTypeId, startDate, endDate, reason (string|undefined), status (LeaveRequestStatus), approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, createdAt, updatedAt. Also declare ILeaveRequestRepository and ILeaveService. Implement the shared helper countLeaveDays(startDate, endDate) HERE (binding rule 1): returns endDate - startDate + 1 (calendar days, inclusive of both ends, no weekend/holiday exclusion). This is the ONLY day-count implementation — every call site uses it.
- src/modules/leave/leave.repository.ts — PgLeaveRequestRepository (optional client param as last argument).
- src/modules/leave/leave.service.ts — LeaveService orchestrating submit/approve/reject/cancel. Compute n via countLeaveDays once per operation. On APPROVE: enforce sufficiency (n <= availableDays) and overlap (no intersecting APPROVED request for the same employee, regardless of leave type) in the same place. Derive the balance year from startDate once (binding rule 4 — a request crossing 31 Dec is charged in full to its startDate's year; never split). Every status change + balance counter change + audit write runs through the SAME unit-of-work client in ONE transaction (pass the client through to balance and audit services).
- src/modules/leave/leave.controller.ts and src/modules/leave/leave.routes.ts — Fastify routes/controller.
- Register the routes in src/app.ts (read it first; it currently registers uptimeRoutes).

Include Jest unit tests in tests/unit/modules/leave/ (mock repositories/services). This phase depends on: src/shared/types/* (Phase 1), the balance service + audit service (Phase 2 part 2), and the notification service (Phase 3) — read src/modules/balance/balance.service.ts, src/modules/audit/audit.service.ts, src/modules/notification/notification.service.ts, and src/app.ts before generating code that references them.
