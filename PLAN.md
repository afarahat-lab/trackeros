# PLAN.md

## Phase 1: Phase 1: Shared foundation — types, base repository, error types

Create three files that all downstream modules depend on:

1. `src/shared/types/index.ts` — Define the canonical enums: `LeaveType` (values: ANNUAL, SICK, EMERGENCY), `LeaveRequestStatus` (values: PENDING, APPROVED, REJECTED, CANCELLED), and `EmployeeStatus` (values: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE). Export all from a barrel.

2. `src/shared/base.repository.ts` — Define a generic abstract class `BaseRepository<T>` with common CRUD methods: `findById(id: string): Promise<T | null>`, `findAll(filters?: Record<string, unknown>): Promise<T[]>`, `create(entity: Partial<T>): Promise<T>`, `update(id: string, updates: Partial<T>): Promise<T>`, `delete(id: string): Promise<void>`. Accept a `pool: Pool` in the constructor. Import `Pool` from `pg` and the pool from `src/shared/db/connection.ts` (already exists).

3. `src/shared/error-types.ts` — Define custom error classes: `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`. Each extends `Error` and accepts a message string.

Include Jest unit tests in `tests/unit/shared/` for the base repository (mock the pool) and error types.

## Phase 2: Phase 2: Employee module — model, repository, and tests

Create the employee domain model and repository together so Aider sees field definitions and their usage in a single context.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `EmployeeStatus`)
- `src/shared/base.repository.ts` from Phase 1 (for `BaseRepository<T>`)
- `src/shared/db/connection.ts` (already exists)

Files to create:
1. `src/modules/employee/employee.model.ts` — Define the `Employee` interface with exact attributes from the architecture: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: EmployeeStatus`, `createdAt: Date`, `updatedAt: Date`. Import `EmployeeStatus` from `src/shared/types/index.ts`.

2. `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface and `EmployeeRepository` class extending `BaseRepository<Employee>`. Add employee-specific methods: `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findByDepartment(department: string): Promise<Employee[]>`. Import `Employee` from `./employee.model.ts` and `BaseRepository` from `src/shared/base.repository.ts`.

3. `src/modules/employee/index.ts` — Barrel export of `Employee`, `IEmployeeRepository`, `EmployeeRepository`.

Include Jest unit tests in `tests/unit/modules/employee/` for the repository methods (mock the pool).

## Phase 3: Phase 3: Policy module — model, repository, and tests

Create the LeavePolicy domain model and repository together.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `LeaveType`)
- `src/shared/base.repository.ts` from Phase 1 (for `BaseRepository<T>`)
- `src/shared/db/connection.ts` (already exists)

Files to create:
1. `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with exact attributes: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/index.ts`.

2. `src/modules/policy/policy.repository.ts` — Define `IPolicyRepository` interface and `PolicyRepository` class extending `BaseRepository<LeavePolicy>`. Add policy-specific methods: `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findActive(): Promise<LeavePolicy[]>`. Import `LeavePolicy` from `./policy.model.ts`, `LeaveType` from `src/shared/types/index.ts`, and `BaseRepository` from `src/shared/base.repository.ts`.

3. `src/modules/policy/index.ts` — Barrel export of `LeavePolicy`, `IPolicyRepository`, `PolicyRepository`.

Include Jest unit tests in `tests/unit/modules/policy/` for the repository methods (mock the pool).

## Phase 4: Phase 4: Leave module — model, repository, and tests

Create the LeaveRequest domain model and repository together.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `LeaveRequestStatus`, `LeaveType`)
- `src/shared/base.repository.ts` from Phase 1 (for `BaseRepository<T>`)
- `src/shared/error-types.ts` from Phase 1 (for `NotFoundError`)
- `src/modules/employee/employee.model.ts` from Phase 2 (for `Employee` type reference)
- `src/modules/policy/policy.model.ts` from Phase 3 (for `LeavePolicy` type reference)
- `src/shared/db/connection.ts` (already exists)

Files to create (approximately 3):
1. `src/modules/leave/leave.model.ts` — Define `LeaveRequest` interface with exact attributes: `id: string`, `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveRequestDto` (employeeId, leaveTypeId, startDate, endDate, reason?) and `UpdateLeaveRequestDto` (status?, approvedBy?, approvedAt?). Import `LeaveRequestStatus` from `src/shared/types/index.ts`.

2. `src/modules/leave/leave.repository.ts` — Define `ILeaveRepository` interface and `LeaveRepository` class extending `BaseRepository<LeaveRequest>`. Add methods: `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findPendingByManagerId(managerId: string): Promise<LeaveRequest[]>` (joins through employee.managerId), `findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`. Import `LeaveRequest` from `./leave.model.ts`, `LeaveRequestStatus` from `src/shared/types/index.ts`, and `BaseRepository` from `src/shared/base.repository.ts`.

3. `src/modules/leave/index.ts` — Barrel export of `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`, `ILeaveRepository`, `LeaveRepository`.

Include Jest unit tests in `tests/unit/modules/leave/` for repository methods (mock the pool).

## Phase 5: Phase 5: Balance module — model, repository, and tests

Create the Balance domain model and repository together.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `LeaveType`)
- `src/shared/base.repository.ts` from Phase 1 (for `BaseRepository<T>`)
- `src/modules/employee/employee.model.ts` from Phase 2 (for `Employee` type reference)
- `src/modules/policy/policy.model.ts` from Phase 3 (for `LeavePolicy` type reference)
- `src/shared/db/connection.ts` (already exists)

Files to create (approximately 3):
1. `src/modules/balance/balance.model.ts` — Define the `Balance` interface with exact attributes from the architecture: `id: string`, `employeeId: string`, `policyId: string`, `leaveType: LeaveType`, `entitledDays: number`, `usedDays: number`, `pendingDays: number`, `carriedForward: number`, `year: number`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateBalanceDto` and `UpdateBalanceDto`. Import `LeaveType` from `src/shared/types/index.ts`.

2. `src/modules/balance/balance.repository.ts` — Define `IBalanceRepository` interface and `BalanceRepository` class extending `BaseRepository<Balance>`. Add methods: `findByEmployeeId(employeeId: string): Promise<Balance[]>`, `findByEmployeeAndLeaveType(employeeId: string, leaveType: LeaveType, year: number): Promise<Balance | null>`, `findByEmployeeAndYear(employeeId: string, year: number): Promise<Balance[]>`, `deductDays(id: string, days: number): Promise<Balance>` (atomic update). Import `Balance` from `./balance.model.ts`, `LeaveType` from `src/shared/types/index.ts`, and `BaseRepository` from `src/shared/base.repository.ts`.

3. `src/modules/balance/index.ts` — Barrel export of `Balance`, `CreateBalanceDto`, `UpdateBalanceDto`, `IBalanceRepository`, `BalanceRepository`.

Include Jest unit tests in `tests/unit/modules/balance/` for repository methods (mock the pool).

## Phase 6: Phase 6: Balance service — interface, implementation, and tests

Create the balance service layer. This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `LeaveType`)
- `src/shared/error-types.ts` from Phase 1 (for `NotFoundError`, `ValidationError`)
- `src/modules/policy/policy.model.ts` from Phase 3 (for `LeavePolicy`)
- `src/modules/policy/policy.repository.ts` from Phase 3 (for `IPolicyRepository`)
- `src/modules/balance/balance.model.ts` from Phase 5 (for `Balance`, `CreateBalanceDto`, `UpdateBalanceDto`)
- `src/modules/balance/balance.repository.ts` from Phase 5 (for `IBalanceRepository`)

Files to create (approximately 3):
1. `src/modules/balance/balance.service.interface.ts` — Define `IBalanceService` interface with methods: `getBalances(employeeId: string, year?: number): Promise<Balance[]>`, `getBalance(employeeId: string, leaveType: LeaveType, year: number): Promise<Balance>`, `initializeBalances(employeeId: string, year: number): Promise<Balance[]>` (reads active policies and creates balance rows), `deductDays(employeeId: string, leaveType: LeaveType, days: number, year: number): Promise<Balance>`, `restoreDays(employeeId: string, leaveType: LeaveType, days: number, year: number): Promise<Balance>`. Import `Balance` from `./balance.model.ts` and `LeaveType` from `src/shared/types/index.ts`.

2. `src/modules/balance/balance.service.ts` — Implement `BalanceService` class implementing `IBalanceService`. Constructor accepts `IBalanceRepository` and `IPolicyRepository`. `initializeBalances` iterates active policies and creates balance rows if they don't exist. `deductDays` atomically decrements `usedDays` and increments `pendingDays`. `restoreDays` reverses the deduction. Throw `NotFoundError` when balance not found, `ValidationError` when insufficient balance. Import all dependencies from their exact paths.

3. Update `src/modules/balance/index.ts` — Add barrel exports for `IBalanceService` and `BalanceService`.

Include Jest unit tests in `tests/unit/modules/balance/` for the service (mock repositories).

## Phase 7: Phase 7: Leave service — interface, implementation, and tests

Create the leave service layer — the core business logic for submitting, approving, and rejecting leave requests.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `LeaveRequestStatus`, `LeaveType`)
- `src/shared/error-types.ts` from Phase 1 (for `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`)
- `src/modules/employee/employee.model.ts` from Phase 2 (for `Employee`)
- `src/modules/employee/employee.repository.ts` from Phase 2 (for `IEmployeeRepository`)
- `src/modules/policy/policy.model.ts` from Phase 3 (for `LeavePolicy`)
- `src/modules/policy/policy.repository.ts` from Phase 3 (for `IPolicyRepository`)
- `src/modules/leave/leave.model.ts` from Phase 4 (for `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestDto`)
- `src/modules/leave/leave.repository.ts` from Phase 4 (for `ILeaveRepository`)
- `src/modules/balance/balance.service.interface.ts` from Phase 6 (for `IBalanceService`)

Files to create (approximately 3):
1. `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods: `submit(request: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approve(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `reject(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `cancel(leaveRequestId: string, employeeId: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest>`, `getByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `getPendingForManager(managerId: string): Promise<LeaveRequest[]>`. Import `LeaveRequest`, `CreateLeaveRequestDto` from `./leave.model.ts`.

2. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor accepts `ILeaveRepository`, `IEmployeeRepository`, `IPolicyRepository`, `IBalanceService`. Business rules: `submit` validates employee is ACTIVE, checks policy exists and is active, validates minimum notice days, checks for overlapping requests, checks sufficient balance via `IBalanceService`, creates request with PENDING status, and deducts pending days from balance. `approve` validates approver is the employee's manager, transitions status to APPROVED, moves pending days to used days. `reject` validates approver is manager, transitions to REJECTED, restores pending days. `cancel` validates requester owns the request and it's PENDING, transitions to CANCELLED, restores pending days. Throw appropriate errors from `src/shared/error-types.ts`.

3. Update `src/modules/leave/index.ts` — Add barrel exports for `ILeaveService` and `LeaveService`.

Include Jest unit tests in `tests/unit/modules/leave/` for the service (mock all dependencies).

## Phase 8: Phase 8: Leave routes — Fastify route handlers and tests

Create the Fastify route handlers for the leave module, following the pattern established by `src/modules/uptime/uptime.routes.ts`.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `LeaveRequestStatus`)
- `src/shared/error-types.ts` from Phase 1 (for error classes)
- `src/modules/leave/leave.model.ts` from Phase 4 (for `CreateLeaveRequestDto`, `LeaveRequest`)
- `src/modules/leave/leave.repository.ts` from Phase 4 (for `LeaveRepository`)
- `src/modules/leave/leave.service.ts` from Phase 7 (for `LeaveService`)
- `src/modules/leave/leave.service.interface.ts` from Phase 7 (for `ILeaveService`)
- `src/modules/employee/employee.repository.ts` from Phase 2 (for `EmployeeRepository`)
- `src/modules/policy/policy.repository.ts` from Phase 3 (for `PolicyRepository`)
- `src/modules/balance/balance.service.ts` from Phase 6 (for `BalanceService`)
- `src/modules/balance/balance.repository.ts` from Phase 5 (for `BalanceRepository`)
- `src/shared/db/connection.ts` (already exists)

Files to create (approximately 2):
1. `src/modules/leave/leave.routes.ts` — Export an async function `leaveRoutes(fastify: FastifyInstance): Promise<void>`. Register the following routes:
   - `POST /leave` — submit a new leave request. Parse body as `CreateLeaveRequestDto`, instantiate `LeaveService` with all required repository/service dependencies, call `leaveService.submit(dto)`, return 201 with the created `LeaveRequest`.
   - `GET /leave/:id` — get a leave request by ID. Return 200 with `LeaveRequest` or 404.
   - `GET /leave/employee/:employeeId` — list leave requests for an employee. Return 200 with `LeaveRequest[]`.
   - `GET /leave/manager/:managerId/pending` — list pending requests for a manager. Return 200 with `LeaveRequest[]`.
   - `PATCH /leave/:id/approve` — approve a leave request. Body includes `approverId`. Return 200 with updated `LeaveRequest`.
   - `PATCH /leave/:id/reject` — reject a leave request. Body includes `approverId`. Return 200 with updated `LeaveRequest`.
   - `PATCH /leave/:id/cancel` — cancel a leave request. Body includes `employeeId`. Return 200 with updated `LeaveRequest`.
   Each route handler wraps logic in try/catch, logs errors via `request.log.error`, and returns appropriate HTTP status codes (400 for ValidationError, 404 for NotFoundError, 409 for ConflictError, 403 for UnauthorizedError, 500 for unexpected errors).

2. Update `src/modules/leave/index.ts` — Add barrel export for `leaveRoutes`.

Include Jest integration tests in `tests/integration/modules/leave/` using Fastify's `inject` method (mock the pool).

## Phase 9: Phase 9: Balance routes — Fastify route handlers and tests

Create the Fastify route handlers for the balance module, following the pattern established by `src/modules/uptime/uptime.routes.ts`.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `LeaveType`)
- `src/shared/error-types.ts` from Phase 1 (for error classes)
- `src/modules/balance/balance.model.ts` from Phase 5 (for `Balance`)
- `src/modules/balance/balance.repository.ts` from Phase 5 (for `BalanceRepository`)
- `src/modules/balance/balance.service.ts` from Phase 6 (for `BalanceService`)
- `src/modules/balance/balance.service.interface.ts` from Phase 6 (for `IBalanceService`)
- `src/modules/policy/policy.repository.ts` from Phase 3 (for `PolicyRepository`)
- `src/shared/db/connection.ts` (already exists)

Files to create (approximately 2):
1. `src/modules/balance/balance.routes.ts` — Export async function `balanceRoutes(fastify: FastifyInstance): Promise<void>`. Register routes:
   - `GET /balance/employee/:employeeId` — list all balances for an employee. Optional query param `year` (defaults to current year). Return 200 with `Balance[]`.
   - `GET /balance/employee/:employeeId/type/:leaveType` — get balance for a specific leave type. Query param `year`. Return 200 with `Balance` or 404.
   - `POST /balance/employee/:employeeId/initialize` — initialize balances for an employee for a given year (body: `{ year: number }`). Return 201 with `Balance[]`.
   Each route wraps in try/catch, logs errors, returns appropriate HTTP status codes (400 for ValidationError, 404 for NotFoundError, 500 for unexpected).

2. Update `src/modules/balance/index.ts` — Add barrel export for `balanceRoutes`.

Include Jest integration tests in `tests/integration/modules/balance/` using Fastify's `inject` method (mock the pool).

## Phase 10: Phase 10: App wiring — register leave and balance routes in app.ts

Wire the new leave and balance route modules into the Fastify application.

This phase depends on:
- `src/modules/leave/leave.routes.ts` from Phase 8 (for `leaveRoutes`)
- `src/modules/balance/balance.routes.ts` from Phase 9 (for `balanceRoutes`)
- `src/app.ts` (already exists — currently registers only `uptimeRoutes`)

Files to modify (1):
1. `src/app.ts` — Add imports for `leaveRoutes` from `./modules/leave/leave.routes` and `balanceRoutes` from `./modules/balance/balance.routes`. Register both with `app.register(leaveRoutes)` and `app.register(balanceRoutes)`. Keep existing `uptimeRoutes` registration intact.

No new test files needed — the integration tests from Phases 8 and 9 already cover the route behavior. Verify the app boots without errors by running `npm run build`.
