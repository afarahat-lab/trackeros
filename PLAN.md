# PLAN.md

## Phase 1: Phase 1: Shared types and business-day utility

Create `src/shared/types/index.ts` with all canonical enums and interfaces: LeaveType (annual, sick, emergency, unpaid, maternity, paternity), LeaveStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), EmploymentStatus (ACTIVE, INACTIVE, TERMINATED), AuditAction (CREATE, UPDATE, DELETE, APPROVE, REJECT), BaseEntity (id: string, created_at: Date, updated_at: Date), and AuthenticatedUser ({ id: string; role: 'employee'|'manager'|'hr_admin' }). Also create `src/shared/utils/business-days.ts` exporting `countBusinessDays(start: Date, end: Date, holidays: Date[]): number` — counts business days (Mon–Fri) excluding weekends and the supplied holiday dates, normalising all dates to UTC midnight for calendar-date comparison. Include Jest unit tests in `tests/unit/shared/business-days.test.ts`.

## Phase 2: Phase 2: Employee module (model + repository)

Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Create `src/modules/employee/employee.model.ts` with the Employee entity (id, employeeNumber, firstName, lastName, email, managerId: string|null, department: string|null, hireDate: Date, terminationDate: Date|null, employmentStatus: EmploymentStatus, createdAt: Date, updatedAt: Date, deletedAt: Date|null) — importing EmploymentStatus from `src/shared/types/index.ts`.

Create `src/modules/employee/employee.repository.ts` with IEmployeeRepository interface and EmployeeRepository class. The repository must use the existing `src/shared/db/connection.ts` pool. Methods: findById(id), findByEmail(email), findByManagerId(managerId), findAll(filters?), create(employee), update(id, partial), softDelete(id). Use parameterised queries only.

Create `src/modules/employee/index.ts` barrel exporting the model and repository.

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts`.

## Phase 3: Phase 3: Policy module (model + repository)

Create the policy module at `src/modules/policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Create `src/modules/policy/policy.model.ts` with the LeavePolicy entity using the canonical fields: id, policyName, leaveType (LeaveType enum from shared types), entitlementDays, accrualRate (number|null), maxAccumulation (number|null), minimumNoticeDays (number|null), requiresManagerApproval, isActive, createdAt, updatedAt.

Create `src/modules/policy/policy.repository.ts` with IPolicyRepository interface and PolicyRepository class using the existing `src/shared/db/connection.ts` pool. Methods: findById(id), findByLeaveType(leaveType), findAllActive(), create(policy), update(id, partial), deactivate(id).

Create `src/modules/policy/index.ts` barrel.

Include Jest unit tests in `tests/unit/modules/policy/policy.repository.test.ts`.

## Phase 4: Phase 4: Notification module (model + repository + service)

Create the notification module at `src/modules/notification/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Create `src/modules/notification/notification.model.ts` with the Notification entity: id, recipientId, type, title, message, relatedEntityType (string|null), relatedEntityId (string|null), status ('PENDING'|'SENT'|'READ'|'ARCHIVED'), createdAt, readAt (Date|null).

Create `src/modules/notification/notification.repository.ts` with INotificationRepository interface and NotificationRepository class using `src/shared/db/connection.ts`. Methods: create(notification), findByRecipient(recipientId), markSent(id), markRead(id).

Create `src/modules/notification/notification.service.ts` with INotificationService interface and NotificationService class. The service wraps the repository and exposes: notify(recipientId, type, title, message, relatedEntityType?, relatedEntityId?): Promise<Notification> — creates and returns the notification.

Create `src/modules/notification/index.ts` barrel.

Include Jest unit tests in `tests/unit/modules/notification/notification.service.test.ts`.

## Phase 5: Phase 5: Audit module (model + repository + service)

Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Create `src/modules/audit/audit.model.ts` with the AuditRecord entity: id, entityType, entityId, action (AuditAction enum from shared types), oldValues (Record<string, unknown>|null), newValues (Record<string, unknown>|null), performedBy (string|null), performedAt (Date), createdAt, updatedAt.

Create `src/modules/audit/audit.repository.ts` with IAuditRepository interface and AuditRepository class using `src/shared/db/connection.ts`. Methods: create(record), findByEntity(entityType, entityId), findByPerformer(performedBy, limit?, offset?).

Create `src/modules/audit/audit.service.ts` with IAuditService interface and AuditService class. The service wraps the repository and exposes: record(action, entityType, entityId, performedBy, oldValues?, newValues?): Promise<AuditRecord> — creates an audit record with performedAt set to now.

Create `src/modules/audit/index.ts` barrel.

Include Jest unit tests in `tests/unit/modules/audit/audit.service.test.ts`.

## Phase 6: Phase 6: Balance module (model + repository + service)

Create the balance module at `src/modules/balance/`. This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/policy/policy.model.ts` from Phase 3 — read all three before generating any code.

Create `src/modules/balance/balance.model.ts` with:
- BalanceStatus enum: ACTIVE, EXHAUSTED, EXPIRED
- LeaveBalance entity: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays (COMPUTED — never stored, derived as totalEntitlement - usedDays at query time), fiscalYear (calendar year of the request, Jan 1–Dec 31), status: BalanceStatus, createdAt, updatedAt.

Create `src/modules/balance/balance.repository.ts` with IBalanceRepository interface and BalanceRepository class using `src/shared/db/connection.ts`. Methods: findByEmployeeAndPolicy(employeeId, policyId, fiscalYear), findByEmployee(employeeId, fiscalYear), create(balance), incrementUsedDays(id, days) — atomic UPDATE used_days = used_days + $1 WHERE id = $2 RETURNING *, decrementUsedDays(id, days) — atomic UPDATE used_days = used_days - $1 WHERE id = $2 AND used_days >= $1 RETURNING *. All reads compute remainingDays as totalEntitlement - usedDays in the query.

Create `src/modules/balance/balance.service.ts` with IBalanceService interface and BalanceService class. Methods: getBalance(employeeId, policyId, fiscalYear), getBalances(employeeId, fiscalYear), initializeBalance(employeeId, policyId, totalEntitlement, fiscalYear), deductDays(balanceId, days) — delegates to repository.incrementUsedDays, throws InsufficientBalanceError if remaining would go below zero, restoreDays(balanceId, days) — delegates to repository.decrementUsedDays.

Create `src/modules/balance/index.ts` barrel.

Include Jest unit tests in `tests/unit/modules/balance/balance.service.test.ts`.

## Phase 7: Phase 7: Leave module — model, repository, and validation

Create the leave module foundation at `src/modules/leave/`. This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, `src/modules/policy/policy.model.ts` from Phase 3, `src/modules/audit/audit.service.ts` from Phase 5, and `src/modules/balance/balance.service.ts` from Phase 6 — read all five before generating any code.

Create `src/modules/leave/leave.model.ts` with:
- LeaveRequest entity using canonical fields: id, employeeId, leaveTypeId, startDate, endDate, reason (string|undefined), status (LeaveStatus), approvedBy (string|null), approvedAt (Date|null), createdAt, updatedAt.
- CreateLeaveRequestDto: employeeId, leaveTypeId, startDate, endDate, reason?.
- UpdateLeaveRequestDto: startDate?, endDate?, reason?.
- LeaveRequestQueryParams: status?, leaveTypeId?, startDateFrom?, startDateTo?, endDateFrom?, endDateTo?, limit?, offset?.

Create `src/modules/leave/leave.validation.ts` with Zod schemas for createLeaveRequestSchema and updateLeaveRequestSchema — validate startDate < endDate, dates are valid ISO strings, required fields present.

Create `src/modules/leave/leave.repository.ts` with ILeaveRepository interface and LeaveRepository class using `src/shared/db/connection.ts`. Methods: findById(id), findByEmployee(employeeId, queryParams?), findByApprover(approverId, queryParams?), create(dto), updateStatus(id, status, approvedBy?, approvedAt?), update(id, dto).

Create `src/modules/leave/index.ts` barrel.

Include Jest unit tests in `tests/unit/modules/leave/leave.repository.test.ts` and `tests/unit/modules/leave/leave.validation.test.ts`.

## Phase 8: Phase 8: Leave module — service layer

Create `src/modules/leave/leave.service.ts`. This phase depends on all prior phases — read `src/modules/leave/leave.model.ts`, `src/modules/leave/leave.repository.ts`, `src/modules/leave/leave.validation.ts` from Phase 7, `src/modules/balance/balance.service.ts` from Phase 6, `src/modules/audit/audit.service.ts` from Phase 5, `src/modules/notification/notification.service.ts` from Phase 4, `src/modules/policy/policy.model.ts` from Phase 3, `src/modules/employee/employee.model.ts` from Phase 2, and `src/shared/types/index.ts` + `src/shared/utils/business-days.ts` from Phase 1 — before generating any code.

Implement ILeaveService interface and LeaveService class with these methods:

- `submit(leaveRequestId: string, actor: AuthenticatedUser): Promise<LeaveRequest>` — validates the request is in DRAFT status and belongs to the actor (employee can only submit own). Looks up the LeavePolicy by leaveTypeId. Computes business days via countBusinessDays(startDate, endDate, holidays[]). Looks up or initialises the LeaveBalance for the employee+policy+fiscalYear. Checks remaining >= requested days; if insufficient, throws InsufficientBalanceError. Atomically deducts days from balance. Updates status to SUBMITTED. Writes audit record (action: UPDATE). Sends notification to the employee's manager (or HR admin if managerId is null).

- `approve(leaveRequestId: string, approverId: string, approverRole: 'manager'|'hr_admin'): Promise<LeaveRequest>` — validates status is SUBMITTED. Looks up the employee; if managerId is not null, approver must be the manager (else throw ApproverNotAuthorizedError). If managerId is null, approverRole must be 'hr_admin'. Updates status to APPROVED, sets approvedBy and approvedAt. Writes audit record (action: APPROVE). Sends notification to the employee.

- `reject(leaveRequestId: string, approverId: string, approverRole: 'manager'|'hr_admin', reason?: string): Promise<LeaveRequest>` — same authorisation as approve. Updates status to REJECTED. Restores days to balance via balanceService.restoreDays. Writes audit record (action: REJECT). Sends notification to the employee.

- `cancel(leaveRequestId: string, actor: AuthenticatedUser): Promise<LeaveRequest>` — employee can cancel own DRAFT or SUBMITTED; manager/hr_admin can cancel any APPROVED request for employees they oversee. If status was APPROVED, restores days. Updates status to CANCELLED. Writes audit record (action: UPDATE).

- `create(dto: CreateLeaveRequestDto, actor: AuthenticatedUser): Promise<LeaveRequest>` — validates via Zod schema. Employee can only create for themselves. Creates with status DRAFT. Writes audit record (action: CREATE).

- `update(leaveRequestId: string, dto: UpdateLeaveRequestDto, actor: AuthenticatedUser): Promise<LeaveRequest>` — only DRAFT requests, only by the owning employee. Validates via Zod schema.

- `findById(id: string, actor: AuthenticatedUser): Promise<LeaveRequest>` — RBAC: employee sees own only; manager sees own + direct reports; hr_admin sees all.

- `findByEmployee(employeeId: string, queryParams: LeaveRequestQueryParams, actor: AuthenticatedUser): Promise<LeaveRequest[]>` — same RBAC rules.

Define custom error classes: InsufficientBalanceError, ApproverNotAuthorizedError, LeaveRequestNotFoundError, InvalidStateTransitionError.

Include Jest unit tests in `tests/unit/modules/leave/leave.service.test.ts`.

## Phase 9: Phase 9: Leave module — controller and routes

Create `src/modules/leave/leave.controller.ts` and `src/modules/leave/leave.routes.ts`. This phase depends on `src/modules/leave/leave.service.ts` from Phase 8, `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.validation.ts` from Phase 7, and `src/shared/types/index.ts` from Phase 1 — read all four before generating any code.

Create `src/modules/leave/leave.controller.ts` with LeaveController class. The controller consumes `request.user` (AuthenticatedUser) from the existing auth middleware — declare the type, do NOT build auth middleware. If request.user is absent, return 401. Methods:
- `create(request, reply)` — validates body with createLeaveRequestSchema (400 on invalid), calls service.create, returns 201.
- `submit(request, reply)` — reads leaveRequestId from params, calls service.submit, returns 200.
- `approve(request, reply)` — reads leaveRequestId from params, passes request.user.id + role, returns 200.
- `reject(request, reply)` — reads leaveRequestId from params + optional reason from body, passes request.user.id + role, returns 200.
- `cancel(request, reply)` — reads leaveRequestId from params, calls service.cancel, returns 200.
- `getById(request, reply)` — reads id from params, calls service.findById, returns 200.
- `getByEmployee(request, reply)` — reads employeeId from params + query string, calls service.findByEmployee, returns 200.
- `update(request, reply)` — reads leaveRequestId from params, validates body with updateLeaveRequestSchema, calls service.update, returns 200.

Create `src/modules/leave/leave.routes.ts` as a Fastify plugin registering all routes under `/api/leave`:
- POST `/api/leave` → controller.create
- POST `/api/leave/:leaveRequestId/submit` → controller.submit
- POST `/api/leave/:leaveRequestId/approve` → controller.approve
- POST `/api/leave/:leaveRequestId/reject` → controller.reject
- POST `/api/leave/:leaveRequestId/cancel` → controller.cancel
- GET `/api/leave/:id` → controller.getById
- GET `/api/leave/employee/:employeeId` → controller.getByEmployee
- PATCH `/api/leave/:leaveRequestId` → controller.update

Update `src/modules/leave/index.ts` barrel to export controller and routes.

Register the leave routes in `src/app.ts` via `app.register(leaveRoutes)`.

Include Jest unit tests in `tests/unit/modules/leave/leave.controller.test.ts`.
