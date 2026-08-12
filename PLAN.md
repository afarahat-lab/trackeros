# PLAN.md

## Phase 1: Phase 1: Shared types — LeaveType and LeaveStatus enums

Create `src/shared/types/index.ts` with the canonical `LeaveType` enum (`'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`) and `LeaveStatus` enum (`'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`). Export both as named exports. No dependencies on any other module. Include a Jest unit test at `tests/unit/shared/types.test.ts` that verifies all enum values are present.

## Phase 2: Phase 2: Employee module — model + repository

Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 (read it before generating).

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` interface with the canonical fields: id, employeeNumber, firstName, lastName, email, role ('employee' | 'manager' | 'hr_admin'), managerId (string | null), department (string | null), hireDate (Date), terminationDate (Date | null), employmentStatus ('ACTIVE' | 'INACTIVE' | 'TERMINATED'), createdAt, updatedAt, deletedAt (Date | null).
- `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`. Implement `EmployeeRepository` class using the pg pool from `src/shared/db/connection.ts` via Knex (import knex from 'knex' configured with the pool). Use parameterized queries.
- `src/modules/employee/index.ts` — Barrel export of Employee, IEmployeeRepository, EmployeeRepository.
- `tests/unit/modules/employee/employee.repository.test.ts` — Jest unit tests mocking the db layer, testing findById returns Employee or null.

Approximately 4 files.

## Phase 3: Phase 3: Policy module — model + repository

Create the policy module at `src/modules/policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:
- `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with canonical fields: id, policyName, leaveType (LeaveType enum imported from `src/shared/types`), entitlementDays, accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays, requiresManagerApproval, isActive, isPaid, createdAt, updatedAt.
- `src/modules/policy/policy.repository.ts` — Define `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findAllActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`. Implement `LeavePolicyRepository` using the pg pool from `src/shared/db/connection.ts` with parameterized queries.
- `src/modules/policy/index.ts` — Barrel export.
- `tests/unit/modules/policy/policy.repository.test.ts` — Jest unit tests mocking the db layer.

Approximately 4–5 files.

## Phase 4: Phase 4: Balance module — model + repository

Create the balance module at `src/modules/balance/`. This phase depends on `src/shared/types/index.ts` from Phase 1 and `src/modules/employee/employee.model.ts` from Phase 2 — read both before generating.

Files to create:
- `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` interface with canonical fields: id, employeeId, policyId, fiscalYear (number), totalEntitlement (number), usedDays (number), remainingDays (number), status ('ACTIVE' | 'EXHAUSTED' | 'CLOSED'), createdAt, updatedAt.
- `src/modules/balance/balance.repository.ts` — Define `ILeaveBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `create(data: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`, `update(id: string, data: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance>`. Implement `LeaveBalanceRepository` using the pg pool from `src/shared/db/connection.ts` with parameterized queries.
- `src/modules/balance/index.ts` — Barrel export.
- `tests/unit/modules/balance/balance.repository.test.ts` — Jest unit tests mocking the db layer.

Approximately 4 files.

## Phase 5: Phase 5: Leave module — model + repository

Create the leave module at `src/modules/leave/`. This phase depends on `src/shared/types/index.ts` from Phase 1 and `src/modules/employee/employee.model.ts` from Phase 2 — read both before generating.

Files to create:
- `src/modules/leave/leave.model.ts` — Define the `LeaveRequest` interface with canonical fields: id, employeeId, leaveTypeId, startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus from Phase 1), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt, updatedAt. Also define `CreateLeaveRequestDto` (employeeId, leaveTypeId, startDate, endDate, reason?) and `UpdateLeaveRequestDto` (startDate?, endDate?, reason?).
- `src/modules/leave/leave.repository.ts` — Define `ILeaveRequestRepository` interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<LeaveRequest[]>`, `create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`, `update(id: string, data: Partial<Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveRequest>`. Implement `LeaveRequestRepository` using the pg pool from `src/shared/db/connection.ts` with parameterized queries. The `findOverlapping` method must query for SUBMITTED or APPROVED requests where date ranges overlap (inclusive).
- `src/modules/leave/index.ts` — Barrel export.
- `tests/unit/modules/leave/leave.repository.test.ts` — Jest unit tests mocking the db layer.

Approximately 4–5 files.

## Phase 6: Phase 6: Audit module — model + repository

Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:
- `src/modules/audit/audit.model.ts` — Define the `AuditLog` interface with canonical fields: id, entityType, entityId, action (string), changedBy (string), changes (Record<string, unknown>), createdAt (Date).
- `src/modules/audit/audit.repository.ts` — Define `IAuditLogRepository` interface with methods: `create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>`, `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`. Implement `AuditLogRepository` using the pg pool from `src/shared/db/connection.ts` with parameterized queries.
- `src/modules/audit/index.ts` — Barrel export of AuditLog, IAuditLogRepository, AuditLogRepository.
- `tests/unit/modules/audit/audit.repository.test.ts` — Jest unit tests mocking the db layer.

Approximately 4 files.

## Phase 7: Phase 7: EmployeeService + PolicyService

Create the service layers for employee and policy modules. This phase depends on:
- `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2
- `src/modules/policy/policy.model.ts` and `src/modules/policy/policy.repository.ts` from Phase 3
Read all four before generating.

Files to create:
- `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` with methods: `getById(id: string): Promise<Employee | null>`, `getByManager(managerId: string): Promise<Employee[]>`, `getAll(): Promise<Employee[]>`, `create(data: CreateEmployeeDto): Promise<Employee>`. Also define `CreateEmployeeDto` (firstName, lastName, email, employeeNumber, role, managerId?, department?, hireDate).
- `src/modules/employee/employee.service.ts` — Implement `EmployeeService` implementing `IEmployeeService`. On `create`, after inserting the employee, also auto-create LeaveBalance records for ALL active leave policies (import ILeavePolicyRepository from Phase 3 and ILeaveBalanceRepository from Phase 4). Use the current calendar year as fiscalYear. This enforces the BINDING rule: "auto-create balances for ALL leave types on employee creation."
- `src/modules/policy/policy.service.interface.ts` — Define `ILeavePolicyService` with methods: `getById(id: string): Promise<LeavePolicy | null>`, `getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `getAllActive(): Promise<LeavePolicy[]>`.
- `src/modules/policy/policy.service.ts` — Implement `LeavePolicyService` implementing `ILeavePolicyService`, delegating to `ILeavePolicyRepository`.
- Update `src/modules/employee/index.ts` and `src/modules/policy/index.ts` barrel exports to include new service symbols.
- `tests/unit/modules/employee/employee.service.test.ts` — Jest tests mocking repositories, verifying balance auto-creation on employee create.

Approximately 5 files (plus barrel updates).

## Phase 8: Phase 8: BalanceService

Create the balance service layer. This phase depends on:
- `src/modules/balance/balance.model.ts` and `src/modules/balance/balance.repository.ts` from Phase 4
- `src/modules/policy/policy.model.ts` and `src/modules/policy/policy.repository.ts` from Phase 3
Read all four before generating.

Files to create:
- `src/modules/balance/balance.service.interface.ts` — Define `IBalanceService` with methods: `getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `getBalancesForEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `reserveDays(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>` (adds to pending/reservation — does NOT deduct usedDays), `finalizeDeduction(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>` (moves pending to usedDays), `releaseReservation(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>`, `getAvailableBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<number>` (returns totalEntitlement - usedDays - pendingDays). Also define a `PendingDays` field on LeaveBalance or track it separately.
- `src/modules/balance/balance.service.ts` — Implement `BalanceService` implementing `IBalanceService`. Import `ILeaveBalanceRepository` and `ILeavePolicyRepository`. Implement business-day counting utility (exclude weekends, whole days only). The `reserveDays` method checks available balance before reserving; throws if insufficient. The `finalizeDeduction` method moves pending to used. The `releaseReservation` method reduces pending. All methods operate within the fiscal year of the leave startDate (calendar year Jan 1 – Dec 31). Enforce the BINDING rule: "deduct on APPROVAL (finalize); on submission count as PENDING; on reject/cancel release the reservation."
- Update `src/modules/balance/index.ts` barrel export.
- `tests/unit/modules/balance/balance.service.test.ts` — Jest tests mocking repositories, verifying reserve/finalize/release logic and business-day counting.

Approximately 4 files.

## Phase 9: Phase 9: NotificationService + AuditService

Create the notification and audit service layers. This phase depends on:
- `src/modules/audit/audit.model.ts` and `src/modules/audit/audit.repository.ts` from Phase 6
Read both before generating.

Files to create:
- `src/modules/notification/notification.service.interface.ts` — Define `INotificationService` with methods: `notifyLeaveSubmitted(employeeId: string, managerId: string | null, leaveRequestId: string): Promise<void>`, `notifyLeaveApproved(employeeId: string, leaveRequestId: string): Promise<void>`, `notifyLeaveRejected(employeeId: string, leaveRequestId: string, reason?: string): Promise<void>`, `notifyLeaveCancelled(employeeId: string, leaveRequestId: string): Promise<void>`. These are fire-and-forget methods; initial implementation logs to console (no actual email/push yet).
- `src/modules/notification/notification.service.ts` — Implement `NotificationService` implementing `INotificationService`. Console-log each notification event with structured data. This is a stub that can be upgraded to BullMQ later.
- `src/modules/notification/index.ts` — Barrel export of INotificationService, NotificationService.
- `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` with method: `log(params: { entityType: string; entityId: string; action: string; changedBy: string; changes: Record<string, unknown> }): Promise<AuditLog>`.
- `src/modules/audit/audit.service.ts` — Implement `AuditService` implementing `IAuditService`, delegating to `IAuditLogRepository`. Enforces GP-002: every state-changing operation must produce an audit record.
- Update `src/modules/audit/index.ts` barrel export.
- `tests/unit/modules/notification/notification.service.test.ts` and `tests/unit/modules/audit/audit.service.test.ts` — Jest tests.

Approximately 5 files (plus barrel updates).

## Phase 10: Phase 10: LeaveService + LeaveController + leaveRoutes

Create the leave service, controller, and routes — the main orchestration layer. This phase depends on:
- `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` from Phase 5
- `src/modules/employee/employee.service.ts` from Phase 7
- `src/modules/policy/policy.service.ts` from Phase 7
- `src/modules/balance/balance.service.ts` from Phase 8
- `src/modules/notification/notification.service.ts` from Phase 9
- `src/modules/audit/audit.service.ts` from Phase 9
Read all six before generating.

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` with methods: `submit(request: CreateLeaveRequestDto, actorId: string): Promise<LeaveRequest>`, `approve(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `reject(leaveRequestId: string, rejectorId: string, reason?: string): Promise<LeaveRequest>`, `cancel(leaveRequestId: string, actorId: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest | null>`, `getByEmployee(employeeId: string): Promise<LeaveRequest[]>`.
- `src/modules/leave/leave.service.ts` — Implement `LeaveService` implementing `ILeaveService`. This is the core business logic:
  - `submit`: Validate employee exists (IEmployeeService), validate leave policy is active (ILeavePolicyService), check minimumNoticeDays, check for overlapping requests via ILeaveRequestRepository.findOverlapping (BINDING: reject if overlap with SUBMITTED/APPROVED), compute business days (exclude weekends), call IBalanceService.reserveDays, set status=SUBMITTED, create LeaveRequest, call IAuditService.log, call INotificationService.notifyLeaveSubmitted (escalate to HR if no manager).
  - `approve`: Validate request exists and is SUBMITTED, validate approver is the employee's manager or HR (RBAC), call IBalanceService.finalizeDeduction, set status=APPROVED with approvedBy/approvedAt, call IAuditService.log, call INotificationService.notifyLeaveApproved.
  - `reject`: Validate request exists and is SUBMITTED, validate rejector is manager/HR, call IBalanceService.releaseReservation, set status=REJECTED with rejectedBy/rejectedAt, call IAuditService.log, call INotificationService.notifyLeaveRejected.
  - `cancel`: Validate request exists and is SUBMITTED or APPROVED, validate actor is the employee or manager/HR, if APPROVED call IBalanceService.releaseReservation (return days), if SUBMITTED call IBalanceService.releaseReservation, set status=CANCELLED with cancelledBy/cancelledAt, call IAuditService.log, call INotificationService.notifyLeaveCancelled.
- `src/modules/leave/leave.controller.ts` — Define `LeaveController` class with methods that parse Fastify request/response, validate inputs (GP-003), enforce RBAC (GP-005), and delegate to ILeaveService. Methods: `submit`, `approve`, `reject`, `cancel`, `getById`, `getByEmployee`.
- `src/modules/leave/leave.routes.ts` — Define `leaveRoutes` Fastify plugin registering routes: POST /leaves (submit), PATCH /leaves/:id/approve, PATCH /leaves/:id/reject, PATCH /leaves/:id/cancel, GET /leaves/:id, GET /leaves (query by employeeId). Use Zod for input validation on request bodies.
- Update `src/modules/leave/index.ts` barrel export.
- Update `src/app.ts` to register `leaveRoutes` (import from `./modules/leave/leave.routes` and call `app.register(leaveRoutes)`).
- `tests/unit/modules/leave/leave.service.test.ts` — Jest tests mocking all dependencies, covering submit (success, overlap rejection, insufficient balance, policy inactive), approve, reject, cancel flows.

Approximately 5 files (plus barrel and app.ts updates).
