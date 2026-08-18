# PLAN.md

## Phase 1: Phase 1: Foundation & Shared Types

Create all shared enums, base repository interface, and error types. These are the foundation every other module imports.

Files to create:
- `src/shared/types/leave-status.enum.ts` — LeaveStatus enum: DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED
- `src/shared/types/leave-type.enum.ts` — LeaveType enum: annual | sick | emergency | unpaid | maternity | paternity
- `src/shared/types/leave-action.enum.ts` — LeaveAction enum: CREATE | SUBMIT | APPROVE | REJECT | CANCEL | UPDATE | DELETE
- `src/shared/types/notification-type.enum.ts` — NotificationType enum: LEAVE_SUBMITTED | LEAVE_APPROVED | LEAVE_REJECTED | LEAVE_CANCELLED | BALANCE_UPDATED
- `src/shared/types/employment-status.enum.ts` — EmploymentStatus enum: ACTIVE | INACTIVE | TERMINATED
- `src/shared/types/audit-action.enum.ts` — AuditAction enum: CREATE | UPDATE | DELETE | APPROVE | REJECT
- `src/shared/types/index.ts` — barrel export re-exporting all enums
- `src/shared/error-types.ts` — base error classes: NotFoundError, ValidationError, ConflictError, UnauthorizedError (extend Error, include statusCode)
- `src/shared/base-repository.ts` — generic IBaseRepository<T> interface with findById, findAll, create, update, delete methods; and an abstract BaseRepository<T> class using the existing pg Pool from `src/shared/db/connection.ts`
- `tests/unit/shared/types/enums.spec.ts` — Jest tests verifying every enum value exists

Existing files to read before generating: `src/shared/db/connection.ts` (the pg Pool export), `tsconfig.json` (baseUrl is `./src` so imports use non-relative paths like `shared/db/connection`).

## Phase 2: Phase 2: Employee & LeavePolicy Modules

Build the Employee and LeavePolicy domain modules — models, repository interfaces, repository implementations, service interfaces, and service implementations. No controllers/routes yet.

Employee module files (~6 files):
- `src/modules/employee/employee.model.ts` — Employee entity interface with exact fields: id, employeeNumber, firstName, lastName, email, managerId (string | null), department (string | null), hireDate (Date), terminationDate (Date | null), employmentStatus (EmploymentStatus), createdAt, updatedAt, deletedAt (Date | null). Import EmploymentStatus from `shared/types/employment-status.enum`.
- `src/modules/employee/employee.repository.ts` — IEmployeeRepository interface extending IBaseRepository<Employee> plus findByEmployeeNumber, findByEmail, findByManagerId, findActive. EmployeeRepository class extending BaseRepository<Employee> implementing IEmployeeRepository using the pg Pool.
- `src/modules/employee/employee.service.ts` — IEmployeeService interface with getById, getByEmployeeNumber, getByEmail, getSubordinates, isActive. EmployeeService implementation delegating to IEmployeeRepository.
- `src/modules/employee/index.ts` — barrel export

LeavePolicy module files (~6 files):
- `src/modules/leave-policy/leave-policy.model.ts` — LeavePolicy entity interface with exact fields: id, policyName, leaveType (LeaveType), entitlementDays, accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval, isActive, createdAt, updatedAt. Import LeaveType from `shared/types/leave-type.enum`.
- `src/modules/leave-policy/leave-policy.repository.ts` — ILeavePolicyRepository interface extending IBaseRepository<LeavePolicy> plus findByLeaveType, findActive. LeavePolicyRepository class.
- `src/modules/leave-policy/leave-policy.service.ts` — ILeavePolicyService interface with getById, getByLeaveType, getActivePolicies, isLeaveTypeActive. LeavePolicyService implementation.
- `src/modules/leave-policy/index.ts` — barrel export

Test files:
- `tests/unit/modules/employee/employee.service.spec.ts`
- `tests/unit/modules/leave-policy/leave-policy.service.spec.ts`

This phase depends on Phase 1 files: `src/shared/types/index.ts`, `src/shared/base-repository.ts`, `src/shared/error-types.ts`, `src/shared/db/connection.ts`. Read all of them before generating any code.

## Phase 3: Phase 3: LeaveBalance Module

Build the LeaveBalance domain module — model, repository, service. LeaveBalance tracks an employee's entitlement, usage, and remaining balance for a specific policy and fiscal year.

Files to create (~5 files):
- `src/modules/balance/balance.model.ts` — LeaveBalance entity interface with exact fields: id, employeeId, leavePolicyId, totalEntitlement (number), usedDays (number), remainingDays (number), fiscalYear (number), status ('ACTIVE' | 'CLOSED'), createdAt, updatedAt. Also define CreateLeaveBalanceDto (employeeId, leavePolicyId, totalEntitlement, fiscalYear) and UpdateLeaveBalanceDto (partial of usedDays, remainingDays, status).
- `src/modules/balance/balance.repository.ts` — ILeaveBalanceRepository interface extending IBaseRepository<LeaveBalance> plus findByEmployeeId, findByEmployeeAndPolicy, findByEmployeeAndFiscalYear, findActiveByEmployee, upsert (for idempotent balance creation). LeaveBalanceRepository class implementing it.
- `src/modules/balance/balance.service.ts` — ILeaveBalanceService interface with getBalance, getOrCreateBalance, deductDays, restoreDays, getRemainingDays, closeBalance. LeaveBalanceService implementation. The deductDays method MUST use the BINDING formula: daysRequested = (endDate - startDate) + 1 (inclusive calendar days, integer). remainingDays = totalEntitlement - usedDays (integer arithmetic). Throw ValidationError if insufficient balance.
- `src/modules/balance/index.ts` — barrel export
- `tests/unit/modules/balance/balance.service.spec.ts` — Jest tests covering balance creation, deduction (including exact-boundary and insufficient-balance cases), restoration, and fiscal-year scoping.

This phase depends on:
- Phase 1: `src/shared/types/index.ts`, `src/shared/base-repository.ts`, `src/shared/error-types.ts`, `src/shared/db/connection.ts`
- Phase 2: `src/modules/employee/employee.model.ts`, `src/modules/leave-policy/leave-policy.model.ts` (LeaveBalance references employeeId and leavePolicyId — read these to understand the FK shapes)

## Phase 4: Phase 4: LeaveRequest Core Workflow

Build the LeaveRequest domain module — model, repository, service, controller, and routes. This is the central workflow: employees create/submit leave requests, the system validates against policy and balance, and managers approve/reject.

Files to create (approximately 6-8 files):

- `src/modules/leave-request/leave-request.model.ts` — LeaveRequest entity interface with exact fields: id, employeeId, leavePolicyId, startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus), approvedBy (string | null), approvedAt (Date | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt, updatedAt. Also define CreateLeaveRequestDto (employeeId, leavePolicyId, startDate, endDate, reason?), UpdateLeaveRequestDto (partial of startDate, endDate, reason, status), and LeaveRequestQueryParams (employeeId?, status?, leavePolicyId?, startDate?, endDate?). Import LeaveStatus from `shared/types/leave-status.enum`.

- `src/modules/leave-request/leave-request.repository.ts` — ILeaveRequestRepository interface extending IBaseRepository<LeaveRequest> plus findByEmployeeId, findByStatus, findOverlapping (detects date-range overlaps for the same employee), findByDateRange, findPendingForManager. LeaveRequestRepository class implementing it. The findOverlapping query MUST use the BINDING inclusive-day formula: overlap exists when existing.startDate <= newEndDate AND existing.endDate >= newStartDate.

- `src/modules/leave-request/leave-request.service.ts` — ILeaveRequestService interface with create, submit, approve, reject, cancel, update, getById, query, getEmployeeRequests. LeaveRequestService implementation. Key BINDING rules to enforce:
  * On SUBMIT: validate employee is ACTIVE (via IEmployeeService), validate policy is active (via ILeavePolicyService), check minimumNoticeDays (skip for emergency leave per BINDING rule), check for overlapping requests, compute daysRequested = (endDate - startDate) + 1 (inclusive calendar days, integer), check sufficient balance via ILeaveBalanceService.
  * On APPROVE: deduct days from LeaveBalance using the same inclusive formula. Set approvedBy, approvedAt.
  * On REJECT: no balance change, just status transition.
  * On CANCEL (from APPROVED): restore days to LeaveBalance, set cancelledBy, cancelledAt.
  * Fiscal year = calendar year of startDate (BINDING). Cross-year requests charge entirely to startDate's fiscal year.
  * Inject IEmployeeService, ILeavePolicyService, ILeaveBalanceService, ILeaveRequestRepository as constructor dependencies.

- `src/modules/leave-request/leave-request.controller.ts` — LeaveRequestController class with handler methods: createLeaveRequest, submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, updateLeaveRequest, getLeaveRequest, queryLeaveRequests. Each method extracts/validates input from Fastify request, calls the service, and returns the appropriate HTTP response. Use Zod for request validation.

- `src/modules/leave-request/leave-request.routes.ts` — Fastify plugin registering routes: POST /leave-requests, POST /leave-requests/:id/submit, POST /leave-requests/:id/approve, POST /leave-requests/:id/reject, POST /leave-requests/:id/cancel, PUT /leave-requests/:id, GET /leave-requests/:id, GET /leave-requests.

- `src/modules/leave-request/index.ts` — barrel export

- `tests/unit/modules/leave-request/leave-request.service.spec.ts` — Jest tests covering: create draft, submit with valid policy/balance, submit with insufficient balance (expect ValidationError), submit with overlapping dates (expect ConflictError), submit emergency leave bypassing minimumNoticeDays, approve (deducts balance), reject (no balance change), cancel from approved (restores balance), cancel from submitted (no balance change), cross-year request charged to startDate fiscal year.

This phase depends on:
- Phase 1: `src/shared/types/index.ts`, `src/shared/base-repository.ts`, `src/shared/error-types.ts`, `src/shared/db/connection.ts`
- Phase 2: `src/modules/employee/employee.model.ts`, `src/modules/employee/employee.repository.ts`, `src/modules/employee/employee.service.ts`, `src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.ts`, `src/modules/leave-policy/leave-policy.service.ts`
- Phase 3: `src/modules/balance/balance.model.ts`, `src/modules/balance/balance.repository.ts`, `src/modules/balance/balance.service.ts`

Read ALL of these dependency files before generating any code — the service must import and use the exact interfaces and types from prior phases.

## Phase 5: Phase 5: Integration, Testing & Polish

Build the Audit and Notification modules, wire all routes into the Fastify app, and add integration tests.

Audit module (~4 files):
- `src/modules/audit/audit.model.ts` — AuditRecord entity interface with exact fields: id, entityType, entityId, action (AuditAction), oldValues (Record<string, unknown> | null), newValues (Record<string, unknown> | null), performedBy, performedAt, ipAddress (string | null), userAgent (string | null), createdAt. Import AuditAction from `shared/types/audit-action.enum`.
- `src/modules/audit/audit.repository.ts` — IAuditRepository interface extending IBaseRepository<AuditRecord> plus findByEntity, findByPerformedBy, findByDateRange. AuditRepository class.
- `src/modules/audit/audit.service.ts` — IAuditService interface with log, getAuditTrail, getByEntity. AuditService implementation.
- `src/modules/audit/index.ts` — barrel export

Notification module (~4 files):
- `src/modules/notification/notification.model.ts` — Notification entity interface with exact fields: id, recipientId, type (NotificationType), title, message, relatedEntityType (string | null), relatedEntityId (string | null), status ('UNREAD' | 'READ'), createdAt, readAt (Date | null). Import NotificationType from `shared/types/notification-type.enum`.
- `src/modules/notification/notification.repository.ts` — INotificationRepository interface extending IBaseRepository<Notification> plus findByRecipient, findUnreadByRecipient, markAsRead. NotificationRepository class.
- `src/modules/notification/notification.service.ts` — INotificationService interface with send, getNotifications, markAsRead, markAllAsRead. NotificationService implementation.
- `src/modules/notification/index.ts` — barrel export

App wiring and integration tests (~3 files):
- Update `src/app.ts` — register leave-request routes, balance routes, and any other module routes alongside the existing uptimeRoutes. Import and register: leaveRequestRoutes from `modules/leave-request/leave-request.routes`, balanceRoutes from `modules/balance/balance.routes` (create this lightweight routes file if not already present).
- `src/modules/balance/balance.routes.ts` — Fastify plugin with GET /balances/:employeeId and GET /balances/:employeeId/:leavePolicyId endpoints using BalanceService.
- `tests/integration/leave-request-workflow.spec.ts` — Integration test: build Fastify instance with all routes registered, test the full lifecycle: create draft → submit → approve → verify balance deducted → cancel → verify balance restored. Use a test database or mock the repository layer.

This phase depends on ALL prior phases — read every model, repository, and service file from Phases 1-4 before generating any code. Specifically:
- Phase 1: `src/shared/types/index.ts`, `src/shared/base-repository.ts`, `src/shared/error-types.ts`, `src/shared/db/connection.ts`
- Phase 2: `src/modules/employee/employee.model.ts`, `src/modules/employee/employee.repository.ts`, `src/modules/employee/employee.service.ts`, `src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.ts`, `src/modules/leave-policy/leave-policy.service.ts`
- Phase 3: `src/modules/balance/balance.model.ts`, `src/modules/balance/balance.repository.ts`, `src/modules/balance/balance.service.ts`
- Phase 4: `src/modules/leave-request/leave-request.model.ts`, `src/modules/leave-request/leave-request.repository.ts`, `src/modules/leave-request/leave-request.service.ts`, `src/modules/leave-request/leave-request.controller.ts`, `src/modules/leave-request/leave-request.routes.ts`
- Existing: `src/app.ts`, `src/index.ts`
