# PLAN.md

## Phase 1: Phase 1: Foundational domain types — enums and BaseEntity

Create the foundational domain types that all other modules depend on. No prior phase dependencies.

Create these files:

1. `src/modules/BaseEntity/BaseEntity.model.ts` — Define and export the `BaseEntity` interface with fields: `id: string`, `createdAt: Date`, `updatedAt: Date`. This is the base interface that LeaveRequest, Employee, and LeavePolicy will extend.

2. `src/modules/BaseEntity/index.ts` — Barrel export re-exporting `BaseEntity` from `./BaseEntity.model`.

3. `src/modules/LeaveStatus/LeaveStatus.model.ts` — Define and export the `LeaveRequestStatus` enum with members: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

4. `src/modules/LeaveStatus/index.ts` — Barrel export re-exporting `LeaveRequestStatus` from `./LeaveStatus.model`.

5. `src/modules/LeaveType/LeaveType.model.ts` — Define and export the `LeaveType` enum with members: `ANNUAL`, `SICK`, `EMERGENCY`.

Include Jest unit tests in `tests/unit/modules/BaseEntity/`, `tests/unit/modules/LeaveStatus/`, and `tests/unit/modules/LeaveType/` verifying the enum values and interface shape.

## Phase 2: Phase 2: Employee domain model and repository

Create the Employee domain model and repository. This phase depends on `src/modules/BaseEntity/BaseEntity.model.ts` from Phase 1 — read it before generating any code that extends BaseEntity.

Create these files:

1. `src/modules/employee/employee.model.ts` — Define and export:
   - `EmploymentStatus` enum with members: `ACTIVE`, `INACTIVE`, `TERMINATED`, `ON_LEAVE`.
   - `Employee` interface extending `BaseEntity` (imported from `src/modules/BaseEntity/BaseEntity.model`) with fields: `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: EmploymentStatus`, `deletedAt: Date | null`.

2. `src/modules/employee/employee.repository.ts` — Define and export `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `softDelete(id: string): Promise<void>`. Also implement `EmployeeRepository` class using Knex (import pool from `src/shared/db/connection.ts`) that implements `IEmployeeRepository`.

3. `src/modules/employee/index.ts` — Barrel export re-exporting all public symbols.

Include Jest unit tests in `tests/unit/modules/employee/` for the repository methods using an in-memory or mocked database.

## Phase 3: Phase 3: LeavePolicy domain model and repository

Create the LeavePolicy domain model and repository. This phase depends on `src/modules/BaseEntity/BaseEntity.model.ts` and `src/modules/LeaveType/LeaveType.model.ts` from Phase 1 — read both before generating any code.

Create these files:

1. `src/modules/policy/policy.model.ts` — Define and export the `LeavePolicy` interface extending `BaseEntity` (imported from `src/modules/BaseEntity/BaseEntity.model`) with fields: `policyName: string`, `leaveTypeId: string` (references `LeaveType` enum values), `entitlementDays: number`, `accrualRate: number | undefined`, `maxAccumulation: number | undefined`, `minimumNoticeDays: number | undefined`, `requiresManagerApproval: boolean`, `isActive: boolean`. Also export `CreateLeavePolicyDto` with the same fields minus `id`, `createdAt`, `updatedAt`.

2. `src/modules/policy/policy.repository.ts` — Define and export `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>`, `findAllActive(): Promise<LeavePolicy[]>`, `create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`, `deactivate(id: string): Promise<void>`. Implement `LeavePolicyRepository` class using Knex (import pool from `src/shared/db/connection.ts`) that implements `ILeavePolicyRepository`.

3. `src/modules/policy/index.ts` — Barrel export re-exporting all public symbols.

Include Jest unit tests in `tests/unit/modules/policy/` for the repository methods.

## Phase 4: Phase 4: LeaveRequest domain model and repository

Create the LeaveRequest domain model and repository — the central aggregate root for the leave management bounded context.

This phase depends on:
- `src/modules/BaseEntity/BaseEntity.model.ts` from Phase 1 (BaseEntity interface)
- `src/modules/LeaveStatus/LeaveStatus.model.ts` from Phase 1 (LeaveRequestStatus enum)
- `src/modules/LeaveType/LeaveType.model.ts` from Phase 1 (LeaveType enum)
- `src/modules/employee/employee.model.ts` from Phase 2 (Employee interface for employeeId reference)
- `src/modules/policy/policy.model.ts` from Phase 3 (LeavePolicy interface for leaveTypeId reference)

Read all of these before generating any code.

Create these files:

1. `src/modules/leave/leave.model.ts` — Define and export:
   - `LeaveRequest` interface extending `BaseEntity` with fields: `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`.
   - `CreateLeaveRequestDto` with fields: `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason?: string`.

2. `src/modules/leave/leave.repository.ts` — Define and export `ILeaveRepository` interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findByEmployeeIdAndDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`, `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string): Promise<LeaveRequest | null>`. Implement `LeaveRepository` class using Knex (import pool from `src/shared/db/connection.ts`) that implements `ILeaveRepository`.

3. `src/modules/leave/index.ts` — Barrel export re-exporting all public symbols.

Include Jest unit tests in `tests/unit/modules/leave/` for the repository methods.

## Phase 5: Phase 5: Leave service — apply, approve, reject, cancel

Create the leave service with core business logic for applying, approving, rejecting, and cancelling leave requests.

This phase depends on:
- `src/modules/leave/leave.model.ts` from Phase 4 (LeaveRequest, CreateLeaveRequestDto)
- `src/modules/leave/leave.repository.ts` from Phase 4 (ILeaveRepository)
- `src/modules/employee/employee.repository.ts` from Phase 2 (IEmployeeRepository)
- `src/modules/policy/policy.repository.ts` from Phase 3 (ILeavePolicyRepository)
- `src/modules/LeaveStatus/LeaveStatus.model.ts` from Phase 1 (LeaveRequestStatus enum)
- `src/modules/LeaveType/LeaveType.model.ts` from Phase 1 (LeaveType enum)

Read all of these before generating any code.

Create these files:

1. `src/modules/leave/leave.service.interface.ts` — Define and export `ILeaveService` interface with methods: `apply(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approve(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `reject(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `cancel(leaveRequestId: string, employeeId: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest | null>`, `getByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `getPendingApprovals(managerId: string): Promise<LeaveRequest[]>`.

2. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Business rules:
   - `apply`: Validate employee exists, validate leave policy exists and is active, check for overlapping leave requests, enforce minimum notice days from policy, set initial status to PENDING.
   - `approve`: Validate the approver is the employee's manager (look up employee.managerId), validate request is in PENDING status, set status to APPROVED, set approvedBy and approvedAt.
   - `reject`: Same manager validation as approve, set status to REJECTED.
   - `cancel`: Validate the requesting employee owns the leave request, validate status is PENDING, set status to CANCELLED.
   - `getPendingApprovals`: Find all employees whose managerId matches, then find their PENDING leave requests.

3. `src/modules/leave/index.ts` — Update barrel export to include new service symbols.

Include Jest unit tests in `tests/unit/modules/leave/` for the service methods, mocking the repositories.

## Phase 6: Phase 6: Leave controller and Fastify routes

Create the leave controller and Fastify route registration for the leave management HTTP API.

This phase depends on:
- `src/modules/leave/leave.service.interface.ts` from Phase 5 (ILeaveService)
- `src/modules/leave/leave.service.ts` from Phase 5 (LeaveService)
- `src/modules/leave/leave.model.ts` from Phase 4 (CreateLeaveRequestDto, LeaveRequest)
- `src/modules/leave/leave.repository.ts` from Phase 4 (ILeaveRepository, LeaveRepository)
- `src/app.ts` (existing — to register the new routes)

Read all of these before generating any code.

Create these files:

1. `src/modules/leave/leave.controller.ts` — Define and export `LeaveController` class. Constructor takes `ILeaveService`. Methods:
   - `apply(request: FastifyRequest, reply: FastifyReply): Promise<void>` — parse body as CreateLeaveRequestDto, call service.apply, return 201 with created LeaveRequest.
   - `approve(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract leaveRequestId from params and approverId from auth context (request.user.id placeholder), call service.approve, return 200.
   - `reject(request: FastifyRequest, reply: FastifyReply): Promise<void>` — same pattern as approve.
   - `cancel(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract leaveRequestId from params, employeeId from auth context, call service.cancel, return 200.
   - `getById(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract id from params, call service.getById, return 200 or 404.
   - `getMyRequests(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract employeeId from auth context, call service.getByEmployeeId, return 200.
   - `getPendingApprovals(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract managerId from auth context, call service.getPendingApprovals, return 200.

2. `src/modules/leave/leave.routes.ts` — Define and export `leaveRoutes` async function (Fastify plugin pattern matching `src/modules/uptime/uptime.routes.ts`). Instantiate `LeaveRepository` (using pool from `src/shared/db/connection.ts`), `EmployeeRepository`, `LeavePolicyRepository`, `LeaveService`, and `LeaveController`. Register routes:
   - `POST /api/leave` → controller.apply
   - `GET /api/leave/:id` → controller.getById
   - `GET /api/leave/my` → controller.getMyRequests
   - `POST /api/leave/:id/approve` → controller.approve
   - `POST /api/leave/:id/reject` → controller.reject
   - `POST /api/leave/:id/cancel` → controller.cancel
   - `GET /api/leave/pending-approvals` → controller.getPendingApprovals

3. Update `src/app.ts` — Import and register `leaveRoutes` alongside the existing `uptimeRoutes`.

4. Update `src/modules/leave/index.ts` — Add barrel exports for controller and routes.

Include Jest integration tests in `tests/integration/modules/leave/` for the HTTP endpoints using Fastify's inject method.

## Phase 7: Phase 7: Database migrations for all leave management tables

Create Knex database migration files for all tables needed by the leave management module. This phase has no code dependencies on prior phases but the table schemas must align with the domain models defined in Phases 1-4.

Read these files for schema alignment before generating migrations:
- `src/modules/BaseEntity/BaseEntity.model.ts` from Phase 1
- `src/modules/employee/employee.model.ts` from Phase 2
- `src/modules/policy/policy.model.ts` from Phase 3
- `src/modules/leave/leave.model.ts` from Phase 4

Create these files:

1. `migrations/001_create_employees.ts` — Knex migration (up/down). Creates `employees` table with columns: `id` (uuid, primary key, default uuid_generate_v4()), `employee_number` (varchar, unique, not null), `first_name` (varchar, not null), `last_name` (varchar, not null), `email` (varchar, unique, not null), `manager_id` (uuid, nullable, references employees.id), `department` (varchar, nullable), `hire_date` (date, not null), `termination_date` (date, nullable), `employment_status` (varchar, not null, default 'ACTIVE'), `created_at` (timestamptz, not null, default now()), `updated_at` (timestamptz, not null, default now()), `deleted_at` (timestamptz, nullable). Down drops the table.

2. `migrations/002_create_leave_policies.ts` — Knex migration. Creates `leave_policies` table with columns: `id` (uuid, pk), `policy_name` (varchar, not null), `leave_type_id` (varchar, not null), `entitlement_days` (integer, not null), `accrual_rate` (numeric, nullable), `max_accumulation` (numeric, nullable), `minimum_notice_days` (integer, nullable), `requires_manager_approval` (boolean, not null, default true), `is_active` (boolean, not null, default true), `created_at`, `updated_at`. Unique constraint on `leave_type_id` where `is_active = true`.

3. `migrations/003_create_leave_requests.ts` — Knex migration. Creates `leave_requests` table with columns: `id` (uuid, pk), `employee_id` (uuid, not null, references employees.id), `leave_type_id` (varchar, not null), `start_date` (date, not null), `end_date` (date, not null), `reason` (text, nullable), `status` (varchar, not null, default 'PENDING'), `approved_by` (uuid, nullable, references employees.id), `approved_at` (timestamptz, nullable), `created_at`, `updated_at`. Index on `employee_id`, `status`, and composite `(employee_id, start_date, end_date)`.

4. `migrations/004_create_leave_balances.ts` — Knex migration. Creates `leave_balances` table with columns: `id` (uuid, pk), `employee_id` (uuid, not null, references employees.id), `leave_type_id` (varchar, not null), `entitled_days` (numeric, not null), `used_days` (numeric, not null, default 0), `accrued_days` (numeric, not null, default 0), `year` (integer, not null), `created_at`, `updated_at`. Unique constraint on `(employee_id, leave_type_id, year)`. Index on `employee_id`.

5. Create or update `knexfile.ts` at the project root if it does not already exist, configuring the PostgreSQL connection from `DATABASE_URL` environment variable and pointing migrations directory to `./migrations`.

Include Jest unit tests in `tests/unit/migrations/` verifying migration up/down runs without error (using a test database or SQLite in-memory for speed).

## Phase 8: Phase 8: LeaveBalance domain model and repository

Create the LeaveBalance domain model and repository for tracking employee leave balances per leave type per year.

This phase depends on:
- `src/modules/BaseEntity/BaseEntity.model.ts` from Phase 1 (BaseEntity interface)
- `src/modules/LeaveType/LeaveType.model.ts` from Phase 1 (LeaveType enum)
- `src/modules/leave/leave.model.ts` from Phase 4 (LeaveRequest interface for understanding the relationship)

Read all of these before generating any code.

Create these files:

1. `src/modules/balance/balance.model.ts` — Define and export:
   - `LeaveBalance` interface extending `BaseEntity` with fields: `employeeId: string`, `leaveTypeId: string`, `entitledDays: number`, `usedDays: number`, `accruedDays: number`, `year: number`.
   - `CreateLeaveBalanceDto` with fields: `employeeId: string`, `leaveTypeId: string`, `entitledDays: number`, `year: number`.
   - `UpdateLeaveBalanceDto` with optional fields: `entitledDays?: number`, `usedDays?: number`, `accruedDays?: number`.

2. `src/modules/balance/balance.repository.ts` — Define and export `ILeaveBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>`, `findByEmployeeIdLeaveTypeAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>`, `create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>`, `update(id: string, data: UpdateLeaveBalanceDto): Promise<LeaveBalance | null>`, `upsert(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>`. Implement `LeaveBalanceRepository` class using Knex (import pool from `src/shared/db/connection.ts`) that implements `ILeaveBalanceRepository`.

3. `src/modules/balance/index.ts` — Barrel export re-exporting all public symbols.

Include Jest unit tests in `tests/unit/modules/balance/` for the repository methods.

## Phase 9: Phase 9: Balance service — entitlement calculation and deduction on approval

Create the balance service that calculates leave entitlements and deducts used days when leave is approved. Also update the leave service to integrate balance deduction on approval.

This phase depends on:
- `src/modules/balance/balance.model.ts` from Phase 8 (LeaveBalance, CreateLeaveBalanceDto, UpdateLeaveBalanceDto)
- `src/modules/balance/balance.repository.ts` from Phase 8 (ILeaveBalanceRepository)
- `src/modules/leave/leave.model.ts` from Phase 4 (LeaveRequest, LeaveRequestStatus)
- `src/modules/leave/leave.service.ts` from Phase 5 (LeaveService — to integrate balance deduction)
- `src/modules/leave/leave.service.interface.ts` from Phase 5 (ILeaveService)
- `src/modules/policy/policy.repository.ts` from Phase 3 (ILeavePolicyRepository)
- `src/modules/LeaveType/LeaveType.model.ts` from Phase 1 (LeaveType enum)

Read all of these before generating any code.

Create these files:

1. `src/modules/balance/balance.service.interface.ts` — Define and export `IBalanceService` interface with methods: `getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>`, `getAllBalances(employeeId: string, year: number): Promise<LeaveBalance[]>`, `initializeBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance>`, `deductDays(employeeId: string, leaveTypeId: string, days: number, year: number): Promise<LeaveBalance>`, `getRemainingDays(employeeId: string, leaveTypeId: string, year: number): Promise<number>`.

2. `src/modules/balance/balance.service.ts` — Implement `BalanceService` class implementing `IBalanceService`. Business rules:
   - `initializeBalance`: Look up the active LeavePolicy for the leave type, use its entitlementDays as the initial entitledDays. Create a LeaveBalance record via repository.
   - `getRemainingDays`: Fetch balance, return `entitledDays + accruedDays - usedDays`.
   - `deductDays`: Fetch balance, validate sufficient remaining days, increment usedDays, update via repository. Throw a domain error if insufficient balance.
   - `getBalance` / `getAllBalances`: Delegate to repository.

3. Update `src/modules/leave/leave.service.ts` from Phase 5 — Modify the `approve` method to also call `BalanceService.deductDays()` after setting status to APPROVED. The LeaveService constructor must now also accept `IBalanceService`. Calculate the number of working days between startDate and endDate for the deduction.

4. Update `src/modules/leave/leave.routes.ts` from Phase 6 — Update the LeaveService instantiation to also pass the BalanceService (which needs LeaveBalanceRepository and LeavePolicyRepository).

5. Update `src/modules/balance/index.ts` — Add barrel exports for service interface and service class.

Include Jest unit tests in `tests/unit/modules/balance/` for the balance service methods, mocking repositories.

## Phase 10: Phase 10: Balance routes and leave-balance integration endpoints

Create the balance controller and Fastify routes, and add balance-related endpoints. Also add a leave eligibility check endpoint that validates balance before applying.

This phase depends on:
- `src/modules/balance/balance.service.interface.ts` from Phase 9 (IBalanceService)
- `src/modules/balance/balance.service.ts` from Phase 9 (BalanceService)
- `src/modules/balance/balance.model.ts` from Phase 8 (LeaveBalance)
- `src/modules/balance/balance.repository.ts` from Phase 8 (ILeaveBalanceRepository, LeaveBalanceRepository)
- `src/modules/leave/leave.service.interface.ts` from Phase 5 (ILeaveService)
- `src/modules/leave/leave.service.ts` from Phase 9 (updated LeaveService with balance integration)
- `src/modules/leave/leave.routes.ts` from Phase 9 (updated routes)
- `src/app.ts` (existing — to register balance routes)

Read all of these before generating any code.

Create these files:

1. `src/modules/balance/balance.controller.ts` — Define and export `BalanceController` class. Constructor takes `IBalanceService`. Methods:
   - `getMyBalances(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract employeeId from auth context and optional year query param (default current year), call service.getAllBalances, return 200.
   - `getBalanceByType(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract employeeId, leaveTypeId from params, year from query, call service.getBalance, return 200 or 404.
   - `getRemainingDays(request: FastifyRequest, reply: FastifyReply): Promise<void>` — extract employeeId, leaveTypeId from params, year from query, call service.getRemainingDays, return 200 with `{ remainingDays: number }`.

2. `src/modules/balance/balance.routes.ts` — Define and export `balanceRoutes` async function (Fastify plugin pattern). Instantiate `LeaveBalanceRepository`, `LeavePolicyRepository`, `BalanceService`, and `BalanceController`. Register routes:
   - `GET /api/balance` → controller.getMyBalances
   - `GET /api/balance/:leaveTypeId` → controller.getBalanceByType
   - `GET /api/balance/:leaveTypeId/remaining` → controller.getRemainingDays

3. Update `src/modules/leave/leave.routes.ts` — Add a new route `GET /api/leave/eligibility` that checks whether the employee has sufficient balance for a requested leave (query params: leaveTypeId, startDate, endDate). This calls `BalanceService.getRemainingDays` and compares against the calculated working days.

4. Update `src/app.ts` — Import and register `balanceRoutes` alongside existing `uptimeRoutes` and `leaveRoutes`.

5. Update `src/modules/balance/index.ts` — Add barrel exports for controller and routes.

Include Jest integration tests in `tests/integration/modules/balance/` for the HTTP endpoints.
