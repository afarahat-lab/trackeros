# PLAN.md

## Phase 1: Phase 1: Shared types and base repository

Create the foundational shared types and base repository.

Files to create:
- `src/shared/types/index.ts` — Define and export the three enums exactly as specified: `LeaveType` (values: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'), `LeaveRequestStatus` (values: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'), `UserRole` (values: 'employee' | 'manager' | 'hr_admin').
- `src/shared/base-repository.ts` — Abstract base class providing common PostgreSQL query helpers using the `pool` from `src/shared/db/connection.ts`. Include methods: `query(text, params)`, `findById(table, id)`, `findAll(table)`, `insert(table, data)`, `update(table, id, data)`, `delete(table, id)`. Use TypeScript generics. No `any` types — use `unknown` with type guards.

Existing files to read before generating: `src/shared/db/connection.ts` (for the pool export).

Include Jest unit tests in `tests/unit/shared/base-repository.test.ts`.

## Phase 2: Phase 2: Employee model + repository

Create the Employee domain model and repository.

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` entity interface with exact fields: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string | null, hireDate: Date, terminationDate: Date | null, employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED', createdAt: Date, updatedAt: Date, deletedAt: Date | null.
- `src/modules/employee/employee.repository.interface.ts` — Define `IEmployeeRepository` interface with methods: findById(id), findByEmployeeNumber(employeeNumber), findByEmail(email), findByManagerId(managerId), findAll(), create(employee), update(id, employee), softDelete(id).
- `src/modules/employee/employee.repository.ts` — Implement `PgEmployeeRepository` class implementing IEmployeeRepository, extending the base repository from `src/shared/base-repository.ts`. Use the pool from `src/shared/db/connection.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts`.

## Phase 3: Phase 3: LeavePolicy model + repository

Create the LeavePolicy domain model and repository.

Files to create:
- `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` entity interface with exact fields: id: string, policyName: string, leaveType: LeaveType, entitlementDays: number, accrualRate: number | undefined, maxAccumulation: number | undefined, minimumNoticeDays: number | undefined, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date. Import LeaveType from `src/shared/types/index.ts`.
- `src/modules/leave-policy/leave-policy.repository.interface.ts` — Define `ILeavePolicyRepository` interface with methods: findById(id), findByLeaveType(leaveType), findAllActive(), create(policy), update(id, policy), deactivate(id).
- `src/modules/leave-policy/leave-policy.repository.ts` — Implement `PgLeavePolicyRepository` class implementing ILeavePolicyRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`.

## Phase 4: Phase 4: LeaveBalance model + repository

Create the LeaveBalance domain model and repository.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` entity interface with exact fields: id: string, employeeId: string, policyId: string, totalEntitlement: number, usedDays: number, remainingDays: number, fiscalYear: number, status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED', createdAt: Date, updatedAt: Date.
- `src/modules/leave-balance/leave-balance.repository.interface.ts` — Define `ILeaveBalanceRepository` interface with methods: findById(id), findByEmployeeId(employeeId), findByEmployeeAndPolicy(employeeId, policyId), findByEmployeeAndFiscalYear(employeeId, fiscalYear), create(balance), update(id, balance), upsert(balance).
- `src/modules/leave-balance/leave-balance.repository.ts` — Implement `PgLeaveBalanceRepository` class implementing ILeaveBalanceRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`.

## Phase 5: Phase 5: LeaveRequest model + repository

Create the LeaveRequest domain model and repository.

Files to create:
- `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` entity interface with exact fields: id: string, employeeId: string, leaveTypeId: string, leavePolicyId: string, startDate: Date, endDate: Date, daysCount: number, reason: string | undefined, status: LeaveRequestStatus, approvedBy: string | null, approvedAt: Date | null, cancelledBy: string | null, cancelledAt: Date | null, createdAt: Date, updatedAt: Date. Import LeaveRequestStatus from `src/shared/types/index.ts`.
- `src/modules/leave-request/leave-request.repository.interface.ts` — Define `ILeaveRequestRepository` interface with methods: findById(id), findByEmployeeId(employeeId), findByEmployeeAndStatus(employeeId, status), findOverlapping(employeeId, startDate, endDate), findPendingByManagerId(managerId), findAll(filters), create(request), update(id, request), updateStatus(id, status, metadata).
- `src/modules/leave-request/leave-request.repository.ts` — Implement `PgLeaveRequestRepository` class implementing ILeaveRequestRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.repository.test.ts`.

## Phase 6: Phase 6: AuditLog model + repository

Create the AuditLog domain model and repository.

Files to create:
- `src/modules/audit/audit.model.ts` — Define the `AuditLog` entity interface with exact fields: id: string, entityType: string, entityId: string, action: string, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, performedBy: string | null, performedAt: Date, ipAddress: string | null, userAgent: string | null, createdAt: Date.
- `src/modules/audit/audit.repository.interface.ts` — Define `IAuditLogRepository` interface with methods: findById(id), findByEntity(entityType, entityId), findByPerformedBy(performedBy, limit?), create(entry), findAll(filters).
- `src/modules/audit/audit.repository.ts` — Implement `PgAuditLogRepository` class implementing IAuditLogRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/audit/audit.repository.test.ts`.

## Phase 7: Phase 7: Notification model + repository

Create the Notification domain model and repository.

Files to create:
- `src/modules/notification/notification.model.ts` — Define the `Notification` entity interface with exact fields: id: string, recipientId: string, type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED', title: string, message: string, relatedEntityType: 'LeaveRequest', relatedEntityId: string, status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED', createdAt: Date, readAt: Date | null.
- `src/modules/notification/notification.repository.interface.ts` — Define `INotificationRepository` interface with methods: findById(id), findByRecipient(recipientId, status?), create(notification), updateStatus(id, status), markAsRead(id), findByRelatedEntity(entityType, entityId).
- `src/modules/notification/notification.repository.ts` — Implement `PgNotificationRepository` class implementing INotificationRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/notification/notification.repository.test.ts`.

## Phase 8: Phase 8: EmployeeService + LeavePolicyService

Create the Employee and LeavePolicy service layers.

Files to create:
- `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` interface with methods: findById(id), findByEmployeeNumber(employeeNumber), findByEmail(email), getDirectReports(managerId), isManagerOf(managerId, employeeId), createEmployee(data), updateEmployee(id, data), terminateEmployee(id).
- `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing IEmployeeService. Inject IEmployeeRepository. Delegate to repository with input validation.
- `src/modules/leave-policy/leave-policy.service.interface.ts` — Define `ILeavePolicyService` interface with methods: findById(id), findByLeaveType(leaveType), getAllActive(), getEntitlementDays(policyId), requiresManagerApproval(policyId), getMinimumNoticeDays(policyId), createPolicy(data), updatePolicy(id, data), deactivatePolicy(id).
- `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class implementing ILeavePolicyService. Inject ILeavePolicyRepository. Delegate to repository with validation.

This phase depends on:
- `src/modules/employee/employee.model.ts`, `src/modules/employee/employee.repository.interface.ts`, `src/modules/employee/employee.repository.ts` from Phase 2
- `src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.interface.ts`, `src/modules/leave-policy/leave-policy.repository.ts` from Phase 3
- `src/shared/types/index.ts` from Phase 1

Read all dependency files before generating.

Include Jest unit test in `tests/unit/modules/employee/employee.service.test.ts`.

## Phase 9: Phase 9: LeaveBalanceService + LeaveRequestService

Create the LeaveBalance and LeaveRequest service layers with core business logic.

Files to create:
- `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService` interface with methods: getBalance(employeeId, policyId), getBalancesForEmployee(employeeId), getBalancesForFiscalYear(employeeId, fiscalYear), initializeBalance(employeeId, policyId, fiscalYear), getAvailableBalance(employeeId, policyId) — returns entitled - (used + pending), deductDays(employeeId, policyId, days), restoreDays(employeeId, policyId, days).
- `src/modules/leave-balance/leave-balance.service.ts` — Implement `LeaveBalanceService` class implementing ILeaveBalanceService. Inject ILeaveBalanceRepository and ILeavePolicyService. Implement getAvailableBalance using the binding rule: entitled - (used + pending). Implement deductDays and restoreDays for APPROVAL and reject/cancel scenarios.
- `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService` interface with methods: createDraft(employeeId, data), submit(id, employeeId), approve(id, approverId), reject(id, approverId, reason), cancel(id, employeeId), findById(id), findByEmployee(employeeId), findPendingForManager(managerId), findAll(filters).
- `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` class implementing ILeaveRequestService. Inject ILeaveRequestRepository, IEmployeeService, ILeavePolicyService, ILeaveBalanceService. Implement all binding business rules: BUSINESS DAYS ONLY day counting (exclude weekends/holidays), inclusive overlap detection (startA <= endB AND startB <= endA), minimumNoticeDays measured as business days from submission date to startDate, balance check on submission (entitled - (used + pending) >= daysCount), used_days deducted on APPROVAL and restored on reject/cancel of previously-approved, escalate to HR admin when employee has no manager, RBAC enforcement, input validation at all boundaries.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1
- `src/modules/leave-balance/leave-balance.model.ts`, `src/modules/leave-balance/leave-balance.repository.interface.ts`, `src/modules/leave-balance/leave-balance.repository.ts` from Phase 4
- `src/modules/leave-request/leave-request.model.ts`, `src/modules/leave-request/leave-request.repository.interface.ts`, `src/modules/leave-request/leave-request.repository.ts` from Phase 5
- `src/modules/employee/employee.service.interface.ts`, `src/modules/employee/employee.service.ts` from Phase 8
- `src/modules/leave-policy/leave-policy.service.interface.ts`, `src/modules/leave-policy/leave-policy.service.ts` from Phase 8

Read all dependency files before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.service.test.ts` and `tests/unit/modules/leave-request/leave-request.service.test.ts`.

## Phase 10: Phase 10: AuditService, NotificationService, LeaveRequest routes, and app registration

Create the remaining service layers, the main leave-request API routes, and wire everything into the Fastify app.

Files to create:
- `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with methods: logCreate(entityType, entityId, newValues, performedBy, ipAddress?, userAgent?), logUpdate(entityType, entityId, oldValues, newValues, performedBy, ipAddress?, userAgent?), logDelete(entityType, entityId, oldValues, performedBy, ipAddress?, userAgent?), findByEntity(entityType, entityId), findByPerformer(performedBy, limit?).
- `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing IAuditService. Inject IAuditLogRepository. Each log method creates an AuditLog entry with action ('CREATE' | 'UPDATE' | 'DELETE'), performedAt set to now, and the provided metadata.
- `src/modules/notification/notification.service.interface.ts` — Define `INotificationService` interface with methods: notifyLeaveSubmitted(leaveRequest), notifyLeaveApproved(leaveRequest), notifyLeaveRejected(leaveRequest, reason), notifyLeaveCancelled(leaveRequest), getNotificationsForUser(recipientId), markAsRead(notificationId).
- `src/modules/notification/notification.service.ts` — Implement `NotificationService` class implementing INotificationService. Inject INotificationRepository. Each notify method creates a Notification with the appropriate type, title, message, relatedEntityType='LeaveRequest', relatedEntityId, and status='PENDING'.
- `src/modules/leave-request/leave-request.routes.ts` — Define Fastify routes for the leave-request API. Endpoints: POST /leave-requests (create draft), PUT /leave-requests/:id/submit (submit), PUT /leave-requests/:id/approve (manager/HR approve), PUT /leave-requests/:id/reject (manager/HR reject), PUT /leave-requests/:id/cancel (employee cancel), GET /leave-requests/:id, GET /leave-requests (list with filters for employee/manager/HR). Enforce RBAC: employee acts on own requests, manager on direct reports, HR admin on all. Validate all inputs with Zod. Inject LeaveRequestService, AuditService, NotificationService. On state transitions, call AuditService to log the change and NotificationService to notify relevant parties.

Existing file to modify:
- `src/app.ts` — Register the leave-request routes via `app.register(leaveRequestRoutes)`. Import from `./modules/leave-request/leave-request.routes`.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1
- `src/modules/audit/audit.model.ts`, `src/modules/audit/audit.repository.interface.ts`, `src/modules/audit/audit.repository.ts` from Phase 6
- `src/modules/notification/notification.model.ts`, `src/modules/notification/notification.repository.interface.ts`, `src/modules/notification/notification.repository.ts` from Phase 7
- `src/modules/leave-request/leave-request.model.ts`, `src/modules/leave-request/leave-request.repository.interface.ts`, `src/modules/leave-request/leave-request.repository.ts` from Phase 5
- `src/modules/leave-request/leave-request.service.interface.ts`, `src/modules/leave-request/leave-request.service.ts` from Phase 9
- `src/app.ts` (existing — read before modifying)

Read all dependency files before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.routes.test.ts`.
