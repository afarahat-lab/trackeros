# PLAN.md

## Phase 1: Phase 1: Shared foundation — enums, error types, and base repository

Create the foundational shared types that all downstream modules depend on.

Files to create:
- `src/shared/types/index.ts` — Define `LeaveType` enum (ANNUAL, SICK, EMERGENCY), `LeaveRequestStatus` enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and `EmploymentStatus` type ('ACTIVE' | 'INACTIVE' | 'TERMINATED'). These are the canonical enum/type names from the architecture.
- `src/shared/errors/index.ts` — Define `AppError` (abstract base), `NotFoundError`, `ValidationError`, and `ConflictError` classes extending `AppError`. Each carries a `statusCode`, `code` string, and optional `details`.
- `src/shared/base.repository.ts` — Define a generic `IBaseRepository<T>` interface with methods: `findById(id: string): Promise<T | null>`, `findAll(filter?: Partial<T>): Promise<T[]>`, `create(entity: Partial<T>): Promise<T>`, `update(id: string, entity: Partial<T>): Promise<T>`, `delete(id: string): Promise<void>`.
- `tests/unit/shared/types.spec.ts` — Jest tests verifying enum values exist and are correct.
- `tests/unit/shared/errors.spec.ts` — Jest tests verifying error classes instantiate correctly with proper statusCode and message.

No dependencies on prior phases — this is the first phase. The existing `src/shared/db/connection.ts` is available but not required for this phase.

## Phase 2: Phase 2: Employee module — model and repository

Create the Employee domain model and repository. This phase depends on `src/shared/types/index.ts` from Phase 1 (for EmploymentStatus) and `src/shared/base.repository.ts` from Phase 1 (for IBaseRepository). Read those files before generating any code.

Files to create:
- `src/modules/employee/employee.model.ts` — Define `Employee` interface with attributes: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: EmploymentStatus`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`. Import `EmploymentStatus` from `src/shared/types/index.ts`.
- `src/modules/employee/employee.repository.ts` — Implement `IEmployeeRepository` interface extending `IBaseRepository<Employee>` with additional methods: `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findActive(): Promise<Employee[]>`. Implement `EmployeeRepository` class using the pg pool from `src/shared/db/connection.ts` with parameterized SQL queries.
- `tests/unit/modules/employee/employee.repository.spec.ts` — Jest tests for EmployeeRepository with mocked pg pool, covering findById, findByEmployeeNumber, findByEmail, create, and update.

This phase depends on `src/shared/types/index.ts` and `src/shared/base.repository.ts` from Phase 1 — read them before generating any code that references their types.

## Phase 3: Phase 3: Leave policy module — model and repository

Create the LeavePolicy domain model and repository. This phase depends on `src/shared/types/index.ts` from Phase 1 (for LeaveType) and `src/shared/base.repository.ts` from Phase 1. Read those files before generating any code.

Files to create:
- `src/modules/policy/policy.model.ts` — Define `LeavePolicy` interface with attributes: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | undefined`, `maxAccumulation: number | undefined`, `minimumNoticeDays: number | undefined`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/index.ts`.
- `src/modules/policy/policy.repository.ts` — Implement `ILeavePolicyRepository` interface extending `IBaseRepository<LeavePolicy>` with additional methods: `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findActive(): Promise<LeavePolicy[]>`. Implement `LeavePolicyRepository` class using the pg pool from `src/shared/db/connection.ts`.
- `tests/unit/modules/policy/policy.repository.spec.ts` — Jest tests for LeavePolicyRepository with mocked pg pool.

This phase depends on `src/shared/types/index.ts` and `src/shared/base.repository.ts` from Phase 1 — read them before generating any code that references their types.

## Phase 4: Phase 4: LeaveRequest model, DTOs, and repository

Create the LeaveRequest domain model, DTOs, and repository. This is the core entity of the leave management feature.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for LeaveType, LeaveRequestStatus)
- `src/shared/base.repository.ts` from Phase 1 (for IBaseRepository)
- `src/shared/errors/index.ts` from Phase 1 (for NotFoundError)
Read those files before generating any code.

Files to create:
- `src/modules/leave/leave.model.ts` — Define `LeaveRequest` interface with all attributes from the architecture: `id: string`, `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `cancelledBy: string | null`, `cancelledAt: Date | null`, `cancellationReason: string | undefined`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveRequestDto` with fields: `employeeId: string`, `leaveTypeId: string`, `startDate: string` (ISO date), `endDate: string` (ISO date), `reason?: string`. Also define `UpdateLeaveRequestStatusDto` with `status: LeaveRequestStatus`, `approvedBy?: string`, `cancelledBy?: string`, `cancellationReason?: string`. Import `LeaveRequestStatus` from `src/shared/types/index.ts`.
- `src/modules/leave/leave.repository.ts` — Define `ILeaveRepository` interface extending `IBaseRepository<LeaveRequest>` with additional methods: `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findPendingByManagerId(managerId: string): Promise<LeaveRequest[]>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`. Implement `LeaveRepository` class using the pg pool from `src/shared/db/connection.ts` with parameterized SQL.
- `tests/unit/modules/leave/leave.repository.spec.ts` — Jest tests for LeaveRepository with mocked pg pool, covering create, findByEmployeeId, findByStatus, findOverlapping, and updateStatus.

This phase depends on `src/shared/types/index.ts`, `src/shared/base.repository.ts`, and `src/shared/errors/index.ts` from Phase 1 — read them before generating any code that references their types.

## Phase 5: Phase 5: Leave service — business logic for apply, approve, reject, cancel

Create the leave service with core business logic. This phase depends on the employee, policy, and leave repositories from Phases 2–4.

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods: `apply(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approve(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `reject(leaveRequestId: string, approverId: string): Promise<LeaveRequest>`, `cancel(leaveRequestId: string, cancelledById: string, reason?: string): Promise<LeaveRequest>`, `getByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `getPendingForManager(managerId: string): Promise<LeaveRequest[]>`. Import `LeaveRequest` and `CreateLeaveRequestDto` from `./leave.model`.
- `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor takes `IEmployeeRepository`, `ILeavePolicyRepository`, and `ILeaveRepository`. Business rules: (1) `apply` — validate employee exists and is ACTIVE, validate policy exists and isActive, validate startDate < endDate, check for overlapping requests via `findOverlapping`, set status to SUBMITTED; (2) `approve` — validate request exists and is SUBMITTED, validate approver is the employee's manager, set status to APPROVED with approvedBy/approvedAt; (3) `reject` — validate request exists and is SUBMITTED, validate approver is the employee's manager, set status to REJECTED; (4) `cancel` — validate request exists and is APPROVED or SUBMITTED, set status to CANCELLED with cancelledBy/cancelledAt/cancellationReason. Throw `NotFoundError` and `ValidationError` from `src/shared/errors/index.ts`.
- `tests/unit/modules/leave/leave.service.spec.ts` — Jest tests with mocked repositories covering apply (success, inactive employee, inactive policy, overlapping), approve (success, wrong manager, already processed), reject, cancel.

This phase depends on:
- `src/modules/employee/employee.repository.ts` from Phase 2 (for IEmployeeRepository)
- `src/modules/policy/policy.repository.ts` from Phase 3 (for ILeavePolicyRepository)
- `src/modules/leave/leave.model.ts` and `src/modules/leave/leave.repository.ts` from Phase 4
- `src/shared/errors/index.ts` from Phase 1
Read those files before generating any code.

## Phase 6: Phase 6: Leave routes — Fastify REST endpoints

Create the Fastify route handlers for the leave management API. This phase depends on the leave service from Phase 5.

Files to create:
- `src/modules/leave/leave.routes.ts` — Export `leaveRoutes` async function that registers the following endpoints on a FastifyInstance:
  - `POST /api/leave` — apply for leave. Body validated as `CreateLeaveRequestDto`. Calls `leaveService.apply()`. Returns 201 with the created LeaveRequest.
  - `GET /api/leave/employee/:employeeId` — get employee's leave requests. Calls `leaveService.getByEmployeeId()`.
  - `GET /api/leave/manager/:managerId/pending` — get pending requests for a manager. Calls `leaveService.getPendingForManager()`.
  - `PATCH /api/leave/:id/approve` — approve a leave request. Body: `{ approverId: string }`. Calls `leaveService.approve()`.
  - `PATCH /api/leave/:id/reject` — reject a leave request. Body: `{ approverId: string }`. Calls `leaveService.reject()`.
  - `PATCH /api/leave/:id/cancel` — cancel a leave request. Body: `{ cancelledById: string, reason?: string }`. Calls `leaveService.cancel()`.
  All endpoints wrap calls in try/catch, mapping `NotFoundError` → 404, `ValidationError` → 400, `ConflictError` → 409, others → 500.
- `tests/unit/modules/leave/leave.routes.spec.ts` — Jest tests using Fastify's `inject()` method with a mocked LeaveService, covering all six endpoints for success and error cases.

This phase depends on:
- `src/modules/leave/leave.service.interface.ts` and `src/modules/leave/leave.service.ts` from Phase 5
- `src/modules/leave/leave.model.ts` from Phase 4 (for CreateLeaveRequestDto)
- `src/shared/errors/index.ts` from Phase 1
Read those files before generating any code.

## Phase 7: Phase 7: Wire leave routes into the Fastify app

Register the leave routes in the Fastify application and create the module's public barrel export.

Files to create/modify:
- `src/modules/leave/index.ts` — Barrel export file. Export `LeaveRequest`, `CreateLeaveRequestDto`, `UpdateLeaveRequestStatusDto` from `./leave.model`, `ILeaveRepository`, `LeaveRepository` from `./leave.repository`, `ILeaveService` from `./leave.service.interface`, `LeaveService` from `./leave.service`, and `leaveRoutes` from `./leave.routes`.
- `src/app.ts` — MODIFY this existing file. Add `import { leaveRoutes } from './modules/leave/leave.routes'` and register with `app.register(leaveRoutes)`. Keep the existing uptimeRoutes registration intact.
- `tests/integration/leave/leave.api.spec.ts` — Integration test that builds the Fastify app, uses `inject()` against the real endpoints, and verifies end-to-end behavior with a test database (or mocked repositories injected via the service constructor).

This phase depends on:
- `src/modules/leave/leave.routes.ts` from Phase 6
- `src/modules/leave/leave.model.ts` from Phase 4
- `src/modules/leave/leave.repository.ts` from Phase 4
- `src/modules/leave/leave.service.ts` from Phase 5
- `src/app.ts` (existing file — read before modifying)
Read those files before generating any code.

## Phase 8: Phase 8: Balance module — model and repository

Create the Balance domain model and repository for tracking leave balances per employee per leave type.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for LeaveType)
- `src/shared/base.repository.ts` from Phase 1 (for IBaseRepository)
Read those files before generating any code.

Files to create:
- `src/modules/balance/balance.model.ts` — Define `LeaveBalance` interface with attributes: `id: string`, `employeeId: string`, `leaveTypeId: string`, `entitledDays: number`, `usedDays: number`, `pendingDays: number`, `availableDays: number` (computed as entitledDays - usedDays - pendingDays), `year: number`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveBalanceDto` with `employeeId: string`, `leaveTypeId: string`, `entitledDays: number`, `year: number`. Also define `UpdateLeaveBalanceDto` with optional `usedDays?: number`, `pendingDays?: number`.
- `src/modules/balance/balance.repository.ts` — Define `ILeaveBalanceRepository` interface extending `IBaseRepository<LeaveBalance>` with additional methods: `findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>`, `findByEmployeeLeaveTypeAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>`, `upsert(entity: Partial<LeaveBalance>): Promise<LeaveBalance>`. Implement `LeaveBalanceRepository` class using the pg pool from `src/shared/db/connection.ts`.
- `tests/unit/modules/balance/balance.repository.spec.ts` — Jest tests for LeaveBalanceRepository with mocked pg pool.

This phase depends on `src/shared/types/index.ts` and `src/shared/base.repository.ts` from Phase 1 — read them before generating any code that references their types.

## Phase 9: Phase 9: Balance service — balance deduction on approval and restoration on cancellation

Create the balance service and integrate it with the leave service so that leave approvals deduct from balances and cancellations restore them.

Files to create:
- `src/modules/balance/balance.service.interface.ts` — Define `IBalanceService` interface with methods: `getBalances(employeeId: string, year: number): Promise<LeaveBalance[]>`, `initializeBalance(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>`, `deductPending(employeeId: string, leaveTypeId: string, days: number, year: number): Promise<LeaveBalance>`, `commitDeduction(employeeId: string, leaveTypeId: string, days: number, year: number): Promise<LeaveBalance>`, `restorePending(employeeId: string, leaveTypeId: string, days: number, year: number): Promise<LeaveBalance>`.
- `src/modules/balance/balance.service.ts` — Implement `BalanceService` class implementing `IBalanceService`. Constructor takes `ILeaveBalanceRepository`. Business rules: `deductPending` increases pendingDays and recalculates availableDays; `commitDeduction` moves days from pending to used; `restorePending` decreases pendingDays. Throw `ValidationError` if insufficient balance.
- `tests/unit/modules/balance/balance.service.spec.ts` — Jest tests with mocked repository.

Files to modify:
- `src/modules/leave/leave.service.ts` — MODIFY the existing LeaveService to accept an optional `IBalanceService` in its constructor. In the `approve` method, after setting status to APPROVED, call `balanceService.commitDeduction()`. In the `cancel` method, if the request was APPROVED, call `balanceService.restorePending()`. If `IBalanceService` is not provided, skip balance operations (graceful degradation).

This phase depends on:
- `src/modules/leave/leave.service.ts` from Phase 5 (read before modifying)
- `src/modules/leave/leave.model.ts` from Phase 4
- `src/modules/balance/balance.model.ts` and `src/modules/balance/balance.repository.ts` from Phase 8
- `src/shared/errors/index.ts` from Phase 1
Read those files before generating any code.

## Phase 10: Phase 10: Database migrations — Knex schema for leave, employee, policy, balance

Create Knex database migrations and seeds for all leave management tables. This is the final phase that makes the module fully operational with a real database.

Files to create:
- `knexfile.ts` — Knex configuration reading DATABASE_URL from environment, with migrations directory `./migrations` and seeds directory `./seeds`.
- `migrations/001_create_employees.ts` — Create `employees` table with columns: id (uuid, PK), employee_number (varchar, unique, not null), first_name, last_name, email (unique), manager_id (nullable FK to employees), department, hire_date, termination_date, employment_status (varchar, default 'ACTIVE'), created_at, updated_at, deleted_at.
- `migrations/002_create_leave_policies.ts` — Create `leave_policies` table with columns: id (uuid, PK), policy_name, leave_type (varchar, not null), entitlement_days (integer, not null), accrual_rate (decimal, nullable), max_accumulation (decimal, nullable), minimum_notice_days (integer, nullable), requires_manager_approval (boolean, default true), is_active (boolean, default true), created_at, updated_at.
- `migrations/003_create_leave_requests.ts` — Create `leave_requests` table with columns: id (uuid, PK), employee_id (FK to employees), leave_type_id (FK to leave_policies), start_date (date, not null), end_date (date, not null), reason (text, nullable), status (varchar, default 'SUBMITTED'), approved_by (nullable FK to employees), approved_at (nullable timestamp), cancelled_by (nullable FK to employees), cancelled_at (nullable timestamp), cancellation_reason (text, nullable), created_at, updated_at. Add CHECK constraint ensuring end_date >= start_date.
- `migrations/004_create_leave_balances.ts` — Create `leave_balances` table with columns: id (uuid, PK), employee_id (FK to employees), leave_type_id (FK to leave_policies), entitled_days (decimal, not null), used_days (decimal, default 0), pending_days (decimal, default 0), year (integer, not null), created_at, updated_at. Add UNIQUE constraint on (employee_id, leave_type_id, year).

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for enum values used in CHECK constraints)
- `src/shared/db/connection.ts` (existing — Knex will use the same DATABASE_URL)
Read those files before generating any code.
