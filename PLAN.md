# PLAN.md

## Phase 1: Phase 1: Shared types — enums and common DTOs

Create `src/shared/types/index.ts` with all shared enums and DTOs for the leave management feature.

Define these exact enums:
- `LeaveType` enum: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'
- `LeaveRequestStatus` enum: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
- `BalanceStatus` enum: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN' | 'CLOSED'
- `LeavePolicyStatus` enum: 'ACTIVE' | 'INACTIVE'
- `EmploymentStatus` enum: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'

Define these DTO interfaces:
- `CreateLeaveRequestDto`: employeeId (string), leavePolicyId (string), startDate (string), endDate (string), reason (string | undefined)
- `UpdateLeaveRequestDto`: status (LeaveRequestStatus | undefined), approvedBy (string | undefined), reason (string | undefined) — all optional for partial updates

Export everything from a barrel export. Include a Jest unit test at `tests/unit/shared/types/index.test.ts` verifying enum values and DTO shapes.

## Phase 2: Phase 2: Employee module — model, repository interface, and repository

Create the employee module files under `src/modules/employee/`.

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` interface with attributes: id (string), firstName (string), lastName (string), email (string), employmentStatus (EmploymentStatus), managerId (string | null), createdAt (Date), updatedAt (Date). Import `EmploymentStatus` from `src/shared/types/index.ts`.
- `src/modules/employee/employee.repository.interface.ts` — Define `IEmployeeRepository` interface with methods: findById(id: string): Promise<Employee | null>, findByEmail(email: string): Promise<Employee | null>, findAll(): Promise<Employee[]>, create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>, update(id: string, data: Partial<Employee>): Promise<Employee | null>.
- `src/modules/employee/employee.repository.ts` — Implement `PgEmployeeRepository` class implementing `IEmployeeRepository`. Use the pg pool from `src/shared/db/connection.ts`. Include parameterized SQL queries.

Include Jest unit tests at `tests/unit/modules/employee/employee.repository.test.ts`.

## Phase 3: Phase 3: LeavePolicy module — model, repository interface, and repository

Create the policy module files under `src/modules/policy/`.

Files to create:
- `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with attributes: id (string), policyName (string), leaveType (LeaveType), entitlementDays (number), accrualRate (number | undefined), maxAccumulation (number | undefined), minimumNoticeDays (number | undefined), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date). Import `LeaveType` from `src/shared/types/index.ts`.
- `src/modules/policy/policy.repository.interface.ts` — Define `ILeavePolicyRepository` interface with methods: findById(id: string): Promise<LeavePolicy | null>, findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>, findAllActive(): Promise<LeavePolicy[]>, create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>, update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>.
- `src/modules/policy/policy.repository.ts` — Implement `PgLeavePolicyRepository` class implementing `ILeavePolicyRepository`. Use the pg pool from `src/shared/db/connection.ts`. Include parameterized SQL queries.

Include Jest unit tests at `tests/unit/modules/policy/policy.repository.test.ts`.

## Phase 4: Phase 4: LeaveBalance module — model, repository interface, and repository

Create the balance module files under `src/modules/balance/`.

Files to create:
- `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` interface with attributes: id (string), employeeId (string), leavePolicyId (string), totalEntitlement (number), usedDays (number), remainingDays (number), fiscalYear (number), status (BalanceStatus), createdAt (Date), updatedAt (Date). Import `BalanceStatus` from `src/shared/types/index.ts`.
- `src/modules/balance/balance.repository.interface.ts` — Define `ILeaveBalanceRepository` interface with methods: findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null>, findByEmployee(employeeId: string): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>, deductDays(id: string, days: number): Promise<LeaveBalance | null>.
- `src/modules/balance/balance.repository.ts` — Implement `PgLeaveBalanceRepository` class implementing `ILeaveBalanceRepository`. Use the pg pool from `src/shared/db/connection.ts`. The `deductDays` method must atomically decrement `remainingDays` and increment `usedDays` in a single UPDATE with a RETURNING clause.

Include Jest unit tests at `tests/unit/modules/balance/balance.repository.test.ts`.

## Phase 5: Phase 5: LeaveRequest module — model, repository interface, and repository

Create the leave module's data layer under `src/modules/leave/`.

Files to create:
- `src/modules/leave/leave.model.ts` — Define the `LeaveRequest` interface with attributes: id (string), employeeId (string), leavePolicyId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), createdAt (Date), updatedAt (Date). Import `LeaveRequestStatus` from `src/shared/types/index.ts`.
- `src/modules/leave/leave.repository.interface.ts` — Define `ILeaveRequestRepository` interface with methods: findById(id: string): Promise<LeaveRequest | null>, findByEmployee(employeeId: string): Promise<LeaveRequest[]>, findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>, create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>, update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>.
- `src/modules/leave/leave.repository.ts` — Implement `PgLeaveRequestRepository` class implementing `ILeaveRequestRepository`. Use the pg pool from `src/shared/db/connection.ts`. Include parameterized SQL queries for all CRUD operations and filtered queries.

Include Jest unit tests at `tests/unit/modules/leave/leave.repository.test.ts`.

## Phase 6: Phase 6: LeaveService — business logic for leave requests

Create the leave service layer under `src/modules/leave/`.

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods:
  - `createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — validates employee exists, policy exists and is active, creates request with DRAFT status
  - `submitLeaveRequest(id: string): Promise<LeaveRequest>` — transitions DRAFT → SUBMITTED
  - `approveLeaveRequest(id: string, approverId: string): Promise<LeaveRequest>` — transitions SUBMITTED → APPROVED, sets approvedBy/approvedAt, deducts balance
  - `rejectLeaveRequest(id: string, approverId: string): Promise<LeaveRequest>` — transitions SUBMITTED → REJECTED
  - `cancelLeaveRequest(id: string): Promise<LeaveRequest>` — transitions any non-terminal status → CANCELLED
  - `getLeaveRequest(id: string): Promise<LeaveRequest | null>`
  - `getEmployeeLeaveRequests(employeeId: string): Promise<LeaveRequest[]>`
  Import `CreateLeaveRequestDto` from `src/shared/types/index.ts`.

- `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor takes `ILeaveRequestRepository`, `ILeaveBalanceRepository`, `ILeavePolicyRepository`, `IEmployeeRepository`. Each method enforces the state machine transitions described above. The `approveLeaveRequest` method must call `balanceRepository.deductDays()` after setting the request to APPROVED.

Include Jest unit tests at `tests/unit/modules/leave/leave.service.test.ts` with mocked repositories.

## Phase 7: Phase 7: LeaveController and leaveRoutes — HTTP surface

Create the controller and routes for the leave module under `src/modules/leave/`.

Files to create:
- `src/modules/leave/leave.controller.ts` — Define `LeaveController` class. Constructor takes `ILeaveService`. Methods:
  - `create(request: FastifyRequest, reply: FastifyReply)` — POST handler, parses body as `CreateLeaveRequestDto`, calls service, returns 201
  - `submit(request: FastifyRequest, reply: FastifyReply)` — PATCH handler for `/:id/submit`, calls service, returns 200
  - `approve(request: FastifyRequest, reply: FastifyReply)` — PATCH handler for `/:id/approve`, reads approverId from request (auth placeholder), calls service, returns 200
  - `reject(request: FastifyRequest, reply: FastifyReply)` — PATCH handler for `/:id/reject`, reads approverId from request, calls service, returns 200
  - `cancel(request: FastifyRequest, reply: FastifyReply)` — PATCH handler for `/:id/cancel`, calls service, returns 200
  - `getById(request: FastifyRequest, reply: FastifyReply)` — GET handler for `/:id`, calls service, returns 200
  - `getByEmployee(request: FastifyRequest, reply: FastifyReply)` — GET handler for `/employee/:employeeId`, calls service, returns 200

- `src/modules/leave/leave.routes.ts` — Export `leaveRoutes` async function registering all routes on a FastifyInstance. Instantiate `PgLeaveRequestRepository`, `PgLeaveBalanceRepository`, `PgLeavePolicyRepository`, `PgEmployeeRepository`, `LeaveService`, and `LeaveController` (simple DI, no container). Register routes: POST `/leave`, PATCH `/leave/:id/submit`, PATCH `/leave/:id/approve`, PATCH `/leave/:id/reject`, PATCH `/leave/:id/cancel`, GET `/leave/:id`, GET `/leave/employee/:employeeId`.

- Update `src/app.ts` to import and register `leaveRoutes`.

Include Jest integration tests at `tests/integration/modules/leave/leave.routes.test.ts`.

## Phase 8: Phase 8: Audit module — model, repository interface, and repository

Create the audit module files under `src/modules/audit/`.

Files to create:
- `src/modules/audit/audit.model.ts` — Define the `AuditLog` interface with attributes: id (string), entityType (string), entityId (string), action (string), performedBy (string | null), changes (Record<string, unknown>), createdAt (Date).
- `src/modules/audit/audit.repository.interface.ts` — Define `IAuditLogRepository` interface with methods: create(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>, findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>.
- `src/modules/audit/audit.repository.ts` — Implement `PgAuditLogRepository` class implementing `IAuditLogRepository`. Use the pg pool from `src/shared/db/connection.ts`.

Include Jest unit tests at `tests/unit/modules/audit/audit.repository.test.ts`.

## Phase 9: Phase 9: AuditService and integration into LeaveService

Create the audit service and wire it into the leave workflow.

Files to create:
- `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with method: `log(entityType: string, entityId: string, action: string, performedBy: string | null, changes: Record<string, unknown>): Promise<AuditLog>`.
- `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. Constructor takes `IAuditLogRepository`. The `log` method delegates to the repository.

Files to modify:
- `src/modules/leave/leave.service.ts` — Update `LeaveService` constructor to also accept `IAuditService`. In `submitLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`, and `cancelLeaveRequest`, call `auditService.log()` after the state transition succeeds. Read the existing file at `src/modules/leave/leave.service.ts` before modifying.

Include Jest unit tests at `tests/unit/modules/audit/audit.service.test.ts` and update `tests/unit/modules/leave/leave.service.test.ts` to verify audit logging calls.

## Phase 10: Phase 10: Notification module and final wiring

Create the notification module and complete the final integration.

Files to create:
- `src/modules/notification/notification.service.interface.ts` — Define `INotificationService` interface with method: `notifyLeaveStatusChange(leaveRequest: LeaveRequest, recipientEmail: string): Promise<void>`.
- `src/modules/notification/notification.service.ts` — Implement `NotificationService` class implementing `INotificationService`. For now, `notifyLeaveStatusChange` logs the notification to console (placeholder for email/SMS integration). Import `LeaveRequest` from `src/modules/leave/leave.model.ts`.

Files to modify:
- `src/modules/leave/leave.service.ts` — Update `LeaveService` constructor to also accept `INotificationService`. After `approveLeaveRequest` and `rejectLeaveRequest` succeed, call `notificationService.notifyLeaveStatusChange()`. Read the existing file before modifying.
- `src/modules/leave/leave.routes.ts` — Update DI wiring to instantiate `AuditService` (with `PgAuditLogRepository`) and `NotificationService`, passing them to `LeaveService`. Read the existing file before modifying.

Include Jest unit tests at `tests/unit/modules/notification/notification.service.test.ts` and update `tests/unit/modules/leave/leave.service.test.ts` to verify notification calls.
