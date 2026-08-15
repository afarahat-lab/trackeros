# PLAN.md

## Phase 1: Phase 1: Shared enums — LeaveType and LeaveRequestStatus

Create the foundational shared enums at the exact paths declared by the architecture's Module Boundaries for the shared-types module (`src/shared/types/`).

Files to create:
- `src/shared/types/leave-type.enum.ts` — Define the `LeaveType` enum with values: `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`. Use a TypeScript string enum or const object with a union type.
- `src/shared/types/leave-request-status.enum.ts` — Define the `LeaveRequestStatus` enum with values: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`.
- `src/shared/types/index.ts` — Barrel export re-exporting both enums.

Include Jest unit tests in `tests/unit/shared/types/` verifying each enum value is present and correctly typed.

This phase has no dependencies on any other phase — it is the root of the dependency graph.

## Phase 2: Phase 2: Employee model and repository

Create the Employee domain model and repository at the exact paths declared by the architecture's Module Boundaries for the employee module (`src/modules/employee/`).

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` interface with the canonical fields: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`.
- `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findAll(): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `softDelete(id: string): Promise<void>`. Implement `EmployeeRepository` class using the existing `pool` from `src/shared/db/connection.ts` with parameterized SQL queries via `pg`. The repository must implement `IEmployeeRepository`.
- `src/modules/employee/index.ts` — Barrel export.

This phase depends on `src/shared/types/index.ts` from Phase 1 (read it before generating). Also depends on `src/shared/db/connection.ts` (existing).

Include Jest unit tests in `tests/unit/modules/employee/`.

## Phase 3: Phase 3: LeavePolicy model and repository

Create the LeavePolicy domain model and repository at the exact paths declared by the architecture's Module Boundaries for the policy module (`src/modules/policy/`).

Files to create:
- `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with the canonical fields: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/leave-type.enum.ts`.
- `src/modules/policy/policy.repository.ts` — Define `IPolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findAllActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`. Implement `PolicyRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/policy/index.ts` — Barrel export.

This phase depends on `src/shared/types/index.ts` from Phase 1 (read it before generating). Also depends on `src/shared/db/connection.ts` (existing).

Include Jest unit tests in `tests/unit/modules/policy/`.

## Phase 4: Phase 4: LeaveBalance model and repository

Create the LeaveBalance domain model and repository at the exact paths declared by the architecture's Module Boundaries for the balance module (`src/modules/balance/`).

Files to create:
- `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` interface with the canonical fields: `id: string`, `employeeId: string`, `policyId: string`, `totalEntitlement: number`, `usedDays: number`, `remainingDays: number`, `fiscalYear: number`, `status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN'`, `createdAt: Date`, `updatedAt: Date`.
- `src/modules/balance/balance.repository.ts` — Define `IBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null>`, `findByEmployeeAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`, `update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>`, `updateUsedDays(id: string, usedDays: number, remainingDays: number): Promise<LeaveBalance | null>`. Implement `BalanceRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/balance/index.ts` — Barrel export.

This phase depends on `src/shared/types/index.ts` from Phase 1 (read it before generating). Also depends on `src/shared/db/connection.ts` (existing).

Include Jest unit tests in `tests/unit/modules/balance/`.

## Phase 5: Phase 5: LeaveRequest model and repository

Create the LeaveRequest domain model and repository at the exact paths declared by the architecture's Module Boundaries for the leave module (`src/modules/leave/`).

Files to create:
- `src/modules/leave/leave.model.ts` — Define the `LeaveRequest` interface with the canonical fields: `id: string`, `employeeId: string`, `leavePolicyId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveRequestStatus` from `src/shared/types/leave-request-status.enum.ts`.
- `src/modules/leave/leave.repository.ts` — Define `ILeaveRepository` interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `findByEmployeeAndStatus(employeeId: string, status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<LeaveRequest[]>`, `create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`, `findPendingByEmployee(employeeId: string): Promise<LeaveRequest[]>`. Implement `LeaveRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/leave/index.ts` — Barrel export.

This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/policy/policy.model.ts` from Phase 3 — read all three before generating. Also depends on `src/shared/db/connection.ts` (existing).

Include Jest unit tests in `tests/unit/modules/leave/`.

## Phase 6: Phase 6: AuditLog model, repository, and service

Create the AuditLog domain model, repository, and service at the exact paths declared by the architecture's Module Boundaries for the audit module (`src/modules/audit/`).

Files to create:
- `src/modules/audit/audit.model.ts` — Define the `AuditLog` interface with the canonical fields: `id: string`, `entityType: string`, `entityId: string`, `action: string`, `oldValues: Record<string, unknown> | null`, `newValues: Record<string, unknown> | null`, `performedBy: string | null`, `performedAt: Date`, `createdAt: Date`, `updatedAt: Date`.
- `src/modules/audit/audit.repository.ts` — Define `IAuditRepository` interface with methods: `create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog>`, `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`. Implement `AuditRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with method: `log(params: { entityType: string; entityId: string; action: string; oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null; performedBy: string | null }): Promise<void>`.
- `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. It injects `IAuditRepository` and delegates to it, setting `performedAt: new Date()`.
- `src/modules/audit/index.ts` — Barrel export.

This phase depends on `src/shared/db/connection.ts` (existing). No dependency on other phases.

Include Jest unit tests in `tests/unit/modules/audit/`.

## Phase 7: Phase 7: Business logic services — EmployeeService, PolicyService, BalanceService

Create the business logic service layer for employee, policy, and balance modules. These services encapsulate business rules and coordinate between repositories.

Files to create:
- `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` with methods: `getById(id: string): Promise<Employee | null>`, `getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `isActive(id: string): Promise<boolean>`, `getManagerId(id: string): Promise<string | null>`.
- `src/modules/employee/employee.service.ts` — Implement `EmployeeService` implementing `IEmployeeService`. Inject `IEmployeeRepository`. `isActive` returns true only when `employmentStatus === 'ACTIVE'` and `terminationDate` is null.
- `src/modules/policy/policy.service.interface.ts` — Define `IPolicyService` with methods: `getById(id: string): Promise<LeavePolicy | null>`, `getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `getAllActive(): Promise<LeavePolicy[]>`.
- `src/modules/policy/policy.service.ts` — Implement `PolicyService` implementing `IPolicyService`. Inject `IPolicyRepository`.
- `src/modules/balance/balance.service.interface.ts` — Define `IBalanceService` with methods: `getBalance(employeeId: string, policyId: string): Promise<LeaveBalance | null>`, `getAvailableDays(employeeId: string, policyId: string): Promise<number>`, `reserveDays(employeeId: string, policyId: string, days: number): Promise<void>`, `releaseReservation(employeeId: string, policyId: string, days: number): Promise<void>`, `deductDays(employeeId: string, policyId: string, days: number): Promise<void>`, `initializeBalancesForEmployee(employeeId: string): Promise<void>`.
- `src/modules/balance/balance.service.ts` — Implement `BalanceService` implementing `IBalanceService`. Inject `IBalanceRepository` and `IPolicyRepository`. `getAvailableDays` computes `remainingDays` minus any pending reservations. `reserveDays` holds days as pending (must not allow negative). `deductDays` moves pending to used on approval. `releaseReservation` releases on reject/cancel. `initializeBalancesForEmployee` creates a balance for every active policy for the current calendar year. Apply the BINDING business rules: fiscal year = calendar year, annual lump-sum upfront on Jan 1, mid-year hire pro-rating (whole months remaining rounded down), no carry-over, no negative balance.

Update `src/modules/employee/index.ts`, `src/modules/policy/index.ts`, `src/modules/balance/index.ts` to export the new service interfaces and implementations.

This phase depends on all prior phases — read `src/modules/employee/employee.model.ts` and `employee.repository.ts` from Phase 2, `src/modules/policy/policy.model.ts` and `policy.repository.ts` from Phase 3, `src/modules/balance/balance.model.ts` and `balance.repository.ts` from Phase 4, and `src/shared/types/index.ts` from Phase 1 before generating.

Include Jest unit tests in `tests/unit/modules/employee/`, `tests/unit/modules/policy/`, and `tests/unit/modules/balance/`.

## Phase 8: Phase 8: LeaveService — core leave request business logic

Create the LeaveService with all leave-request lifecycle business logic at the exact path declared by the architecture's Module Boundaries for the leave module (`src/modules/leave/`).

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` with methods: `submitDraft(requestId: string, employeeId: string): Promise<LeaveRequest>`, `createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approve(requestId: string, approverId: string): Promise<LeaveRequest>`, `reject(requestId: string, approverId: string): Promise<LeaveRequest>`, `cancel(requestId: string, employeeId: string): Promise<LeaveRequest>`, `getById(requestId: string): Promise<LeaveRequest | null>`, `getByEmployee(employeeId: string): Promise<LeaveRequest[]>`. Also define `CreateLeaveRequestDto` with fields: `employeeId: string`, `leavePolicyId: string`, `startDate: Date`, `endDate: Date`, `reason?: string`.
- `src/modules/leave/leave.service.ts` — Implement `LeaveService` implementing `ILeaveService`. Inject `ILeaveRepository`, `IEmployeeService`, `IPolicyService`, `IBalanceService`, `IAuditService`. Apply ALL BINDING business rules:
  - Only ACTIVE employees may submit (call `IEmployeeService.isActive`).
  - On submit: validate no overlapping SUBMITTED/APPROVED requests for same employee (call `ILeaveRepository.findOverlapping`).
  - Count business days (weekdays only, Mon-Fri, inclusive start/end, no half-days, no public holidays) using a pure date helper function defined in this file.
  - Check minimum notice days from policy (if `minimumNoticeDays` is set, reject if `startDate - now < minimumNoticeDays`). Emergency leave bypasses this.
  - Check available balance: `IBalanceService.getAvailableDays` must be >= requested days. Reject with validation error if insufficient.
  - On submit: reserve days via `IBalanceService.reserveDays`.
  - On approve: verify approver is the employee's manager (via `IEmployeeService.getManagerId`) or has HR role; deduct days via `IBalanceService.deductDays`; set `approvedBy`, `approvedAt`.
  - On reject: release reservation via `IBalanceService.releaseReservation`.
  - On cancel: release reservation via `IBalanceService.releaseReservation`.
  - Audit every state transition via `IAuditService.log`.
- `src/modules/leave/leave.errors.ts` — Define domain-specific error classes: `InsufficientBalanceError`, `OverlappingRequestError`, `EmployeeNotActiveError`, `MinimumNoticeError`, `NotManagerError`.

Update `src/modules/leave/index.ts` to export the new service interface, implementation, DTO, and errors.

This phase depends on all prior phases. Read before generating: `src/modules/leave/leave.model.ts` and `leave.repository.ts` from Phase 5, `src/modules/employee/employee.service.interface.ts` from Phase 7, `src/modules/policy/policy.service.interface.ts` from Phase 7, `src/modules/balance/balance.service.interface.ts` from Phase 7, `src/modules/audit/audit.service.interface.ts` from Phase 6, `src/shared/types/index.ts` from Phase 1.

Include Jest unit tests in `tests/unit/modules/leave/` covering all lifecycle transitions, balance checks, overlap detection, and the weekday-counting helper.

## Phase 9: Phase 9: Notification service

Create the notification service at the exact paths declared by the architecture's Module Boundaries for the notification module (`src/modules/notification/`).

Files to create:
- `src/modules/notification/notification.service.interface.ts` — Define `INotificationService` interface with methods: `notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<void>`, `notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<void>`, `notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<void>`, `notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<void>`.
- `src/modules/notification/notification.service.ts` — Implement `NotificationService` implementing `INotificationService`. Initial implementation logs notifications via Fastify's logger (injected via constructor). This is a stub that can later be extended with email/push via BullMQ. Each method logs the event with the leave request id, employee id, and new status.
- `src/modules/notification/index.ts` — Barrel export.

This phase depends on `src/modules/leave/leave.model.ts` from Phase 5 (for the `LeaveRequest` type in the interface signatures). Read it before generating.

Include Jest unit tests in `tests/unit/modules/notification/`.

## Phase 10: Phase 10: LeaveController, LeaveRoutes, and app integration

Create the HTTP layer for the leave module — controller and routes — and wire everything into the Fastify app.

Files to create:
- `src/modules/leave/leave.controller.ts` — Implement `LeaveController` class. Inject `ILeaveService` and `INotificationService`. Methods:
  - `createDraft(req, reply)` — POST `/leaves` — parse body as `CreateLeaveRequestDto`, call `leaveService.createDraft`, return 201.
  - `submitDraft(req, reply)` — POST `/leaves/:id/submit` — call `leaveService.submitDraft`, then `notificationService.notifyLeaveSubmitted`, return 200.
  - `approve(req, reply)` — POST `/leaves/:id/approve` — call `leaveService.approve`, then `notificationService.notifyLeaveApproved`, return 200.
  - `reject(req, reply)` — POST `/leaves/:id/reject` — call `leaveService.reject`, then `notificationService.notifyLeaveRejected`, return 200.
  - `cancel(req, reply)` — POST `/leaves/:id/cancel` — call `leaveService.cancel`, then `notificationService.notifyLeaveCancelled`, return 200.
  - `getById(req, reply)` — GET `/leaves/:id` — call `leaveService.getById`, return 200.
  - `getByEmployee(req, reply)` — GET `/leaves?employeeId=X` — call `leaveService.getByEmployee`, return 200.
  - Apply RBAC: extract caller identity from JWT (assume `req.user` has `{ id: string, role: string }`). Employees can only act on their own leave requests. Managers can approve/reject direct reports. HR admins (`role === 'hr_admin'`) can act on any.
  - Validate inputs with Zod schemas for each endpoint.
- `src/modules/leave/leave.routes.ts` — Export a Fastify plugin function `leaveRoutes` that registers all routes from `LeaveController`. Use Fastify's `fastify.post` / `fastify.get` with schema validation.
- Update `src/app.ts` — Import and register `leaveRoutes` alongside the existing `uptimeRoutes`. Wire up dependency injection: instantiate repositories, services, controller with their dependencies, and pass them to the route plugin (or use Fastify's `decorate` to make them available).

This phase depends on all prior phases. Read before generating: `src/modules/leave/leave.service.interface.ts` and `leave.model.ts` from Phase 8/5, `src/modules/notification/notification.service.interface.ts` from Phase 9, `src/shared/types/index.ts` from Phase 1, `src/app.ts` (existing).

Include Jest integration tests in `tests/integration/modules/leave/` using Fastify's `inject` method.
