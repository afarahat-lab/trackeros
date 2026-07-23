# PLAN.md

## Phase 1: Phase 1: Knex configuration + LeaveType model, repository, and migration

Create the Knex configuration and the LeaveType catalog entity — the foundational lookup that LeaveRequest and LeaveBalance both reference.

Files to create/modify (approximately 5):
- `knexfile.ts` — Knex configuration reading DATABASE_URL from environment, with TypeScript support for migrations
- `src/modules/leave/leave.model.ts` — Define the `LeaveType` interface with fields: id (string), code (string), label (string), description (string), isActive (boolean), createdAt (Date), updatedAt (Date)
- `src/modules/leave/leave.repository.ts` — Define `ILeaveTypeRepository` interface (findAll, findById, findByCode, create) and `KnexLeaveTypeRepository` class implementing it using the Knex instance from the existing `src/shared/db/connection.ts`
- `migrations/001_create_leave_types.ts` — Knex migration: up creates `leave_types` table with columns matching LeaveType fields; down drops the table
- `tests/unit/modules/leave/leave-type.repository.test.ts` — Jest unit tests for KnexLeaveTypeRepository (mock Knex, test findAll returns active types, findById, findByCode)

This phase depends on the existing `src/shared/db/connection.ts` for the database pool. Read it before generating any code that references database connections.

## Phase 2: Phase 2: LeaveRequest model, repository, and migration

Create the LeaveRequest domain entity, its repository, and database migration.

Files to create/modify (approximately 4):
- `src/modules/leave/leave.model.ts` — ADD the `LeaveRequestStatus` enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) and the `LeaveRequest` interface with fields: id (string), employeeId (string), leaveTypeId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), rejectionReason (string | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt (Date), updatedAt (Date). Also define `CreateLeaveRequestDto` with: employeeId, leaveTypeId, startDate, endDate, reason (optional).
- `src/modules/leave/leave.repository.ts` — ADD `ILeaveRequestRepository` interface (findById, findByEmployeeId, findByStatus, create, updateStatus, findAll) and `KnexLeaveRequestRepository` class implementing it
- `migrations/002_create_leave_requests.ts` — Knex migration: up creates `leave_requests` table with FK references to `leave_types(id)`; down drops the table
- `tests/unit/modules/leave/leave-request.repository.test.ts` — Jest unit tests for KnexLeaveRequestRepository

This phase depends on `src/modules/leave/leave.model.ts` (LeaveType portion) and `src/modules/leave/leave.repository.ts` (ILeaveTypeRepository portion) from Phase 1. Read those files before generating any code. Also depends on `knexfile.ts` from Phase 1 for migration patterns.

## Phase 3: Phase 3: LeaveBalance model, repository, and migration

Create the LeaveBalance domain entity, its repository, and database migration.

Files to create/modify (approximately 4):
- `src/modules/leave/leave.model.ts` — ADD the `LeaveBalance` interface with fields: id (string), employeeId (string), leaveTypeId (string), fiscalYear (number), totalEntitlement (number), usedDays (number), pendingDays (number), remainingDays (number), carriedForward (number), createdAt (Date), updatedAt (Date). Also define `UpdateLeaveBalanceDto` with fields for incrementing usedDays/pendingDays.
- `src/modules/leave/leave.repository.ts` — ADD `ILeaveBalanceRepository` interface (findByEmployeeAndType, findByEmployeeId, findByEmployeeAndFiscalYear, upsert, updateBalance, create) and `KnexLeaveBalanceRepository` class implementing it
- `migrations/003_create_leave_balances.ts` — Knex migration: up creates `leave_balances` table with FK references to `leave_types(id)` and a unique constraint on (employeeId, leaveTypeId, fiscalYear); down drops the table
- `tests/unit/modules/leave/leave-balance.repository.test.ts` — Jest unit tests for KnexLeaveBalanceRepository

This phase depends on `src/modules/leave/leave.model.ts` (LeaveType and LeaveRequest portions) and `src/modules/leave/leave.repository.ts` (prior repository portions) from Phases 1-2. Read those files before generating any code. Also depends on `knexfile.ts` from Phase 1.

## Phase 4: Phase 4: Leave service — submit, approve, reject, cancel

Create the LeaveService with business logic for the full leave request lifecycle: submit, approve, reject, and cancel. The service orchestrates across LeaveRequest and LeaveBalance repositories.

Files to create/modify (approximately 3):
- `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods: submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>, rejectLeaveRequest(requestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>, cancelLeaveRequest(requestId: string, cancellerId: string): Promise<LeaveRequest>, getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>, getPendingLeaveRequests(): Promise<LeaveRequest[]>
- `src/modules/leave/leave.service.ts` — Implement `LeaveService` class. On submit: validate leave type exists, check balance has enough remainingDays, create LeaveRequest with status SUBMITTED, increment pendingDays on LeaveBalance. On approve: set status APPROVED, move pendingDays to usedDays. On reject: set status REJECTED, decrement pendingDays. On cancel: set status CANCELLED, decrement usedDays if previously approved, decrement pendingDays if submitted. Use transactions for balance mutations.
- `tests/unit/modules/leave/leave.service.test.ts` — Jest unit tests mocking ILeaveRequestRepository and ILeaveBalanceRepository, covering all lifecycle transitions and edge cases (insufficient balance, double-approve, cancel already-cancelled)

This phase depends on `src/modules/leave/leave.model.ts` (all types: LeaveType, LeaveRequest, LeaveRequestStatus, CreateLeaveRequestDto, LeaveBalance, UpdateLeaveBalanceDto) and `src/modules/leave/leave.repository.ts` (all repository interfaces: ILeaveTypeRepository, ILeaveRequestRepository, ILeaveBalanceRepository) from Phases 1-3. Read those files before generating any code.

## Phase 5: Phase 5: Leave controller and routes

Create the Fastify controller and route registration for the leave module, exposing REST endpoints for the leave lifecycle.

Files to create/modify (approximately 3):
- `src/modules/leave/leave.controller.ts` — Create `LeaveController` class that takes `ILeaveService` as a constructor dependency. Methods: submitLeave, approveLeave, rejectLeave, cancelLeave, getMyLeaveRequests, getPendingLeaveRequests. Each method extracts params/body from the Fastify request, calls the service, and returns the appropriate HTTP response. Use Zod (already in dependencies) for request body validation on submit.
- `src/modules/leave/leave.routes.ts` — Export `leaveRoutes` async function registering routes on FastifyInstance: POST /leave/requests (submit), PATCH /leave/requests/:id/approve, PATCH /leave/requests/:id/reject, PATCH /leave/requests/:id/cancel, GET /leave/requests (employee's own), GET /leave/requests/pending (manager view). Instantiate repositories and service with Knex from `src/shared/db/connection.ts`.
- `src/app.ts` — MODIFY: import and register `leaveRoutes` alongside the existing `uptimeRoutes`

This phase depends on `src/modules/leave/leave.service.interface.ts` and `src/modules/leave/leave.service.ts` from Phase 4, `src/modules/leave/leave.model.ts` from Phases 1-3, `src/modules/leave/leave.repository.ts` from Phases 1-3, and `src/shared/db/connection.ts` (existing). Read those files before generating any code. Also read `src/app.ts` and `src/modules/uptime/uptime.routes.ts` for the existing route registration pattern.

## Phase 6: Phase 6: Seed default leave types

Create a seed script that populates the `leave_types` table with the standard catalog entries: annual, sick, and emergency leave.

Files to create/modify (approximately 2):
- `seeds/001_seed_leave_types.ts` — Knex seed file that inserts rows for: { code: 'ANNUAL', label: 'Annual Leave', description: 'Paid time off for vacation or personal reasons', isActive: true }, { code: 'SICK', label: 'Sick Leave', description: 'Leave for illness or medical appointments', isActive: true }, { code: 'EMERGENCY', label: 'Emergency Leave', description: 'Leave for unforeseen emergencies', isActive: true }. Uses `knex('leave_types').insert(...).onConflict('code').ignore()` for idempotency.
- `knexfile.ts` — MODIFY: add the `seeds` configuration pointing to the `seeds/` directory

This phase depends on `knexfile.ts` and `migrations/001_create_leave_types.ts` from Phase 1. Read those files before generating any code.

## Phase 7: Phase 7: Leave balance service

Create the LeaveBalanceService for querying and computing employee leave balances.

Files to create/modify (approximately 3):
- `src/modules/leave/leave.service.interface.ts` — ADD `ILeaveBalanceService` interface with methods: getBalancesByEmployee(employeeId: string): Promise<LeaveBalance[]>, getBalanceByEmployeeAndType(employeeId: string, leaveTypeId: string): Promise<LeaveBalance | null>, getRemainingDays(employeeId: string, leaveTypeId: string): Promise<number>, initializeBalance(employeeId: string, leaveTypeId: string, fiscalYear: number, entitlement: number): Promise<LeaveBalance>
- `src/modules/leave/leave.service.ts` — ADD `LeaveBalanceService` class implementing ILeaveBalanceService. `getRemainingDays` computes `totalEntitlement + carriedForward - usedDays - pendingDays`. `initializeBalance` creates a new balance row for a given employee/type/fiscalYear combination.
- `tests/unit/modules/leave/leave-balance.service.test.ts` — Jest unit tests mocking ILeaveBalanceRepository, covering balance retrieval, remaining days calculation, and initialization

This phase depends on `src/modules/leave/leave.model.ts` (LeaveBalance interface) and `src/modules/leave/leave.repository.ts` (ILeaveBalanceRepository) from Phase 3. Read those files before generating any code.

## Phase 8: Phase 8: Balance routes and controller

Add REST endpoints for querying leave balances.

Files to create/modify (approximately 3):
- `src/modules/leave/leave.controller.ts` — ADD `BalanceController` class (or extend existing controller) with methods: getMyBalances, getMyBalanceByType. Takes ILeaveBalanceService as a dependency.
- `src/modules/leave/leave.routes.ts` — ADD balance routes: GET /leave/balances (employee's own balances), GET /leave/balances/:leaveTypeId (specific balance). Wire up BalanceController with LeaveBalanceService and KnexLeaveBalanceRepository.
- `tests/unit/modules/leave/balance.routes.test.ts` — Jest integration-style tests for balance endpoints using Fastify's inject method

This phase depends on `src/modules/leave/leave.service.interface.ts` (ILeaveBalanceService), `src/modules/leave/leave.service.ts` (LeaveBalanceService) from Phase 7, `src/modules/leave/leave.controller.ts` and `src/modules/leave/leave.routes.ts` from Phase 5, and `src/modules/leave/leave.repository.ts` from Phase 3. Read those files before generating any code.

## Phase 9: Phase 9: Module barrel export and integration tests

Create the module's public entry point and integration tests that verify the full leave lifecycle end-to-end.

Files to create/modify (approximately 3):
- `src/modules/leave/index.ts` — Barrel export file re-exporting all public types and symbols: LeaveType, LeaveRequest, LeaveRequestStatus, LeaveBalance, CreateLeaveRequestDto, UpdateLeaveBalanceDto from leave.model.ts; ILeaveTypeRepository, ILeaveRequestRepository, ILeaveBalanceRepository from leave.repository.ts; ILeaveService, ILeaveBalanceService from leave.service.interface.ts; leaveRoutes from leave.routes.ts. This is the module's public API surface.
- `tests/integration/leave/leave-lifecycle.test.ts` — Jest integration test that uses Fastify's inject method against a test app instance. Tests the full lifecycle: submit a leave request → verify status SUBMITTED → approve → verify APPROVED and balance updated → cancel → verify CANCELLED and balance restored. Also tests rejection flow and balance query endpoints.
- `src/app.ts` — VERIFY leaveRoutes is registered correctly (already done in Phase 5, confirm no drift)

This phase depends on all prior phases (1-8). Read `src/modules/leave/leave.model.ts`, `src/modules/leave/leave.repository.ts`, `src/modules/leave/leave.service.interface.ts`, `src/modules/leave/leave.service.ts`, `src/modules/leave/leave.controller.ts`, `src/modules/leave/leave.routes.ts`, and `src/app.ts` before generating any code.
