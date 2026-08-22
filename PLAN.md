# PLAN.md

## Phase 1: Phase 1: Shared types and foundational modules (part 1/2)

Create the models and interfaces layer for the foundational modules. This phase produces ONLY type definitions and interfaces — no concrete implementations.

Files to create:

1. `src/shared/types/index.ts` — Define and export three enums exactly as specified:
   - `LeaveType` enum: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
   - `LeaveStatus` enum: `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
   - `AuditAction` enum: `'CREATE' | 'SUBMIT' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CANCEL'`

2. `src/modules/employee/employee.model.ts` — Define and export the `Employee` entity interface with these exact fields: `id: string`, `fullName: string`, `email: string`, `department: string`, `managerId: string | null`, `createdAt: Date`, `updatedAt: Date`.

3. `src/modules/employee/employee.repository.interface.ts` — Define and export `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByDepartment(department: string): Promise<Employee[]>`. Import `Employee` from `./employee.model`.

4. `src/modules/employee/employee.service.interface.ts` — Define and export `IEmployeeService` interface with methods: `getEmployeeById(id: string): Promise<Employee | null>`, `getEmployeeByEmail(email: string): Promise<Employee | null>`. Import `Employee` from `./employee.model`.

5. `src/modules/audit/audit.model.ts` — Define and export the `AuditRecord` entity interface with these exact fields: `id: string`, `entityType: string`, `entityId: string`, `action: AuditAction`, `performedBy: string`, `changes: Record<string, unknown> | null`, `createdAt: Date`. Import `AuditAction` from `../../shared/types`.

6. `src/modules/audit/audit.service.interface.ts` — Define and export `IAuditService` interface with method: `record(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>`. Import `AuditRecord` from `./audit.model`.

No barrel exports (index.ts) in this phase — those come in part 2 with the implementations. No tests in this phase. All files must pass `tsc --noEmit`.

## Phase 2: Phase 1: Shared types and foundational modules (part 2/2)

Create the concrete implementations and barrel exports for the employee and audit modules. This phase depends on the models/interfaces from part 1.

Files to create:

1. `src/modules/employee/employee.repository.ts` — Implement `EmployeeRepository` class implementing `IEmployeeRepository`. Uses the shared `pool` from `src/shared/db/connection.ts` for PostgreSQL queries. Methods: `findById`, `findByEmail`, `findByDepartment`. Import `IEmployeeRepository` from `./employee.repository.interface` and `Employee` from `./employee.model`.

2. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Constructor takes `IEmployeeRepository`. Methods delegate to repository. Import `IEmployeeService` from `./employee.service.interface`, `IEmployeeRepository` from `./employee.repository.interface`, `Employee` from `./employee.model`.

3. `src/modules/employee/index.ts` — Barrel export: `Employee`, `IEmployeeRepository`, `EmployeeRepository`, `IEmployeeService`, `EmployeeService`.

4. `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. Constructor takes the shared `pool` from `src/shared/db/connection.ts`. The `record` method inserts into an `audit_records` table and returns the created `AuditRecord`. Import `IAuditService` from `./audit.service.interface`, `AuditRecord` from `./audit.model`, `AuditAction` from `../../shared/types`.

5. `src/modules/audit/index.ts` — Barrel export: `AuditRecord`, `IAuditService`, `AuditService`.

6. `src/shared/types/index.ts` — Update the barrel to also re-export `AuditAction` (already defined in part 1; ensure it's exported).

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts` and `tests/unit/modules/audit/audit.service.test.ts`. Mock the pg pool. All files must pass `tsc --noEmit` and `npx jest`.

## Phase 3: Phase 2: Leave policy module

Build the complete leave-policy module (~8 files). This phase depends on `src/shared/types/index.ts` from Phase 1 for the `LeaveType` enum.

Files to create:

1. `src/modules/leave-policy/leave-policy.model.ts` — Define and export the `LeavePolicy` entity interface with exact fields: `id: string`, `policyName: string`, `leaveTypeId: string`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeavePolicyDto` and `UpdateLeavePolicyDto` types.

2. `src/modules/leave-policy/leave-policy.repository.interface.ts` — Define `ILeavePolicyRepository` with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>`, `update(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy | null>`. Import `LeavePolicy`, `CreateLeavePolicyDto`, `UpdateLeavePolicyDto` from `./leave-policy.model`.

3. `src/modules/leave-policy/leave-type.repository.interface.ts` — Define `ILeaveTypeRepository` with method: `findAll(): Promise<LeaveType[]>`. Import `LeaveType` from `../../shared/types`.

4. `src/modules/leave-policy/leave-policy.repository.ts` — Implement `PgLeavePolicyRepository` implementing `ILeavePolicyRepository`. Uses the shared `pool` from `src/shared/db/connection.ts`. All methods query the `leave_policies` table.

5. `src/modules/leave-policy/leave-type.repository.ts` — Implement `PgLeaveTypeRepository` implementing `ILeaveTypeRepository`. Returns the canonical `LeaveType` enum values as records.

6. `src/modules/leave-policy/leave-policy.service.interface.ts` — Define `ILeavePolicyService` with methods: `getPolicy(id: string): Promise<LeavePolicy | null>`, `getPolicyByLeaveType(leaveTypeId: string): Promise<LeavePolicy | null>`, `getAllPolicies(): Promise<LeavePolicy[]>`, `createPolicy(dto: CreateLeavePolicyDto): Promise<LeavePolicy>`, `updatePolicy(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy | null>`, `getAllLeaveTypes(): Promise<LeaveType[]>`.

7. `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` implementing `ILeavePolicyService`. Constructor takes `ILeavePolicyRepository` and `ILeaveTypeRepository`. Delegates to repositories.

8. `src/modules/leave-policy/index.ts` — Barrel export all public symbols.

Include Jest unit tests in `tests/unit/modules/leave-policy/`. Mock the pg pool. All files must pass `tsc --noEmit` and `npx jest`.

## Phase 4: Phase 3: Leave balance module

Build the complete leave-balance module (~6 files). This phase depends on `src/shared/types/index.ts` (Phase 1) for `LeaveType` and `src/modules/leave-policy/` (Phase 2) for `LeavePolicy` and `ILeavePolicyRepository`.

Files to create:

1. `src/modules/leave-balance/leave-balance.model.ts` — Define and export the `LeaveBalance` entity interface with exact fields: `id: string`, `employeeId: string`, `leaveTypeId: string`, `policyId: string`, `totalEntitlement: number`, `usedDays: number`, `remainingDays: number`, `fiscalYear: number`, `status: string`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveBalanceDto` and `UpdateLeaveBalanceDto`.

2. `src/modules/leave-balance/leave-balance.repository.interface.ts` — Define `ILeaveBalanceRepository` with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeAndLeaveType(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `findByEmployee(employeeId: string): Promise<LeaveBalance[]>`, `create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>`, `update(id: string, dto: UpdateLeaveBalanceDto): Promise<LeaveBalance | null>`. Import `LeaveBalance`, `CreateLeaveBalanceDto`, `UpdateLeaveBalanceDto` from `./leave-balance.model`.

3. `src/modules/leave-balance/leave-balance.repository.ts` — Implement `PgLeaveBalanceRepository` implementing `ILeaveBalanceRepository`. Uses the shared `pool` from `src/shared/db/connection.ts`. All methods query the `leave_balances` table.

4. `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService` with methods: `getBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `getAllBalances(employeeId: string): Promise<LeaveBalance[]>`, `initializeBalance(employeeId: string, leaveTypeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance>`, `deductDays(id: string, days: number): Promise<LeaveBalance>`, `restoreDays(id: string, days: number): Promise<LeaveBalance>`.

5. `src/modules/leave-balance/leave-balance.service.ts` — Implement `LeaveBalanceService` implementing `ILeaveBalanceService`. Constructor takes `ILeaveBalanceRepository` and `ILeavePolicyRepository` (imported from `../leave-policy`). The `initializeBalance` method looks up the policy to get `entitlementDays` and creates a balance record with `totalEntitlement = entitlementDays`, `usedDays = 0`, `remainingDays = entitlementDays`. `deductDays` atomically increments `usedDays` and decrements `remainingDays`. `restoreDays` does the reverse.

6. `src/modules/leave-balance/index.ts` — Barrel export all public symbols.

Include Jest unit tests in `tests/unit/modules/leave-balance/`. Mock the pg pool and policy repository. All files must pass `tsc --noEmit` and `npx jest`.

## Phase 5: Phase 4: Leave request module (part 1/2)

Create the models, interfaces, and shared helper for the leave-request module. This is the type/interface layer only — no concrete implementations. Depends on `src/shared/types/index.ts` (Phase 1) for `LeaveStatus` and `LeaveType`, `src/modules/leave-policy/` (Phase 2) for `LeavePolicy`, and `src/modules/leave-balance/` (Phase 3) for `LeaveBalance`.

Files to create:

1. `src/modules/leave-request/leave-request.model.ts` — Define and export the `LeaveRequest` entity interface with exact fields: `id: string`, `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveRequestDto` (fields: `employeeId`, `leaveTypeId`, `startDate`, `endDate`, `reason?`), `UpdateLeaveRequestDto` (partial of create fields plus `status?`), and `LeaveRequestQueryParams` (optional filters: `employeeId?`, `status?`, `leaveTypeId?`). Import `LeaveStatus` from `../../shared/types`.

2. `src/modules/leave-request/leave-request.helper.ts` — Define and export the SINGLE shared helper `countLeaveDays(startDate: Date, endDate: Date): number`. Implementation: `endDate - startDate + 1` (calendar days, inclusive of both ends, per binding rule Q1/Q5). This is the canonical day-count function; every call site in the service MUST use it — no inline re-derivation.

3. `src/modules/leave-request/leave-request.repository.interface.ts` — Define `ILeaveRequestRepository` with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`, `findApprovedOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<LeaveRequest[]>`, `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null>`. Import `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`, `LeaveRequestQueryParams` from `./leave-request.model`.

4. `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService` with methods: `createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `submit(id: string): Promise<LeaveRequest>`, `approve(id: string, approverId: string): Promise<LeaveRequest>`, `reject(id: string, approverId: string): Promise<LeaveRequest>`, `cancel(id: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest | null>`, `getByEmployee(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`. Import `LeaveRequest`, `CreateLeaveRequestDto`, `LeaveRequestQueryParams` from `./leave-request.model`.

No barrel export, no tests in this phase. All files must pass `tsc --noEmit`.

## Phase 6: Phase 4: Leave request module (part 2/2)

Create the concrete implementations, barrel exports, and tests for the leave-request module. This phase depends on ALL prior phases — read these files before generating any code:

- `src/shared/types/index.ts` (Phase 1) — `LeaveStatus`, `LeaveType`, `AuditAction`
- `src/modules/employee/index.ts` (Phase 1) — `IEmployeeRepository`, `Employee`
- `src/modules/audit/index.ts` (Phase 1) — `IAuditService`, `AuditRecord`
- `src/modules/leave-policy/index.ts` (Phase 2) — `ILeavePolicyRepository`, `LeavePolicy`
- `src/modules/leave-balance/index.ts` (Phase 3) — `ILeaveBalanceRepository`, `ILeaveBalanceService`, `LeaveBalance`
- `src/modules/leave-request/leave-request.model.ts` (Phase 4 part 1) — `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`, `LeaveRequestQueryParams`
- `src/modules/leave-request/leave-request.helper.ts` (Phase 4 part 1) — `countLeaveDays`
- `src/modules/leave-request/leave-request.repository.interface.ts` (Phase 4 part 1) — `ILeaveRequestRepository`
- `src/modules/leave-request/leave-request.service.interface.ts` (Phase 4 part 1) — `ILeaveRequestService`

Files to create:

1. `src/modules/leave-request/leave-request.repository.ts` — Implement `PgLeaveRequestRepository` implementing `ILeaveRequestRepository`. Uses the shared `pool` from `src/shared/db/connection.ts`. The `findApprovedOverlapping` method must query for APPROVED requests for the given employee where the date ranges intersect: `startDate <= :endDate AND endDate >= :startDate`. Exclude the optional `excludeId` (used when updating an existing request).

2. `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` implementing `ILeaveRequestService`. Constructor takes: `ILeaveRequestRepository`, `ILeaveBalanceRepository`, `ILeavePolicyRepository`, `IEmployeeRepository`, `IAuditService`.

BUSINESS RULES (BINDING — implement exactly as specified):

- `createDraft`: Creates a LeaveRequest with `status = DRAFT`. No validation beyond field presence.
- `submit`: Changes status from DRAFT → SUBMITTED. Records audit action SUBMIT.
- `approve`: 
  a. Load the request and the associated LeavePolicy (via leaveTypeId).
  b. Call `countLeaveDays(startDate, endDate)` from the helper — NEVER inline the calculation.
  c. Check for overlapping APPROVED requests via `findApprovedOverlapping`. If overlap exists, throw error.
  d. Load the LeaveBalance for this employee+leaveTypeId+fiscalYear. If none exists, throw error.
  e. Check `remainingDays >= countedDays`. If insufficient, throw error.
  f. Update status to APPROVED, set `approvedBy` and `approvedAt`.
  g. Call `ILeaveBalanceService.deductDays` (or directly use `ILeaveBalanceRepository.update`) to deduct the counted days.
  h. Record audit action APPROVE.
- `reject`: Changes status from SUBMITTED → REJECTED. Sets `approvedBy`. Records audit action REJECT.
- `cancel`: Changes status from SUBMITTED or APPROVED → CANCELLED. If the request was APPROVED, restore the days to the balance using `countLeaveDays`. Records audit action CANCEL.

3. `src/modules/leave-request/index.ts` — Barrel export all public symbols: `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`, `LeaveRequestQueryParams`, `countLeaveDays`, `ILeaveRequestRepository`, `PgLeaveRequestRepository`, `ILeaveRequestService`, `LeaveRequestService`.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.service.test.ts` covering: createDraft, submit, approve (success, insufficient balance, overlapping), reject, cancel (from SUBMITTED, from APPROVED with balance restoration). Mock all injected dependencies. All files must pass `tsc --noEmit` and `npx jest`.
