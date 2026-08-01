# PLAN.md

## Phase 1: Phase 1: Shared types and enums

Create the shared-types module at src/shared/types/. Produce three files:

1. `src/shared/types/enums.ts` — Define and export:
   - `LeaveType` enum: `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`
   - `LeaveStatus` enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
   - `AuditAction` enum: `CREATED`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`, `BALANCE_DEDUCTED`, `BALANCE_RESTORED`

2. `src/shared/types/dtos.ts` — Define and export:
   - `LeaveRequestDTO`: `{ id: string; employeeId: string; leaveTypeId: string; startDate: string; endDate: string; reason?: string; rejectionReason?: string; status: LeaveStatus; approvedBy: string | null; approvedAt: string | null; cancelledAt: string | null; createdAt: string; updatedAt: string }`
   - `LeaveBalanceDTO`: `{ id: string; employeeId: string; leaveTypeId: string; policyId: string; totalEntitlement: number; usedDays: number; pendingDays: number; remainingDays: number; fiscalYear: number; status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN'; createdAt: string; updatedAt: string }`

3. `src/shared/types/index.ts` — barrel re-export of all symbols from enums.ts and dtos.ts.

Include a Jest unit test at `tests/unit/shared/types/enums.spec.ts` verifying all enum values are present. No external dependencies — this phase stands alone.

## Phase 2: Phase 2: Employee model and repository

Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:

1. `src/modules/employee/employee.model.ts` — Define and export the `Employee` entity interface with the canonical fields:
   - `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`

2. `src/modules/employee/employee.repository.ts` — Define and export:
   - `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `softDelete(id: string): Promise<void>`
   - `EmployeeRepository` class implementing `IEmployeeRepository` using the pg pool from `src/shared/db/connection.ts`. Use parameterized SQL queries.

3. `src/modules/employee/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/employee/employee.repository.spec.ts` with mocked pg pool.

## Phase 3: Phase 3: LeavePolicy model and repository

Create the leave-policy module at `src/modules/leave-policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:

1. `src/modules/leave-policy/leave-policy.model.ts` — Define and export the `LeavePolicy` entity interface with canonical fields: `id: string`, `policyName: string`, `leaveTypeId: string`, `entitlementDays: number`, `accrualRate: number | undefined`, `maxAccumulation: number | undefined`, `minimumNoticeDays: number | undefined`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Also define and export the `LeaveType` entity interface here if not already present in shared-types: `id: string`, `code: string`, `label: string`, `description: string | undefined`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`.

2. `src/modules/leave-policy/leave-policy.repository.ts` — Define and export:
   - `ILeavePolicyRepository` interface: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>`, `findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`
   - `LeavePolicyRepository` class implementing the interface using the pg pool from `src/shared/db/connection.ts`.

3. `src/modules/leave-policy/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/leave-policy/leave-policy.repository.spec.ts`.

## Phase 4: Phase 4: LeaveBalance model and repository

Create the leave-balance module at `src/modules/leave-balance/`. This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts` from Phase 3 — read all three before generating.

Files to create:

1. `src/modules/leave-balance/leave-balance.model.ts` — Define and export the `LeaveBalance` entity interface with canonical fields: `id: string`, `employeeId: string`, `leaveTypeId: string`, `policyId: string`, `totalEntitlement: number`, `usedDays: number`, `pendingDays: number`, `remainingDays: number`, `fiscalYear: number`, `status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN'`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/index.ts`.

2. `src/modules/leave-balance/leave-balance.repository.ts` — Define and export:
   - `ILeaveBalanceRepository` interface: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeAndType(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`, `update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>`, `incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>`, `decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>`
   - `LeaveBalanceRepository` class implementing the interface using the pg pool from `src/shared/db/connection.ts`. The `incrementUsedDays` and `decrementUsedDays` methods must use atomic SQL updates (`UPDATE ... SET used_days = used_days + $1`) and return the updated row.

3. `src/modules/leave-balance/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/leave-balance/leave-balance.repository.spec.ts`.

## Phase 5: Phase 5: LeaveRequest model and repository

Create the leave-request module at `src/modules/leave-request/`. This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts` from Phase 3 — read all three before generating.

Files to create:

1. `src/modules/leave-request/leave-request.model.ts` — Define and export the `LeaveRequest` entity interface with canonical fields: `id: string`, `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `rejectionReason: string | undefined`, `status: LeaveStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `cancelledAt: Date | null`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveStatus` from `src/shared/types/index.ts`.

2. `src/modules/leave-request/leave-request.repository.ts` — Define and export:
   - `ILeaveRequestRepository` interface: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>`, `findByApprover(approvedBy: string): Promise<LeaveRequest[]>`, `findPendingByManager(managerId: string): Promise<LeaveRequest[]>`, `create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`, `updateStatus(id: string, status: LeaveStatus, extra?: { rejectionReason?: string; approvedBy?: string; approvedAt?: Date; cancelledAt?: Date }): Promise<LeaveRequest | null>`
   - `LeaveRequestRepository` class implementing the interface using the pg pool from `src/shared/db/connection.ts`.

3. `src/modules/leave-request/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/leave-request/leave-request.repository.spec.ts`.

## Phase 6: Phase 6: Audit model and repository

Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:

1. `src/modules/audit/audit.model.ts` — Define and export the `AuditRecord` entity interface: `id: string`, `entityType: string`, `entityId: string`, `action: AuditAction`, `performedBy: string`, `details: Record<string, unknown> | null`, `createdAt: Date`. Import `AuditAction` from `src/shared/types/index.ts`.

2. `src/modules/audit/audit.repository.ts` — Define and export:
   - `IAuditRepository` interface: `create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>`, `findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>`, `findByUser(performedBy: string): Promise<AuditRecord[]>`
   - `AuditRepository` class implementing the interface using the pg pool from `src/shared/db/connection.ts`.

3. `src/modules/audit/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/audit/audit.repository.spec.ts`.

## Phase 7: Phase 7: LeavePolicy service

Create the leave-policy service layer. This phase depends on `src/modules/leave-policy/leave-policy.model.ts` and `src/modules/leave-policy/leave-policy.repository.ts` from Phase 3 — read both before generating.

Files to create:

1. `src/modules/leave-policy/leave-policy.service.interface.ts` — Define and export `ILeavePolicyService` interface:
   - `getActivePolicy(leaveTypeId: string): Promise<LeavePolicy | null>`
   - `getPolicyById(id: string): Promise<LeavePolicy | null>`
   - `getAllPolicies(): Promise<LeavePolicy[]>`
   - `createPolicy(data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`
   - `updatePolicy(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`

2. `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class implementing `ILeavePolicyService`. Inject `ILeavePolicyRepository` via constructor. Each method delegates to the repository. The `getActivePolicy` method filters for `isActive: true` and returns the first match.

3. Update `src/modules/leave-policy/index.ts` to also export the service interface and class.

Include Jest unit tests at `tests/unit/modules/leave-policy/leave-policy.service.spec.ts` with mocked repository.

## Phase 8: Phase 8: Employee service

Create the employee service layer. This phase depends on `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2 — read both before generating.

Files to create:

1. `src/modules/employee/employee.service.interface.ts` — Define and export `IEmployeeService` interface:
   - `getEmployeeById(id: string): Promise<Employee | null>`
   - `getEmployeeByNumber(employeeNumber: string): Promise<Employee | null>`
   - `getSubordinates(managerId: string): Promise<Employee[]>`
   - `getAllEmployees(): Promise<Employee[]>`
   - `createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`
   - `updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null>`
   - `terminateEmployee(id: string): Promise<void>`

2. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Inject `IEmployeeRepository` via constructor. The `terminateEmployee` method sets `employmentStatus` to `'TERMINATED'`, sets `terminationDate` to now, and calls `softDelete`.

3. Update `src/modules/employee/index.ts` to also export the service interface and class.

Include Jest unit tests at `tests/unit/modules/employee/employee.service.spec.ts` with mocked repository.

## Phase 9: Phase 9: LeaveBalance service and Notification service

Create two service layers in one phase. This phase depends on:
- `src/modules/leave-balance/leave-balance.model.ts` and `src/modules/leave-balance/leave-balance.repository.ts` from Phase 4
- `src/modules/leave-policy/leave-policy.service.ts` from Phase 7
- `src/shared/types/index.ts` from Phase 1
Read all before generating.

Files to create (approximately 5):

**LeaveBalance service:**
1. `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService`:
   - `getBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>`
   - `getAllBalances(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`
   - `initializeBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance>` — looks up active policy via `ILeavePolicyService`, sets `totalEntitlement` from policy, `usedDays=0`, `pendingDays=0`, `remainingDays=totalEntitlement` (computed), `status='ACTIVE'`
   - `deductDays(employeeId: string, leaveTypeId: string, fiscalYear: number, days: number): Promise<LeaveBalance>` — atomically increments `usedDays`; throws if remaining would go below zero
   - `restoreDays(employeeId: string, leaveTypeId: string, fiscalYear: number, days: number): Promise<LeaveBalance>` — atomically decrements `usedDays`

2. `src/modules/leave-balance/leave-balance.service.ts` — Implement `LeaveBalanceService` class implementing `ILeaveBalanceService`. Inject `ILeaveBalanceRepository` and `ILeavePolicyService` via constructor. The `remainingDays` field must be computed as `totalEntitlement - usedDays` at query time — never stored. `deductDays` must check `totalEntitlement - usedDays - days >= 0` before proceeding.

3. Update `src/modules/leave-balance/index.ts` to export the service.

**Notification service:**
4. `src/modules/notification/notification.service.interface.ts` — Define `INotificationService`:
   - `notifyLeaveSubmitted(request: LeaveRequestDTO): Promise<void>`
   - `notifyLeaveApproved(request: LeaveRequestDTO): Promise<void>`
   - `notifyLeaveRejected(request: LeaveRequestDTO): Promise<void>`
   - `notifyLeaveCancelled(request: LeaveRequestDTO): Promise<void>`

5. `src/modules/notification/notification.service.ts` — Implement `NotificationService` class implementing `INotificationService`. Stub implementation that logs to console (real email/SMS deferred). Import `LeaveRequestDTO` from `src/shared/types/index.ts`.

6. `src/modules/notification/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/leave-balance/leave-balance.service.spec.ts` and `tests/unit/modules/notification/notification.service.spec.ts`.

## Phase 10: Phase 10: LeaveRequest service, controller, routes, and business-day utility

Create the leave-request service, controller, routes, and a shared business-day utility. This phase depends on:
- `src/modules/leave-request/leave-request.model.ts` and `src/modules/leave-request/leave-request.repository.ts` from Phase 5
- `src/modules/audit/audit.model.ts` and `src/modules/audit/audit.repository.ts` from Phase 6
- `src/modules/employee/employee.service.ts` from Phase 8
- `src/modules/leave-balance/leave-balance.service.ts` from Phase 9
- `src/modules/notification/notification.service.ts` from Phase 9
- `src/shared/types/index.ts` from Phase 1
Read all before generating.

Files to create (approximately 5):

1. `src/shared/utils/business-day.ts` — Export a single function `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number` that counts weekdays (Mon–Fri) between two dates inclusive, excluding weekends and the provided holiday dates. Export a constant `DEFAULT_HOLIDAYS: Date[]` as an empty array (placeholder for the future holidays table).

2. `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService`:
   - `submitDraft(requestId: string, employeeId: string): Promise<LeaveRequest>` — transitions DRAFT→SUBMITTED. Validates the request belongs to the employee. Looks up active policy via `ILeavePolicyService`. Computes business days via `countBusinessDays`. Ensures balance exists (initializes if needed via `ILeaveBalanceService.initializeBalance`). Atomically deducts days via `ILeaveBalanceService.deductDays`. If employee has no manager (`managerId === null`), escalates to HR admin role (logs escalation; actual HR routing deferred). Creates audit record. Sends notification.
   - `approveRequest(requestId: string, approverId: string): Promise<LeaveRequest>` — transitions SUBMITTED→APPROVED. Validates approver is the employee's manager or HR admin. Sets `approvedBy`, `approvedAt`. Creates audit. Sends notification.
   - `rejectRequest(requestId: string, approverId: string, rejectionReason: string): Promise<LeaveRequest>` — transitions SUBMITTED→REJECTED. Requires non-empty `rejectionReason`. Validates approver authority. Restores balance days via `ILeaveBalanceService.restoreDays`. Creates audit. Sends notification.
   - `cancelRequest(requestId: string, employeeId: string): Promise<LeaveRequest>` — transitions SUBMITTED/APPROVED→CANCELLED. Validates ownership. Restores balance days if previously deducted. Sets `cancelledAt`. Creates audit. Sends notification.
   - `getRequestById(id: string): Promise<LeaveRequest | null>`
   - `getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]>`
   - `getPendingForManager(managerId: string): Promise<LeaveRequest[]>`

3. `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` class implementing `ILeaveRequestService`. Inject via constructor: `ILeaveRequestRepository`, `ILeaveBalanceService`, `IEmployeeService`, `ILeavePolicyService`, `IAuditRepository`, `INotificationService`. All state-transition methods must validate the current status before proceeding. Use `countBusinessDays` for day calculations. The `remainingDays` check in submit must use the formula `totalEntitlement - usedDays - requestedDays >= 0`.

4. `src/modules/leave-request/leave-request.controller.ts` — Define `LeaveRequestController` class with Fastify-compatible handler methods:
   - `submit(request, reply)` — extracts `requestId` from params, `employeeId` from authenticated user context
   - `approve(request, reply)` — extracts `requestId` from params, `approverId` from auth context
   - `reject(request, reply)` — extracts `requestId` from params, `rejectionReason` from body, `approverId` from auth
   - `cancel(request, reply)` — extracts `requestId` from params, `employeeId` from auth
   - `getById(request, reply)`, `getMyRequests(request, reply)`, `getPendingForManager(request, reply)`
   Each handler validates inputs (GP-003), calls the service, and returns appropriate HTTP status codes.

5. `src/modules/leave-request/leave-request.routes.ts` — Export `leaveRequestRoutes` Fastify plugin function registering all routes under prefix `/api/leave-requests`:
   - `POST /api/leave-requests/:requestId/submit`
   - `POST /api/leave-requests/:requestId/approve`
   - `POST /api/leave-requests/:requestId/reject`
   - `POST /api/leave-requests/:requestId/cancel`
   - `GET /api/leave-requests/:requestId`
   - `GET /api/leave-requests/my`
   - `GET /api/leave-requests/pending`

6. Update `src/modules/leave-request/index.ts` to export all new symbols.

Include Jest unit tests at `tests/unit/modules/leave-request/leave-request.service.spec.ts` and `tests/unit/shared/utils/business-day.spec.ts`.
