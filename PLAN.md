# PLAN.md

## Phase 1: Phase 1: Shared types + Employee module (~5 files)

Create the shared types and the employee module together.

**Files to create:**

1. `src/shared/types/index.ts` — Define and export ALL shared types in one barrel file:
   - `LeaveType` enum: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
   - `LeaveStatus` enum: `DRAFT | PENDING | APPROVED | REJECTED | CANCELLED` (NOTE: the binding rules use PENDING, not SUBMITTED — this is authoritative)
   - `BaseEntity` interface: `{ id: string; createdAt: Date; updatedAt: Date }`
   - `UserRole` enum: `employee | manager | hr_admin`

2. `src/modules/employee/employee.model.ts` — Define the `Employee` entity interface with the EXACT canonical fields: `id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string | null, hireDate: Date, terminationDate: Date | null, employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED', createdAt: Date, updatedAt: Date, deletedAt: Date | null`. Import `BaseEntity` from `../../shared/types/index.ts`.

3. `src/modules/employee/employee.repository.interface.ts` — Define `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee>`, `softDelete(id: string): Promise<void>`. Import `Employee` from `./employee.model`.

4. `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` interface with methods: `getById(id: string): Promise<Employee | null>`, `getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `getSubordinates(managerId: string): Promise<Employee[]>`, `isActive(id: string): Promise<boolean>`. Import `Employee` from `./employee.model`.

5. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Constructor takes `IEmployeeRepository`. All methods delegate to the repository. `isActive` checks `employmentStatus === 'ACTIVE'` and `deletedAt === null`. Import from `./employee.model`, `./employee.repository.interface`, `./employee.service.interface`.

**Tests:** Include Jest unit tests at `tests/unit/modules/employee/employee.service.spec.ts` mocking the repository.

**Dependencies:** None — this is the first phase. The existing `src/shared/db/connection.ts` is available for reference but not modified.

## Phase 2: Phase 2: Policy module (~5 files)

Create the policy module — model, repository interface, service interface, and service implementation.

**This phase depends on:** `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references `LeaveType`.

**Files to create:**

1. `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` entity interface with the EXACT canonical fields: `id: string, policyName: string, leaveType: LeaveType, entitlementDays: number, accrualRate: number | undefined, maxAccumulation: number | undefined, minimumNoticeDays: number | undefined, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date`. Import `LeaveType` from `../../shared/types/index.ts`. Also import `BaseEntity` from `../../shared/types/index.ts` and extend it.

2. `src/modules/policy/policy.repository.interface.ts` — Define `IPolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `findActive(): Promise<LeavePolicy[]>`, `findActiveByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy>`. Import `LeavePolicy` from `./policy.model` and `LeaveType` from `../../shared/types/index.ts`.

3. `src/modules/policy/policy.service.interface.ts` — Define `IPolicyService` interface with methods: `getById(id: string): Promise<LeavePolicy | null>`, `getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>` (returns the active policy for that type), `getAllActive(): Promise<LeavePolicy[]>`, `validatePolicyExists(policyId: string): Promise<LeavePolicy>` (throws if not found/inactive). Import `LeavePolicy` from `./policy.model` and `LeaveType` from `../../shared/types/index.ts`.

4. `src/modules/policy/policy.service.ts` — Implement `PolicyService` class implementing `IPolicyService`. Constructor takes `IPolicyRepository`. `getByLeaveType` delegates to `findActiveByLeaveType`. `validatePolicyExists` fetches by id and throws an Error if null or `isActive === false`. Import from `./policy.model`, `./policy.repository.interface`, `./policy.service.interface`.

5. `src/modules/policy/index.ts` — Barrel file re-exporting `LeavePolicy`, `IPolicyRepository`, `IPolicyService`, `PolicyService`.

**Tests:** Include Jest unit tests at `tests/unit/modules/policy/policy.service.spec.ts` mocking the repository.

**Binding rules note:** The `minimumNoticeDays` field on `LeavePolicy` will be used later by the leave module for notice-period enforcement. The `entitlementDays` field drives balance creation.

## Phase 3: Phase 3: Balance module (~5 files)

Create the balance module — model, repository interface, service interface, and service implementation.

**This phase depends on:**
- `src/shared/types/index.ts` from Phase 1 — for `LeaveType`
- `src/modules/policy/policy.model.ts` from Phase 2 — for `LeavePolicy`
- `src/modules/employee/employee.model.ts` from Phase 1 — for `Employee`

Read all three before generating any code.

**Files to create:**

1. `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` entity interface with the EXACT canonical fields: `id: string, employeeId: string, policyId: string, entitlementDays: number, usedDays: number, pendingDays: number, year: number, status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED', createdAt: Date, updatedAt: Date`. Import `BaseEntity` from `../../shared/types/index.ts`.

   **CRITICAL — BINDING RULES:** The balance has THREE counters: `entitlementDays`, `usedDays`, `pendingDays`. There is NO `remainingDays` column — it is always derived as `entitlementDays - usedDays - pendingDays`. The year is a plain integer (e.g. 2026) representing the calendar year. No fiscal-year logic.

2. `src/modules/balance/balance.repository.interface.ts` — Define `IBalanceRepository` interface with methods:
   - `findById(id: string): Promise<LeaveBalance | null>`
   - `findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>`
   - `findByEmployeePolicyAndYear(employeeId: string, policyId: string, year: number): Promise<LeaveBalance | null>`
   - `create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`
   - `updateCounters(id: string, usedDays: number, pendingDays: number): Promise<LeaveBalance>` — atomic counter update
   - `getOrCreateForYear(employeeId: string, policyId: string, year: number, entitlementDays: number): Promise<LeaveBalance>`

   Import `LeaveBalance` from `./balance.model`.

3. `src/modules/balance/balance.service.interface.ts` — Define `IBalanceService` interface with methods:
   - `getAvailableDays(employeeId: string, policyId: string, year: number): Promise<number>` — derived: `entitlementDays - usedDays - pendingDays`
   - `hasSufficientBalance(employeeId: string, policyId: string, year: number, requestedDays: number): Promise<boolean>`
   - `reserveDays(employeeId: string, policyId: string, year: number, days: number): Promise<void>` — SUBMIT: `pendingDays += days`
   - `commitDays(employeeId: string, policyId: string, year: number, days: number): Promise<void>` — APPROVE: `pendingDays -= days, usedDays += days`
   - `releaseDays(employeeId: string, policyId: string, year: number, days: number): Promise<void>` — REJECT/CANCEL PENDING: `pendingDays -= days`
   - `restoreDays(employeeId: string, policyId: string, year: number, days: number): Promise<void>` — CANCEL APPROVED: `usedDays -= days`
   - `getOrCreateBalance(employeeId: string, policyId: string, year: number, entitlementDays: number): Promise<LeaveBalance>`

   Import `LeaveBalance` from `./balance.model`.

4. `src/modules/balance/balance.service.ts` — Implement `BalanceService` class implementing `IBalanceService`. Constructor takes `IBalanceRepository`.

   **BINDING RULES implemented here:**
   - `getAvailableDays` computes `entitlementDays - usedDays - pendingDays` — never reads a stored `remainingDays`.
   - `reserveDays`: fetches balance, validates `pendingDays + days <= entitlementDays - usedDays`, then calls `updateCounters` with `pendingDays + days`.
   - `commitDays`: fetches balance, validates `pendingDays >= days`, calls `updateCounters` with `pendingDays - days, usedDays + days`.
   - `releaseDays`: fetches balance, validates `pendingDays >= days`, calls `updateCounters` with `pendingDays - days`.
   - `restoreDays`: fetches balance, validates `usedDays >= days`, calls `updateCounters` with `usedDays - days`.
   - No counter may go negative — throw an Error if a transition would cause that.
   - `getOrCreateBalance`: delegates to repository's `getOrCreateForYear`.

   Import from `./balance.model`, `./balance.repository.interface`, `./balance.service.interface`.

5. `src/modules/balance/index.ts` — Barrel file re-exporting `LeaveBalance`, `IBalanceRepository`, `IBalanceService`, `BalanceService`.

**Tests:** Include Jest unit tests at `tests/unit/modules/balance/balance.service.spec.ts` mocking the repository. Test all counter transitions and the negative-guard.

## Phase 4: Phase 4: Audit module (~4 files)

Create the audit module — model, repository interface, service interface, and service implementation.

**This phase depends on:**
- `src/shared/types/index.ts` from Phase 1 — for `BaseEntity`

Read it before generating any code.

**Files to create:**

1. `src/modules/audit/audit.model.ts` — Define:
   - `AuditAction` enum: `CREATE | UPDATE | DELETE | APPROVE | REJECT`
   - `AuditRecord` entity interface with the EXACT canonical fields: `id: string, entityType: string, entityId: string, action: AuditAction, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, performedBy: string, performedAt: Date, createdAt: Date`. Import `BaseEntity` from `../../shared/types/index.ts`.

2. `src/modules/audit/audit.repository.interface.ts` — Define `IAuditRepository` interface with methods:
   - `create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>`
   - `findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>`
   - `findByPerformer(performedBy: string, limit?: number): Promise<AuditRecord[]>`
   - `findByDateRange(startDate: Date, endDate: Date): Promise<AuditRecord[]>`

   Import `AuditRecord` from `./audit.model`.

3. `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with methods:
   - `log(record: Omit<AuditRecord, 'id' | 'createdAt' | 'performedAt'>): Promise<AuditRecord>` — sets `performedAt` to `new Date()` automatically
   - `getHistory(entityType: string, entityId: string): Promise<AuditRecord[]>`

   Import `AuditRecord` from `./audit.model`.

4. `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. Constructor takes `IAuditRepository`. The `log` method sets `performedAt: new Date()` and delegates to `repository.create`. Import from `./audit.model`, `./audit.repository.interface`, `./audit.service.interface`.

**Tests:** Include Jest unit tests at `tests/unit/modules/audit/audit.service.spec.ts` mocking the repository.

**Note:** No barrel `index.ts` is created in this phase — the leave module (Phase 5) will import directly from the individual files. The audit module is consumed only by the leave service for logging state transitions.

## Phase 5: Phase 5: Leave module (core) (~5 files)

Create the leave module — model (with DTOs + day-count helper), repository interface, service interface, service implementation, and routes.

**This phase depends on ALL prior phases. Read these files before generating any code:**
- `src/shared/types/index.ts` from Phase 1 — for `LeaveStatus`, `LeaveType`, `BaseEntity`
- `src/modules/employee/employee.model.ts` from Phase 1 — for `Employee`
- `src/modules/policy/policy.model.ts` from Phase 2 — for `LeavePolicy`
- `src/modules/balance/balance.model.ts` from Phase 3 — for `LeaveBalance`
- `src/modules/balance/balance.repository.interface.ts` from Phase 3 — for `IBalanceRepository`
- `src/modules/balance/balance.service.interface.ts` from Phase 3 — for `IBalanceService`
- `src/modules/audit/audit.model.ts` from Phase 4 — for `AuditRecord`, `AuditAction`
- `src/modules/audit/audit.repository.interface.ts` from Phase 4 — for `IAuditRepository`
- `src/modules/audit/audit.service.interface.ts` from Phase 4 — for `IAuditService`

**Files to create:**

1. `src/modules/leave/leave.model.ts` — Define:
   - `LeaveRequest` entity interface with EXACT canonical fields: `id: string, employeeId: string, policyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveStatus, approvedBy: string | null, approvedAt: Date | null, createdAt: Date, updatedAt: Date`. Import `LeaveStatus` from `../../shared/types/index.ts` and `BaseEntity` from `../../shared/types/index.ts`.
   - `CreateLeaveRequestDto`: `employeeId: string, policyId: string, startDate: Date, endDate: Date, reason?: string`
   - `UpdateLeaveRequestDto`: `startDate?: Date, endDate?: Date, reason?: string`
   - `LeaveRequestQueryParams`: `employeeId?: string, status?: LeaveStatus, startDate?: Date, endDate?: Date`
   - **`countLeaveDays(startDate: Date, endDate: Date): number`** — BINDING RULE #6: exported helper computing `endDate - startDate + 1` (inclusive, calendar days, no weekend/holiday exclusion). This is the SINGLE canonical day-count function; every call site in the service MUST use it.

2. `src/modules/leave/leave.repository.interface.ts` — Define `ILeaveRequestRepository` interface with methods:
   - `findById(id: string): Promise<LeaveRequest | null>`
   - `findByEmployee(employeeId: string, queryParams?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`
   - `findApprovedOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeRequestId?: string): Promise<LeaveRequest[]>` — for overlap detection at approval time
   - `create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`
   - `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest>`
   - `updateStatus(id: string, status: LeaveStatus, approvedBy?: string | null, approvedAt?: Date | null): Promise<LeaveRequest>`
   Import `LeaveRequest`, `LeaveRequestQueryParams` from `./leave.model`, `LeaveStatus` from `../../shared/types/index.ts`.

3. `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods:
   - `submit(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — creates DRAFT→PENDING, reserves days, audits
   - `approve(requestId: string, approverId: string): Promise<LeaveRequest>` — PENDING→APPROVED with overlap check + balance sufficiency, commits days, audits
   - `reject(requestId: string, rejectorId: string): Promise<LeaveRequest>` — PENDING→REJECTED, releases days, audits
   - `cancel(requestId: string, employeeId: string): Promise<LeaveRequest>` — PENDING→CANCELLED (releases) or APPROVED→CANCELLED (restores), audits
   - `getById(requestId: string): Promise<LeaveRequest | null>`
   - `query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>`
   Import `LeaveRequest`, `CreateLeaveRequestDto`, `LeaveRequestQueryParams` from `./leave.model`.

4. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor takes: `ILeaveRequestRepository`, `IBalanceRepository`, `IAuditRepository`, `IPolicyRepository`.

   **BINDING RULES implemented in this file:**

   **`submit`:** Validate `startDate < endDate`. Compute `days = countLeaveDays(startDate, endDate)`. Determine `year = startDate.getFullYear()`. Look up active policy via `IPolicyRepository.findActiveByLeaveType` — if none, throw. Validate minimum notice: if `policy.minimumNoticeDays` is set, `startDate - today >= minimumNoticeDays`. Get or create balance for `(employeeId, policyId, year, policy.entitlementDays)`. Reserve days on balance: `pendingDays += days`. Create LeaveRequest with `status = PENDING`. Audit with action `CREATE`. All in one logical flow.

   **`approve`:** Fetch request, validate `status === PENDING`. Compute `days = countLeaveDays(request.startDate, request.endDate)`. Determine `year = request.startDate.getFullYear()`. **Overlap check:** call `findApprovedOverlapping(employeeId, startDate, endDate, requestId)` — if any results, throw Error. **Balance sufficiency:** check `availableDays >= days` via balance. Commit days: `pendingDays -= days, usedDays += days`. Update request: `status = APPROVED, approvedBy = approverId, approvedAt = new Date()`. Audit with action `APPROVE`.

   **`reject`:** Fetch request, validate `status === PENDING`. Compute `days = countLeaveDays(...)`. Release days: `pendingDays -= days`. Update request: `status = REJECTED`. Audit with action `REJECT`.

   **`cancel`:** Fetch request, validate `employeeId` matches `request.employeeId`. If `status === PENDING`: compute days, release days (`pendingDays -= days`), set `status = CANCELLED`. If `status === APPROVED`: compute days, restore days (`usedDays -= days`), set `status = CANCELLED`. Otherwise throw. Audit with action `DELETE` (or a generic cancel audit).

   **Every mutating method** uses `countLeaveDays` from `./leave.model` — never inline day-count arithmetic.

   Import from: `./leave.model`, `./leave.repository.interface`, `./leave.service.interface`, `../../shared/types/index.ts`, `../balance/balance.repository.interface`, `../audit/audit.repository.interface`, `../policy/policy.repository.interface`.

5. `src/modules/leave/leave.routes.ts` — Fastify route registration following the existing `uptime.routes.ts` pattern. Register routes under prefix `/leave`:
   - `POST /leave` — submit a leave request (body: CreateLeaveRequestDto)
   - `GET /leave/:id` — get by id
   - `GET /leave` — query with query string params (employeeId, status, startDate, endDate)
   - `POST /leave/:id/approve` — approve (body: { approverId: string })
   - `POST /leave/:id/reject` — reject (body: { rejectorId: string })
   - `POST /leave/:id/cancel` — cancel (body: { employeeId: string })

   Instantiate `LeaveService` with stub/mock repositories for now (the concrete Knex implementations come in a later phase). Each handler wraps in try/catch returning 500 on error. Import `LeaveService` from `./leave.service`, `CreateLeaveRequestDto` from `./leave.model`.

**Tests:** Include Jest unit tests at `tests/unit/modules/leave/leave.service.spec.ts` mocking all four repository dependencies. Test: submit creates PENDING request and reserves days; approve with no overlap and sufficient balance succeeds; approve with overlap throws; approve with insufficient balance throws; reject releases days; cancel on PENDING releases days; cancel on APPROVED restores days; cancel on REJECTED throws; countLeaveDays returns correct inclusive count.
