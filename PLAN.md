# PLAN.md

## Phase 1: Phase 1 — Shared types & enums

Create src/shared/types/index.ts with ALL of the following canonical types in one file:

- LeaveType enum: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'
- LeaveStatus enum: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
- EmploymentStatus enum: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
- AuditAction enum: 'CREATED' | 'UPDATED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'BALANCE_DEDUCTED' | 'BALANCE_RESTORED'
- NotificationStatus enum: 'PENDING' | 'SENT' | 'FAILED'
- CreateLeaveRequestDto interface: employeeId (string), leaveType (LeaveType), startDate (string), endDate (string), reason (string | undefined)
- UpdateLeaveRequestDto interface: status (LeaveStatus), approverId (string | null)
- LeaveRequestQueryParams interface: employeeId (string | undefined), leaveType (LeaveType | undefined), status (LeaveStatus | undefined), startDate (string | undefined), endDate (string | undefined)
- ValidationResult interface: valid (boolean), errors (string[])

No dependencies on any other project files. Include a Jest unit test at tests/unit/shared/types/types.test.ts that verifies enum values and DTO shapes.

## Phase 2: Phase 2 — LeavePolicy module

Create the leave-policy module at src/modules/leave-policy/ with these files:

1. src/modules/leave-policy/leave-policy.model.ts — Define the LeavePolicy entity with EXACT fields: id (string), policyName (string), leaveType (string), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date).

2. src/modules/leave-policy/leave-policy.repository.ts — Define the ILeavePolicyRepository interface with methods: findById(id: string): Promise<LeavePolicy | null>, findByLeaveType(leaveType: string): Promise<LeavePolicy | null>, findAll(): Promise<LeavePolicy[]>, create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>, update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>, delete(id: string): Promise<boolean>.

3. src/modules/leave-policy/pg-leave-policy.repository.ts — Implement PgLeavePolicyRepository using the shared db pool from src/shared/db/connection.ts. Import pool and implement all ILeavePolicyRepository methods against a leave_policies table.

4. src/modules/leave-policy/index.ts — Barrel export of all public symbols.

Include Jest unit tests at tests/unit/modules/leave-policy/leave-policy.repository.test.ts that mock the db pool and test CRUD operations.

This phase depends on src/shared/types/index.ts from Phase 1 (for LeaveType enum) and src/shared/db/connection.ts (existing).

## Phase 3: Phase 3 — LeaveBalance module

Create the leave-balance module at src/modules/leave-balance/ with these files:

1. src/modules/leave-balance/leave-balance.model.ts — Define the LeaveBalance entity with EXACT fields: id (string), employeeId (string), leaveType (string), fiscalYear (number), totalEntitlement (number), usedDays (number), remainingDays (number), status ('ACTIVE' | 'EXHAUSTED' | 'FROZEN'), createdAt (Date), updatedAt (Date).

2. src/modules/leave-balance/leave-balance.repository.ts — Define the ILeaveBalanceRepository interface with methods: findByEmployeeAndType(employeeId: string, leaveType: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, deductBalance(id: string, days: number): Promise<LeaveBalance | null> — MUST atomically increment usedDays AND decrement remainingDays in one transaction per BINDING rule BR-001, restoreBalance(id: string, days: number): Promise<LeaveBalance | null> — MUST atomically decrement usedDays AND increment remainingDays in one transaction.

3. src/modules/leave-balance/pg-leave-balance.repository.ts — Implement PgLeaveBalanceRepository using the shared db pool from src/shared/db/connection.ts. The deductBalance and restoreBalance methods MUST use a PostgreSQL transaction (BEGIN/COMMIT) to atomically update both usedDays and remainingDays.

4. src/modules/leave-balance/index.ts — Barrel export.

Include Jest unit tests at tests/unit/modules/leave-balance/leave-balance.repository.test.ts mocking the pool and verifying atomic dual-update semantics.

This phase depends on src/shared/types/index.ts from Phase 1 and src/shared/db/connection.ts (existing).

## Phase 4: Phase 4 — LeaveRequest module

Create the leave-request module at src/modules/leave-request/ with these files:

1. src/modules/leave-request/leave-request.model.ts — Define the LeaveRequest entity with EXACT fields: id (string), employeeId (string), leaveType (LeaveType — imported from src/shared/types/index.ts), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus — imported from src/shared/types/index.ts), approverId (string | null), approvedAt (Date | null), createdAt (Date), updatedAt (Date). Also re-export CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams from src/shared/types/index.ts.

2. src/modules/leave-request/leave-request.repository.ts — Define the ILeaveRequestRepository interface with methods: findById(id: string): Promise<LeaveRequest | null>, findByEmployee(employeeId: string, params: LeaveRequestQueryParams): Promise<LeaveRequest[]>, findPendingByApprover(approverId: string): Promise<LeaveRequest[]>, create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, updateStatus(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null>, findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>.

3. src/modules/leave-request/pg-leave-request.repository.ts — Implement PgLeaveRequestRepository using src/shared/db/connection.ts. The findOverlapping method MUST use inclusive calendar day overlap logic: WHERE employeeId = $1 AND status NOT IN ('CANCELLED','REJECTED') AND startDate <= $3 AND endDate >= $2.

4. src/modules/leave-request/index.ts — Barrel export.

Include Jest unit tests at tests/unit/modules/leave-request/leave-request.repository.test.ts.

This phase depends on src/shared/types/index.ts from Phase 1 and src/shared/db/connection.ts (existing).

## Phase 5: Phase 5 — Audit module

Create the audit module at src/modules/audit/ with these files:

1. src/modules/audit/audit.model.ts — Define the AuditLog entity with fields: id (string), entityType (string), entityId (string), action (AuditAction — imported from src/shared/types/index.ts), performedBy (string), changes (Record<string, unknown> | null), timestamp (Date).

2. src/modules/audit/audit.repository.ts — Define the IAuditLogRepository interface with methods: log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>, findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>, findByUser(performedBy: string): Promise<AuditLog[]>.

3. src/modules/audit/pg-audit-log.repository.ts — Implement PgAuditLogRepository using src/shared/db/connection.ts.

4. src/modules/audit/audit.service.interface.ts — Define IAuditService interface with method: logAction(entityType: string, entityId: string, action: AuditAction, performedBy: string, changes?: Record<string, unknown>): Promise<AuditLog>.

5. src/modules/audit/audit.service.ts — Implement AuditService using IAuditLogRepository (constructor injection).

6. src/modules/audit/index.ts — Barrel export.

Include Jest unit tests at tests/unit/modules/audit/audit.service.test.ts.

This phase depends on src/shared/types/index.ts from Phase 1 and src/shared/db/connection.ts (existing).

## Phase 6: Phase 5 — Audit module

Create the audit module at src/modules/audit/ with these files:

1. src/modules/audit/audit.model.ts — Define the AuditLog entity with fields: id (string), entityType (string), entityId (string), action (AuditAction — imported from src/shared/types/index.ts), performedBy (string), changes (Record<string, unknown> | null), timestamp (Date).

2. src/modules/audit/audit.repository.ts — Define the IAuditLogRepository interface with methods: log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>, findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>, findByUser(performedBy: string): Promise<AuditLog[]>.

3. src/modules/audit/pg-audit-log.repository.ts — Implement PgAuditLogRepository using src/shared/db/connection.ts.

4. src/modules/audit/audit.service.ts — Define the IAuditService interface AND implement AuditService in the same file. IAuditService has method: logAction(entityType: string, entityId: string, action: AuditAction, performedBy: string, changes?: Record<string, unknown>): Promise<AuditLog>. AuditService takes IAuditLogRepository via constructor injection.

5. src/modules/audit/index.ts — Barrel export of all public symbols.

Include Jest unit tests at tests/unit/modules/audit/audit.service.test.ts mocking the repository.

This phase depends on src/shared/types/index.ts from Phase 1 and src/shared/db/connection.ts (existing).

## Phase 7: Phase 6 — Notification module

Create the notification module at src/modules/notification/ with these files:

1. src/modules/notification/notification.model.ts — Define the Notification entity with fields: id (string), recipientId (string), message (string), type (string), status (NotificationStatus — imported from src/shared/types/index.ts), referenceEntityType (string | null), referenceEntityId (string | null), createdAt (Date), sentAt (Date | null).

2. src/modules/notification/notification.repository.ts — Define the INotificationRepository interface with methods: create(notification: Omit<Notification, 'id' | 'createdAt' | 'sentAt'>): Promise<Notification>, findByRecipient(recipientId: string): Promise<Notification[]>, markSent(id: string): Promise<Notification | null>, findPending(): Promise<Notification[]>.

3. src/modules/notification/pg-notification.repository.ts — Implement PgNotificationRepository using src/shared/db/connection.ts.

4. src/modules/notification/notification.service.ts — Define the INotificationService interface AND implement NotificationService in the same file. INotificationService has method: notify(recipientId: string, message: string, type: string, referenceEntityType?: string, referenceEntityId?: string): Promise<Notification>. NotificationService takes INotificationRepository via constructor injection.

5. src/modules/notification/index.ts — Barrel export.

Include Jest unit tests at tests/unit/modules/notification/notification.service.test.ts.

This phase depends on src/shared/types/index.ts from Phase 1 and src/shared/db/connection.ts (existing).

## Phase 8: Phase 7 — LeaveService & API surface

Create the leave module at src/modules/leave/ and wire it into the app. This phase ties together all prior modules.

Files:

1. src/modules/leave/leave.service.ts — Define ILeaveService interface AND implement LeaveService in the same file. ILeaveService methods:
   - submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> — validate input, compute daysRequested = (endDate - startDate) + 1 (BINDING inclusive calendar days), check for overlapping approved requests via ILeaveRequestRepository.findOverlapping, look up LeavePolicy via ILeavePolicyRepository.findByLeaveType, look up LeaveBalance via ILeaveBalanceRepository.findByEmployeeAndType (fiscalYear = startDate.getFullYear()), verify remainingDays >= daysRequested, create the LeaveRequest, call ILeaveBalanceRepository.deductBalance atomically, call IAuditService.logAction, call INotificationService.notify.
   - approveLeaveRequest(id: string, approverId: string): Promise<LeaveRequest> — update status to APPROVED, set approverId and approvedAt, audit log, notify.
   - rejectLeaveRequest(id: string, approverId: string): Promise<LeaveRequest> — update status to REJECTED, call ILeaveBalanceRepository.restoreBalance to reverse the deduction, audit log, notify.
   - cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> — update status to CANCELLED, if previously APPROVED call restoreBalance, audit log, notify.
   - getLeaveBalance(employeeId: string, leaveType: string, fiscalYear: number): Promise<LeaveBalance | null>
   - getLeaveRequests(employeeId: string, params: LeaveRequestQueryParams): Promise<LeaveRequest[]>
   Constructor injection: ILeaveRequestRepository, ILeaveBalanceRepository, ILeavePolicyRepository, IAuditService, INotificationService.

2. src/modules/leave/leave.controller.ts — LeaveController class. Constructor takes ILeaveService. Methods: submit, approve, reject, cancel, getBalance, getRequests. Each method handles HTTP request/response concerns (parsing params, status codes) and delegates to the service.

3. src/modules/leave/leave.routes.ts — Export leaveRoutes(fastify: FastifyInstance). Register routes: POST /leave/requests, PATCH /leave/requests/:id/approve, PATCH /leave/requests/:id/reject, PATCH /leave/requests/:id/cancel, GET /leave/balances, GET /leave/requests. Instantiate controller with all repository/service dependencies wired up.

4. src/app.ts — MODIFY existing file: import and register leaveRoutes via app.register(leaveRoutes) alongside the existing uptimeRoutes registration.

5. tests/unit/modules/leave/leave.service.test.ts — Jest unit tests mocking all injected dependencies. Test: submitLeaveRequest with sufficient balance, submitLeaveRequest with insufficient balance (expect error), submitLeaveRequest with overlapping dates (expect error), approveLeaveRequest, rejectLeaveRequest (verify balance restored), cancelLeaveRequest, daysRequested calculation (verify inclusive formula).

This phase depends on reading these exact files from prior phases:
- src/shared/types/index.ts (Phase 1)
- src/modules/leave-policy/leave-policy.repository.ts (Phase 2)
- src/modules/leave-balance/leave-balance.repository.ts (Phase 3)
- src/modules/leave-request/leave-request.repository.ts and leave-request.model.ts (Phase 4)
- src/modules/audit/audit.service.ts (Phase 5)
- src/modules/notification/notification.service.ts (Phase 6)
- src/shared/db/connection.ts (existing)
