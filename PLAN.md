# PLAN.md

## Phase 1: Phase 1: Shared types — enums, base entity, DTOs, and day-count utility

Create the shared-types module at src/shared/types/ with these files:

1. **src/shared/types/leave-type.enum.ts** — Define `LeaveType` enum with values: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY.

2. **src/shared/types/leave-request-status.enum.ts** — Define `LeaveRequestStatus` enum with values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.

3. **src/shared/types/base-entity.interface.ts** — Define `BaseEntity` interface with fields: id (string), createdAt (Date), updatedAt (Date).

4. **src/shared/types/leave-request.dto.ts** — Define `CreateLeaveRequestDto` (employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason?: string) and `UpdateLeaveRequestDto` (status?: LeaveRequestStatus, rejectionReason?: string). Import LeaveRequestStatus from ./leave-request-status.enum.

5. **src/shared/types/index.ts** — Barrel export re-exporting all symbols from the four files above.

6. **src/shared/utils/day-count.ts** — Export a function `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number` that counts business days (Mon–Fri) excluding weekends and the provided holidays array. This is the single shared day-count function required by the binding rules.

Include Jest unit tests in **tests/unit/shared/types/types.test.ts** verifying enum values and DTO shape, and **tests/unit/shared/utils/day-count.test.ts** verifying business-day counting (excludes weekends, excludes holidays, inclusive of start and end when both are business days).

This phase has no dependencies on prior phases — it is the foundation.

## Phase 2: Phase 1: Shared types — enums, base entity, DTOs, and day-count utility

Create the shared-types foundation. All later phases depend on these types.

Files to create (5 source files):

1. **src/shared/types/enums.ts** — Define `LeaveType` enum (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY) and `LeaveRequestStatus` enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) in a single file.

2. **src/shared/types/base-entity.interface.ts** — Define `BaseEntity` interface: id (string), createdAt (Date), updatedAt (Date).

3. **src/shared/types/leave-request.dto.ts** — Define `CreateLeaveRequestDto` (employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason?: string) and `UpdateLeaveRequestDto` (status?: LeaveRequestStatus, rejectionReason?: string). Import from ./enums.

4. **src/shared/types/index.ts** — Barrel export re-exporting all symbols from the three files above.

5. **src/shared/utils/day-count.ts** — Export `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number`. Counts Mon–Fri inclusive, excludes weekends and the provided holidays array. This is the single shared day-count function mandated by the binding rules.

Include Jest unit tests: **tests/unit/shared/types/types.test.ts** (enum values, DTO shape) and **tests/unit/shared/utils/day-count.test.ts** (excludes weekends, excludes holidays, inclusive range).

## Phase 3: Phase 2: Employee module — model, repository interface, and repository

Build the employee module. This phase depends on src/shared/types/base-entity.interface.ts from Phase 1 — read it before generating.

Files to create (3 source files):

1. **src/modules/employee/employee.model.ts** — Define `Employee` entity extending `BaseEntity` with exact fields: employeeNumber (string), firstName (string), lastName (string), email (string), managerId (string | null), department (string), hireDate (Date), terminationDate (Date | null), employmentStatus (string). Import BaseEntity from ../../shared/types/base-entity.interface.

2. **src/modules/employee/employee.repository.ts** — Define `IEmployeeRepository` interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findByEmail(email: string): Promise<Employee | null>, findByManagerId(managerId: string): Promise<Employee[]>, findAll(): Promise<Employee[]>, create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>, update(id: string, data: Partial<Employee>): Promise<Employee | null>. Also implement `PgEmployeeRepository` using the shared pg pool from src/shared/db/connection.ts. Import Employee from ./employee.model.

3. **src/modules/employee/index.ts** — Barrel export of Employee, IEmployeeRepository, PgEmployeeRepository.

Include Jest unit tests in **tests/unit/modules/employee/employee.repository.test.ts** (mock the pg pool, test CRUD operations).

## Phase 4: Phase 3: Policy module — model, repository interface, and repository

Build the policy module. Depends on src/shared/types/enums.ts and src/shared/types/base-entity.interface.ts from Phase 1 — read both before generating.

Files to create (3 source files):

1. **src/modules/policy/policy.model.ts** — Define `LeavePolicy` entity extending `BaseEntity` with exact fields: policyName (string), leaveType (LeaveType), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean). Import BaseEntity from ../../shared/types/base-entity.interface and LeaveType from ../../shared/types/enums.

2. **src/modules/policy/policy.repository.ts** — Define `ILeavePolicyRepository` interface: findById(id: string): Promise<LeavePolicy | null>, findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>, findActive(): Promise<LeavePolicy[]>, create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>, update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>. Implement `PgLeavePolicyRepository` using the shared pg pool from src/shared/db/connection.ts.

3. **src/modules/policy/index.ts** — Barrel export of LeavePolicy, ILeavePolicyRepository, PgLeavePolicyRepository.

Include Jest unit tests in **tests/unit/modules/policy/policy.repository.test.ts**.

## Phase 5: Phase 4: Balance module — model, repository interface, and repository

Build the balance module. Depends on src/shared/types/base-entity.interface.ts and src/shared/types/enums.ts from Phase 1, src/modules/employee/employee.model.ts from Phase 2, and src/modules/policy/policy.model.ts from Phase 3 — read all four before generating.

Files to create (3 source files):

1. **src/modules/balance/balance.model.ts** — Define `LeaveBalance` entity extending `BaseEntity` with exact fields: employeeId (string), leavePolicyId (string), totalEntitlement (number), usedDays (number), fiscalYear (number), status ('ACTIVE' | 'EXHAUSTED' | 'CLOSED'). Per binding rules: usedDays is a denormalized counter (source of truth), remainingDays is COMPUTED at query time and NEVER stored. Import BaseEntity from ../../shared/types/base-entity.interface.

2. **src/modules/balance/balance.repository.ts** — Define `ILeaveBalanceRepository` interface: findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployeeId(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance | null> (atomic update for deduction/restoration). Implement `PgLeaveBalanceRepository` using the shared pg pool. The repository must expose a method that computes remainingDays as totalEntitlement - usedDays at query time.

3. **src/modules/balance/index.ts** — Barrel export.

Include Jest unit tests in **tests/unit/modules/balance/balance.repository.test.ts**.

## Phase 6: Phase 5: Leave module — model and repository

Build the leave module's domain model and repository layer. Depends on src/shared/types/enums.ts and src/shared/types/base-entity.interface.ts from Phase 1 — read both before generating.

Files to create (3 source files):

1. **src/modules/leave/leave.model.ts** — Define `LeaveRequest` entity extending `BaseEntity` with exact fields: employeeId (string), leavePolicyId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), rejectionReason (string | null), cancelledBy (string | null), cancelledAt (Date | null). Import BaseEntity from ../../shared/types/base-entity.interface and LeaveRequestStatus from ../../shared/types/enums.

2. **src/modules/leave/leave.repository.ts** — Define `ILeaveRequestRepository` interface: findById(id: string): Promise<LeaveRequest | null>, findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>, findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>, findByEmployeeAndDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>, create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>, update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>. Implement `PgLeaveRequestRepository` using the shared pg pool from src/shared/db/connection.ts.

3. **src/modules/leave/index.ts** — Barrel export of LeaveRequest, ILeaveRequestRepository, PgLeaveRequestRepository.

Include Jest unit tests in **tests/unit/modules/leave/leave.repository.test.ts**.

## Phase 7: Phase 6: Holidays repository — model and data access for public holidays

Create a minimal holidays data layer for the public-holiday calendar required by the binding rules. Depends on src/shared/types/base-entity.interface.ts from Phase 1 — read it before generating.

Files to create (3 source files):

1. **src/shared/holidays/holiday.model.ts** — Define `Holiday` interface: id (string), date (Date), name (string), country (string). This is a simple data interface (not extending BaseEntity since holidays are reference data).

2. **src/shared/holidays/holiday.repository.ts** — Define `IHolidayRepository` interface: findByDateRange(startDate: Date, endDate: Date): Promise<Holiday[]>, findByYear(year: number): Promise<Holiday[]>. Implement `PgHolidayRepository` using the shared pg pool from src/shared/db/connection.ts. The repository returns Date objects that can be passed directly to the `countBusinessDays` function from Phase 1.

3. **src/shared/holidays/index.ts** — Barrel export of Holiday, IHolidayRepository, PgHolidayRepository.

Include Jest unit tests in **tests/unit/shared/holidays/holiday.repository.test.ts**.

## Phase 8: Phase 7: Notification module — model, repository, and service

Build the notification module. Depends on src/shared/types/base-entity.interface.ts from Phase 1 — read it before generating.

Files to create (5 source files):

1. **src/modules/notification/notification.model.ts** — Define `Notification` entity: id (string), recipientId (string), recipientEmail (string), subject (string), body (string), sentAt (Date | null), status ('PENDING' | 'SENT' | 'FAILED'), createdAt (Date), updatedAt (Date).

2. **src/modules/notification/notification.repository.ts** — Define `INotificationRepository` interface: create(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification>, updateStatus(id: string, status: string): Promise<Notification | null>, findByRecipient(recipientId: string): Promise<Notification[]>. Implement `PgNotificationRepository` using the shared pg pool.

3. **src/modules/notification/notification.service.interface.ts** — Define `INotificationService` interface: notifyLeaveSubmitted(employeeId: string, leaveRequestId: string): Promise<void>, notifyLeaveStatusChange(employeeId: string, leaveRequestId: string, oldStatus: string, newStatus: string): Promise<void>.

4. **src/modules/notification/notification.service.ts** — Implement `NotificationService` implementing INotificationService. Uses INotificationRepository to persist notifications. For now, actual email sending is stubbed (log + persist).

5. **src/modules/notification/index.ts** — Barrel export.

Include Jest unit tests in **tests/unit/modules/notification/notification.service.test.ts**.

## Phase 9: Phase 8: Audit module — model and repository

Build the audit module. Depends on src/shared/types/base-entity.interface.ts from Phase 1 — read it before generating.

Files to create (3 source files):

1. **src/modules/audit/audit.model.ts** — Define `AuditLog` entity extending `BaseEntity` with fields: actorId (string), action (string — e.g. 'LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED'), targetId (string), targetType (string — e.g. 'LeaveRequest'), details (Record<string, unknown> | null), timestamp (Date). Import BaseEntity from ../../shared/types/base-entity.interface.

2. **src/modules/audit/audit.repository.ts** — Define `IAuditLogRepository` interface: create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog>, findByTarget(targetId: string, targetType: string): Promise<AuditLog[]>, findByActor(actorId: string): Promise<AuditLog[]>. Implement `PgAuditLogRepository` using the shared pg pool from src/shared/db/connection.ts.

3. **src/modules/audit/index.ts** — Barrel export of AuditLog, IAuditLogRepository, PgAuditLogRepository.

Include Jest unit tests in **tests/unit/modules/audit/audit.repository.test.ts**.

## Phase 10: Phase 9: Leave service — core business logic

Implement the LeaveRequestService with all binding business rules. This phase depends on every prior phase — read these files before generating:

- src/shared/types/enums.ts (Phase 1)
- src/shared/types/leave-request.dto.ts (Phase 1)
- src/shared/utils/day-count.ts (Phase 1)
- src/modules/employee/employee.model.ts and employee.repository.ts (Phase 2)
- src/modules/policy/policy.model.ts and policy.repository.ts (Phase 3)
- src/modules/balance/balance.model.ts and balance.repository.ts (Phase 4)
- src/modules/leave/leave.model.ts and leave.repository.ts (Phase 5)
- src/shared/holidays/holiday.model.ts and holiday.repository.ts (Phase 6)
- src/modules/notification/notification.service.interface.ts (Phase 7)
- src/modules/audit/audit.model.ts and audit.repository.ts (Phase 8)

Files to create (3 source files):

1. **src/modules/leave/leave.service.interface.ts** — Define `ILeaveRequestService` interface:
   - submitDraft(leaveRequestId: string, actorId: string): Promise<LeaveRequest>
   - approve(leaveRequestId: string, approverId: string): Promise<LeaveRequest>
   - reject(leaveRequestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>
   - cancel(leaveRequestId: string, actorId: string): Promise<LeaveRequest>
   - createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>
   - findById(id: string): Promise<LeaveRequest | null>
   - findByEmployee(employeeId: string): Promise<LeaveRequest[]>

2. **src/modules/leave/leave.service.ts** — Implement `LeaveRequestService` implementing ILeaveRequestService. Constructor takes: ILeaveRequestRepository, IEmployeeRepository, ILeavePolicyRepository, ILeaveBalanceRepository, IHolidayRepository, INotificationService, IAuditLogRepository.

   Binding rules to implement:
   - **submitDraft**: Validate employee exists. Look up active LeavePolicy by leavePolicyId. Compute fiscalYear = calendar year of startDate. Fetch holidays in range, call countBusinessDays. Fetch LeaveBalance for employee+policy+fiscalYear; if none exists, fail. Atomically check remainingDays (totalEntitlement - usedDays) >= requested business days; if not, fail. Increment usedDays by business day count in same transaction. Transition status DRAFT→SUBMITTED. Write audit log. Send notification.
   - **approve**: Validate request is SUBMITTED. If employee has no manager (managerId is null), only HR admin role may approve (check actor role from caller). Transition SUBMITTED→APPROVED, set approvedBy/approvedAt. Do NOT change usedDays again. Write audit log. Send notification.
   - **reject**: Validate request is SUBMITTED. Transition SUBMITTED→REJECTED, set rejectedBy/rejectedAt/rejectionReason. Restore usedDays (decrement by business day count). Write audit log. Send notification.
   - **cancel**: Validate request is SUBMITTED or APPROVED. Transition to CANCELLED, set cancelledBy/cancelledAt. If was SUBMITTED or APPROVED, restore usedDays. Write audit log. Send notification.
   - **createDraft**: Create a LeaveRequest with status DRAFT. No balance check.
   - Fiscal/leave year = calendar year. Day counting = business days only via countBusinessDays. usedDays is denormalized counter, deducted on submit, restored on reject/cancel. remainingDays is computed, never stored.

3. **src/modules/leave/index.ts** — Update barrel to also export ILeaveRequestService and LeaveRequestService.

Include Jest unit tests in **tests/unit/modules/leave/leave.service.test.ts** covering: submit with sufficient balance, submit with insufficient balance (fails), approve by manager, approve by HR admin for employee with no manager, reject restores balance, cancel restores balance, business-day counting integration, fiscal year derivation.

## Phase 11: Phase 10: Leave controller, routes, and app registration

Wire the leave module into the Fastify application with RBAC-enforcing controller and routes. Depends on all prior phases — read these files before generating:

- src/shared/types/enums.ts and src/shared/types/leave-request.dto.ts (Phase 1)
- src/modules/leave/leave.model.ts, leave.repository.ts, leave.service.interface.ts, leave.service.ts (Phases 5 & 9)
- src/modules/employee/employee.repository.ts (Phase 2)
- src/modules/policy/policy.repository.ts (Phase 3)
- src/modules/balance/balance.repository.ts (Phase 4)
- src/shared/holidays/holiday.repository.ts (Phase 6)
- src/modules/notification/notification.service.ts (Phase 7)
- src/modules/audit/audit.repository.ts (Phase 8)
- src/shared/db/connection.ts (existing)
- src/app.ts (existing — will be modified)

Files to create/modify (4 files):

1. **src/modules/leave/leave.controller.ts** — Implement `leaveController` as a set of request handler functions. Each handler:
   - Extracts `request.user` = { id, role } from the Fastify request (populated by existing auth middleware). Returns 401 if absent.
   - Validates inputs at the API boundary (400 on invalid: startDate not in past, startDate <= endDate, minimum notice check against policy).
   - Enforces RBAC: employee may only act on their own requests; managers/HR admins on those they oversee. For approve/reject, checks manager relationship via Employee repository (managerId chain) or HR admin role.
   - Delegates to LeaveRequestService.
   - Handlers: createDraft, submitDraft, approve, reject, cancel, getById, getMyRequests, getTeamRequests (manager/HR only).

2. **src/modules/leave/leave.routes.ts** — Define Fastify route plugin `leaveRoutes` registering:
   - POST /leave — createDraft (employee)
   - POST /leave/:id/submit — submitDraft (employee, own only)
   - POST /leave/:id/approve — approve (manager of employee or HR admin)
   - POST /leave/:id/reject — reject (manager of employee or HR admin)
   - POST /leave/:id/cancel — cancel (employee own, or manager/HR)
   - GET /leave/:id — getById (RBAC: own, manager of employee, or HR)
   - GET /leave/mine — getMyRequests (any authenticated)
   - GET /leave/team — getTeamRequests (manager/HR only)

3. **src/modules/leave/index.ts** — Update barrel to export leaveController and leaveRoutes.

4. **src/app.ts** — Modify to register leaveRoutes (alongside existing uptimeRoutes). Import and call `app.register(leaveRoutes)`.

Include Jest integration tests in **tests/integration/modules/leave/leave.routes.test.ts** covering: create draft, submit with balance, submit insufficient balance (400), approve by manager, reject by non-manager (403), cancel and balance restore, RBAC enforcement.
