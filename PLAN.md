# PLAN.md

## Phase 1: Phase 1: Shared types foundation

Create the shared types module at `src/shared/types/index.ts`. Define and export three enums exactly as the architecture specifies:

- `LeaveRequestStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `LeaveType`: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY
- `AuditAction`: CREATED, UPDATED, APPROVED, REJECTED, CANCELLED, DELETED

This is a standalone file with no dependencies on other project modules. Use the existing project conventions: TypeScript strict mode, no `any` types, ES module exports.

Include a Jest unit test file at `tests/unit/shared/types/index.test.ts` that verifies each enum has the correct members and that enum values are distinct.

This phase has no dependencies on prior phases — it is the foundation.

## Phase 2: Phase 2: Employee module

Build the employee module at `src/modules/employee/`. Create these files:

1. `src/modules/employee/employee.model.ts` — Define the `Employee` interface with fields: `id: string`, `fullName: string`, `email: string`, `department: string | null`, `managerId: string | null`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`.

2. `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findAll(): Promise<Employee[]>`, `findByManager(managerId: string): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `delete(id: string): Promise<boolean>`.

3. `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` interface with: `getById(id: string): Promise<Employee | null>`, `getAll(): Promise<Employee[]>`, `getSubordinates(managerId: string): Promise<Employee[]>`, `create(data: CreateEmployeeDto): Promise<Employee>`, `update(id: string, data: UpdateEmployeeDto): Promise<Employee | null>`, `deactivate(id: string): Promise<boolean>`. Also define `CreateEmployeeDto` and `UpdateEmployeeDto` in this file.

4. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. It delegates to `IEmployeeRepository` (constructor injection). Keep logic minimal: validate input, delegate to repository, return results.

5. `src/modules/employee/index.ts` — Barrel export of all public symbols.

This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code. No other module dependencies.

Include Jest unit tests in `tests/unit/modules/employee/` covering the service methods with a mock repository.

## Phase 3: Phase 3: Audit module

Build the audit module at `src/modules/audit/`. Create these files:

1. `src/modules/audit/audit.model.ts` — Define the `AuditRecord` interface with fields: `id: string`, `entityType: string`, `entityId: string`, `action: AuditAction`, `performedBy: string`, `changes: Record<string, unknown> | null`, `timestamp: Date`, `createdAt: Date`. Import `AuditAction` from `src/shared/types/index.ts` (Phase 1).

2. `src/modules/audit/audit.repository.ts` — Define `IAuditRepository` interface with methods: `create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>`, `findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>`, `findByUser(performedBy: string): Promise<AuditRecord[]>`, `findByDateRange(start: Date, end: Date): Promise<AuditRecord[]>`.

3. `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with: `log(record: CreateAuditRecordDto): Promise<AuditRecord>`, `getEntityHistory(entityType: string, entityId: string): Promise<AuditRecord[]>`, `getUserActions(performedBy: string): Promise<AuditRecord[]>`, `getByDateRange(start: Date, end: Date): Promise<AuditRecord[]>`. Also define `CreateAuditRecordDto` here.

4. `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. Constructor-injected `IAuditRepository`. The `log` method creates an audit record with the current timestamp.

5. `src/modules/audit/index.ts` — Barrel export of all public symbols.

This phase depends on `src/shared/types/index.ts` from Phase 1 for the `AuditAction` enum. No other module dependencies.

Include Jest unit tests in `tests/unit/modules/audit/` covering the service with a mock repository.

## Phase 4: Phase 4: Policy module

Build the policy module at `src/modules/policy/`. Create these files:

1. `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with the canonical fields: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/index.ts` (Phase 1).

2. `src/modules/policy/policy.repository.ts` — Define `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `findActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`, `delete(id: string): Promise<boolean>`.

3. `src/modules/policy/policy.service.interface.ts` — Define `ILeavePolicyService` interface with: `getById(id: string): Promise<LeavePolicy | null>`, `getAll(): Promise<LeavePolicy[]>`, `getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `getActive(): Promise<LeavePolicy[]>`, `create(data: CreateLeavePolicyDto): Promise<LeavePolicy>`, `update(id: string, data: UpdateLeavePolicyDto): Promise<LeavePolicy | null>`, `deactivate(id: string): Promise<boolean>`. Also define `CreateLeavePolicyDto` and `UpdateLeavePolicyDto` here.

4. `src/modules/policy/policy.service.ts` — Implement `LeavePolicyService` class implementing `ILeavePolicyService`. Constructor-injected `ILeavePolicyRepository`. Keep logic minimal: validate, delegate, return.

5. `src/modules/policy/index.ts` — Barrel export of all public symbols.

This phase depends on `src/shared/types/index.ts` from Phase 1 for the `LeaveType` enum. No other module dependencies.

Include Jest unit tests in `tests/unit/modules/policy/` covering the service with a mock repository.

## Phase 5: Phase 5: Balance module

Build the balance module at `src/modules/balance/`. Create these files:

1. `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` interface with canonical fields: `id: string`, `employeeId: string`, `leavePolicyId: string`, `totalEntitlement: number`, `usedDays: number`, `remainingDays: number`, `fiscalYear: number`, `status: BalanceStatus`, `createdAt: Date`, `updatedAt: Date`. Also define the `BalanceStatus` enum in this same file: ACTIVE, EXHAUSTED, CLOSED.

2. `src/modules/balance/balance.repository.ts` — Define `IBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployee(employeeId: string): Promise<LeaveBalance[]>`, `findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null>`, `findByEmployeeAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`, `update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>`, `delete(id: string): Promise<boolean>`.

3. `src/modules/balance/balance.service.interface.ts` — Define `IBalanceService` interface with: `getById(id: string): Promise<LeaveBalance | null>`, `getByEmployee(employeeId: string): Promise<LeaveBalance[]>`, `getByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null>`, `create(data: CreateBalanceDto): Promise<LeaveBalance>`, `deductDays(id: string, days: number): Promise<LeaveBalance>`, `restoreDays(id: string, days: number): Promise<LeaveBalance>`, `hasSufficientBalance(employeeId: string, leavePolicyId: string, requestedDays: number): Promise<boolean>`. Also define `CreateBalanceDto` here.

4. `src/modules/balance/balance.service.ts` — Implement `BalanceService` class implementing `IBalanceService`. Constructor-injected `IBalanceRepository`. Apply the BINDING rule: `remainingDays = totalEntitlement - usedDays` (integer, floor if fractional). `deductDays` increments `usedDays` and recalculates `remainingDays`; if `remainingDays` reaches 0, set status to EXHAUSTED. `restoreDays` decrements `usedDays`. `hasSufficientBalance` checks `remainingDays >= requestedDays`.

5. `src/modules/balance/index.ts` — Barrel export of all public symbols.

This phase depends on `src/shared/types/index.ts` from Phase 1 and `src/modules/policy/policy.model.ts` from Phase 4 — read both before generating. The `leavePolicyId` field references a policy; the service may import `LeavePolicy` for type-checking if needed.

Include Jest unit tests in `tests/unit/modules/balance/` covering deduction, restoration, sufficiency checks, and status transitions with a mock repository.

## Phase 6: Phase 6: Leave module

Build the leave module at `src/modules/leave/`. Create these files:

1. `src/modules/leave/leave.model.ts` — Define the `LeaveRequest` interface with ALL canonical fields: `id: string`, `employeeId: string`, `leavePolicyId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `rejectedBy: string | null`, `rejectedAt: Date | null`, `rejectionReason: string | null`, `cancelledBy: string | null`, `cancelledAt: Date | null`, `cancellationReason: string | null`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveRequestStatus` from `src/shared/types/index.ts` (Phase 1). Also define `CreateLeaveRequestDto` (employeeId, leavePolicyId, startDate, endDate, reason?) and `UpdateLeaveRequestDto` (Partial of status-relevant fields) and `LeaveRequestQueryParams` (status?, employeeId?, startDate?, endDate?) in this same file.

2. `src/modules/leave/leave.repository.ts` — Define `ILeaveRequestRepository` interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findByDateRange(start: Date, end: Date): Promise<LeaveRequest[]>`, `query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>`, `create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`, `delete(id: string): Promise<boolean>`.

3. `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with: `create(data: CreateLeaveRequestDto): Promise<LeaveRequest>`, `submit(id: string): Promise<LeaveRequest>`, `approve(id: string, approverId: string): Promise<LeaveRequest>`, `reject(id: string, rejectorId: string, reason: string): Promise<LeaveRequest>`, `cancel(id: string, cancelledBy: string, reason: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest | null>`, `getByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>`.

4. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor-injected dependencies: `ILeaveRequestRepository`, `IEmployeeService` (from Phase 2), `ILeavePolicyService` (from Phase 4), `IBalanceService` (from Phase 5), `IAuditService` (from Phase 3). Apply ALL BINDING rules:
   - Day counting: `daysRequested = (endDate.getTime() - startDate.getTime()) / (1000*60*60*24) + 1` (inclusive calendar days, integer via Math.floor).
   - On `submit`: validate employee exists, validate policy exists and isActive, check `hasSufficientBalance`, check `minimumNoticeDays` (if set, startDate must be >= now + minimumNoticeDays), set status to SUBMITTED.
   - On `approve`: validate current status is SUBMITTED, set approvedBy/approvedAt, set status to APPROVED, call `balanceService.deductDays`.
   - On `reject`: validate current status is SUBMITTED, set rejectedBy/rejectedAt/rejectionReason, set status to REJECTED.
   - On `cancel`: validate status is APPROVED or SUBMITTED. If APPROVED, call `balanceService.restoreDays`. Set cancelledBy/cancelledAt/cancellationReason, set status to CANCELLED.
   - Every state-changing operation logs an audit record via `IAuditService.log`.
   - Emergency leave follows the same `requiresManagerApproval` path as all other types — no special handling.

5. `src/modules/leave/leave.routes.ts` — Fastify route definitions. Register routes: POST /leave (create), POST /leave/:id/submit, POST /leave/:id/approve, POST /leave/:id/reject, POST /leave/:id/cancel, GET /leave/:id, GET /leave (query). Each handler instantiates the service with its dependencies and delegates. Follow the pattern in `src/modules/uptime/uptime.routes.ts`.

6. `src/modules/leave/index.ts` — Barrel export of all public symbols.

This phase depends on files from Phases 1-5. Read these before generating:
- `src/shared/types/index.ts` (Phase 1) — for LeaveRequestStatus
- `src/modules/employee/employee.service.interface.ts` (Phase 2) — for IEmployeeService
- `src/modules/audit/audit.service.interface.ts` (Phase 3) — for IAuditService
- `src/modules/policy/policy.service.interface.ts` (Phase 4) — for ILeavePolicyService
- `src/modules/balance/balance.service.interface.ts` (Phase 5) — for IBalanceService

Include Jest unit tests in `tests/unit/modules/leave/` covering all state transitions, balance deduction/restoration, and validation logic with mock dependencies.

## Phase 7: Phase 7: Notification module

Build the notification module at `src/modules/notification/`. Create these files:

1. `src/modules/notification/notification.model.ts` — Define the `Notification` interface with fields: `id: string`, `recipientId: string`, `type: NotificationType`, `title: string`, `message: string`, `isRead: boolean`, `relatedEntityType: string | null`, `relatedEntityId: string | null`, `createdAt: Date`. Also define the `NotificationType` enum in this same file: LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED, BALANCE_UPDATED.

2. `src/modules/notification/notification.repository.ts` — Define `INotificationRepository` interface with methods: `create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>`, `findByRecipient(recipientId: string): Promise<Notification[]>`, `findUnreadByRecipient(recipientId: string): Promise<Notification[]>`, `markAsRead(id: string): Promise<Notification | null>`, `markAllAsRead(recipientId: string): Promise<number>`.

3. `src/modules/notification/notification.service.interface.ts` — Define `INotificationService` interface with: `notify(data: CreateNotificationDto): Promise<Notification>`, `getByRecipient(recipientId: string): Promise<Notification[]>`, `getUnread(recipientId: string): Promise<Notification[]>`, `markRead(id: string): Promise<Notification | null>`, `markAllRead(recipientId: string): Promise<number>`. Also define `CreateNotificationDto` here.

4. `src/modules/notification/notification.service.ts` — Implement `NotificationService` class implementing `INotificationService`. Constructor-injected `INotificationRepository`. The `notify` method creates a notification record. Keep logic minimal.

5. `src/modules/notification/index.ts` — Barrel export of all public symbols.

This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2 (for Employee type reference), and `src/modules/leave/leave.model.ts` from Phase 6 (for LeaveRequest type reference). Read these before generating.

Include Jest unit tests in `tests/unit/modules/notification/` covering notification creation, retrieval, and read-status updates with a mock repository.
