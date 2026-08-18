# PLAN.md

## Phase 1: Phase 1 — Shared types & Audit foundation

Create the foundational shared types and the audit module. This phase has no prior dependencies.

**Files to create (approximately 6):**

1. `src/shared/types/index.ts` — Define and export all shared enums and the BaseEntity interface:
   - `LeaveRequestStatus` enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
   - `LeaveType` enum: annual, sick, emergency, unpaid, maternity, paternity
   - `BalanceStatus` enum: ACTIVE, EXHAUSTED, CLOSED
   - `EmploymentStatus` enum: ACTIVE, INACTIVE, TERMINATED
   - `BaseEntity` interface: { id: string; createdAt: Date; updatedAt: Date }

2. `src/modules/audit/audit.model.ts` — Define the `AuditRecord` entity with the exact canonical fields: id: string, entityType: string, entityId: string, action: string, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, performedBy: string, performedAt: Date, ipAddress: string | undefined, userAgent: string | undefined, createdAt: Date. Import BaseEntity from `src/shared/types/index.ts`.

3. `src/modules/audit/audit.repository.interface.ts` — Define `IAuditRepository` interface with methods: `create(record: AuditRecord): Promise<AuditRecord>`, `findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>`. Import AuditRecord from `./audit.model`.

4. `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with method: `record(params: { entityType: string; entityId: string; action: string; oldValues?: Record<string, unknown> | null; newValues?: Record<string, unknown> | null; performedBy: string; ipAddress?: string; userAgent?: string }): Promise<AuditRecord>`.

5. `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. Constructor receives `IAuditRepository` (dependency injection). The `record` method constructs an AuditRecord (generating id with crypto.randomUUID(), setting performedAt to new Date(), createdAt to new Date()) and delegates to the repository's create method.

6. `src/modules/audit/index.ts` — Barrel export re-exporting AuditRecord, IAuditRepository, IAuditService, AuditService.

Include Jest unit tests in `tests/unit/modules/audit/audit.service.test.ts` — mock IAuditRepository, verify record() constructs the record correctly and calls repository.create.

The existing `src/shared/db/connection.ts` exports a pg Pool — the repository interface is defined here but the concrete Knex/Postgres repository implementation is deferred to a later phase.

## Phase 2: Phase 2 — Employee module

Build the Employee module. This phase depends on Phase 1 for `EmploymentStatus` and `BaseEntity` from `src/shared/types/index.ts` — read that file before generating any code.

**Files to create (approximately 6):**

1. `src/modules/employee/employee.model.ts` — Define the `Employee` entity with the exact canonical fields: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string, hireDate: Date, terminationDate: Date | null, employmentStatus: EmploymentStatus, createdAt: Date, updatedAt: Date, deletedAt: Date | null. Import `EmploymentStatus` from `src/shared/types/index.ts`.

2. `src/modules/employee/employee.repository.interface.ts` — Define `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(): Promise<Employee[]>`, `create(employee: Employee): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `softDelete(id: string): Promise<boolean>`. Import Employee from `./employee.model`.

3. `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` interface with methods: `getById(id: string): Promise<Employee | null>`, `getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `getSubordinates(managerId: string): Promise<Employee[]>`, `create(data: CreateEmployeeDto): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `terminate(id: string): Promise<Employee | null>`. Also define `CreateEmployeeDto` here: { employeeNumber: string; firstName: string; lastName: string; email: string; managerId?: string | null; department: string; hireDate: Date }.

4. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Constructor receives `IEmployeeRepository`. Methods: `getById` delegates to repo.findById; `getByEmployeeNumber` delegates to repo.findByEmployeeNumber; `getSubordinates` delegates to repo.findByManagerId; `create` constructs an Employee (generates id via crypto.randomUUID(), sets employmentStatus to ACTIVE, createdAt/updatedAt to new Date(), deletedAt to null) and delegates to repo.create; `update` delegates to repo.update; `terminate` sets employmentStatus to TERMINATED, terminationDate to new Date(), and delegates to repo.update.

5. `src/modules/employee/employee.controller.ts` — Fastify route handler functions (not route registration). Export functions: `getEmployeeById`, `getEmployeeByNumber`, `getSubordinates`, `createEmployee`, `updateEmployee`, `terminateEmployee`. Each receives request/reply, extracts params/body, calls EmployeeService, returns appropriate status codes (200, 201, 404).

6. `src/modules/employee/employee.routes.ts` — Export `employeeRoutes` async function registering all employee endpoints on a FastifyInstance with prefix `/employees`. Wire the controller functions.

7. `src/modules/employee/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/employee/employee.service.test.ts` — mock IEmployeeRepository, test create, getById, getSubordinates, terminate flows.

## Phase 3: Phase 3 — Leave Policy module

Build the Leave Policy module. This phase depends on Phase 1 for `LeaveType` from `src/shared/types/index.ts` — read that file before generating any code.

**Files to create (approximately 5):**

1. `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` entity with the exact canonical fields: id: string, policyName: string, leaveType: LeaveType, entitlementDays: number, accrualRate: number | null, maxAccumulation: number | null, minimumNoticeDays: number | null, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date. Import `LeaveType` from `src/shared/types/index.ts`.

2. `src/modules/leave-policy/leave-policy.repository.interface.ts` — Define `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `findAllActive(): Promise<LeavePolicy[]>`, `create(policy: LeavePolicy): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`. Import LeavePolicy from `./leave-policy.model` and LeaveType from `src/shared/types/index.ts`.

3. `src/modules/leave-policy/leave-policy.service.interface.ts` — Define `ILeavePolicyService` interface with methods: `getById(id: string): Promise<LeavePolicy | null>`, `getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `getActivePolicies(): Promise<LeavePolicy[]>`, `create(data: CreateLeavePolicyDto): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`. Also define `CreateLeavePolicyDto`: { policyName: string; leaveType: LeaveType; entitlementDays: number; accrualRate?: number | null; maxAccumulation?: number | null; minimumNoticeDays?: number | null; requiresManagerApproval: boolean }.

4. `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class implementing `ILeavePolicyService`. Constructor receives `ILeavePolicyRepository`. `create` constructs a LeavePolicy (generates id via crypto.randomUUID(), sets isActive to true, createdAt/updatedAt to new Date()) and delegates to repo.create. Other methods delegate to corresponding repo methods.

5. `src/modules/leave-policy/leave-policy.routes.ts` — Export `leavePolicyRoutes` async function registering endpoints on a FastifyInstance with prefix `/leave-policies`: GET `/` (all active), GET `/:id`, GET `/type/:leaveType`, POST `/` (create), PUT `/:id` (update). Inline controller logic — no separate controller file.

6. `src/modules/leave-policy/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.service.test.ts` — mock ILeavePolicyRepository, test create and getActivePolicies flows.

## Phase 4: Phase 4 — Leave Balance module

Build the Leave Balance module. This phase depends on Phase 1 for `BalanceStatus` from `src/shared/types/index.ts` and Phase 3 for `LeavePolicy` from `src/modules/leave-policy/leave-policy.model.ts` — read both files before generating any code.

**Files to create (approximately 5):**

1. `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` entity with the exact canonical fields: id: string, employeeId: string, leavePolicyId: string, totalEntitlement: number, usedDays: number, remainingDays: number, fiscalYear: number, status: BalanceStatus, createdAt: Date, updatedAt: Date. Import `BalanceStatus` from `src/shared/types/index.ts`.

2. `src/modules/leave-balance/leave-balance.repository.interface.ts` — Define `ILeaveBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>`, `findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `create(balance: LeaveBalance): Promise<LeaveBalance>`, `update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>`. Import LeaveBalance from `./leave-balance.model`.

3. `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService` interface with methods: `getByEmployeeId(employeeId: string): Promise<LeaveBalance[]>`, `getByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `initializeBalance(employeeId: string, policyId: string, fiscalYear: number, totalEntitlement: number): Promise<LeaveBalance>`, `deductDays(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>`, `hasSufficientBalance(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<boolean>`. Note: the interface uses `policyId` parameter names as declared in the architecture's Module Boundaries.

4. `src/modules/leave-balance/leave-balance.service.ts` — Implement `LeaveBalanceService` class implementing `ILeaveBalanceService`. Constructor receives `ILeaveBalanceRepository`. Key logic:
   - `initializeBalance`: constructs a LeaveBalance (id via crypto.randomUUID(), usedDays=0, remainingDays=totalEntitlement, status=ACTIVE, createdAt/updatedAt=new Date()) and delegates to repo.create.
   - `deductDays`: fetches balance via repo.findByEmployeeAndPolicy, validates it exists and status is ACTIVE, computes new usedDays = usedDays + days, new remainingDays = totalEntitlement - new usedDays (BINDING: remaining_days = total_entitlement - used_days exactly), sets status to EXHAUSTED if remainingDays <= 0, updates via repo.update.
   - `hasSufficientBalance`: fetches balance, returns remainingDays >= days.
   - `getByEmployeeId` and `getByEmployeeAndPolicy`: delegate to repo.

5. `src/modules/leave-balance/leave-balance.routes.ts` — Export `leaveBalanceRoutes` async function registering endpoints on a FastifyInstance with prefix `/leave-balances`: GET `/employee/:employeeId`, GET `/employee/:employeeId/policy/:policyId/fiscal/:fiscalYear`, POST `/` (initialize). Inline controller logic.

6. `src/modules/leave-balance/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.service.test.ts` — mock ILeaveBalanceRepository, test initializeBalance, deductDays (including EXHAUSTED transition), hasSufficientBalance.

## Phase 5: Phase 5 — Leave Request module (core workflow)

Build the Leave Request module — the core workflow orchestrating employees, policies, balances, and audit. This phase depends on ALL prior phases. Read these files before generating any code:
- `src/shared/types/index.ts` (Phase 1) — for LeaveRequestStatus, BaseEntity
- `src/modules/employee/employee.model.ts` (Phase 2) — for Employee type
- `src/modules/employee/employee.repository.interface.ts` (Phase 2) — for IEmployeeRepository
- `src/modules/leave-policy/leave-policy.model.ts` (Phase 3) — for LeavePolicy type
- `src/modules/leave-policy/leave-policy.repository.interface.ts` (Phase 3) — for ILeavePolicyRepository
- `src/modules/leave-balance/leave-balance.model.ts` (Phase 4) — for LeaveBalance type
- `src/modules/leave-balance/leave-balance.repository.interface.ts` (Phase 4) — for ILeaveBalanceRepository
- `src/modules/audit/audit.service.interface.ts` (Phase 1) — for IAuditService

**Files to create (approximately 8):**

1. `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` entity with the exact canonical fields: id: string, employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveRequestStatus, approvedBy: string | null, approvedAt: Date | null, createdAt: Date, updatedAt: Date. Import `LeaveRequestStatus` from `src/shared/types/index.ts`.

2. `src/modules/leave-request/leave-request.repository.interface.ts` — Define `ILeaveRequestRepository` with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`, `create(request: LeaveRequest): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`. Import LeaveRequest from `./leave-request.model` and LeaveRequestStatus from `src/shared/types/index.ts`.

3. `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService` and DTOs:
   - `CreateLeaveRequestDto`: { employeeId: string; leavePolicyId: string; startDate: Date; endDate: Date; reason?: string }
   - `UpdateLeaveRequestDto`: { startDate?: Date; endDate?: Date; reason?: string }
   - `LeaveRequestQueryParams`: { employeeId?: string; status?: LeaveRequestStatus; startDate?: Date; endDate?: Date }
   - Service methods: `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `submit(id: string): Promise<LeaveRequest>`, `approve(id: string, approverId: string): Promise<LeaveRequest>`, `reject(id: string, approverId: string): Promise<LeaveRequest>`, `cancel(id: string, employeeId: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest | null>`, `getByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>`.

4. `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` implementing `ILeaveRequestService`. Constructor receives `ILeaveRequestRepository`, `IEmployeeRepository`, `ILeavePolicyRepository`, `ILeaveBalanceRepository`, `IAuditService` (all injected). BINDING business rules:
   - **Day counting**: `daysRequested = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1` — inclusive calendar days for ALL leave types.
   - **Fiscal year**: `new Date().getFullYear()` — hardcoded calendar year.
   - **Emergency leave**: ALWAYS requires manager approval — no auto-approval path; the policy's `requiresManagerApproval` flag governs uniformly.
   - **Balances**: integers only (full-day granularity); `remainingDays = totalEntitlement - usedDays` exactly.
   - `create()`: validates employee exists and is ACTIVE; validates policy exists and isActive; computes daysRequested; checks minimumNoticeDays (if set, startDate must be >= now + minimumNoticeDays days); checks for overlapping leave requests via repo.findOverlapping; checks balance sufficiency via ILeaveBalanceRepository; sets status to SUBMITTED if policy.requiresManagerApproval is true, otherwise APPROVED (and auto-deducts balance); creates request; audits the action.
   - `submit()`: validates request exists and status is DRAFT; transitions to SUBMITTED; audits.
   - `approve()`: validates request exists and status is SUBMITTED; validates approverId matches the employee's managerId (fetch employee via IEmployeeRepository); sets status to APPROVED, approvedBy=approverId, approvedAt=new Date(); deducts days from balance via ILeaveBalanceRepository; audits.
   - `reject()`: validates request exists and status is SUBMITTED; validates approverId matches the employee's managerId; sets status to REJECTED; audits.
   - `cancel()`: validates request exists, status is DRAFT or SUBMITTED, and employeeId matches request.employeeId; sets status to CANCELLED; audits.

5. `src/modules/leave-request/leave-request.controller.ts` — Fastify route handler functions: `createLeaveRequest`, `submitLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`, `cancelLeaveRequest`, `getLeaveRequestById`, `getLeaveRequestsByEmployee`, `queryLeaveRequests`. Each extracts params/body/query from request, calls service, returns appropriate status codes.

6. `src/modules/leave-request/leave-request.routes.ts` — Export `leaveRequestRoutes` async function registering endpoints on FastifyInstance with prefix `/leave-requests`: POST `/` (create), POST `/:id/submit`, POST `/:id/approve`, POST `/:id/reject`, POST `/:id/cancel`, GET `/:id`, GET `/employee/:employeeId`, GET `/` (query with query string params).

7. `src/modules/leave-request/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.service.test.ts` — mock all injected dependencies, test: create with manager approval required (status=SUBMITTED), create without manager approval (status=APPROVED + balance deducted), create with insufficient balance (throws), create with overlapping dates (throws), approve by non-manager (throws), approve by manager (success + balance deducted), reject, cancel, submit from DRAFT.
