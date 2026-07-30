# PLAN.md

## Phase 1: Phase 1: Shared types — BaseEntity, LeaveType, LeaveRequestStatus

Create `src/shared/types/index.ts` with:
- `BaseEntity` interface: `id: string`, `createdAt: Date`, `updatedAt: Date`
- `LeaveType` enum: `ANNUAL`, `SICK`, `EMERGENCY`, `UNPAID`, `MATERNITY`, `PATERNITY`
- `LeaveRequestStatus` enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`

Include Jest unit tests in `tests/unit/shared/types/types.test.ts` verifying enum values and interface shape. This phase has no dependencies on any prior phase files.

## Phase 2: Phase 2: Employee model + repository

Create the employee module at `src/modules/employee/`:

- `src/modules/employee/employee.model.ts` — `Employee` entity extending `BaseEntity` from `src/shared/types/index.ts` (Phase 1). Fields: `id: string`, `employeeCode: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN'`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`.
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository` interface with: `findById(id: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findManagerId(employeeId: string): Promise<string | null>`, `findHrAdmins(): Promise<Employee[]>`. Also `EmployeeRepository` class implementing it using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/employee/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references `BaseEntity`.

## Phase 3: Phase 3: LeavePolicy model + repository

Create the leave-policy module at `src/modules/leave-policy/`:

- `src/modules/leave-policy/leave-policy.model.ts` — `LeavePolicy` entity extending `BaseEntity` from `src/shared/types/index.ts` (Phase 1). Fields: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `maxConsecutiveDays: number | null`, `requiresAttachment: boolean`, `allowNegativeBalance: boolean`, `accrualEnabled: boolean`, `createdAt: Date`, `updatedAt: Date`.
- `src/modules/leave-policy/leave-policy.repository.ts` — `ILeavePolicyRepository` interface with: `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `findById(id: string): Promise<LeavePolicy | null>`. Also `LeavePolicyRepository` class implementing it using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/leave-policy/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references `LeaveType` or `BaseEntity`.

## Phase 4: Phase 4: LeaveBalance model + repository

Create the leave-balance module at `src/modules/leave-balance/`:

- `src/modules/leave-balance/leave-balance.model.ts` — `LeaveBalance` entity extending `BaseEntity` from `src/shared/types/index.ts` (Phase 1). Fields: `id: string`, `employeeId: string`, `leaveType: LeaveType`, `fiscalYear: number`, `totalEntitlement: number`, `usedDays: number`, `pendingDays: number`, `remainingDays: number`, `createdAt: Date`, `updatedAt: Date`.
- `src/modules/leave-balance/leave-balance.repository.ts` — `ILeaveBalanceRepository` interface with: `findByEmployeeAndType(employeeId: string, leaveType: LeaveType, fiscalYear: number): Promise<LeaveBalance | null>`, `findAllByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `upsert(balance: LeaveBalance): Promise<LeaveBalance>`, `deductPendingDays(id: string, days: number): Promise<LeaveBalance>`, `restorePendingDays(id: string, days: number): Promise<LeaveBalance>`, `commitUsedDays(id: string, days: number): Promise<LeaveBalance>`. Also `LeaveBalanceRepository` class implementing it using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/leave-balance/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references `LeaveType` or `BaseEntity`.

## Phase 5: Phase 5: LeaveRequest model + repository

Create the leave-request module at `src/modules/leave-request/`:

- `src/modules/leave-request/leave-request.model.ts` — `LeaveRequest` entity extending `BaseEntity` from `src/shared/types/index.ts` (Phase 1). Fields: `id: string`, `employeeId: string`, `leaveType: LeaveType`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `cancelledAt: Date | null`, `createdAt: Date`, `updatedAt: Date`. Also export `CreateLeaveRequestDto` with: `employeeId: string`, `leaveType: LeaveType`, `startDate: Date`, `endDate: Date`, `reason?: string`.
- `src/modules/leave-request/leave-request.repository.ts` — `ILeaveRequestRepository` interface with: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `findPendingByManager(managerId: string): Promise<LeaveRequest[]>`, `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string | null): Promise<LeaveRequest>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`. Also `LeaveRequestRepository` class implementing it using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/leave-request/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.repository.test.ts`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references `LeaveType`, `LeaveRequestStatus`, or `BaseEntity`.

## Phase 6: Phase 6: AuditLog model + repository

Create the audit-log module at `src/modules/audit-log/`:

- `src/modules/audit-log/audit-log.model.ts` — `AuditLog` entity extending `BaseEntity` from `src/shared/types/index.ts` (Phase 1). Fields: `id: string`, `actorId: string`, `action: string`, `entityType: string`, `entityId: string`, `details: Record<string, unknown>`, `createdAt: Date`.
- `src/modules/audit-log/audit-log.repository.ts` — `IAuditLogRepository` interface with: `create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>`, `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`. Also `AuditLogRepository` class implementing it using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/audit-log/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/audit-log/audit-log.repository.test.ts`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references `BaseEntity`.

## Phase 7: Phase 7: EmployeeService + LeavePolicyService

Create service layer for employee and leave-policy modules (approximately 4-5 files):

- `src/modules/employee/employee.service.interface.ts` — `IEmployeeService` interface: `findById(id: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findManagerId(employeeId: string): Promise<string | null>`, `findHrAdmins(): Promise<Employee[]>`.
- `src/modules/employee/employee.service.ts` — `EmployeeService` class implementing `IEmployeeService`, delegating to `EmployeeRepository` from Phase 2.
- `src/modules/leave-policy/leave-policy.service.interface.ts` — `ILeavePolicyService` interface: `getPolicyForLeaveType(leaveType: LeaveType): Promise<LeavePolicy>`, `requiresManagerApproval(leaveType: LeaveType): Promise<boolean>`, `getMinimumNoticeDays(leaveType: LeaveType): Promise<number | null>`.
- `src/modules/leave-policy/leave-policy.service.ts` — `LeavePolicyService` class implementing `ILeavePolicyService`, delegating to `LeavePolicyRepository` from Phase 3. Throws if no active policy found for the leave type.
- Update barrel exports in both `index.ts` files.

Include Jest unit tests in `tests/unit/modules/employee/employee.service.test.ts` and `tests/unit/modules/leave-policy/leave-policy.service.test.ts`.

This phase depends on:
- `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2
- `src/modules/leave-policy/leave-policy.model.ts` and `src/modules/leave-policy/leave-policy.repository.ts` from Phase 3
- `src/shared/types/index.ts` from Phase 1

Read all of these before generating any code.

## Phase 8: Phase 8: LeaveBalanceService

Create the leave-balance service layer (approximately 3 files):

- `src/modules/leave-balance/leave-balance.service.interface.ts` — `ILeaveBalanceService` interface: `getBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number): Promise<LeaveBalance>`, `getAllBalances(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `hasSufficientBalance(employeeId: string, leaveType: LeaveType, requestedDays: number, fiscalYear: number): Promise<boolean>`, `reserveDays(employeeId: string, leaveType: LeaveType, days: number, fiscalYear: number): Promise<LeaveBalance>`, `restoreDays(employeeId: string, leaveType: LeaveType, days: number, fiscalYear: number): Promise<LeaveBalance>`, `commitDays(employeeId: string, leaveType: LeaveType, days: number, fiscalYear: number): Promise<LeaveBalance>`.
- `src/modules/leave-balance/leave-balance.service.ts` — `LeaveBalanceService` class implementing `ILeaveBalanceService`. Delegates to `LeaveBalanceRepository` from Phase 4. `reserveDays` increments `pendingDays` and decrements `remainingDays`. `restoreDays` decrements `pendingDays` and increments `remainingDays`. `commitDays` decrements `pendingDays` and increments `usedDays`. `hasSufficientBalance` checks `remainingDays >= requestedDays` (or `allowNegativeBalance` from policy). Uses `LeavePolicyRepository` from Phase 3 to check `allowNegativeBalance`.
- Update `src/modules/leave-balance/index.ts` barrel export.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.service.test.ts`.

This phase depends on:
- `src/modules/leave-balance/leave-balance.model.ts` and `src/modules/leave-balance/leave-balance.repository.ts` from Phase 4
- `src/modules/leave-policy/leave-policy.model.ts` and `src/modules/leave-policy/leave-policy.repository.ts` from Phase 3
- `src/shared/types/index.ts` from Phase 1

Read all of these before generating any code.

## Phase 9: Phase 9: LeaveRequestService — core business logic

Create the leave-request service layer with all binding business rules (approximately 4 files):

- `src/modules/leave-request/leave-request.service.interface.ts` — `ILeaveRequestService` interface: `submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>`, `rejectLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>`, `cancelLeaveRequest(requestId: string, actorId: string): Promise<LeaveRequest>`, `getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]>`, `getPendingForManager(managerId: string): Promise<LeaveRequest[]>`.

- `src/modules/leave-request/leave-request.service.ts` — `LeaveRequestService` class implementing `ILeaveRequestService`. Implements ALL binding business rules:
  - **Day counting**: compute business days (exclude Sat/Sun) between startDate and endDate (inclusive). Reject if fractional.
  - **Minimum notice**: measured from midnight of submission day to startDate. Compare against policy's `minimumNoticeDays`.
  - **Fiscal year**: calendar year derived from `startDate.getFullYear()`.
  - **Balance deduction on submission**: call `LeaveBalanceService.reserveDays` after creating the request.
  - **Restore on rejection/cancellation**: call `LeaveBalanceService.restoreDays`.
  - **No-manager escalation**: when `EmployeeService.findManagerId` returns null and policy `requiresManagerApproval` is true, route to HR admins via `EmployeeService.findHrAdmins`.
  - **Overlap detection**: use `LeaveRequestRepository.findOverlapping` to reject overlapping requests.
  - **Audit logging**: log every state transition via `AuditLogRepository.create`.
  - **Status validation**: only SUBMITTED requests can be approved/rejected; only DRAFT/SUBMITTED can be cancelled.

- `src/shared/utils/business-days.ts` — `calculateBusinessDays(startDate: Date, endDate: Date): number` utility. Excludes Saturdays and Sundays. Returns integer count of business days inclusive of both start and end.

- Update `src/modules/leave-request/index.ts` barrel export.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.service.test.ts` and `tests/unit/shared/utils/business-days.test.ts`.

This phase depends on:
- `src/modules/leave-request/leave-request.model.ts` and `src/modules/leave-request/leave-request.repository.ts` from Phase 5
- `src/modules/audit-log/audit-log.model.ts` and `src/modules/audit-log/audit-log.repository.ts` from Phase 6
- `src/modules/employee/employee.service.ts` and `src/modules/employee/employee.service.interface.ts` from Phase 7
- `src/modules/leave-policy/leave-policy.service.ts` and `src/modules/leave-policy/leave-policy.service.interface.ts` from Phase 7
- `src/modules/leave-balance/leave-balance.service.ts` and `src/modules/leave-balance/leave-balance.service.interface.ts` from Phase 8
- `src/shared/types/index.ts` from Phase 1

Read all of these before generating any code.

## Phase 10: Phase 10: LeaveRequest routes + controller + app wiring

Create the HTTP layer for leave requests and wire into the Fastify app (approximately 4 files):

- `src/modules/leave-request/leave-request.controller.ts` — `LeaveRequestController` class that takes `LeaveRequestService` as a constructor dependency. Methods: `submit`, `approve`, `reject`, `cancel`, `getEmployeeRequests`, `getPendingForManager`. Each method extracts params/body from the Fastify request, calls the service, and returns the appropriate HTTP response. Uses Zod for request body validation on `submit`.

- `src/modules/leave-request/leave-request.routes.ts` — Fastify plugin registering routes:
  - `POST /leave-requests` → `controller.submit`
  - `POST /leave-requests/:id/approve` → `controller.approve`
  - `POST /leave-requests/:id/reject` → `controller.reject`
  - `POST /leave-requests/:id/cancel` → `controller.cancel`
  - `GET /leave-requests/employee/:employeeId` → `controller.getEmployeeRequests`
  - `GET /leave-requests/manager/:managerId/pending` → `controller.getPendingForManager`

- Update `src/modules/leave-request/index.ts` barrel export to include controller and routes.

- Update `src/app.ts` to register `leaveRequestRoutes` alongside the existing `uptimeRoutes`.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.controller.test.ts` and `tests/unit/modules/leave-request/leave-request.routes.test.ts`.

This phase depends on:
- `src/modules/leave-request/leave-request.service.ts` and `src/modules/leave-request/leave-request.service.interface.ts` from Phase 9
- `src/modules/leave-request/leave-request.model.ts` from Phase 5
- `src/shared/types/index.ts` from Phase 1
- `src/app.ts` (existing — read before modifying)

Read all of these before generating any code.
