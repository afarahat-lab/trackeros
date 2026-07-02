# PLAN.md

## Phase 1: Phase 1: Shared infrastructure — enums, errors, and base repository

Create the shared infrastructure that all leave-related modules depend on.

Create `src/shared/types/index.ts` with:
- Enum `LeaveRequestStatus` with values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- Enum `EmploymentStatus` with values: ACTIVE, INACTIVE, TERMINATED

Create `src/shared/errors/index.ts` with base error classes:
- `NotFoundError` (extends Error, takes entityName and id)
- `ValidationError` (extends Error, takes message and optional fieldErrors map)
- `ConflictError` (extends Error, takes message)

Create `src/shared/db/base.repository.ts` with a generic abstract class `BaseRepository<T>` that wraps the pg Pool from `src/shared/db/connection.ts` (already exists — read it before generating). Provide: `findById(id: string): Promise<T | null>`, `findAll(filters?: Record<string, unknown>): Promise<T[]>`, `create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>`, `update(id: string, updates: Partial<T>): Promise<T | null>`, `delete(id: string): Promise<boolean>`. Use parameterized queries via the pg pool.

Include Jest unit tests in `tests/unit/shared/` for the error classes and base repository (mock the pg pool).

## Phase 2: Phase 2: LeaveType model and repository

Create the LeaveType domain model and repository. This is a lightweight lookup entity referenced by LeavePolicy and LeaveRequest.

Create `src/modules/leave-type/leave-type.model.ts` with:
- Interface `LeaveType` with fields: `id: string`, `code: string`, `label: string`, `description: string | null`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`

Create `src/modules/leave-type/leave-type.repository.ts` with:
- Interface `ILeaveTypeRepository` declaring: `findById(id: string): Promise<LeaveType | null>`, `findByCode(code: string): Promise<LeaveType | null>`, `findAll(): Promise<LeaveType[]>`, `create(dto: CreateLeaveTypeDto): Promise<LeaveType>`, `update(id: string, dto: UpdateLeaveTypeDto): Promise<LeaveType | null>`, `delete(id: string): Promise<boolean>`
- Class `LeaveTypeRepository` implementing `ILeaveTypeRepository`, extending `BaseRepository<LeaveType>` from `src/shared/db/base.repository.ts` (Phase 1). Use the pg pool from `src/shared/db/connection.ts`.
- DTOs `CreateLeaveTypeDto` (code, label, description?, isActive?) and `UpdateLeaveTypeDto` (Partial of create fields) defined in the same model file.

Create `src/modules/leave-type/index.ts` barrel export.

This phase depends on `src/shared/db/base.repository.ts` and `src/shared/db/connection.ts` from Phase 1 — read them before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-type/`.

## Phase 3: Phase 3: Employee model and repository

Create the Employee domain model and repository. Employees apply for leave; managers approve/reject.

Create `src/modules/employee/employee.model.ts` with:
- Interface `Employee` with fields: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: EmploymentStatus`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`
- Import `EmploymentStatus` from `src/shared/types/index.ts` (Phase 1)
- DTOs: `CreateEmployeeDto` and `UpdateEmployeeDto`

Create `src/modules/employee/employee.repository.ts` with:
- Interface `IEmployeeRepository` declaring: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(filters?: EmployeeFilters): Promise<Employee[]>`, `create(dto: CreateEmployeeDto): Promise<Employee>`, `update(id: string, dto: UpdateEmployeeDto): Promise<Employee | null>`, `softDelete(id: string): Promise<boolean>`
- Class `EmployeeRepository` implementing `IEmployeeRepository`, extending `BaseRepository<Employee>` from Phase 1

Create `src/modules/employee/index.ts` barrel export.

This phase depends on `src/shared/types/index.ts` and `src/shared/db/base.repository.ts` from Phase 1 — read them before generating.

Include Jest unit tests in `tests/unit/modules/employee/`.

## Phase 4: Phase 4: LeaveRequest model and repository

Create the LeaveRequest domain model and repository — the core entity of the leave management module.

Create `src/modules/leave/leave.model.ts` with:
- Interface `LeaveRequest` with fields: `id: string`, `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `rejectedBy: string | null`, `rejectedAt: Date | null`, `rejectionReason: string | null`, `createdAt: Date`, `updatedAt: Date`
- Import `LeaveRequestStatus` from `src/shared/types/index.ts` (Phase 1)
- DTOs: `CreateLeaveRequestDto` (employeeId, leaveTypeId, startDate, endDate, reason?) and `UpdateLeaveRequestDto` (Partial, excluding id/createdAt/updatedAt)

Create `src/modules/leave/leave.repository.ts` with:
- Interface `ILeaveRepository` declaring: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findByDateRange(start: Date, end: Date): Promise<LeaveRequest[]>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`, `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null>`, `updateStatus(id: string, status: LeaveRequestStatus, actorId: string, reason?: string): Promise<LeaveRequest | null>`
- Class `LeaveRepository` implementing `ILeaveRepository`, extending `BaseRepository<LeaveRequest>` from Phase 1

Create `src/modules/leave/index.ts` barrel export.

This phase depends on `src/shared/types/index.ts` and `src/shared/db/base.repository.ts` from Phase 1 — read them before generating.

Include Jest unit tests in `tests/unit/modules/leave/`.

## Phase 5: Phase 5: LeavePolicy model and repository

Create the LeavePolicy domain model and repository. Policies define rules like max days per leave type, accrual rates, etc.

Create `src/modules/policy/policy.model.ts` with:
- Interface `LeavePolicy` with fields: `id: string`, `leaveTypeId: string`, `name: string`, `description: string | null`, `maxDaysPerYear: number`, `maxConsecutiveDays: number | null`, `minNoticeDays: number`, `requiresApproval: boolean`, `allowNegativeBalance: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`
- DTOs: `CreateLeavePolicyDto` and `UpdateLeavePolicyDto`

Create `src/modules/policy/policy.repository.ts` with:
- Interface `ILeavePolicyRepository` declaring: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `findActive(): Promise<LeavePolicy[]>`, `create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>`, `update(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy | null>`, `delete(id: string): Promise<boolean>`
- Class `LeavePolicyRepository` implementing `ILeavePolicyRepository`, extending `BaseRepository<LeavePolicy>` from Phase 1

Create `src/modules/policy/index.ts` barrel export.

This phase depends on `src/shared/db/base.repository.ts` from Phase 1 and `src/modules/leave-type/leave-type.model.ts` from Phase 2 — read them before generating.

Include Jest unit tests in `tests/unit/modules/policy/`.

## Phase 6: Phase 6: Balance model and repository

Create the Balance domain model and repository for tracking employee leave balances.

Create `src/modules/balance/balance.model.ts` with:
- Interface `Balance` with fields: `id: string`, `employeeId: string`, `leaveTypeId: string`, `accruedDays: number`, `usedDays: number`, `pendingDays: number`, `year: number`, `createdAt: Date`, `updatedAt: Date`
- Computed property concept: `availableDays = accruedDays - usedDays - pendingDays` (document in comments; implement as a derived getter or method on the repository)
- DTOs: `CreateBalanceDto` and `UpdateBalanceDto`

Create `src/modules/balance/balance.repository.ts` with:
- Interface `IBalanceRepository` declaring: `findById(id: string): Promise<Balance | null>`, `findByEmployeeId(employeeId: string): Promise<Balance[]>`, `findByEmployeeAndLeaveType(employeeId: string, leaveTypeId: string, year: number): Promise<Balance | null>`, `create(dto: CreateBalanceDto): Promise<Balance>`, `update(id: string, dto: UpdateBalanceDto): Promise<Balance | null>`, `deductDays(id: string, days: number): Promise<Balance | null>`, `restoreDays(id: string, days: number): Promise<Balance | null>`
- Class `BalanceRepository` implementing `IBalanceRepository`, extending `BaseRepository<Balance>` from Phase 1

Create `src/modules/balance/index.ts` barrel export.

This phase depends on `src/shared/db/base.repository.ts` from Phase 1 — read it before generating.

Include Jest unit tests in `tests/unit/modules/balance/`.

## Phase 7: Phase 7: Database migrations for leave management tables

Create Knex migration files for all leave management tables. These migrations create the actual PostgreSQL tables that the repositories query.

Create migration files under a `migrations/` directory (or `src/db/migrations/` following project conventions):

1. Migration for `leave_types` table: id (uuid PK), code (varchar unique not null), label (varchar not null), description (text nullable), is_active (boolean default true), created_at (timestamptz), updated_at (timestamptz)

2. Migration for `employees` table: id (uuid PK), employee_number (varchar unique not null), first_name (varchar not null), last_name (varchar not null), email (varchar unique not null), manager_id (uuid nullable references employees), department (varchar nullable), hire_date (date not null), termination_date (date nullable), employment_status (varchar not null default 'ACTIVE'), created_at (timestamptz), updated_at (timestamptz), deleted_at (timestamptz nullable)

3. Migration for `leave_requests` table: id (uuid PK), employee_id (uuid not null references employees), leave_type_id (uuid not null references leave_types), start_date (date not null), end_date (date not null), reason (text nullable), status (varchar not null default 'DRAFT'), approved_by (uuid nullable references employees), approved_at (timestamptz nullable), rejected_by (uuid nullable references employees), rejected_at (timestamptz nullable), rejection_reason (text nullable), created_at (timestamptz), updated_at (timestamptz)

4. Migration for `leave_policies` table: id (uuid PK), leave_type_id (uuid not null references leave_types), name (varchar not null), description (text nullable), max_days_per_year (integer not null), max_consecutive_days (integer nullable), min_notice_days (integer not null default 0), requires_approval (boolean default true), allow_negative_balance (boolean default false), is_active (boolean default true), created_at (timestamptz), updated_at (timestamptz)

5. Migration for `balances` table: id (uuid PK), employee_id (uuid not null references employees), leave_type_id (uuid not null references leave_types), accrued_days (numeric(5,1) not null default 0), used_days (numeric(5,1) not null default 0), pending_days (numeric(5,1) not null default 0), year (integer not null), created_at (timestamptz), updated_at (timestamptz), UNIQUE constraint on (employee_id, leave_type_id, year)

Also create a Knexfile configuration if one does not already exist, reading DATABASE_URL from environment.

This phase depends on the domain models defined in Phases 2-6 for column reference — read `src/modules/leave-type/leave-type.model.ts`, `src/modules/employee/employee.model.ts`, `src/modules/leave/leave.model.ts`, `src/modules/policy/policy.model.ts`, and `src/modules/balance/balance.model.ts` before generating migrations to ensure column alignment.

## Phase 8: Phase 8: Leave service — business logic for leave lifecycle

Create the leave service layer implementing the full leave request lifecycle: submit, approve, reject, cancel.

Create `src/modules/leave/leave.service.interface.ts` with:
- Interface `ILeaveService` declaring: `submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approveLeaveRequest(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `rejectLeaveRequest(leaveRequestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>`, `cancelLeaveRequest(leaveRequestId: string, actorId: string): Promise<LeaveRequest>`, `getLeaveRequestById(id: string): Promise<LeaveRequest | null>`, `getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `getLeaveRequestsByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `getPendingApprovals(managerId: string): Promise<LeaveRequest[]>`

Create `src/modules/leave/leave.service.ts` with:
- Class `LeaveService` implementing `ILeaveService`
- Constructor injecting `ILeaveRepository`, `IEmployeeRepository`, `ILeavePolicyRepository`, `IBalanceRepository`
- `submitLeaveRequest`: validates employee is ACTIVE, checks no overlapping leave requests exist, validates against leave policy (min notice days, max consecutive days), creates request with DRAFT status then transitions to SUBMITTED
- `approveLeaveRequest`: validates approver is the employee's manager, transitions status to APPROVED, deducts from balance (pending → used)
- `rejectLeaveRequest`: validates rejector is the employee's manager, transitions status to REJECTED, restores pending balance
- `cancelLeaveRequest`: validates actor is the employee or their manager, transitions to CANCELLED, restores any pending balance
- Query methods delegate to repository

Update `src/modules/leave/index.ts` barrel export to include the service interface and class.

This phase depends on:
- `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` from Phase 4
- `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 3
- `src/modules/policy/policy.model.ts` and `src/modules/policy/policy.repository.ts` from Phase 5
- `src/modules/balance/balance.model.ts` and `src/modules/balance/balance.repository.ts` from Phase 6
- `src/shared/types/index.ts` and `src/shared/errors/index.ts` from Phase 1

Read all of these before generating.

Include Jest unit tests in `tests/unit/modules/leave/leave.service.spec.ts` mocking all repository dependencies.

## Phase 9: Phase 9: Leave controller and routes — HTTP API surface

Create the Fastify controller and routes for the leave management HTTP API.

Create `src/modules/leave/leave.controller.ts` with:
- Class `LeaveController` that takes `ILeaveService` in its constructor
- Methods: `submitLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`, `cancelLeaveRequest`, `getLeaveRequestById`, `getMyLeaveRequests`, `getPendingApprovals`
- Each method extracts params/body from the Fastify request, calls the service, and returns appropriate HTTP responses (201 for create, 200 for updates/queries, 404 for not found, 400/409 for validation/conflict errors)
- Use `NotFoundError`, `ValidationError`, `ConflictError` from `src/shared/errors/index.ts` (Phase 1) for error mapping

Create `src/modules/leave/leave.routes.ts` with:
- Fastify plugin function `leaveRoutes` registering routes:
  - `POST /api/leave/requests` — submit a new leave request (body: CreateLeaveRequestDto)
  - `GET /api/leave/requests/:id` — get a specific leave request
  - `GET /api/leave/requests/me` — get current employee's leave requests (employeeId from auth context/session)
  - `GET /api/leave/requests/pending` — get pending approvals for the current manager
  - `POST /api/leave/requests/:id/approve` — approve a leave request
  - `POST /api/leave/requests/:id/reject` — reject a leave request (body: { reason })
  - `POST /api/leave/requests/:id/cancel` — cancel a leave request
- Instantiate LeaveService with its repository dependencies (for now, use direct instantiation; DI container can be added later)

Update `src/modules/leave/index.ts` barrel export to include controller and routes.

Register the leave routes in `src/app.ts` (already exists — read it before modifying): add `app.register(leaveRoutes)`.

This phase depends on:
- `src/modules/leave/leave.service.ts` and `src/modules/leave/leave.service.interface.ts` from Phase 8
- `src/modules/leave/leave.model.ts` from Phase 4
- `src/shared/errors/index.ts` from Phase 1
- `src/app.ts` (existing file — read before modifying)

Read all of these before generating.

Include Jest integration tests in `tests/integration/modules/leave/` for the routes.

## Phase 10: Phase 10: Balance service and routes — leave balance tracking API

Create the balance service and HTTP routes to complete the "System tracks leave balances" requirement.

Create `src/modules/balance/balance.service.interface.ts` with:
- Interface `IBalanceService` declaring: `getEmployeeBalances(employeeId: string): Promise<Balance[]>`, `getEmployeeBalance(employeeId: string, leaveTypeId: string, year: number): Promise<Balance | null>`, `getAvailableDays(employeeId: string, leaveTypeId: string, year: number): Promise<number>`, `initializeBalance(dto: CreateBalanceDto): Promise<Balance>`, `accrueDays(employeeId: string, leaveTypeId: string, year: number, days: number): Promise<Balance>`

Create `src/modules/balance/balance.service.ts` with:
- Class `BalanceService` implementing `IBalanceService`
- Constructor injecting `IBalanceRepository`
- `getAvailableDays`: computes `accruedDays - usedDays - pendingDays`
- `accrueDays`: adds days to accruedDays, validates against LeavePolicy maxDaysPerYear
- Query methods delegate to repository

Create `src/modules/balance/balance.controller.ts` with:
- Class `BalanceController` taking `IBalanceService` in constructor
- Methods for each service operation, returning appropriate HTTP responses

Create `src/modules/balance/balance.routes.ts` with:
- Fastify plugin `balanceRoutes` registering:
  - `GET /api/balance/me` — current employee's balances for current year
  - `GET /api/balance/me/:leaveTypeId` — specific balance for current employee
  - `GET /api/balance/employee/:employeeId` — balances for a given employee (manager/HR access)

Update `src/modules/balance/index.ts` barrel export to include service, controller, and routes.

Register `balanceRoutes` in `src/app.ts`.

This phase depends on:
- `src/modules/balance/balance.model.ts` and `src/modules/balance/balance.repository.ts` from Phase 6
- `src/modules/policy/policy.model.ts` and `src/modules/policy/policy.repository.ts` from Phase 5
- `src/modules/employee/employee.repository.ts` from Phase 3
- `src/shared/errors/index.ts` from Phase 1
- `src/app.ts` (existing — read before modifying)

Read all of these before generating.

Include Jest unit tests in `tests/unit/modules/balance/balance.service.spec.ts` and integration tests in `tests/integration/modules/balance/`.
