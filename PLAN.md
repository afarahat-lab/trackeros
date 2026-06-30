# PLAN.md

## Phase 1: Phase 1: Shared enums and base domain types

Create the foundational shared types that all leave-management modules depend on.

Create `src/shared/types/leave.types.ts` with:
- Enum `LeaveStatus`: PENDING, APPROVED, REJECTED, CANCELLED, IN_PROGRESS, COMPLETED
- Enum `EmploymentStatus`: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE
- Enum `AuditAction`: CREATED, UPDATED, DELETED, APPROVED, REJECTED, CANCELLED, SUBMITTED
- Enum `NotificationType`: LEAVE_REQUEST_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED, BALANCE_UPDATED
- Enum `EntityType`: EMPLOYEE, LEAVE_TYPE, LEAVE_POLICY, LEAVE_REQUEST, LEAVE_BALANCE, AUDIT_LOG, NOTIFICATION

Create `src/shared/error.types.ts` with domain error classes:
- `NotFoundError` (extends Error, takes entityName: string, id: string)
- `ValidationError` (extends Error, takes message: string, details?: unknown[])
- `ConflictError` (extends Error, takes message: string)
- `UnauthorizedError` (extends Error, takes message: string)
- `ForbiddenError` (extends Error, takes message: string)

Include Jest unit tests in `tests/unit/shared/error.types.test.ts` covering each error class instantiation and property access.

Approximately 3 files.

## Phase 2: Phase 2: Employee domain model and repository

Create the Employee domain model and its repository together so Aider sees both the field definitions and their usage in a single context.

Create `src/modules/employee/employee.model.ts` with:
- Interface `Employee`: id (string), employeeNumber (string), firstName (string), lastName (string), email (string), managerId (string | null), department (string | null), hireDate (Date), terminationDate (Date | null), employmentStatus (EmploymentStatus), createdAt (Date), updatedAt (Date), deletedAt (Date | null)
- Interface `CreateEmployeeDto`: employeeNumber, firstName, lastName, email, managerId?, department?, hireDate
- Interface `UpdateEmployeeDto`: partial of CreateEmployeeDto fields plus employmentStatus?
- Import `EmploymentStatus` from `src/shared/types/leave.types.ts` (Phase 1)

Create `src/modules/employee/employee.repository.ts` with:
- Interface `IEmployeeRepository`: findById(id), findByEmployeeNumber(employeeNumber), findByEmail(email), findByManagerId(managerId), findAll(filter?), create(dto), update(id, dto), softDelete(id)
- Class `EmployeeRepository` implementing `IEmployeeRepository` using Knex with the `pool` from `src/shared/db/connection.ts`
- Knex migration in `src/modules/employee/migrations/001_create_employees.ts` creating the `employees` table with columns matching the Employee interface, plus indexes on employeeNumber (unique), email (unique), managerId

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts` mocking the database pool.

This phase depends on `src/shared/types/leave.types.ts` and `src/shared/error.types.ts` from Phase 1 — read them before generating any code that references their types.

Approximately 4 files.

## Phase 3: Phase 3: LeaveType and LeavePolicy domain models and repositories

Create the LeaveType and LeavePolicy domain models and their repositories together.

Create `src/modules/leaveType/leaveType.model.ts` with:
- Interface `LeaveType`: id (string), code (string), name (string), description (string | null), isPaid (boolean), isActive (boolean), createdAt (Date), updatedAt (Date)
- Interface `CreateLeaveTypeDto`: code, name, description?, isPaid, isActive?

Create `src/modules/leaveType/leaveType.repository.ts` with:
- Interface `ILeaveTypeRepository`: findById(id), findByCode(code), findAll(filter?), create(dto), update(id, dto), deactivate(id)
- Class `LeaveTypeRepository` implementing `ILeaveTypeRepository` using Knex with `pool` from `src/shared/db/connection.ts`
- Knex migration creating `leave_types` table with unique index on `code`

Create `src/modules/leavePolicy/leavePolicy.model.ts` with:
- Interface `LeavePolicy`: id (string), policyName (string), leaveTypeId (string), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), allowNegativeBalance (boolean), maxConsecutiveDays (number | null), createdAt (Date), updatedAt (Date)
- Interface `CreateLeavePolicyDto`: policyName, leaveTypeId, entitlementDays, accrualRate?, maxAccumulation?, minimumNoticeDays?, requiresManagerApproval?, allowNegativeBalance?, maxConsecutiveDays?
- Interface `UpdateLeavePolicyDto`: partial of CreateLeavePolicyDto fields plus isActive?

Create `src/modules/leavePolicy/leavePolicy.repository.ts` with:
- Interface `ILeavePolicyRepository`: findById(id), findByLeaveTypeId(leaveTypeId), findAllActive(filter?), create(dto), update(id, dto), deactivate(id)
- Class `LeavePolicyRepository` implementing `ILeavePolicyRepository` using Knex
- Knex migration creating `leave_policies` table with foreign key to `leave_types(id)` and index on `leaveTypeId`

Include Jest unit tests in `tests/unit/modules/leaveType/leaveType.repository.test.ts` and `tests/unit/modules/leavePolicy/leavePolicy.repository.test.ts`.

This phase depends on `src/shared/types/leave.types.ts` and `src/shared/error.types.ts` from Phase 1, and `src/shared/db/connection.ts` (existing). Read them before generating.

Approximately 6 files.

## Phase 4: Phase 4: LeaveBalance domain model and repository

Create the LeaveBalance domain model and repository together.

Create `src/modules/balance/balance.model.ts` with:
- Interface `LeaveBalance`: id (string), employeeId (string), leaveTypeId (string), policyId (string), entitledDays (number), usedDays (number), pendingDays (number), carriedForwardDays (number), accruedDays (number), year (number), createdAt (Date), updatedAt (Date)
- Interface `CreateLeaveBalanceDto`: employeeId, leaveTypeId, policyId, entitledDays, year, carriedForwardDays?, accruedDays?
- Interface `UpdateLeaveBalanceDto`: partial fields for usedDays, pendingDays, entitledDays, carriedForwardDays, accruedDays
- Interface `LeaveBalanceQueryParams`: employeeId?, leaveTypeId?, year?

Create `src/modules/balance/balance.repository.ts` with:
- Interface `ILeaveBalanceRepository`: findById(id), findByEmployeeAndType(employeeId, leaveTypeId, year), findByEmployeeId(employeeId, year?), findAll(queryParams), create(dto), update(id, dto), upsert(dto)
- Class `LeaveBalanceRepository` implementing `ILeaveBalanceRepository` using Knex with `pool` from `src/shared/db/connection.ts`
- Knex migration creating `leave_balances` table with foreign keys to `employees(id)`, `leave_types(id)`, `leave_policies(id)`, unique constraint on (employeeId, leaveTypeId, year), and indexes on employeeId and leaveTypeId

Include Jest unit tests in `tests/unit/modules/balance/balance.repository.test.ts`.

This phase depends on `src/shared/types/leave.types.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, `src/modules/leaveType/leaveType.model.ts` and `src/modules/leavePolicy/leavePolicy.model.ts` from Phase 3. Read them before generating.

Approximately 3 files.

## Phase 5: Phase 5: LeaveRequest domain model and repository

Create the LeaveRequest domain model and repository together.

Create `src/modules/leave/leave.model.ts` with:
- Interface `LeaveRequest`: id (string), employeeId (string), leaveTypeId (string), policyId (string), startDate (Date), endDate (Date), totalDays (number), reason (string | null), status (LeaveStatus), submittedAt (Date), reviewedBy (string | null), reviewedAt (Date | null), reviewerComment (string | null), cancelledAt (Date | null), cancelReason (string | null), createdAt (Date), updatedAt (Date)
- Interface `CreateLeaveRequestDto`: employeeId, leaveTypeId, policyId, startDate, endDate, reason?
- Interface `UpdateLeaveRequestDto`: status?, reviewedBy?, reviewerComment?, cancelReason?
- Interface `LeaveRequestQueryParams`: employeeId?, leaveTypeId?, status?, startDate?, endDate?, reviewedBy?
- Import `LeaveStatus` from `src/shared/types/leave.types.ts` (Phase 1)

Create `src/modules/leave/leave.repository.ts` with:
- Interface `ILeaveRepository`: findById(id), findByEmployeeId(employeeId, queryParams?), findByReviewerId(reviewerId, queryParams?), findAll(queryParams), create(dto), update(id, dto), updateStatus(id, status, reviewerId?, comment?)
- Class `LeaveRepository` implementing `ILeaveRepository` using Knex with `pool` from `src/shared/db/connection.ts`
- Knex migration in `src/modules/leave/migrations/001_create_leave_requests.ts` creating the `leave_requests` table with foreign keys to `employees(id)`, `leave_types(id)`, `leave_policies(id)`, and indexes on employeeId, leaveTypeId, status, reviewedBy

Include Jest unit tests in `tests/unit/modules/leave/leave.repository.test.ts`.

This phase depends on `src/shared/types/leave.types.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, `src/modules/leaveType/leaveType.model.ts` and `src/modules/leavePolicy/leavePolicy.model.ts` from Phase 3. Read them before generating.

Approximately 4 files.

## Phase 6: Phase 6: AuditLog and Notification domain models and repositories

Create the AuditLog and Notification domain models and their repositories together. These are simple, cross-cutting persistence models with no complex business logic.

Create `src/modules/audit/audit.model.ts` with:
- Interface `AuditLog`: id (string), entityType (EntityType), entityId (string), action (AuditAction), performedBy (string), oldState (Record<string, unknown> | null), newState (Record<string, unknown> | null), metadata (Record<string, unknown> | null), timestamp (Date), createdAt (Date)
- Interface `CreateAuditLogDto`: entityType, entityId, action, performedBy, oldState?, newState?, metadata?
- Import `EntityType`, `AuditAction` from `src/shared/types/leave.types.ts` (Phase 1)

Create `src/modules/audit/audit.repository.ts` with:
- Interface `IAuditRepository`: findById(id), findByEntityId(entityType, entityId), findByPerformedBy(performedBy, limit?), findAll(filter?), create(dto)
- Class `AuditRepository` implementing `IAuditRepository` using Knex with `pool` from `src/shared/db/connection.ts`
- Knex migration creating `audit_logs` table with indexes on (entityType, entityId), performedBy, timestamp

Create `src/modules/notification/notification.model.ts` with:
- Interface `Notification`: id (string), recipientId (string), type (NotificationType), title (string), body (string), isRead (boolean), metadata (Record<string, unknown> | null), createdAt (Date), readAt (Date | null)
- Interface `CreateNotificationDto`: recipientId, type, title, body, metadata?
- Import `NotificationType` from `src/shared/types/leave.types.ts` (Phase 1)

Create `src/modules/notification/notification.repository.ts` with:
- Interface `INotificationRepository`: findById(id), findByRecipientId(recipientId, unreadOnly?), findAll(filter?), create(dto), markAsRead(id), markAllAsRead(recipientId)
- Class `NotificationRepository` implementing `INotificationRepository` using Knex
- Knex migration creating `notifications` table with indexes on recipientId, isRead, createdAt

Include Jest unit tests in `tests/unit/modules/audit/audit.repository.test.ts` and `tests/unit/modules/notification/notification.repository.test.ts`.

This phase depends on `src/shared/types/leave.types.ts` and `src/shared/error.types.ts` from Phase 1, and `src/shared/db/connection.ts` (existing). Read them before generating.

Approximately 5 files.

## Phase 7: Phase 7: Employee service, controller, and routes

Create the Employee service layer, controller, and Fastify routes. This phase makes the Employee module independently deployable with its own REST endpoints.

Create `src/modules/employee/employee.service.interface.ts` with:
- Interface `IEmployeeService`: getById(id), getByEmployeeNumber(employeeNumber), getByEmail(email), getSubordinates(managerId), getAll(filter?), create(dto), update(id, dto), terminate(id), getEmploymentStatus(id)
- Import `Employee`, `CreateEmployeeDto`, `UpdateEmployeeDto` from `src/modules/employee/employee.model.ts` (Phase 2)

Create `src/modules/employee/employee.service.ts` with:
- Class `EmployeeService` implementing `IEmployeeService`
- Constructor injection of `IEmployeeRepository` from `src/modules/employee/employee.repository.ts` (Phase 2)
- Business logic: validate unique employeeNumber/email on create, enforce employment status transitions (ACTIVE → ON_LEAVE → ACTIVE, ACTIVE → TERMINATED), prevent operations on terminated employees
- Wrap all repository calls in explicit error handling using `NotFoundError`, `ConflictError`, `ValidationError` from `src/shared/error.types.ts` (Phase 1)

Create `src/modules/employee/employee.controller.ts` with:
- Class `EmployeeController` accepting `IEmployeeService` via constructor
- Methods: getById, getByEmployeeNumber, getSubordinates, getAll, create, update, terminate — each returning Fastify-compatible response objects

Create `src/modules/employee/employee.routes.ts` with:
- Fastify plugin function registering routes: GET /employees/:id, GET /employees/number/:employeeNumber, GET /employees/:id/subordinates, GET /employees, POST /employees, PATCH /employees/:id, POST /employees/:id/terminate
- Instantiate EmployeeRepository → EmployeeService → EmployeeController in the plugin
- Register routes on the Fastify instance

Include Jest unit tests in `tests/unit/modules/employee/employee.service.test.ts` mocking the repository.

This phase depends on `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2, and `src/shared/types/leave.types.ts` and `src/shared/error.types.ts` from Phase 1. Read them before generating.

Approximately 5 files.

## Phase 8: Phase 8: LeaveType and LeavePolicy services, controllers, and routes

Create the LeaveType and LeavePolicy service layers, controllers, and Fastify routes. These are configuration-management modules.

Create `src/modules/leaveType/leaveType.service.interface.ts` with:
- Interface `ILeaveTypeService`: getById(id), getByCode(code), getAll(filter?), create(dto), update(id, dto), deactivate(id)
- Import `LeaveType`, `CreateLeaveTypeDto` from `src/modules/leaveType/leaveType.model.ts` (Phase 3)

Create `src/modules/leaveType/leaveType.service.ts` with:
- Class `LeaveTypeService` implementing `ILeaveTypeService`
- Constructor injection of `ILeaveTypeRepository` from Phase 3
- Business logic: validate unique code on create, prevent deactivation if active policies reference this type

Create `src/modules/leaveType/leaveType.routes.ts` with Fastify plugin: GET /leave-types/:id, GET /leave-types/code/:code, GET /leave-types, POST /leave-types, PATCH /leave-types/:id, POST /leave-types/:id/deactivate

Create `src/modules/leavePolicy/leavePolicy.service.interface.ts` with:
- Interface `ILeavePolicyService`: getById(id), getByLeaveTypeId(leaveTypeId), getAllActive(filter?), create(dto), update(id, dto), deactivate(id)
- Import `LeavePolicy`, `CreateLeavePolicyDto`, `UpdateLeavePolicyDto` from `src/modules/leavePolicy/leavePolicy.model.ts` (Phase 3)

Create `src/modules/leavePolicy/leavePolicy.service.ts` with:
- Class `LeavePolicyService` implementing `ILeavePolicyService`
- Constructor injection of `ILeavePolicyRepository` from Phase 3
- Business logic: validate leaveTypeId references an active LeaveType, enforce entitlementDays > 0

Create `src/modules/leavePolicy/leavePolicy.routes.ts` with Fastify plugin: GET /leave-policies/:id, GET /leave-policies/type/:leaveTypeId, GET /leave-policies, POST /leave-policies, PATCH /leave-policies/:id, POST /leave-policies/:id/deactivate

Include Jest unit tests in `tests/unit/modules/leaveType/leaveType.service.test.ts` and `tests/unit/modules/leavePolicy/leavePolicy.service.test.ts`.

This phase depends on `src/modules/leaveType/leaveType.model.ts`, `src/modules/leaveType/leaveType.repository.ts`, `src/modules/leavePolicy/leavePolicy.model.ts`, `src/modules/leavePolicy/leavePolicy.repository.ts` from Phase 3, and `src/shared/error.types.ts` from Phase 1. Read them before generating.

Approximately 5 files.

## Phase 9: Phase 7: Employee service, controller, and routes

Create the Employee service layer, controller, and Fastify routes. This phase makes the Employee module independently deployable with its own REST endpoints.

Create `src/modules/employee/employee.service.interface.ts` with:
- Interface `IEmployeeService`: getById(id), getByEmployeeNumber(employeeNumber), getByEmail(email), getSubordinates(managerId), getAll(filter?), create(dto), update(id, dto), terminate(id), getEmploymentStatus(id)
- Import `Employee`, `CreateEmployeeDto`, `UpdateEmployeeDto` from `src/modules/employee/employee.model.ts` (Phase 2)

Create `src/modules/employee/employee.service.ts` with:
- Class `EmployeeService` implementing `IEmployeeService`
- Constructor injection of `IEmployeeRepository` from `src/modules/employee/employee.repository.ts` (Phase 2)
- Business logic: validate unique employeeNumber/email on create, enforce employment status transitions, prevent operations on terminated employees
- Wrap all repository calls in explicit error handling using `NotFoundError`, `ConflictError`, `ValidationError` from `src/shared/error.types.ts` (Phase 1)

Create `src/modules/employee/employee.routes.ts` with:
- Fastify plugin registering: GET /employees/:id, GET /employees/number/:employeeNumber, GET /employees/:id/subordinates, GET /employees, POST /employees, PATCH /employees/:id, POST /employees/:id/terminate
- Instantiate EmployeeRepository → EmployeeService in the plugin; wire directly (no separate controller file needed)

Include Jest unit tests in `tests/unit/modules/employee/employee.service.test.ts` mocking the repository.

This phase depends on `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2, and `src/shared/types/leave.types.ts` and `src/shared/error.types.ts` from Phase 1. Read them before generating.

Approximately 4 files.

## Phase 10: Phase 9: Balance, Audit, and Notification services and routes

Create the service layers and Fastify routes for Balance, Audit, and Notification modules. These are straightforward modules — Balance has moderate business logic, while Audit and Notification are thin pass-through services.

Create `src/modules/balance/balance.service.interface.ts` with:
- Interface `IBalanceService`: getById(id), getByEmployeeAndType(employeeId, leaveTypeId, year), getByEmployee(employeeId, year?), initializeBalance(dto), recalculateBalance(employeeId, leaveTypeId, year), deductDays(id, days), restoreDays(id, days), getRemainingBalance(employeeId, leaveTypeId, year)
- Import `LeaveBalance`, `CreateLeaveBalanceDto` from `src/modules/balance/balance.model.ts` (Phase 4)

Create `src/modules/balance/balance.service.ts` with:
- Class `BalanceService` implementing `IBalanceService`
- Constructor injection of `ILeaveBalanceRepository` from Phase 4
- Business logic: recalculateBalance computes usedDays + pendingDays against entitledDays + carriedForwardDays + accruedDays; deductDays validates sufficient balance (unless policy allows negative); restoreDays reverses deductions on cancellation

Create `src/modules/balance/balance.routes.ts` with Fastify plugin: GET /balances/:id, GET /balances/employee/:employeeId, GET /balances/employee/:employeeId/remaining, POST /balances, POST /balances/recalculate

Create `src/modules/audit/audit.service.ts` with:
- Class `AuditService` implementing `IAuditService` (interface defined inline in same file or a small interface file)
- Constructor injection of `IAuditRepository` from Phase 6
- Methods: log(entityType, entityId, action, performedBy, oldState?, newState?, metadata?), getHistory(entityType, entityId), getByUser(performedBy, limit?)

Create `src/modules/notification/notification.service.ts` with:
- Class `NotificationService` implementing `INotificationService`
- Constructor injection of `INotificationRepository` from Phase 6
- Methods: send(recipientId, type, title, body, metadata?), getByRecipient(recipientId, unreadOnly?), markAsRead(id), markAllAsRead(recipientId)

Include Jest unit tests in `tests/unit/modules/balance/balance.service.test.ts`, `tests/unit/modules/audit/audit.service.test.ts`, and `tests/unit/modules/notification/notification.service.test.ts`.

This phase depends on `src/modules/balance/balance.model.ts` and `src/modules/balance/balance.repository.ts` from Phase 4, `src/modules/audit/audit.model.ts` and `src/modules/audit/audit.repository.ts` from Phase 6, `src/modules/notification/notification.model.ts` and `src/modules/notification/notification.repository.ts` from Phase 6, and `src/shared/error.types.ts` from Phase 1. Read them before generating.

Approximately 5 files.
