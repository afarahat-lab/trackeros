# PLAN.md

## Phase 1: Phase 1: Shared enums and base types

Create the foundational shared types and base classes that all leave management modules depend on.

Create `src/shared/types/leave.types.ts` with these TypeScript enums:
- `LeaveType`: ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, OTHER
- `LeaveStatus`: PENDING, APPROVED, REJECTED, CANCELLED
- `NotificationType`: LEAVE_REQUESTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED
- `AuditAction`: CREATED, UPDATED, DELETED, APPROVED, REJECTED, CANCELLED
- `EntityType`: LEAVE_REQUEST, LEAVE_BALANCE, LEAVE_POLICY, EMPLOYEE
- `EmployeeRole`: EMPLOYEE, MANAGER, HR_ADMIN
- `EmploymentStatus`: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE

Create `src/shared/error.types.ts` with base error classes:
- `NotFoundError` (extends Error, takes entityName and id)
- `ValidationError` (extends Error, takes message and optional fieldErrors array)
- `ForbiddenError` (extends Error, takes message)
- `ConflictError` (extends Error, takes message)

Create `src/shared/base.repository.ts` with an abstract `BaseRepository<T>` class that accepts a Knex instance and provides common CRUD method signatures: `findById`, `findAll`, `create`, `update`, `delete`. Use the Knex type from the existing project setup.

Include Vitest unit tests in `tests/unit/shared/error.types.test.ts` for the error classes.

## Phase 2: Phase 2: Employee model and repository

Create the Employee domain model and repository. This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (for EmployeeRole and EmploymentStatus enums) and `src/shared/base.repository.ts` from Phase 1 — read both before generating any code.

Create `src/modules/employee/employee.model.ts` with these TypeScript interfaces:
- `Employee`: id (string), employeeNumber (string), firstName (string), lastName (string), email (string), department (string | null), designation (string | null), managerId (string | null), role (EmployeeRole from src/shared/types/leave.types.ts), employmentStatus (EmploymentStatus from src/shared/types/leave.types.ts), hireDate (Date), terminationDate (Date | null), createdAt (Date), updatedAt (Date), deletedAt (Date | null)
- `CreateEmployeeDto`: employeeNumber, firstName, lastName, email, department?, designation?, managerId?, role, hireDate
- `UpdateEmployeeDto`: Partial of all mutable Employee fields except id, createdAt, updatedAt, deletedAt

Create `src/modules/employee/employee.repository.ts` with:
- `IEmployeeRepository` interface extending the pattern from `src/shared/base.repository.ts`: findById(id: string), findByEmployeeNumber(employeeNumber: string), findByEmail(email: string), findByManagerId(managerId: string), findAll(filter?: EmployeeFilter), create(dto: CreateEmployeeDto), update(id: string, dto: UpdateEmployeeDto), softDelete(id: string)
- `EmployeeRepository` class implementing IEmployeeRepository using Knex

Create `src/modules/employee/index.ts` as the public entry point exporting Employee, CreateEmployeeDto, UpdateEmployeeDto, IEmployeeRepository, EmployeeRepository.

Include Vitest unit tests in `tests/unit/modules/employee/employee.repository.test.ts`.

## Phase 3: Phase 3: LeavePolicy model, repository, service, and index

Create the LeavePolicy domain module (model + repository + service + index) in a single phase so Aider sees type definitions alongside their usage.

This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (for LeaveType enum) and `src/shared/base.repository.ts` from Phase 1 — read both before generating any code.

Create `src/modules/policy/policy.model.ts` with these TypeScript interfaces:
- `LeaveType`: id (string), code (string), name (string), description (string | null), isPaid (boolean), requiresAttachment (boolean), minDurationDays (number | null), maxDurationDays (number | null), isActive (boolean), createdAt (Date), updatedAt (Date)
- `LeavePolicy`: id (string), policyName (string), leaveTypeId (string), department (string | null), designation (string | null), annualQuota (number), maxConsecutiveDays (number | null), minTenureMonths (number | null), requiresApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date)
- `CreateLeavePolicyDto`: policyName, leaveTypeId, department?, designation?, annualQuota, maxConsecutiveDays?, minTenureMonths?, requiresApproval?
- `UpdateLeavePolicyDto`: Partial of all mutable LeavePolicy fields except id, createdAt, updatedAt
- `LeavePolicyQueryParams`: leaveTypeId?, department?, designation?, isActive?

Create `src/modules/policy/policy.repository.ts` with:
- `ILeavePolicyRepository` interface: findById, findByLeaveTypeId, findActivePolicies, findAll (with query params filter), create, update, softDelete
- `LeavePolicyRepository` class implementing ILeavePolicyRepository using Knex, extending BaseRepository pattern from `src/shared/base.repository.ts`

Create `src/modules/policy/policy.service.ts` with:
- `ILeavePolicyService` interface: getPolicy, getPoliciesForEmployee (matches by department/designation), createPolicy, updatePolicy, deactivatePolicy
- `LeavePolicyService` class implementing ILeavePolicyService, delegating to ILeavePolicyRepository

Create `src/modules/policy/index.ts` as the public entry point re-exporting all public types and classes.

Include Vitest unit tests in `tests/unit/modules/policy/policy.repository.test.ts`.

## Phase 4: Phase 4: LeaveBalance model and repository

Create the LeaveBalance domain model and repository. This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (for LeaveType enum), `src/shared/base.repository.ts` from Phase 1, and `src/modules/employee/employee.model.ts` from Phase 2 (for Employee type reference) — read all three before generating any code.

Create `src/modules/balance/balance.model.ts` with these TypeScript interfaces:
- `LeaveBalance`: id (string), employeeId (string), leaveTypeId (string), leaveTypeCode (LeaveType from src/shared/types/leave.types.ts), annualQuota (number), usedDays (number), pendingDays (number), remainingDays (number), year (number), lastAccrualDate (Date | null), createdAt (Date), updatedAt (Date)
- `CreateLeaveBalanceDto`: employeeId, leaveTypeId, leaveTypeCode, annualQuota, year
- `UpdateLeaveBalanceDto`: Partial of mutable fields (annualQuota, usedDays, pendingDays, remainingDays, lastAccrualDate)
- `LeaveBalanceQueryParams`: employeeId?, leaveTypeId?, year?, leaveTypeCode?

Create `src/modules/balance/balance.repository.ts` with:
- `ILeaveBalanceRepository` interface: findById, findByEmployeeId, findByEmployeeAndLeaveType, findByEmployeeAndYear, findAll (with query params), create, update, upsert (insert or update based on employeeId + leaveTypeId + year uniqueness), recalculateRemaining (updates remainingDays = annualQuota - usedDays - pendingDays)
- `LeaveBalanceRepository` class implementing ILeaveBalanceRepository using Knex, extending the BaseRepository pattern from `src/shared/base.repository.ts`

Create `src/modules/balance/index.ts` as the public entry point re-exporting all public types and classes.

Include Vitest unit tests in `tests/unit/modules/balance/balance.repository.test.ts`.

## Phase 5: Phase 5: LeaveRequest model and repository

Create the LeaveRequest domain model and repository. This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (for LeaveType, LeaveStatus enums), `src/shared/base.repository.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2 (for Employee type), `src/modules/policy/policy.model.ts` from Phase 3 (for LeavePolicy type), and `src/modules/balance/balance.model.ts` from Phase 4 (for LeaveBalance type) — read all five before generating any code.

Create `src/modules/leave/leave.model.ts` with these TypeScript interfaces:
- `LeaveRequest`: id (string), employeeId (string), leaveTypeId (string), leaveTypeCode (LeaveType from src/shared/types/leave.types.ts), status (LeaveStatus from src/shared/types/leave.types.ts), startDate (Date), endDate (Date), durationDays (number), reason (string | null), attachmentUrl (string | null), reviewerId (string | null), reviewerComment (string | null), reviewedAt (Date | null), cancelledAt (Date | null), cancellationReason (string | null), createdAt (Date), updatedAt (Date)
- `CreateLeaveRequestDto`: employeeId, leaveTypeId, leaveTypeCode, startDate, endDate, durationDays, reason?, attachmentUrl?
- `UpdateLeaveRequestDto`: Partial of mutable fields (status, reviewerId, reviewerComment, reviewedAt, cancelledAt, cancellationReason)
- `LeaveRequestQueryParams`: employeeId?, leaveTypeId?, status?, startDate?, endDate?, reviewerId?

Create `src/modules/leave/leave.repository.ts` with:
- `ILeaveRepository` interface: findById, findByEmployeeId, findByReviewerId, findByStatus, findAll (with query params), findOverlapping (checks for date-range conflicts for a given employee), create, update, updateStatus (atomic status transition with reviewer info)
- `LeaveRepository` class implementing ILeaveRepository using Knex, extending the BaseRepository pattern from `src/shared/base.repository.ts`

Create `src/modules/leave/index.ts` as the public entry point re-exporting all public types and classes.

Include Vitest unit tests in `tests/unit/modules/leave/leave.repository.test.ts`.

## Phase 6: Phase 6: AuditLog and Notification models and repositories

Create the AuditLog and Notification domain models and repositories. This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (for AuditAction, EntityType, NotificationType enums), `src/shared/base.repository.ts` from Phase 1, and `src/modules/employee/employee.model.ts` from Phase 2 (for Employee type) — read all three before generating any code.

Create `src/modules/audit/audit.model.ts` with:
- `AuditRecord`: id (string), entityType (EntityType from src/shared/types/leave.types.ts), entityId (string), action (AuditAction from src/shared/types/leave.types.ts), actorId (string), previousState (Record<string, unknown> | null), newState (Record<string, unknown> | null), metadata (Record<string, unknown> | null), createdAt (Date)

Create `src/modules/audit/audit.repository.ts` with:
- `IAuditRepository` interface: findById, findByEntity, findByActor, findByAction, findAll (with date range and entity type filters), create
- `AuditRepository` class implementing IAuditRepository using Knex

Create `src/modules/notification/notification.model.ts` with:
- `Notification`: id (string), recipientId (string), notificationType (NotificationType from src/shared/types/leave.types.ts), title (string), body (string), entityType (EntityType from src/shared/types/leave.types.ts), entityId (string), isRead (boolean), createdAt (Date), readAt (Date | null)

Create `src/modules/notification/notification.repository.ts` with:
- `INotificationRepository` interface: findById, findByRecipient, findUnreadByRecipient, create, markAsRead, markAllAsRead
- `NotificationRepository` class implementing INotificationRepository using Knex

Create `src/modules/audit/index.ts` and `src/modules/notification/index.ts` as public entry points.

Include Vitest unit tests in `tests/unit/modules/audit/audit.repository.test.ts` and `tests/unit/modules/notification/notification.repository.test.ts`.

## Phase 7: Phase 7: Leave management service (orchestration)

Create the core leave management service that orchestrates the full leave request lifecycle. This phase depends on all prior phases — read these files before generating any code:
- `src/shared/types/leave.types.ts` from Phase 1 (enums)
- `src/shared/error.types.ts` from Phase 1 (error classes)
- `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2
- `src/modules/policy/policy.model.ts` and `src/modules/policy/policy.repository.ts` from Phase 3
- `src/modules/balance/balance.model.ts` and `src/modules/balance/balance.repository.ts` from Phase 4
- `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` from Phase 5
- `src/modules/audit/audit.model.ts` and `src/modules/audit/audit.repository.ts` from Phase 6
- `src/modules/notification/notification.model.ts` and `src/modules/notification/notification.repository.ts` from Phase 6

Create `src/modules/leave/leave.service.ts` with:
- `ILeaveService` interface declaring: apply(dto: CreateLeaveRequestDto, actorId: string), approve(requestId: string, reviewerId: string, comment?: string), reject(requestId: string, reviewerId: string, comment: string), cancel(requestId: string, actorId: string, reason?: string), getRequest(requestId: string), getEmployeeRequests(employeeId: string, params?: LeaveRequestQueryParams), getPendingApprovals(reviewerId: string), getLeaveBalance(employeeId: string, leaveTypeId?: string)
- `LeaveService` class implementing ILeaveService. Constructor injects: ILeaveRepository, IEmployeeRepository, ILeavePolicyRepository, ILeaveBalanceRepository, IAuditRepository, INotificationRepository. The apply method must: validate employee exists and is active, resolve applicable LeavePolicy, check balance sufficiency (remainingDays >= durationDays), check for overlapping requests, create the LeaveRequest with PENDING status, update LeaveBalance pendingDays, write AuditRecord, create Notification for the manager. The approve method must: validate request is PENDING, validate reviewer is the employee's manager or HR_ADMIN, transition to APPROVED, move pendingDays to usedDays in balance, write AuditRecord, create Notification. The reject method must: validate request is PENDING, validate reviewer authorization, transition to REJECTED, release pendingDays back to remaining, write AuditRecord, create Notification. The cancel method must: validate request is PENDING or APPROVED, validate actor is the employee or HR_ADMIN, transition to CANCELLED, adjust balance accordingly, write AuditRecord, create Notification.

Include Vitest unit tests in `tests/unit/modules/leave/leave.service.test.ts` with mocked repository dependencies.

## Phase 8: Phase 8: Leave validation schemas (Zod)

Create Zod validation schemas for all leave management API inputs. This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (for LeaveType, LeaveStatus enums) and `src/modules/leave/leave.model.ts` from Phase 5 (for DTO field definitions) — read both before generating any code.

Create `src/modules/leave/leave.validation.ts` with Zod schemas:
- `createLeaveRequestSchema`: validates employeeId (uuid), leaveTypeId (uuid), leaveTypeCode (nativeEnum LeaveType), startDate (coerced date, must be today or future), endDate (coerced date, must be after startDate), durationDays (positive number), reason (optional string, max 500 chars), attachmentUrl (optional url string)
- `approveLeaveRequestSchema`: validates reviewerComment (optional string, max 500 chars)
- `rejectLeaveRequestSchema`: validates reviewerComment (required string, min 1, max 500 chars)
- `cancelLeaveRequestSchema`: validates cancellationReason (optional string, max 500 chars)
- `leaveRequestQuerySchema`: validates optional query params: employeeId (uuid), leaveTypeId (uuid), status (nativeEnum LeaveStatus), startDate (coerced date), endDate (coerced date), reviewerId (uuid), page (positive int default 1), limit (positive int max 100 default 20)
- `leaveBalanceQuerySchema`: validates optional query params: employeeId (uuid), leaveTypeId (uuid), year (positive int)
- Export inferred TypeScript types from each schema using `z.infer<>`

Include Vitest unit tests in `tests/unit/modules/leave/leave.validation.test.ts` covering valid inputs, invalid inputs, edge cases (date ordering, enum values, string lengths).

## Phase 9: Phase 9: Leave controller

Create the LeaveController that bridges HTTP requests to the leave service. This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (enums), `src/shared/error.types.ts` from Phase 1 (error classes), `src/modules/leave/leave.model.ts` from Phase 5 (DTOs), `src/modules/leave/leave.service.ts` from Phase 7 (ILeaveService), and `src/modules/leave/leave.validation.ts` from Phase 8 (Zod schemas) — read all five before generating any code.

Create `src/modules/leave/leave.controller.ts` with:
- `ILeaveController` interface declaring handler method signatures matching Fastify's RouteHandlerMethod pattern: apply, approve, reject, cancel, getRequest, getMyRequests, getPendingApprovals, getLeaveBalance
- `LeaveController` class implementing ILeaveController. Constructor injects ILeaveService. Each handler: extracts and validates request params/body/query using the Zod schemas from `src/modules/leave/leave.validation.ts`, calls the corresponding ILeaveService method, maps domain errors (NotFoundError, ValidationError, ForbiddenError, ConflictError) to appropriate HTTP status codes (404, 400, 403, 409), and returns a consistent JSON response envelope `{ success: boolean, data?: T, error?: { code: string, message: string } }`. The getMyRequests handler extracts the authenticated user's employeeId from the request context (request.employeeId set by auth middleware). The getPendingApprovals handler extracts the reviewer's employeeId from the request context.

Create `src/modules/leave/index.ts` updating the public entry point to also export ILeaveController, LeaveController.

Include Vitest unit tests in `tests/unit/modules/leave/leave.controller.test.ts` with a mocked ILeaveService.

## Phase 10: Phase 10: Leave routes with RBAC middleware

Create the Fastify route registration for the leave module with RBAC enforcement. This phase depends on `src/shared/types/leave.types.ts` from Phase 1 (for EmployeeRole enum), `src/modules/leave/leave.validation.ts` from Phase 8 (Zod schemas), and `src/modules/leave/leave.controller.ts` from Phase 9 (LeaveController) — read all three before generating any code.

Create `src/modules/leave/leave.routes.ts` that exports an async function `leaveRoutes(fastify: FastifyInstance): Promise<void>`. Register the following routes with RBAC middleware:

- `POST /leave/requests` — apply for leave. Auth required. Role: EMPLOYEE, MANAGER, HR_ADMIN. Validate body with createLeaveRequestSchema. Handler: leaveController.apply.
- `GET /leave/requests` — list own requests. Auth required. Role: EMPLOYEE, MANAGER, HR_ADMIN. Validate query with leaveRequestQuerySchema. Handler: leaveController.getMyRequests.
- `GET /leave/requests/:id` — get a specific request. Auth required. Role: EMPLOYEE, MANAGER, HR_ADMIN. Handler: leaveController.getRequest.
- `POST /leave/requests/:id/approve` — approve a request. Auth required. Role: MANAGER, HR_ADMIN. Validate body with approveLeaveRequestSchema. Handler: leaveController.approve.
- `POST /leave/requests/:id/reject` — reject a request. Auth required. Role: MANAGER, HR_ADMIN. Validate body with rejectLeaveRequestSchema. Handler: leaveController.reject.
- `POST /leave/requests/:id/cancel` — cancel a request. Auth required. Role: EMPLOYEE, MANAGER, HR_ADMIN. Validate body with cancelLeaveRequestSchema. Handler: leaveController.cancel.
- `GET /leave/approvals/pending` — list pending approvals for the reviewer. Auth required. Role: MANAGER, HR_ADMIN. Handler: leaveController.getPendingApprovals.
- `GET /leave/balances` — get leave balances. Auth required. Role: EMPLOYEE, MANAGER, HR_ADMIN. Validate query with leaveBalanceQuerySchema. Handler: leaveController.getLeaveBalance.

Create an RBAC middleware helper `src/shared/middleware/rbac.middleware.ts` with:
- `requireRole(...roles: EmployeeRole[])` — returns a Fastify preHandler that checks `request.employeeRole` (set by auth middleware) against the allowed roles, returning 403 Forbidden if not authorized.
- `requireAuth` — returns a Fastify preHandler that checks `request.employeeId` exists, returning 401 Unauthorized if not.

Register the leave routes in `src/app.ts` by importing and calling `app.register(leaveRoutes, { prefix: '/api' })`.

Update `src/modules/leave/index.ts` to also export `leaveRoutes`.

Include Vitest unit tests in `tests/unit/modules/leave/leave.routes.test.ts` using Fastify's inject method to test each endpoint with mocked dependencies, and `tests/unit/shared/middleware/rbac.middleware.test.ts` for the RBAC middleware.
