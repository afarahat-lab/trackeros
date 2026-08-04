# PLAN.md

## Phase 1: Phase 1: Shared enums (LeaveType, LeaveRequestStatus)

Create the two shared enum files that every downstream module depends on.

Create `src/shared/types/leave-type.enum.ts` with:
- `LeaveType` enum: ANNUAL, SICK, EMERGENCY

Create `src/shared/types/leave-request-status.enum.ts` with:
- `LeaveRequestStatus` enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED

Include Jest unit tests in `tests/unit/shared/types/` verifying each enum has exactly the members listed above.

No dependencies on any existing module files.

## Phase 2: Phase 2: Employee model + repository

Create the Employee domain model and repository. This phase depends on no prior module files.

Create `src/modules/employee/employee.model.ts` with the Employee entity using the exact canonical fields: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus ('ACTIVE' | 'INACTIVE' | 'TERMINATED'), createdAt, updatedAt, deletedAt.

Create `src/modules/employee/employee.repository.ts` with:
- `IEmployeeRepository` interface declaring: findById(id), findByEmployeeNumber(employeeNumber), findByManagerId(managerId), findByDepartment(department), findActive(), save(employee), update(id, partial), softDelete(id)
- `PgEmployeeRepository` class implementing IEmployeeRepository using the shared db connection at `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/employee/` for both model validation and repository methods (mocked db).

## Phase 3: Phase 3: LeavePolicy model + repository

Create the LeavePolicy domain model and repository.

Create `src/modules/leave-policy/leave-policy.model.ts` with the LeavePolicy entity using the exact canonical fields: id, policyName, leaveType (import LeaveType from `src/shared/types/leave-type.enum.ts` from Phase 1), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt.

Create `src/modules/leave-policy/leave-policy.repository.ts` with:
- `ILeavePolicyRepository` interface declaring: findById(id), findByLeaveType(leaveType), findActive(), findAll(), save(policy), update(id, partial)
- `PgLeavePolicyRepository` class implementing ILeavePolicyRepository using `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/leave-policy/`.

## Phase 4: Phase 4: LeaveBalance model + repository

Create the LeaveBalance domain model and repository. This phase depends on Employee (Phase 2) and LeavePolicy (Phase 3) types for foreign-key references.

Create `src/modules/leave-balance/leave-balance.model.ts` with the LeaveBalance entity using the exact canonical fields: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status ('ACTIVE' | 'CLOSED' | 'FORECAST'), createdAt, updatedAt. Import Employee and LeavePolicy types from their respective modules for reference typing.

Create `src/modules/leave-balance/leave-balance.repository.ts` with:
- `ILeaveBalanceRepository` interface declaring: findById(id), findByEmployeeId(employeeId), findByEmployeeAndPolicy(employeeId, policyId), findByEmployeeAndFiscalYear(employeeId, fiscalYear), save(balance), update(id, partial), incrementUsedDays(id, days) — atomic increment for the materialized balance rule
- `PgLeaveBalanceRepository` class implementing ILeaveBalanceRepository using `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/leave-balance/`.

## Phase 5: Phase 5: LeaveRequest model + repository

Create the LeaveRequest domain model and repository. This phase depends on Phase 1 (LeaveType, LeaveRequestStatus enums), Phase 2 (Employee), and Phase 3 (LeavePolicy).

Create `src/modules/leave-request/leave-request.model.ts` with the LeaveRequest entity using the exact canonical fields: id, employeeId, leavePolicyId, startDate, endDate, reason, status (LeaveRequestStatus from Phase 1), approvedBy, approvedAt, cancelledBy, cancelledAt, createdAt, updatedAt. Import LeaveRequestStatus from `src/shared/types/leave-request-status.enum.ts`.

Create `src/modules/leave-request/leave-request.repository.ts` with:
- `ILeaveRequestRepository` interface declaring: findById(id), findByEmployeeId(employeeId), findByStatus(status), findByEmployeeAndStatus(employeeId, status), findPendingForManager(managerId), save(request), update(id, partial), updateStatus(id, status, metadata)
- `PgLeaveRequestRepository` class implementing ILeaveRequestRepository using `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/leave-request/`.

## Phase 6: Phase 6: Employee service + controller + routes

Build the Employee service, controller, and routes. Depends on Phase 2 (employee model + repository).

Create `src/modules/employee/employee.service.ts` with:
- `IEmployeeService` interface declaring: getById(id), getByEmployeeNumber(employeeNumber), getSubordinates(managerId), getByDepartment(department), isActive(id), getManager(id)
- `EmployeeService` class implementing IEmployeeService, injecting IEmployeeRepository from Phase 2

Create `src/modules/employee/employee.controller.ts` with:
- `EmployeeController` class: request handlers that delegate to IEmployeeService, with RBAC checks (employee sees own record; manager/HR sees subordinates)

Create `src/modules/employee/employee.routes.ts` with:
- Fastify route definitions: GET /employees/:id, GET /employees/by-number/:employeeNumber, GET /employees/:id/subordinates, GET /employees/department/:department

Include Jest unit tests in `tests/unit/modules/employee/` for service and controller.

## Phase 7: Phase 7: LeavePolicy service + controller + routes

Build the LeavePolicy service, controller, and routes. Depends on Phase 3 (LeavePolicy model + repository) and Phase 6 (Employee service for RBAC).

Create `src/modules/leave-policy/leave-policy.service.ts` with:
- `ILeavePolicyService` interface declaring: getById(id), getByLeaveType(leaveType), getActivePolicies(), getAll(), createPolicy(dto), updatePolicy(id, dto), deactivatePolicy(id)
- `LeavePolicyService` class implementing ILeavePolicyService, injecting ILeavePolicyRepository from Phase 3

Create `src/modules/leave-policy/leave-policy.controller.ts` with:
- `LeavePolicyController` class: request handlers with RBAC (HR/admin can manage policies; employees/managers can read active policies)

Create `src/modules/leave-policy/leave-policy.routes.ts` with:
- Fastify route definitions: GET /policies, GET /policies/:id, GET /policies/type/:leaveType, POST /policies, PUT /policies/:id, PATCH /policies/:id/deactivate

Include Jest unit tests in `tests/unit/modules/leave-policy/`.

## Phase 8: Phase 8: LeaveBalance service

Build the LeaveBalance service. Depends on Phase 4 (LeaveBalance model + repository), Phase 2 (Employee), and Phase 3 (LeavePolicy).

Create `src/modules/leave-balance/leave-balance.service.ts` with:
- `ILeaveBalanceService` interface declaring: getBalance(employeeId, policyId), getBalancesForEmployee(employeeId), getBalancesForFiscalYear(employeeId, fiscalYear), initializeBalance(employeeId, policyId, fiscalYear), getRemainingDays(employeeId, policyId) — computed as totalEntitlement - usedDays, hasSufficientBalance(employeeId, policyId, requestedDays) — validates against remainingDays
- `LeaveBalanceService` class implementing ILeaveBalanceService, injecting ILeaveBalanceRepository from Phase 4 and ILeavePolicyRepository from Phase 3 (to read entitlementDays)

This phase does NOT create controller or routes — balance is read/written internally by the LeaveRequest service in Phase 9.

Include Jest unit tests in `tests/unit/modules/leave-balance/`.

## Phase 9: Phase 9: LeaveRequest service + controller + routes

Build the core leave request workflow: service, controller, and routes. Depends on Phase 5 (LeaveRequest model + repository), Phase 6 (Employee service for RBAC/manager lookup), Phase 7 (LeavePolicy service for policy validation), and Phase 8 (LeaveBalance service for balance checks and materialized deductions).

Create `src/modules/leave-request/leave-request.service.ts` with:
- `ILeaveRequestService` interface declaring: submit(dto), approve(requestId, approverId), reject(requestId, approverId, reason), cancel(requestId, cancelledBy), getById(id), getByEmployee(employeeId), getPendingForManager(managerId)
- `LeaveRequestService` class implementing ILeaveRequestService, injecting ILeaveRequestRepository (Phase 5), IEmployeeService (Phase 6), ILeavePolicyService (Phase 7), ILeaveBalanceService (Phase 8)

Business rules to implement in the service:
- submit: validate employee is ACTIVE, validate policy exists and is active, validate minimumNoticeDays if set, validate sufficient balance via ILeaveBalanceService.hasSufficientBalance (business-day count), set status=DRAFT→SUBMITTED, escalate to HR admin if employee has no manager
- approve: validate caller is manager or HR admin, compute business-day count from startDate/endDate (exclude weekends), atomically call ILeaveBalanceRepository.incrementUsedDays within the same transaction, set status=APPROVED, approvedBy, approvedAt
- reject: validate caller is manager or HR admin, set status=REJECTED; if request was previously APPROVED, atomically restore balance
- cancel: validate caller is employee (own request) or manager/HR, set status=CANCELLED; if request was previously APPROVED, atomically restore balance via ILeaveBalanceRepository.incrementUsedDays(id, -days)
- Day counting: business days only (exclude weekends and public holidays). Use a shared utility at `src/shared/utils/business-days.ts` with a function `countBusinessDays(startDate, endDate): number`

Create `src/modules/leave-request/leave-request.controller.ts` with:
- `LeaveRequestController` class: request handlers with RBAC (employee sees/acts on own requests; manager/HR acts on reports)

Create `src/modules/leave-request/leave-request.routes.ts` with:
- Fastify route definitions: POST /leave-requests, GET /leave-requests, GET /leave-requests/:id, GET /leave-requests/pending, PATCH /leave-requests/:id/approve, PATCH /leave-requests/:id/reject, PATCH /leave-requests/:id/cancel

Include Jest unit tests in `tests/unit/modules/leave-request/` covering all workflow transitions and balance deduction/restoration.

## Phase 10: Phase 10: Audit + Notification modules

Build the Audit and Notification modules to complete the leave management feature. Depends on Phase 9 (LeaveRequest service emits events that audit/notification consume).

Create `src/modules/audit/audit.model.ts` with the AuditLog entity using exact canonical fields: id, entityType, entityId, action, oldValues, newValues, performedBy, performedAt, ipAddress, userAgent, createdAt.

Create `src/modules/audit/audit.repository.ts` with:
- `IAuditLogRepository` interface: log(entry), findByEntity(entityType, entityId), findByPerformer(performedBy), findByDateRange(start, end)
- `PgAuditLogRepository` class

Create `src/modules/audit/audit.service.ts` with:
- `IAuditService` interface: recordAudit(entry), getAuditTrail(entityType, entityId)
- `AuditService` class that logs all leave request state transitions (SUBMITTED, APPROVED, REJECTED, CANCELLED)

Create `src/modules/notification/notification.model.ts` with the Notification entity using exact canonical fields: id, recipientId, type, title, message, relatedEntityType, relatedEntityId, status ('PENDING' | 'SENT' | 'READ' | 'ARCHIVED'), createdAt, readAt.

Create `src/modules/notification/notification.repository.ts` with:
- `INotificationRepository` interface: save(notification), findByRecipient(recipientId), findPending(), markSent(id), markRead(id)
- `PgNotificationRepository` class

Create `src/modules/notification/notification.service.ts` with:
- `INotificationService` interface: notify(recipientId, type, title, message, relatedEntityType?, relatedEntityId?)
- `NotificationService` class that sends notifications on leave request events: notify employee on approval/rejection, notify manager on new submission

Include Jest unit tests in `tests/unit/modules/audit/` and `tests/unit/modules/notification/`.
