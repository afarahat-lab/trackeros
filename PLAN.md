# PLAN.md

## Phase 1: Phase 1: Balance domain model and repository interfaces

Create the balance module domain model and repository interfaces.

Create `src/modules/balance/balance.model.ts` with:
- `LeaveBalanceStatus` enum (ACTIVE, EXHAUSTED, FROZEN, CLOSED)
- `BalanceAdjustmentStatus` enum (PENDING, APPLIED, REVERSED)
- `AdjustmentType` type alias: `'DEBIT' | 'CREDIT'`
- `LeaveBalance` interface with fields: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays (derived as totalEntitlement - usedDays), fiscalYear, status (LeaveBalanceStatus), createdAt, updatedAt
- `BalanceAdjustment` interface with fields: id, leaveBalanceId, leaveRequestId (string | null), adjustmentType (AdjustmentType), amountDays, reason, performedBy (string | null), status (BalanceAdjustmentStatus), appliedAt (Date | null), createdAt, updatedAt
- `CreateLeaveBalanceDto` interface with: employeeId, policyId, totalEntitlement, fiscalYear
- `CreateBalanceAdjustmentDto` interface with: leaveBalanceId, leaveRequestId (optional), adjustmentType, amountDays, reason, performedBy (optional)

Create `src/modules/balance/balance.repository.ts` with:
- `ILeaveBalanceRepository` interface: findByEmployeePolicyFiscalYear(employeeId, policyId, fiscalYear), findById(id), create(dto), updateUsedDays(id, usedDays), findAllByEmployeeId(employeeId)
- `IBalanceAdjustmentRepository` interface: findByLeaveBalanceId(leaveBalanceId), create(dto), updateStatus(id, status, appliedAt)

Create `tests/unit/modules/balance/balance.model.test.ts` with Jest tests verifying:
- remainingDays is correctly derived as totalEntitlement - usedDays
- CreateLeaveBalanceDto and CreateBalanceAdjustmentDto shape validation
- AdjustmentType only accepts 'DEBIT' or 'CREDIT'

This phase has no dependencies on prior phases — it is the foundation for all subsequent balance phases.

## Phase 2: Phase 2: Database migrations for leave_balances and balance_adjustments tables

Create Knex migrations for the balance module's database tables.

Create `src/modules/balance/migrations/001_create_leave_balances.ts` with a Knex migration that:
- Creates `leave_balances` table with columns: id (uuid, primary key, default uuid_generate_v4()), employee_id (uuid, not null), policy_id (uuid, not null), total_entitlement (decimal, not null), used_days (decimal, not null, default 0), fiscal_year (integer, not null), status (varchar, not null, default 'ACTIVE'), created_at (timestamptz, not null, default now()), updated_at (timestamptz, not null, default now())
- Adds a unique constraint on (employee_id, policy_id, fiscal_year)
- Adds foreign key references to employees and leave_policies tables (use ON DELETE RESTRICT)
- Down migration drops the table

Create `src/modules/balance/migrations/002_create_balance_adjustments.ts` with a Knex migration that:
- Creates `balance_adjustments` table with columns: id (uuid, primary key, default uuid_generate_v4()), leave_balance_id (uuid, not null, references leave_balances), leave_request_id (uuid, nullable), adjustment_type (varchar, not null, check IN ('DEBIT','CREDIT')), amount_days (decimal, not null, check > 0), reason (text, not null), performed_by (uuid, nullable), status (varchar, not null, default 'PENDING'), applied_at (timestamptz, nullable), created_at (timestamptz, not null, default now()), updated_at (timestamptz, not null, default now())
- Adds foreign key on leave_balance_id referencing leave_balances(id) ON DELETE RESTRICT
- Down migration drops the table

This phase depends on `src/modules/balance/balance.model.ts` from Phase 1 — read it before generating migrations to ensure column names and types match the interface fields exactly.

## Phase 3: Phase 3: Knex repository implementations

Implement the Knex-based repository classes that satisfy the interfaces from Phase 1.

Create `src/modules/balance/balance.repository.knex.ts` with:
- `KnexLeaveBalanceRepository` class implementing `ILeaveBalanceRepository` from `src/modules/balance/balance.repository.ts`. Methods: findByEmployeePolicyFiscalYear (query leave_balances by employee_id, policy_id, fiscal_year), findById, create (insert into leave_balances, return created row), updateUsedDays (update used_days and updated_at), findAllByEmployeeId. Use the Knex instance from `src/shared/db/connection.ts` (read that file to understand the connection pattern — note it currently exports a `pg.Pool`, so this phase should also create a Knex instance wrapper).

Create `src/shared/db/knex.ts` that exports a configured Knex instance using the DATABASE_URL from `src/shared/db/connection.ts` or directly from process.env.

Create `tests/unit/modules/balance/balance.repository.knex.test.ts` with Jest tests that mock the Knex instance and verify:
- findByEmployeePolicyFiscalYear constructs correct where clauses
- create inserts and returns the row
- updateUsedDays updates only used_days and updated_at columns

This phase depends on:
- `src/modules/balance/balance.model.ts` from Phase 1 (for LeaveBalance, CreateLeaveBalanceDto types)
- `src/modules/balance/balance.repository.ts` from Phase 1 (for ILeaveBalanceRepository interface)
- `src/shared/db/connection.ts` (existing — read for connection pattern)

## Phase 4: Phase 4: Balance service interface and implementation

Create the balance service interface and its implementation.

Create `src/modules/balance/balance.service.interface.ts` with:
- `IBalanceService` interface declaring: getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance>, getBalancesForEmployee(employeeId: string): Promise<LeaveBalance[]>, createBalance(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>, applyAdjustment(dto: CreateBalanceAdjustmentDto): Promise<BalanceAdjustment>

Create `src/modules/balance/balance.service.ts` with:
- `BalanceService` class implementing `IBalanceService`. Constructor takes `ILeaveBalanceRepository` and `IBalanceAdjustmentRepository`. The `applyAdjustment` method must: (1) validate the balance exists, (2) for DEBIT adjustments verify usedDays + amountDays does not exceed totalEntitlement, (3) create the adjustment record with status PENDING, (4) update the balance's usedDays (increment for DEBIT, decrement for CREDIT), (5) update the adjustment status to APPLIED with appliedAt set, (6) update balance status to EXHAUSTED if remainingDays reaches 0. All operations within a single database transaction using Knex.

Create `tests/unit/modules/balance/balance.service.test.ts` with Jest tests:
- getBalance delegates to repository correctly
- applyAdjustment DEBIT increases usedDays and sets adjustment to APPLIED
- applyAdjustment CREDIT decreases usedDays
- applyAdjustment throws when DEBIT would exceed totalEntitlement
- applyAdjustment sets balance status to EXHAUSTED when remainingDays reaches 0

This phase depends on:
- `src/modules/balance/balance.model.ts` from Phase 1 (LeaveBalance, BalanceAdjustment, CreateLeaveBalanceDto, CreateBalanceAdjustmentDto, LeaveBalanceStatus, BalanceAdjustmentStatus, AdjustmentType)
- `src/modules/balance/balance.repository.ts` from Phase 1 (ILeaveBalanceRepository, IBalanceAdjustmentRepository)
- `src/modules/balance/balance.repository.knex.ts` from Phase 3 (KnexLeaveBalanceRepository — read for constructor signature)

## Phase 5: Phase 5: KnexBalanceAdjustmentRepository and balance controller

Implement the adjustment repository and the balance HTTP controller.

Create `src/modules/balance/balance.repository.knex.ts` — extend the existing file from Phase 3 by adding:
- `KnexBalanceAdjustmentRepository` class implementing `IBalanceAdjustmentRepository` from `src/modules/balance/balance.repository.ts`. Methods: findByLeaveBalanceId (query balance_adjustments by leave_balance_id, ordered by created_at DESC), create (insert into balance_adjustments, return created row), updateStatus (update status, applied_at, and updated_at by id).

Create `src/modules/balance/balance.controller.ts` with:
- `BalanceController` class. Constructor takes `IBalanceService`. Methods:
  - `getBalance(req, reply)`: extracts employeeId, policyId, fiscalYear from query params, calls service.getBalance, returns 200 with the balance
  - `getBalancesForEmployee(req, reply)`: extracts employeeId from params, calls service.getBalancesForEmployee, returns 200 with balances array
  - `createBalance(req, reply)`: validates body against CreateLeaveBalanceDto shape, calls service.createBalance, returns 201
  - `applyAdjustment(req, reply)`: validates body against CreateBalanceAdjustmentDto shape, calls service.applyAdjustment, returns 201

Create `tests/unit/modules/balance/balance.controller.test.ts` with Jest tests:
- getBalance returns 200 with balance when found
- getBalance returns 404 when balance not found
- createBalance returns 201 on success
- applyAdjustment returns 201 on success
- applyAdjustment returns 400 when DEBIT would exceed entitlement

This phase depends on:
- `src/modules/balance/balance.model.ts` from Phase 1 (all types)
- `src/modules/balance/balance.repository.ts` from Phase 1 (IBalanceAdjustmentRepository)
- `src/modules/balance/balance.repository.knex.ts` from Phase 3 (read existing file before extending)
- `src/modules/balance/balance.service.interface.ts` from Phase 4 (IBalanceService)
- `src/modules/balance/balance.service.ts` from Phase 4 (BalanceService)

## Phase 6: Phase 6: Balance routes

Create the Fastify route definitions for the balance module.

Create `src/modules/balance/balance.routes.ts` with:
- `balanceRoutes` async function that registers the following endpoints on a FastifyInstance:
  - `GET /balances` — calls BalanceController.getBalance (query params: employeeId, policyId, fiscalYear)
  - `GET /balances/:employeeId` — calls BalanceController.getBalancesForEmployee
  - `POST /balances` — calls BalanceController.createBalance (body validated as CreateLeaveBalanceDto)
  - `POST /balances/adjustments` — calls BalanceController.applyAdjustment (body validated as CreateBalanceAdjustmentDto)
- Each route handler wraps the controller call in try/catch, logs errors via request.log.error, and returns appropriate HTTP status codes (404 for not-found, 400 for validation/business rule failures, 500 for unexpected errors)
- The function must instantiate the full dependency chain: Knex instance → KnexLeaveBalanceRepository + KnexBalanceAdjustmentRepository → BalanceService → BalanceController

Create `tests/unit/modules/balance/balance.routes.test.ts` with Jest tests using Fastify's inject method:
- GET /balances returns 200 with balance data
- GET /balances/:employeeId returns 200 with balances array
- POST /balances returns 201
- POST /balances/adjustments returns 201

This phase depends on:
- `src/modules/balance/balance.model.ts` from Phase 1 (CreateLeaveBalanceDto, CreateBalanceAdjustmentDto)
- `src/modules/balance/balance.repository.knex.ts` from Phase 3 and Phase 5 (KnexLeaveBalanceRepository, KnexBalanceAdjustmentRepository)
- `src/modules/balance/balance.service.ts` from Phase 4 (BalanceService)
- `src/modules/balance/balance.controller.ts` from Phase 5 (BalanceController)
- `src/shared/db/knex.ts` from Phase 3 (Knex instance)
- `src/modules/uptime/uptime.routes.ts` (existing — read for the Fastify route registration pattern)

## Phase 7: Phase 7: Module barrel export and app registration

Create the balance module's public entry point and register routes in the application.

Create `src/modules/balance/index.ts` that re-exports the public API of the balance module:
- Re-export all types from `./balance.model` (LeaveBalance, BalanceAdjustment, LeaveBalanceStatus, BalanceAdjustmentStatus, AdjustmentType, CreateLeaveBalanceDto, CreateBalanceAdjustmentDto)
- Re-export `ILeaveBalanceRepository`, `IBalanceAdjustmentRepository` from `./balance.repository`
- Re-export `IBalanceService` from `./balance.service.interface`
- Re-export `BalanceService` from `./balance.service`
- Re-export `BalanceController` from `./balance.controller`
- Re-export `balanceRoutes` from `./balance.routes`
- Re-export `KnexLeaveBalanceRepository`, `KnexBalanceAdjustmentRepository` from `./balance.repository.knex`

Update `src/app.ts` to register the balance routes. Read the existing file first — it currently registers `uptimeRoutes`. Add `import { balanceRoutes } from './modules/balance/balance.routes'` and call `app.register(balanceRoutes)` after the existing uptimeRoutes registration.

This phase depends on:
- `src/modules/balance/balance.model.ts` from Phase 1
- `src/modules/balance/balance.repository.ts` from Phase 1
- `src/modules/balance/balance.repository.knex.ts` from Phases 3 and 5
- `src/modules/balance/balance.service.interface.ts` from Phase 4
- `src/modules/balance/balance.service.ts` from Phase 4
- `src/modules/balance/balance.controller.ts` from Phase 5
- `src/modules/balance/balance.routes.ts` from Phase 6
- `src/app.ts` (existing — read before modifying)
