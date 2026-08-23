# PLAN.md

## Phase 1: Phase 1: Shared types

Create the shared types module at `src/shared/types/`. This phase has no dependencies on other feature phases.

Create exactly these files:

1. **`src/shared/types/leave.types.ts`** — Define and export the canonical enums and base type:
   - `LeaveRequestStatus` enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
   - `LeaveType` enum: `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`
   - `AuditAction` enum: `CREATED`, `UPDATED`, `DELETED`, `APPROVED`, `REJECTED`, `CANCELLED`, `SUBMITTED`
   - `BaseEntity` type: `{ id: string; createdAt: Date; updatedAt: Date }`

2. **`src/shared/types/index.ts`** — Barrel file that re-exports everything from `leave.types.ts`.

Existing files to read before generating: `tsconfig.json` (baseUrl is `./src`, so imports like `shared/types/leave.types` resolve).

Include Jest unit tests in `tests/unit/shared/types/leave.types.spec.ts` verifying enum values are as expected.

## Phase 2: Phase 2: Employee module

Build the employee module under `src/modules/employee/`. This phase depends on Phase 1's shared types.

Read these existing files before generating:
- `src/shared/types/leave.types.ts` (from Phase 1) — for `BaseEntity`
- `src/shared/db/connection.ts` — for the PostgreSQL pool
- `tsconfig.json` — for path resolution

Create approximately 4 files:

1. **`src/modules/employee/employee.model.ts`** — Define and export:
   - `Employee` entity with the canonical fields: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`
   - `IEmployeeRepository` interface declaring: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findAll(): Promise<Employee[]>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `softDelete(id: string): Promise<void>`

2. **`src/modules/employee/employee.repository.ts`** — Implement `EmployeeRepository` class implementing `IEmployeeRepository` using the `pool` from `src/shared/db/connection.ts`. Use parameterized SQL queries via `pg`. Table name: `employees`.

3. **`src/modules/employee/employee.service.ts`** — Implement `EmployeeService` class with methods: `getById`, `getByEmployeeNumber`, `getAll`, `getSubordinates`, `create`, `update`, `terminate`. Depends on `IEmployeeRepository` injected via constructor.

4. **`src/modules/employee/index.ts`** — Barrel file re-exporting the model, repository, and service.

Include Jest unit tests in `tests/unit/modules/employee/employee.service.spec.ts` (mock the repository).

## Phase 3: Phase 3: Policy module

Build the policy module under `src/modules/policy/`. This phase depends on Phase 1's shared types.

Read these existing files before generating:
- `src/shared/types/leave.types.ts` (from Phase 1) — for `LeaveType`, `BaseEntity`
- `src/shared/db/connection.ts` — for the PostgreSQL pool
- `tsconfig.json` — for path resolution

Create approximately 4 files:

1. **`src/modules/policy/policy.model.ts`** — Define and export:
   - `LeavePolicy` entity with the canonical fields: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | undefined`, `maxAccumulation: number | undefined`, `minimumNoticeDays: number | undefined`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`
   - `IPolicyRepository` interface declaring: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findAllActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`

2. **`src/modules/policy/policy.repository.ts`** — Implement `PolicyRepository` class implementing `IPolicyRepository` using the `pool` from `src/shared/db/connection.ts`. Table name: `leave_policies`.

3. **`src/modules/policy/policy.service.ts`** — Implement `PolicyService` class with methods: `getById`, `getByLeaveType`, `getAllActive`, `create`, `update`, `getEntitlementForType(leaveType: LeaveType): Promise<number>` (returns `entitlementDays` for the active policy of that type, or throws if none found).

4. **`src/modules/policy/index.ts`** — Barrel file.

Include Jest unit tests in `tests/unit/modules/policy/policy.service.spec.ts`.

## Phase 4: Phase 4: Audit & Notification modules

Build the audit and notification modules. This phase depends on Phase 1's shared types.

Read these existing files before generating:
- `src/shared/types/leave.types.ts` (from Phase 1) — for `AuditAction`, `BaseEntity`
- `src/shared/db/connection.ts` — for the PostgreSQL pool
- `tsconfig.json` — for path resolution

Create approximately 8 files across two modules:

**Audit module (`src/modules/audit/`):**

1. **`src/modules/audit/audit.model.ts`** — Define and export:
   - `AuditLog` entity with canonical fields: `id: string`, `entityType: string`, `entityId: string`, `action: string`, `oldValues: Record<string, unknown> | null`, `newValues: Record<string, unknown> | null`, `performedBy: string`, `performedAt: Date`
   - `IAuditRepository` interface: `create(entry: Omit<AuditLog, 'id' | 'performedAt'>): Promise<AuditLog>`, `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`, `findByPerformer(performedBy: string, limit?: number): Promise<AuditLog[]>`

2. **`src/modules/audit/audit.repository.ts`** — Implement `AuditRepository` using `pool`. Table: `audit_logs`.

3. **`src/modules/audit/audit.service.ts`** — Implement `AuditService` with methods: `log(entry)`, `getEntityHistory(entityType, entityId)`, `getUserActions(performedBy, limit)`. The `log` method auto-sets `performedAt` to `new Date()`.

4. **`src/modules/audit/index.ts`** — Barrel file.

**Notification module (`src/modules/notification/`):**

5. **`src/modules/notification/notification.model.ts`** — Define and export:
   - `Notification` entity: `id: string`, `recipientId: string`, `title: string`, `body: string`, `type: 'EMAIL' | 'IN_APP'`, `isRead: boolean`, `metadata: Record<string, unknown> | null`, `createdAt: Date`
   - `INotificationRepository` interface: `create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>`, `findByRecipient(recipientId: string, limit?: number): Promise<Notification[]>`, `markAsRead(id: string): Promise<void>`

6. **`src/modules/notification/notification.repository.ts`** — Implement `NotificationRepository` using `pool`. Table: `notifications`.

7. **`src/modules/notification/notification.service.ts`** — Implement `NotificationService` with methods: `send(recipientId, title, body, type, metadata?)`, `getForUser(recipientId, limit?)`, `markRead(id)`.

8. **`src/modules/notification/index.ts`** — Barrel file.

Include Jest unit tests in `tests/unit/modules/audit/audit.service.spec.ts` and `tests/unit/modules/notification/notification.service.spec.ts`.

## Phase 5: Phase 5: Balance module

Build the balance module under `src/modules/balance/`. This phase depends on Phase 1 (shared types), Phase 2 (employee module), and Phase 3 (policy module).

Read these existing files before generating:
- `src/shared/types/leave.types.ts` (Phase 1) — for `LeaveType`, `BaseEntity`
- `src/modules/employee/employee.model.ts` (Phase 2) — for `Employee` type reference
- `src/modules/policy/policy.model.ts` (Phase 3) — for `LeavePolicy`, `IPolicyRepository`
- `src/modules/policy/policy.service.ts` (Phase 3) — for `PolicyService.getEntitlementForType`
- `src/shared/db/connection.ts` — for the PostgreSQL pool
- `tsconfig.json` — for path resolution

Create approximately 6 files:

1. **`src/modules/balance/balance.model.ts`** — Define and export:
   - `LeaveBalance` entity with canonical fields: `id: string`, `employeeId: string`, `policyId: string`, `totalEntitlement: number`, `usedDays: number`, `pendingDays: number`, `remainingDays: number` (derived: `totalEntitlement - usedDays - pendingDays`), `fiscalYear: number`, `status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN' | 'CLOSED'`, `createdAt: Date`, `updatedAt: Date`
   - `IBalanceRepository` interface: `findByEmployeeAndYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `findByEmployeeYearAndPolicy(employeeId: string, fiscalYear: number, policyId: string): Promise<LeaveBalance | null>`, `create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>`, `update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>`, `deductPendingDays(id: string, days: number): Promise<LeaveBalance | null>` (atomically increments `pendingDays`), `commitDeduction(id: string, days: number): Promise<LeaveBalance | null>` (atomically moves `days` from `pendingDays` to `usedDays`), `restorePendingDays(id: string, days: number): Promise<LeaveBalance | null>` (atomically decrements `pendingDays`)

2. **`src/modules/balance/balance.repository.ts`** — Implement `BalanceRepository` using `pool`. Table: `leave_balances`. The `deductPendingDays`, `commitDeduction`, and `restorePendingDays` methods must use `UPDATE ... RETURNING *` with atomic arithmetic in SQL to prevent race conditions.

3. **`src/modules/balance/balance.service.ts`** — Implement `BalanceService` with methods:
   - `getOrCreateBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number): Promise<LeaveBalance>` — looks up existing balance or creates one by fetching the policy entitlement via `PolicyService.getEntitlementForType`
   - `getBalancesForEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`
   - `hasSufficientBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number, requestedDays: number): Promise<boolean>` — checks `remainingDays >= requestedDays`
   - `reserveDays(employeeId: string, leaveType: LeaveType, fiscalYear: number, days: number): Promise<LeaveBalance>` — calls `deductPendingDays`
   - `commitDays(employeeId: string, leaveType: LeaveType, fiscalYear: number, days: number): Promise<LeaveBalance>` — calls `commitDeduction`
   - `restoreDays(employeeId: string, leaveType: LeaveType, fiscalYear: number, days: number): Promise<LeaveBalance>` — calls `restorePendingDays`
   - Fiscal year is derived as the calendar year of the leave request's `startDate` (e.g., `startDate.getFullYear()`). This is the BINDING calendar-year rule.

4. **`src/modules/balance/balance.controller.ts`** — Fastify route handlers: `getBalances` (GET `/balances?employeeId=&year=`), `getBalance` (GET `/balances/:id`).

5. **`src/modules/balance/balance.routes.ts`** — Fastify plugin registering balance routes.

6. **`src/modules/balance/index.ts`** — Barrel file.

Include Jest unit tests in `tests/unit/modules/balance/balance.service.spec.ts` (mock `IBalanceRepository` and `PolicyService`).

## Phase 6: Phase 6: Leave module

Build the leave module under `src/modules/leave/`. This is the core module that wires together all prior phases. It depends on every prior phase.

Read these existing files before generating:
- `src/shared/types/leave.types.ts` (Phase 1) — for `LeaveRequestStatus`, `LeaveType`, `BaseEntity`
- `src/modules/employee/employee.model.ts` (Phase 2) — for `Employee`, `IEmployeeRepository`
- `src/modules/policy/policy.model.ts` (Phase 3) — for `LeavePolicy`, `IPolicyRepository`
- `src/modules/policy/policy.service.ts` (Phase 3) — for `PolicyService`
- `src/modules/audit/audit.model.ts` (Phase 4) — for `AuditLog`, `IAuditRepository`
- `src/modules/audit/audit.service.ts` (Phase 4) — for `AuditService`
- `src/modules/notification/notification.model.ts` (Phase 4) — for `INotificationRepository`
- `src/modules/notification/notification.service.ts` (Phase 4) — for `NotificationService`
- `src/modules/balance/balance.model.ts` (Phase 5) — for `LeaveBalance`, `IBalanceRepository`
- `src/modules/balance/balance.service.ts` (Phase 5) — for `BalanceService`
- `src/shared/db/connection.ts` — for the PostgreSQL pool
- `tsconfig.json` — for path resolution

Create approximately 8 files:

1. **`src/modules/leave/leave.model.ts`** — Define and export:
   - `LeaveRequest` entity with canonical fields: `id: string`, `employeeId: string`, `leaveType: LeaveType`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `createdAt: Date`, `updatedAt: Date`
   - `CreateLeaveRequestDto`: `{ employeeId: string; leaveType: LeaveType; startDate: string; endDate: string; reason?: string }`
   - `UpdateLeaveRequestDto`: `{ startDate?: string; endDate?: string; reason?: string; status?: LeaveRequestStatus }`
   - `LeaveRequestQueryParams`: `{ employeeId?: string; status?: LeaveRequestStatus; leaveType?: LeaveType; startDate?: string; endDate?: string }`
   - `ILeaveRepository` interface: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`, `findOverlappingApproved(employeeId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<LeaveRequest[]>`, `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`, `findPendingByManager(managerId: string): Promise<LeaveRequest[]>`
   - `ILeaveService` interface: `submit(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approve(id: string, approverId: string): Promise<LeaveRequest>`, `reject(id: string, approverId: string): Promise<LeaveRequest>`, `cancel(id: string, employeeId: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest | null>`, `getByEmployee(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`, `getPendingForManager(managerId: string): Promise<LeaveRequest[]>`

2. **`src/modules/leave/leave.repository.ts`** — Implement `LeaveRepository` using `pool`. Table: `leave_requests`. The `findOverlappingApproved` method must query for any APPROVED request for the same employee where `startDate <= :endDate AND endDate >= :startDate` (the BINDING overlap rule).

3. **`src/modules/leave/leave.service.ts`** — Implement `LeaveService` implementing `ILeaveService`. This is the core business logic. Constructor injects: `ILeaveRepository`, `IEmployeeRepository`, `IPolicyRepository`, `IBalanceRepository`, `IAuditRepository`, `INotificationRepository`.

   **CRITICAL — implement the BINDING `countLeaveDays` helper EXACTLY ONCE in this file** (or in `leave.model.ts` and import it here):
   ```ts
   export function countLeaveDays(startDate: Date, endDate: Date): number {
     const msPerDay = 1000 * 60 * 60 * 24;
     return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
   }
   ```
   Every day-count call site in this service MUST use this helper — never inline the calculation.

   Methods:
   - `submit(dto)`: Validates employee exists. Validates policy exists and is active. If `minimumNoticeDays` is set, checks `countLeaveDays(new Date(), startDate) >= minimumNoticeDays`. Creates request with status `SUBMITTED`. Audits the creation. Returns the request.
   - `approve(id, approverId)`: Loads request, validates it is `SUBMITTED`. Validates approver exists and is the employee's manager (or has authority). **Checks for overlapping APPROVED leave** via `findOverlappingApproved` — rejects if any overlap exists. Computes `days = countLeaveDays(startDate, endDate)`. Determines `fiscalYear = startDate.getFullYear()`. Calls `balanceService.hasSufficientBalance(employeeId, leaveType, fiscalYear, days)` — rejects if insufficient. Calls `balanceService.reserveDays(...)` then `balanceService.commitDays(...)`. Updates status to `APPROVED`, sets `approvedBy = approverId`, `approvedAt = new Date()`. Audits the approval. Sends notification to employee.
   - `reject(id, approverId)`: Loads request, validates it is `SUBMITTED`. Updates status to `REJECTED`. Audits. Sends notification.
   - `cancel(id, employeeId)`: Loads request, validates it belongs to employee and status is `SUBMITTED` or `APPROVED`. If status was `APPROVED`, computes `days = countLeaveDays(startDate, endDate)`, `fiscalYear = startDate.getFullYear()`, and calls `balanceService.restoreDays(employeeId, leaveType, fiscalYear, days)`. Updates status to `CANCELLED`. Audits. Sends notification.
   - `getById`, `getByEmployee`, `getPendingForManager`: delegate to repository.

4. **`src/modules/leave/leave.controller.ts`** — Fastify route handlers:
   - `submitLeave` (POST `/leaves`)
   - `approveLeave` (POST `/leaves/:id/approve`)
   - `rejectLeave` (POST `/leaves/:id/reject`)
   - `cancelLeave` (POST `/leaves/:id/cancel`)
   - `getLeave` (GET `/leaves/:id`)
   - `getMyLeaves` (GET `/leaves?employeeId=...`)
   - `getPendingForManager` (GET `/leaves/pending?managerId=...`)

5. **`src/modules/leave/leave.routes.ts`** — Fastify plugin registering all leave routes.

6. **`src/modules/leave/index.ts`** — Barrel file re-exporting model, repository, service, controller, routes, and the `countLeaveDays` helper.

Include Jest unit tests:
- `tests/unit/modules/leave/leave.service.spec.ts` — mock all injected dependencies. Test: submit with valid data, submit with insufficient notice, approve with sufficient balance, approve with insufficient balance, approve with overlapping request, reject, cancel SUBMITTED, cancel APPROVED (verify balance restoration), countLeaveDays helper.
- `tests/unit/modules/leave/countLeaveDays.spec.ts` — test the helper in isolation: same-day = 1, two consecutive days = 2, across weekend = correct calendar count.
