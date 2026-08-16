# PLAN.md

## Phase 1: Phase 1: Shared types — enums and DTOs

Create `src/shared/types/index.ts` with all shared enums and DTOs for the leave management feature. Define exactly:

- `LeaveStatus` enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `LeaveType` enum: annual, sick, emergency, unpaid, maternity, paternity
- `AuditAction` enum: CREATE, UPDATE, DELETE, APPROVE, REJECT
- `NotificationStatus` enum: PENDING, SENT, READ, ARCHIVED
- `EmploymentStatus` enum: ACTIVE, INACTIVE, TERMINATED
- `CreateLeaveRequestDto` interface: employeeId (string), leavePolicyId (string), startDate (Date), endDate (Date), reason (string | undefined)
- `UpdateLeaveRequestDto` interface: startDate (Date | undefined), endDate (Date | undefined), reason (string | undefined), status (LeaveStatus | undefined)
- `LeaveRequestQueryParams` interface: employeeId (string | undefined), status (LeaveStatus | undefined), leavePolicyId (string | undefined), startDateFrom (Date | undefined), startDateTo (Date | undefined)
- `ValidationResult` interface: valid (boolean), errors (string[])

Include Jest unit tests in `tests/unit/shared/types/index.test.ts` verifying enum values and DTO shapes.

## Phase 2: Phase 2: Employee model and repository

Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` entity interface with exact fields: id (string), employeeNumber (string), firstName (string), lastName (string), email (string), managerId (string | null), department (string), hireDate (Date), terminationDate (Date | null), employmentStatus (EmploymentStatus — import from `src/shared/types`), createdAt (Date), updatedAt (Date).
- `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findByManagerId(managerId: string): Promise<Employee[]>, findAll(): Promise<Employee[]>, create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>, update(id: string, data: Partial<Employee>): Promise<Employee | null>. Also provide a stub/empty implementation class `EmployeeRepository` that throws "not implemented" — the real DB-backed implementation comes in a later phase.

Include Jest unit tests in `tests/unit/modules/employee/employee.model.test.ts` and `tests/unit/modules/employee/employee.repository.test.ts`.

## Phase 3: Phase 3: LeavePolicy model and repository

Create the leave-policy module at `src/modules/leave-policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` entity interface with exact fields: id (string), policyName (string), leaveType (LeaveType — import from `src/shared/types`), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date).
- `src/modules/leave-policy/leave-policy.repository.ts` — Define `ILeavePolicyRepository` interface with methods: findById(id: string): Promise<LeavePolicy | null>, findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>, findAllActive(): Promise<LeavePolicy[]>, create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>, update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>. Provide a stub `LeavePolicyRepository` class that throws "not implemented".

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.model.test.ts` and `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`.

## Phase 4: Phase 4: LeaveBalance model and repository

Create the leave-balance module at `src/modules/leave-balance/`. This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts` from Phase 3 — read all three before generating any code.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` entity interface with exact fields: id (string), employeeId (string), leavePolicyId (string), totalEntitlement (number), usedDays (number), remainingDays (number), fiscalYear (number), status ('ACTIVE' | 'EXHAUSTED' | 'CLOSED'), createdAt (Date), updatedAt (Date).
- `src/modules/leave-balance/leave-balance.repository.ts` — Define `ILeaveBalanceRepository` interface with methods: findById(id: string): Promise<LeaveBalance | null>, findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployeeId(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>. Provide a stub `LeaveBalanceRepository` class.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.model.test.ts` and `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`.

## Phase 5: Phase 5: LeaveRequest model and repository

Create the leave-request module at `src/modules/leave-request/`. This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts` from Phase 3 — read all three before generating any code.

Files to create:
- `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` entity interface with exact fields: id (string), employeeId (string), leavePolicyId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus — import from `src/shared/types`), approvedBy (string | null), approvedAt (Date | null), cancelledAt (Date | null), createdAt (Date), updatedAt (Date).
- `src/modules/leave-request/leave-request.repository.ts` — Define `ILeaveRequestRepository` interface with methods: findById(id: string): Promise<LeaveRequest | null>, findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>, findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>, query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>, create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>, update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>. Provide a stub `LeaveRequestRepository` class.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.model.test.ts` and `tests/unit/modules/leave-request/leave-request.repository.test.ts`.

## Phase 6: Phase 6: Notification model and repository

Create the notification module at `src/modules/notification/`. This phase depends on `src/shared/types/index.ts` from Phase 1 and `src/modules/leave-request/leave-request.model.ts` from Phase 5 — read both before generating any code.

Files to create:
- `src/modules/notification/notification.model.ts` — Define the `LeaveNotification` entity interface with exact fields: id (string), recipientId (string), type ('SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'BALANCE_LOW' | 'BALANCE_EXHAUSTED'), title (string), message (string), leaveRequestId (string), status (NotificationStatus — import from `src/shared/types`), createdAt (Date), readAt (Date | null).
- `src/modules/notification/notification.repository.ts` — Define `INotificationRepository` interface with methods: findById(id: string): Promise<LeaveNotification | null>, findByRecipientId(recipientId: string): Promise<LeaveNotification[]>, findByLeaveRequestId(leaveRequestId: string): Promise<LeaveNotification[]>, create(notification: Omit<LeaveNotification, 'id' | 'createdAt'>): Promise<LeaveNotification>, updateStatus(id: string, status: NotificationStatus): Promise<LeaveNotification | null>. Provide a stub `NotificationRepository` class.

Include Jest unit tests in `tests/unit/modules/notification/notification.model.test.ts` and `tests/unit/modules/notification/notification.repository.test.ts`.

## Phase 7: Phase 7: AuditLog model and repository

Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/audit/audit.model.ts` — Define the `AuditLog` entity interface with exact fields: id (string), entityType (string), entityId (string), action (string), oldValues (Record<string, any> | null), newValues (Record<string, any> | null), performedBy (string | null), performedAt (Date), ipAddress (string | null), userAgent (string | null), createdAt (Date).
- `src/modules/audit/audit.repository.ts` — Define `IAuditLogRepository` interface with methods: findById(id: string): Promise<AuditLog | null>, findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>, findByPerformedBy(performedBy: string): Promise<AuditLog[]>, create(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>. Provide a stub `AuditLogRepository` class.

Include Jest unit tests in `tests/unit/modules/audit/audit.model.test.ts` and `tests/unit/modules/audit/audit.repository.test.ts`.

## Phase 8: Phase 8: LeaveRequestService — core orchestration

Create the LeaveRequestService at `src/modules/leave-request/`. This phase depends on all prior model and repository files — read them before generating any code.

Files to create (approximately 3):
- `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService` interface with methods: createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, submit(id: string): Promise<LeaveRequest>, approve(id: string, approverId: string): Promise<LeaveRequest>, reject(id: string, approverId: string): Promise<LeaveRequest>, cancel(id: string): Promise<LeaveRequest>, findById(id: string): Promise<LeaveRequest | null>, findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>, query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>.
- `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` class. Constructor takes: ILeaveRequestRepository, ILeaveBalanceRepository, ILeavePolicyRepository, IEmployeeRepository. Key logic:
  - `createDraft`: validate employee exists, validate policy exists and isActive, validate startDate <= endDate, create with status DRAFT.
  - `submit`: validate request is in DRAFT state, validate policy minimumNoticeDays (if set, startDate must be >= now + minimumNoticeDays), check balance has sufficient remainingDays using the BINDING formula `daysRequested = (endDate - startDate) + 1` (calendar days inclusive), transition to SUBMITTED.
  - `approve`: validate request is SUBMITTED, validate approver is the employee's manager (employee.managerId === approverId), deduct `daysRequested` from LeaveBalance.usedDays and recalculate remainingDays, set status APPROVED, approvedBy, approvedAt.
  - `reject`: validate request is SUBMITTED, validate approver is manager, set status REJECTED.
  - `cancel`: validate request is APPROVED or SUBMITTED, if APPROVED restore usedDays on balance, set status CANCELLED, cancelledAt.
- `tests/unit/modules/leave-request/leave-request.service.test.ts` — Jest unit tests with mocked repositories covering all state transitions and the BINDING day-counting formula.

Use the exact BINDING formula everywhere: `daysRequested = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1`. All dates are full-day granularity — no time-of-day considerations.

## Phase 9: Phase 9: LeaveRequest routes and controller

Create the Fastify routes and controller for leave requests at `src/modules/leave-request/`. This phase depends on `src/modules/leave-request/leave-request.service.ts` and `src/modules/leave-request/leave-request.service.interface.ts` from Phase 8, plus `src/modules/leave-request/leave-request.model.ts` from Phase 5 and `src/shared/types/index.ts` from Phase 1 — read all before generating.

Files to create (approximately 2-3):
- `src/modules/leave-request/leave-request.controller.ts` — Controller class that takes ILeaveRequestService in its constructor. Methods map 1:1 to service methods, handling HTTP concerns (extracting params from request, formatting responses, catching errors). Each method returns a plain object suitable for JSON serialization (Date fields serialized as ISO strings).
- `src/modules/leave-request/leave-request.routes.ts` — Fastify plugin registering routes:
  - POST /leave-requests (createDraft) — body: CreateLeaveRequestDto
  - POST /leave-requests/:id/submit
  - POST /leave-requests/:id/approve — body: { approverId: string }
  - POST /leave-requests/:id/reject — body: { approverId: string }
  - POST /leave-requests/:id/cancel
  - GET /leave-requests/:id
  - GET /leave-requests (query by employeeId, status, etc.)
  - GET /leave-requests/employee/:employeeId
- `tests/unit/modules/leave-request/leave-request.routes.test.ts` — Jest tests using Fastify's inject() method with a mocked service.

Register the routes in `src/app.ts` by importing and calling `app.register(leaveRequestRoutes)`.

## Phase 10: Phase 10: Supporting services — Balance, Notification, Audit, Policy, Employee

Create the remaining service interfaces and implementations for all supporting modules. This phase depends on all prior model and repository files — read them before generating.

Files to create (approximately 5):

- `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `IBalanceService` interface: getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>, getBalancesForEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, initializeBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>.
- `src/modules/leave-balance/leave-balance.service.ts` — Implement `BalanceService` class using ILeaveBalanceRepository and ILeavePolicyRepository. `initializeBalance` reads the policy's entitlementDays and creates a balance with totalEntitlement=entitlementDays, usedDays=0, remainingDays=entitlementDays, status='ACTIVE', fiscalYear=current calendar year (hardcoded Jan 1 – Dec 31 per BINDING rule).

- `src/modules/notification/notification.service.interface.ts` — Define `INotificationService` interface: notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<LeaveNotification>, notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<LeaveNotification>, notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<LeaveNotification>, notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<LeaveNotification>, getNotificationsForUser(recipientId: string): Promise<LeaveNotification[]>, markAsRead(id: string): Promise<void>.
- `src/modules/notification/notification.service.ts` — Implement `NotificationService` class using INotificationRepository and IEmployeeRepository. Each notify method creates a LeaveNotification with appropriate type, title, and message, targeting the employee's manager (for SUBMITTED/CANCELLED) or the employee (for APPROVED/REJECTED).

- `tests/unit/modules/leave-balance/leave-balance.service.test.ts` and `tests/unit/modules/notification/notification.service.test.ts` — Jest unit tests with mocked repositories.

The AuditService, LeavePolicyService, and EmployeeService interfaces are declared in the architecture but their full implementations are deferred — create stub interface files only:
- `src/modules/audit/audit.service.interface.ts` — `IAuditService` with logAction(entityType, entityId, action, oldValues, newValues, performedBy): Promise<AuditLog>
- `src/modules/leave-policy/leave-policy.service.interface.ts` — `ILeavePolicyService` with getPolicy(id), getPolicyByType(leaveType), isActive(id)
- `src/modules/employee/employee.service.interface.ts` — `IEmployeeService` with getEmployee(id), getManager(employeeId), isActive(id)
