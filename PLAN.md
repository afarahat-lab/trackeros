# PLAN.md

## Phase 1: Phase 1: Shared enums

Create `src/shared/types/index.ts` with all five canonical enums: LeaveType ('annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'), LeaveRequestStatus ('DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'), BalanceStatus ('ACTIVE' | 'EXHAUSTED' | 'FROZEN' | 'CLOSED'), AuditAction ('CREATED' | 'UPDATED' | 'DELETED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'), EmploymentStatus ('ACTIVE' | 'INACTIVE' | 'TERMINATED'). Export all from the barrel. Include a Jest unit test at `tests/unit/shared/types/index.spec.ts` verifying each enum has its canonical members.

## Phase 2: Phase 2: Employee model + repository

Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files:
- `src/modules/employee/employee.model.ts` — Define the Employee interface with exact canonical fields: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string | null, hireDate: Date, terminationDate: Date | null, employmentStatus: EmploymentStatus (import from src/shared/types), createdAt: Date, updatedAt: Date, deletedAt: Date | null.
- `src/modules/employee/employee.repository.ts` — Define IEmployeeRepository interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findAll(): Promise<Employee[]>, create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>, update(id: string, data: Partial<Employee>): Promise<Employee | null>, softDelete(id: string): Promise<void>. Implement EmployeeRepository class using the shared db pool from `src/shared/db/connection.ts` and Knex. The repository must use parameterized queries.
- `src/modules/employee/index.ts` — barrel export of model and repository.

Include Jest unit tests at `tests/unit/modules/employee/employee.repository.spec.ts`.

## Phase 3: Phase 3: LeavePolicy model + repository

Create the leave-policy module at `src/modules/leave-policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files:
- `src/modules/leave-policy/leave-policy.model.ts` — Define the LeavePolicy interface with exact canonical fields: id: string, policyName: string, leaveType: LeaveType (import from src/shared/types), entitlementDays: number, accrualRate: number | null, maxAccumulation: number | null, minimumNoticeDays: number | null, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date.
- `src/modules/leave-policy/leave-policy.repository.ts` — Define ILeavePolicyRepository interface with methods: findById(id: string): Promise<LeavePolicy | null>, findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>, findAllActive(): Promise<LeavePolicy[]>, findAll(): Promise<LeavePolicy[]>, create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>, update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>. Implement LeavePolicyRepository using the shared db pool and Knex with parameterized queries.
- `src/modules/leave-policy/index.ts` — barrel export.

Include Jest unit tests at `tests/unit/modules/leave-policy/leave-policy.repository.spec.ts`.

## Phase 4: Phase 4: LeaveBalance model + repository

Create the leave-balance module at `src/modules/leave-balance/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the LeaveBalance interface with exact canonical fields: id: string, employeeId: string, policyId: string, totalEntitlement: number, usedDays: number, remainingDays: number, fiscalYear: number, status: BalanceStatus (import from src/shared/types), createdAt: Date, updatedAt: Date.
- `src/modules/leave-balance/leave-balance.repository.ts` — Define ILeaveBalanceRepository interface with methods: findById(id: string): Promise<LeaveBalance | null>, findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployee(employeeId: string): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>. Implement LeaveBalanceRepository using the shared db pool and Knex with parameterized queries.
- `src/modules/leave-balance/index.ts` — barrel export.

Include Jest unit tests at `tests/unit/modules/leave-balance/leave-balance.repository.spec.ts`.

## Phase 5: Phase 5: LeaveRequest model + repository + DTOs

Create the leave-request module at `src/modules/leave-request/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files:
- `src/modules/leave-request/leave-request.model.ts` — Define the LeaveRequest interface with exact canonical fields: id: string, employeeId: string, policyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveRequestStatus (import from src/shared/types), approvedBy: string | null, approvedAt: Date | null, createdAt: Date, updatedAt: Date. Also define CreateLeaveRequestDto (employeeId, policyId, startDate, endDate, reason?), UpdateLeaveRequestDto (status?, reason?, approvedBy?, approvedAt?), and LeaveRequestQueryParams (employeeId?, status?, startDate?, endDate?).
- `src/modules/leave-request/leave-request.repository.ts` — Define ILeaveRequestRepository interface with methods: findById(id: string): Promise<LeaveRequest | null>, findByEmployee(employeeId: string, queryParams?: LeaveRequestQueryParams): Promise<LeaveRequest[]>, findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<LeaveRequest[]>, create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>. Implement LeaveRequestRepository using the shared db pool and Knex with parameterized queries.
- `src/modules/leave-request/index.ts` — barrel export.

Include Jest unit tests at `tests/unit/modules/leave-request/leave-request.repository.spec.ts`.

## Phase 6: Phase 6: Audit model + repository + service

Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files (approximately 5):
- `src/modules/audit/audit.model.ts` — Define the AuditLog interface with exact canonical fields: id: string, entityType: string, entityId: string, action: AuditAction (import from src/shared/types), oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, performedBy: string, performedAt: Date, ipAddress: string | null, userAgent: string | null, createdAt: Date.
- `src/modules/audit/audit.repository.ts` — Define IAuditRepository interface with methods: findById(id: string): Promise<AuditLog | null>, findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>, create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>. Implement AuditRepository using the shared db pool and Knex.
- `src/modules/audit/audit.service.interface.ts` — Define IAuditService interface with method: log(entry: Omit<AuditLog, 'id' | 'createdAt' | 'performedAt'>): Promise<AuditLog>.
- `src/modules/audit/audit.service.ts` — Implement AuditService class that wraps AuditRepository, sets performedAt to new Date().
- `src/modules/audit/index.ts` — barrel export.

Include Jest unit tests at `tests/unit/modules/audit/`.

## Phase 7: Phase 7: Notification model + repository + service

Create the notification module at `src/modules/notification/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files (approximately 5):
- `src/modules/notification/notification.model.ts` — Define the Notification interface with exact canonical fields: id: string, recipientId: string, type: string, title: string, message: string, relatedEntityType: string | null, relatedEntityId: string | null, isRead: boolean, createdAt: Date.
- `src/modules/notification/notification.repository.ts` — Define INotificationRepository interface with methods: findById(id: string): Promise<Notification | null>, findByRecipient(recipientId: string): Promise<Notification[]>, findUnreadByRecipient(recipientId: string): Promise<Notification[]>, create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>, markAsRead(id: string): Promise<void>. Implement NotificationRepository using the shared db pool and Knex.
- `src/modules/notification/notification.service.interface.ts` — Define INotificationService interface with methods: notify(recipientId: string, type: string, title: string, message: string, relatedEntityType?: string, relatedEntityId?: string): Promise<Notification>, getUnread(recipientId: string): Promise<Notification[]>, markRead(id: string): Promise<void>.
- `src/modules/notification/notification.service.ts` — Implement NotificationService wrapping NotificationRepository.
- `src/modules/notification/index.ts` — barrel export.

Include Jest unit tests at `tests/unit/modules/notification/`.

## Phase 8: Phase 8: Employee service

Add the employee service layer. This phase depends on `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2 — read both before generating.

Files:
- `src/modules/employee/employee.service.interface.ts` — Define IEmployeeService interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, isActive(id: string): Promise<boolean>, getManagerId(id: string): Promise<string | null>.
- `src/modules/employee/employee.service.ts` — Implement EmployeeService class wrapping IEmployeeRepository. isActive returns true only when employmentStatus is 'ACTIVE' and terminationDate is null. getManagerId returns the employee's managerId.
- Update `src/modules/employee/index.ts` to export the new service interface and class.

Include Jest unit tests at `tests/unit/modules/employee/employee.service.spec.ts`.

## Phase 9: Phase 9: Day-counting helper + LeavePolicy service + LeaveBalance service

This phase depends on Phase 3 (`src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.ts`) and Phase 4 (`src/modules/leave-balance/leave-balance.model.ts`, `src/modules/leave-balance/leave-balance.repository.ts`) — read all four before generating.

Files (approximately 5):
- `src/shared/utils/date-utils.ts` — Pure helper: `countWeekdays(startDate: Date, endDate: Date): number` — counts Monday–Friday inclusive, excludes Saturday/Sunday, no holiday table. Also `getFiscalYear(date: Date): number` — returns the calendar year of the date (Jan 1 – Dec 31).
- `src/modules/leave-policy/leave-policy.service.interface.ts` — Define ILeavePolicyService with: findById(id: string): Promise<LeavePolicy | null>, findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>, getMinimumNoticeDays(policyId: string): Promise<number | null>.
- `src/modules/leave-policy/leave-policy.service.ts` — Implement LeavePolicyService wrapping ILeavePolicyRepository.
- `src/modules/leave-balance/leave-balance.service.interface.ts` — Define ILeaveBalanceService with: getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>, getOrCreateBalance(employeeId: string, policyId: string, fiscalYear: number, entitlementDays: number): Promise<LeaveBalance>, deductDays(id: string, days: number): Promise<LeaveBalance>, restoreDays(id: string, days: number): Promise<LeaveBalance>, hasSufficientBalance(employeeId: string, policyId: string, fiscalYear: number, requestedDays: number): Promise<boolean>.
- `src/modules/leave-balance/leave-balance.service.ts` — Implement LeaveBalanceService wrapping ILeaveBalanceRepository. getOrCreateBalance creates a new balance if none exists for that employee+policy+fiscalYear. deductDays subtracts from remainingDays and adds to usedDays. restoreDays adds back to remainingDays and subtracts from usedDays.

Update the barrel exports in `src/modules/leave-policy/index.ts` and `src/modules/leave-balance/index.ts` to export the new service interfaces and classes.

Include Jest unit tests at `tests/unit/shared/utils/date-utils.spec.ts`, `tests/unit/modules/leave-policy/leave-policy.service.spec.ts`, and `tests/unit/modules/leave-balance/leave-balance.service.spec.ts`.

## Phase 10: Phase 10: LeaveRequest service + controller + routes

This is the integration phase. It depends on ALL prior phases — read the following files before generating:
- Phase 5: `src/modules/leave-request/leave-request.model.ts`, `src/modules/leave-request/leave-request.repository.ts`
- Phase 6: `src/modules/audit/audit.service.ts`
- Phase 7: `src/modules/notification/notification.service.ts`
- Phase 8: `src/modules/employee/employee.service.ts`
- Phase 9: `src/shared/utils/date-utils.ts`, `src/modules/leave-policy/leave-policy.service.ts`, `src/modules/leave-balance/leave-balance.service.ts`

Files (approximately 5):
- `src/modules/leave-request/leave-request.service.interface.ts` — Define ILeaveRequestService with methods: submit(dto: CreateLeaveRequestDto, performedBy: string): Promise<LeaveRequest>, approve(requestId: string, performedBy: string): Promise<LeaveRequest>, reject(requestId: string, performedBy: string, reason?: string): Promise<LeaveRequest>, cancel(requestId: string, performedBy: string): Promise<LeaveRequest>, findById(id: string): Promise<LeaveRequest | null>, findByEmployee(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>.
- `src/modules/leave-request/leave-request.service.ts` — Implement LeaveRequestService. Constructor injects: ILeaveRequestRepository, IEmployeeService, ILeavePolicyService, ILeaveBalanceService, IAuditService, INotificationService. Implement ALL binding business rules: (1) submit validates employee is ACTIVE via IEmployeeService.isActive; (2) resolves policy via ILeavePolicyService.findByLeaveType; (3) counts weekdays via countWeekdays from date-utils; (4) fiscal year via getFiscalYear(startDate); (5) checks overlap via findOverlapping — reject if any SUBMITTED/APPROVED overlap exists; (6) minimumNoticeDays enforced ONLY for annual leave (not sick/emergency); (7) balance sufficiency checked via ILeaveBalanceService.hasSufficientBalance; (8) on approve: deduct days via ILeaveBalanceService.deductDays; (9) on cancel (from APPROVED): restore days via ILeaveBalanceService.restoreDays; (10) manager approval: resolve managerId via IEmployeeService.getManagerId, if null escalate to HR role; (11) audit every status change via IAuditService.log; (12) notify employee on approve/reject, notify manager on submit. Set status to SUBMITTED on creation.
- `src/modules/leave-request/leave-request.controller.ts` — Fastify request handlers. Each handler extracts employeeId from JWT (request.user), validates input with Zod schemas, enforces RBAC (employee submits own, manager approves direct reports, HR admin can do all), delegates to LeaveRequestService.
- `src/modules/leave-request/leave-request.routes.ts` — Fastify plugin registering routes: POST /leave-requests, GET /leave-requests, GET /leave-requests/:id, PATCH /leave-requests/:id/approve, PATCH /leave-requests/:id/reject, PATCH /leave-requests/:id/cancel.
- Update `src/modules/leave-request/index.ts` to export service interface, service class, controller, and routes.

Include Jest unit tests at `tests/unit/modules/leave-request/leave-request.service.spec.ts` and `tests/unit/modules/leave-request/leave-request.controller.spec.ts`.
