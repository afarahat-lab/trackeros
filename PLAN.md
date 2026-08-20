# PLAN.md

## Phase 1: Phase 1: Foundation – Shared types, Employee, LeavePolicy (part 1/2)

Create the foundational shared enums and the Employee + LeavePolicy domain models with their repository/service interfaces. This is the models+interfaces slice only — NO concrete implementations.

Files to create:

1. `src/shared/types/index.ts` — Define and export all shared enums with EXACT names from the architecture:
   - `LeaveType` enum: `annual`, `sick`, `emergency`
   - `LeaveStatus` enum: `draft`, `submitted`, `approved`, `rejected`, `cancelled`
   - `EmploymentStatus` enum: `active`, `inactive`, `terminated`
   - `BalanceStatus` enum: `active`, `exhausted`
   - `NotificationType` enum: `leave_submitted`, `leave_approved`, `leave_rejected`, `leave_cancelled`
   - `NotificationStatus` enum: `pending`, `sent`, `read`, `archived`

2. `src/modules/employee/employee.model.ts` — Define the `Employee` entity interface with the canonical fields: id, employeeNumber, firstName, lastName, email, managerId (string | null), department (string | null), hireDate (Date), terminationDate (Date | null), employmentStatus (string), createdAt (Date), updatedAt (Date), deletedAt (Date | null). Also define the `IEmployeeRepository` interface with methods: findById(id: string), findByEmployeeNumber(employeeNumber: string), findAll(), create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>), update(id: string, data: Partial<Employee>), softDelete(id: string).

3. `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` entity interface with the canonical fields: id, policyName, leaveType, entitlementDays, accrualRate (number | undefined), maxAccumulation (number | undefined), minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt. Also define `ILeavePolicyRepository` interface with methods: findById, findByLeaveType, findAllActive, create, update. Also define `ILeavePolicyService` interface with methods: getPolicyForLeaveType(leaveType: string), validateEntitlement(employeeId: string, leaveType: string, requestedDays: number).

Import `LeaveType` from `../../shared/types` (relative from src/modules/leave-policy/) for the leaveType field typing.

No tests in this phase — tests come in part 2/2.

## Phase 2: Phase 1: Foundation – Shared types, Employee, LeavePolicy (part 2/2)

Implement the concrete repository classes for Employee and LeavePolicy, plus the LeavePolicy service. This phase depends on the models/interfaces from part 1/2 — read those files before generating any code.

Files to create:

1. `src/modules/employee/employee.repository.ts` — Implement `PgEmployeeRepository` class that satisfies `IEmployeeRepository`. Use the pg Pool from `src/shared/db/connection.ts`. Methods: findById (SELECT by id), findByEmployeeNumber (SELECT by employee_number), findAll (SELECT all where deleted_at IS NULL), create (INSERT returning *), update (UPDATE by id returning *), softDelete (UPDATE deleted_at = NOW()). Use parameterized queries. Import `Employee` and `IEmployeeRepository` from `./employee.model.ts`.

2. `src/modules/leave-policy/leave-policy.repository.ts` — Implement `PgLeavePolicyRepository` class that satisfies `ILeavePolicyRepository`. Use the pg Pool from `src/shared/db/connection.ts`. Methods: findById, findByLeaveType (SELECT by leave_type), findAllActive (SELECT where is_active = true), create, update. Import `LeavePolicy` and `ILeavePolicyRepository` from `./leave-policy.model.ts`.

3. `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class that satisfies `ILeavePolicyService`. Constructor takes `ILeavePolicyRepository`. Implement getPolicyForLeaveType (delegates to repo.findByLeaveType), validateEntitlement (looks up policy, checks requestedDays <= entitlementDays, returns boolean). Import interfaces from `./leave-policy.model.ts`.

4. `tests/unit/modules/employee/employee.repository.spec.ts` — Jest unit tests for PgEmployeeRepository. Mock the pg Pool. Test findById returns employee, findByEmployeeNumber, findAll excludes soft-deleted, create inserts, update modifies, softDelete sets deletedAt.

5. `tests/unit/modules/leave-policy/leave-policy.repository.spec.ts` — Jest unit tests for PgLeavePolicyRepository. Mock the pg Pool. Test all CRUD methods.

6. `tests/unit/modules/leave-policy/leave-policy.service.spec.ts` — Jest unit tests for LeavePolicyService. Mock ILeavePolicyRepository. Test getPolicyForLeaveType delegates correctly, validateEntitlement returns true/false based on entitlementDays vs requestedDays.

## Phase 3: Phase 2: Balance & Audit Log (part 1/2)

Create the Balance and AuditLog domain models with their repository/service interfaces. This is the models+interfaces slice only — NO concrete implementations.

Read these files before generating: `src/shared/types/index.ts` (for BalanceStatus enum), `src/modules/employee/employee.model.ts` (for Employee reference pattern).

Files to create:

1. `src/modules/balance/balance.model.ts` — Define the `Balance` entity interface with canonical fields: id, employeeId, leaveType, totalEntitlement, usedDays, remainingDays, fiscalYear, status (BalanceStatus), createdAt, updatedAt. Define `IBalanceRepository` interface with methods: findByEmployeeId(employeeId: string), findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string), findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number), create(balance: Omit<Balance, 'id' | 'createdAt' | 'updatedAt'>), update(id: string, data: Partial<Balance>), deductDays(id: string, days: number). Define `IBalanceService` interface with methods: getBalance(employeeId: string, leaveType: string), hasSufficientBalance(employeeId: string, leaveType: string, requestedDays: number), deductBalance(employeeId: string, leaveType: string, days: number).

2. `src/modules/audit-log/audit-log.model.ts` — Define the `AuditLog` entity interface with fields: id, entityType (string), entityId (string), action (string), performedBy (string), changes (Record<string, unknown>), createdAt (Date). Define `IAuditLogRepository` interface with methods: findByEntity(entityType: string, entityId: string), create(entry: Omit<AuditLog, 'id' | 'createdAt'>), findAll(filters?: { entityType?: string; performedBy?: string; fromDate?: Date; toDate?: Date }).

No tests in this phase — tests come in part 2/2.

## Phase 4: Phase 2: Balance & Audit Log (part 2/2)

Implement the concrete repository classes for Balance and AuditLog, plus the Balance service, controller, and routes. This phase depends on the models/interfaces from part 1/2.

Read these files before generating: `src/modules/balance/balance.model.ts`, `src/modules/audit-log/audit-log.model.ts`, `src/shared/db/connection.ts`, `src/app.ts`.

Files to create:

1. `src/modules/balance/balance.repository.ts` — Implement `PgBalanceRepository` satisfying `IBalanceRepository`. Use pg Pool. Methods: findByEmployeeId, findByEmployeeIdAndLeaveType, findByEmployeeIdAndFiscalYear, create, update, deductDays (UPDATE remaining_days = remaining_days - $days, used_days = used_days + $days, set status to 'exhausted' if remaining reaches 0). Import from `./balance.model.ts`.

2. `src/modules/balance/balance.service.ts` — Implement `BalanceService` satisfying `IBalanceService`. Constructor takes `IBalanceRepository`. getBalance delegates to repo, hasSufficientBalance checks remainingDays >= requestedDays, deductBalance delegates to repo.deductDays. [BINDING RULE: Calendar days inclusive — the service must accept the pre-calculated day count; the calculation itself lives in the leave-request module.]

3. `src/modules/balance/balance.controller.ts` — Fastify route handlers: getBalance (GET /balance/:employeeId/:leaveType), getBalances (GET /balance/:employeeId). Import BalanceService.

4. `src/modules/balance/balance.routes.ts` — Register Fastify routes for the balance controller. Export a plugin function.

5. `src/modules/audit-log/audit-log.repository.ts` — Implement `PgAuditLogRepository` satisfying `IAuditLogRepository`. Use pg Pool. Methods: findByEntity, create, findAll with optional filters.

6. `tests/unit/modules/balance/balance.repository.spec.ts` — Jest tests for PgBalanceRepository (mock pg Pool).
   `tests/unit/modules/balance/balance.service.spec.ts` — Jest tests for BalanceService (mock IBalanceRepository).
   `tests/unit/modules/audit-log/audit-log.repository.spec.ts` — Jest tests for PgAuditLogRepository.

Note: The balance routes should be registered in `src/app.ts` in a follow-up integration phase or as part of this phase if the app.ts already supports plugin registration.

## Phase 5: Phase 3: Leave Request & Notification (part 1/2)

Create the LeaveRequest and Notification domain models with their repository/service interfaces. This is the models+interfaces slice only — NO concrete implementations.

Read these files before generating: `src/shared/types/index.ts` (for LeaveType, LeaveStatus, NotificationType, NotificationStatus enums), `src/modules/employee/employee.model.ts` (for Employee reference), `src/modules/leave-policy/leave-policy.model.ts` (for LeavePolicy reference), `src/modules/balance/balance.model.ts` (for Balance reference).

Files to create:

1. `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` entity interface with canonical fields: id, employeeId, leaveType (LeaveType), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus), approvedBy (string | null), approvedAt (Date | null), rejectionReason (string | undefined), createdAt (Date), updatedAt (Date). Define `ILeaveRequestRepository` interface with methods: findById(id: string), findByEmployeeId(employeeId: string), findByStatus(status: LeaveStatus), findByManagerId(managerId: string), create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>), update(id: string, data: Partial<LeaveRequest>), updateStatus(id: string, status: LeaveStatus, approvedBy?: string, rejectionReason?: string). Define `ILeaveRequestService` interface with methods: submit(request: CreateLeaveRequestDto), approve(id: string, approverId: string), reject(id: string, approverId: string, reason: string), cancel(id: string, employeeId: string), getById(id: string), getByEmployee(employeeId: string), getPendingForManager(managerId: string). Also define `CreateLeaveRequestDto` with fields: employeeId, leaveType, startDate, endDate, reason (optional). Also define the validation schemas (Zod): createLeaveRequestSchema, updateLeaveRequestSchema.

2. `src/modules/notification/notification.model.ts` — Define the `Notification` entity interface with canonical fields: id, recipientId, type (NotificationType), title, message, relatedEntityType (string | null), relatedEntityId (string | null), status (NotificationStatus), createdAt (Date), readAt (Date | null). Define `INotificationRepository` interface with methods: findByRecipientId(recipientId: string), findByRecipientIdAndStatus(recipientId: string, status: NotificationStatus), create(notification: Omit<Notification, 'id' | 'createdAt'>), updateStatus(id: string, status: NotificationStatus, readAt?: Date). Define `INotificationService` interface with methods: notifyLeaveSubmitted(leaveRequest: LeaveRequest), notifyLeaveApproved(leaveRequest: LeaveRequest), notifyLeaveRejected(leaveRequest: LeaveRequest), notifyLeaveCancelled(leaveRequest: LeaveRequest), getNotifications(recipientId: string), markAsRead(id: string).

No tests in this phase — tests come in part 2/2.

## Phase 6: Phase 3: Leave Request & Notification (part 2/2)

Implement the concrete repository and service classes for LeaveRequest and Notification, plus the LeaveRequest controller and routes. This phase depends on the models/interfaces from part 1/2.

Read these files before generating: `src/modules/leave-request/leave-request.model.ts`, `src/modules/notification/notification.model.ts`, `src/shared/db/connection.ts`, `src/shared/types/index.ts`, `src/modules/balance/balance.model.ts` (for IBalanceService), `src/modules/leave-policy/leave-policy.model.ts` (for ILeavePolicyService), `src/modules/audit-log/audit-log.model.ts` (for IAuditLogRepository), `src/app.ts`.

Files to create:

1. `src/modules/leave-request/leave-request.repository.ts` — Implement `PgLeaveRequestRepository` satisfying `ILeaveRequestRepository`. Use pg Pool. Methods: findById, findByEmployeeId, findByStatus, findByManagerId (JOIN with employee table on manager_id), create, update, updateStatus (UPDATE status, approvedBy, approvedAt, rejectionReason as appropriate). Import from `./leave-request.model.ts`.

2. `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` satisfying `ILeaveRequestService`. Constructor takes `ILeaveRequestRepository`, `ILeavePolicyService`, `IBalanceService`, `INotificationService`, `IAuditLogRepository`. 
   - `submit`: validate via policy service (validateEntitlement), calculate days using [BINDING RULE: Calendar days inclusive — (endDate.getTime() - startDate.getTime()) / (1000*60*60*24) + 1], check balance via balanceService.hasSufficientBalance, create request with status 'submitted', call notificationService.notifyLeaveSubmitted, log audit.
   - `approve`: update status to 'approved', set approvedBy/approvedAt, call balanceService.deductBalance, call notificationService.notifyLeaveApproved, log audit.
   - `reject`: update status to 'rejected', set rejectionReason, call notificationService.notifyLeaveRejected, log audit.
   - `cancel`: update status to 'cancelled' (only if current status is 'submitted' or 'approved'), call notificationService.notifyLeaveCancelled, log audit.
   - `getById`, `getByEmployee`, `getPendingForManager`: delegate to repository.

3. `src/modules/leave-request/leave-request.controller.ts` — Fastify route handlers: submitLeave (POST /leave-requests), approveLeave (POST /leave-requests/:id/approve), rejectLeave (POST /leave-requests/:id/reject), cancelLeave (POST /leave-requests/:id/cancel), getLeaveRequest (GET /leave-requests/:id), getEmployeeLeaveRequests (GET /leave-requests/employee/:employeeId), getPendingForManager (GET /leave-requests/manager/:managerId/pending). Use Zod schemas from model for request validation.

4. `src/modules/leave-request/leave-request.routes.ts` — Register Fastify routes for the leave-request controller. Export a plugin function.

5. `src/modules/notification/notification.repository.ts` — Implement `PgNotificationRepository` satisfying `INotificationRepository`. Use pg Pool. Methods: findByRecipientId, findByRecipientIdAndStatus, create, updateStatus.

6. `src/modules/notification/notification.service.ts` — Implement `NotificationService` satisfying `INotificationService`. Constructor takes `INotificationRepository`. Each notify* method creates a Notification with appropriate type, title, message, relatedEntityType='leave_request', relatedEntityId=leaveRequest.id. getNotifications delegates to repo, markAsRead updates status to 'read'.

7. `tests/unit/modules/leave-request/leave-request.repository.spec.ts` — Jest tests for PgLeaveRequestRepository.
   `tests/unit/modules/leave-request/leave-request.service.spec.ts` — Jest tests for LeaveRequestService (mock all dependencies).
   `tests/unit/modules/notification/notification.repository.spec.ts` — Jest tests for PgNotificationRepository.
   `tests/unit/modules/notification/notification.service.spec.ts` — Jest tests for NotificationService.

Register the leave-request routes in `src/app.ts` alongside the existing uptimeRoutes.
