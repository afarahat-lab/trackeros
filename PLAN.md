# PLAN.md

## Phase 1: Phase 1: Shared types and base infrastructure

Create three foundational files that all subsequent phases depend on:

1. `src/shared/types/index.ts` — Define the canonical enums:
   - `LeaveType` enum with values `ANNUAL`, `SICK`, `EMERGENCY`
   - `LeaveRequestStatus` enum with values `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
   - `LeaveBalanceStatus` enum with values `ACTIVE`, `EXHAUSTED`, `EXPIRED`

2. `src/shared/error-types.ts` — Define base error classes:
   - `AppError` (abstract base extending Error, with `statusCode: number` and `code: string`)
   - `NotFoundError` (extends AppError, statusCode 404)
   - `ValidationError` (extends AppError, statusCode 400, carries `details: unknown[]`)
   - `ConflictError` (extends AppError, statusCode 409)
   - `UnauthorizedError` (extends AppError, statusCode 401)

3. `src/shared/base-repository.ts` — Define a generic `BaseRepository<T>` abstract class with:
   - Constructor taking a Knex instance (import from knex, not pg Pool directly)
   - Abstract `tableName: string` property
   - `findById(id: string): Promise<T | null>`
   - `findAll(filter?: Partial<T>): Promise<T[]>`
   - `create(data: Partial<T>): Promise<T>`
   - `update(id: string, data: Partial<T>): Promise<T | null>`
   - `delete(id: string): Promise<boolean>`

Include Jest unit tests in `tests/unit/shared/` for error-types and base-repository. This phase has no dependencies on any prior phase files.

## Phase 2: Phase 2: LeavePolicy model and repository

Create the policy module's domain model and repository together so Aider sees both the interface fields and their usage in a single context.

Files to create:
- `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with attributes: `id: string`, `policyName: string`, `leaveTypeId: string`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Also define `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `create(data: Partial<LeavePolicy>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`.

- `src/modules/policy/policy.repository.ts` — Implement `PolicyRepository` class that extends `BaseRepository<LeavePolicy>` from `src/shared/base-repository.ts` (Phase 1) and implements `ILeavePolicyRepository`. Override `tableName` to return `'leave_policies'`. Implement `findByLeaveTypeId` using Knex query. Constructor takes a Knex instance.

This phase depends on `src/shared/types/index.ts` from Phase 1 for the `LeaveType` enum (used as `leaveTypeId`), and `src/shared/base-repository.ts` from Phase 1 for the `BaseRepository` class. Read both before generating any code.

Include Jest unit tests in `tests/unit/modules/policy/`.

## Phase 3: Phase 3: LeaveBalance model and repository

Create the balance module's domain model and repository together.

Files to create:
- `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` interface with attributes: `id: string`, `employeeId: string`, `leaveTypeId: string`, `policyId: string`, `totalEntitlement: number`, `usedDays: number`, `remainingDays: number`, `pendingDays: number`, `fiscalYear: number`, `status: LeaveBalanceStatus`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveBalanceStatus` from `src/shared/types/index.ts`. Also define `ILeaveBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeAndType(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `findByEmployee(employeeId: string): Promise<LeaveBalance[]>`, `create(data: Partial<LeaveBalance>): Promise<LeaveBalance>`, `update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>`, `deductDays(id: string, days: number): Promise<LeaveBalance | null>`, `restoreDays(id: string, days: number): Promise<LeaveBalance | null>`.

- `src/modules/balance/balance.repository.ts` — Implement `BalanceRepository` class extending `BaseRepository<LeaveBalance>` from `src/shared/base-repository.ts` (Phase 1) and implementing `ILeaveBalanceRepository`. Override `tableName` to return `'leave_balances'`. Implement `findByEmployeeAndType`, `findByEmployee`, `deductDays` (decrements `usedDays` and `remainingDays` atomically), and `restoreDays` (increments `remainingDays` and decrements `usedDays`). Constructor takes a Knex instance.

This phase depends on: `src/shared/types/index.ts` from Phase 1 (for `LeaveBalanceStatus`), `src/shared/base-repository.ts` from Phase 1 (for `BaseRepository`), and `src/modules/policy/policy.model.ts` from Phase 2 (for `policyId` type reference). Read all three before generating any code.

Include Jest unit tests in `tests/unit/modules/balance/`.

## Phase 4: Phase 4: LeaveRequest model and repository

Create the leave module's domain model, DTOs, and repository together.

Files to create:
- `src/modules/leave/leave.model.ts` — Define:
  - `LeaveRequest` interface with all canonical attributes: `id: string`, `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `rejectedBy: string | null`, `rejectedAt: Date | null`, `rejectionReason: string | null`, `cancelledBy: string | null`, `cancelledAt: Date | null`, `cancellationReason: string | null`, `durationDays: number`, `isEmergency: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveRequestStatus` from `src/shared/types/index.ts`.
  - `CreateLeaveRequestDto` interface with: `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason?: string`, `isEmergency?: boolean`.
  - `ILeaveRepository` interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `findPendingByManager(managerId: string): Promise<LeaveRequest[]>`, `create(data: CreateLeaveRequestDto): Promise<LeaveRequest>`, `updateStatus(id: string, status: LeaveRequestStatus, actorId: string, reason?: string): Promise<LeaveRequest | null>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`.

- `src/modules/leave/leave.repository.ts` — Implement `LeaveRepository` class extending `BaseRepository<LeaveRequest>` from `src/shared/base-repository.ts` (Phase 1) and implementing `ILeaveRepository`. Override `tableName` to return `'leave_requests'`. Implement `findByEmployee`, `findPendingByManager` (joins to an employee-manager relationship), `create` (computes `durationDays` from start/end dates, sets initial status to `SUBMITTED`), `updateStatus` (handles APPROVED/REJECTED/CANCELLED transitions with actor tracking), and `findOverlapping` (checks for date-range overlaps for the same employee). Constructor takes a Knex instance.

This phase depends on: `src/shared/types/index.ts` from Phase 1 (for `LeaveRequestStatus`), `src/shared/base-repository.ts` from Phase 1 (for `BaseRepository`), `src/shared/error-types.ts` from Phase 1 (for `NotFoundError`, `ConflictError`). Read all three before generating any code.

Include Jest unit tests in `tests/unit/modules/leave/`.

## Phase 5: Phase 5: Leave service layer

Create the leave module's service layer that orchestrates leave request creation, approval/rejection/cancellation, and balance management.

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods:
  - `submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`
  - `approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>`
  - `rejectLeaveRequest(requestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>`
  - `cancelLeaveRequest(requestId: string, cancellerId: string, reason: string): Promise<LeaveRequest>`
  - `getEmployeeLeaveRequests(employeeId: string): Promise<LeaveRequest[]>`
  - `getPendingRequestsForManager(managerId: string): Promise<LeaveRequest[]>`
  - `getLeaveRequestById(requestId: string): Promise<LeaveRequest | null>`

- `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor takes `ILeaveRepository` and `ILeaveBalanceRepository` (injected). Business logic:
  - `submitLeaveRequest`: validates no overlapping requests exist, computes duration, creates the request, updates the balance's `pendingDays`.
  - `approveLeaveRequest`: validates request is in SUBMITTED status, sets status to APPROVED with approver tracking, deducts days from the employee's balance (calls `deductDays` on `ILeaveBalanceRepository`), decrements `pendingDays`.
  - `rejectLeaveRequest`: validates request is in SUBMITTED status, sets status to REJECTED with rejector tracking, decrements `pendingDays` on balance.
  - `cancelLeaveRequest`: validates request is in APPROVED status, sets status to CANCELLED, restores days to balance (calls `restoreDays`).

This phase depends on: `src/modules/leave/leave.model.ts` from Phase 4 (for `LeaveRequest`, `CreateLeaveRequestDto`, `ILeaveRepository`), `src/modules/balance/balance.model.ts` from Phase 3 (for `ILeaveBalanceRepository`), `src/shared/types/index.ts` from Phase 1 (for `LeaveRequestStatus`), `src/shared/error-types.ts` from Phase 1 (for `NotFoundError`, `ConflictError`, `ValidationError`). Read all four before generating any code.

Include Jest unit tests in `tests/unit/modules/leave/` mocking both repository dependencies.

## Phase 6: Phase 6: Leave controller

Create the leave module's controller that handles HTTP request/response mapping.

Files to create:
- `src/modules/leave/leave.controller.ts` — Implement `LeaveController` class. Constructor takes `ILeaveService` (injected). Methods (each returns a Fastify-compatible handler function or plain async methods that the routes layer will wrap):
  - `submitLeave(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Parses body as `CreateLeaveRequestDto`, calls `leaveService.submitLeaveRequest`, returns 201 with the created `LeaveRequest`.
  - `approveLeave(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `requestId` from params, `approverId` from authenticated user context, calls `leaveService.approveLeaveRequest`, returns 200.
  - `rejectLeave(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `requestId` from params, `rejectionReason` from body, `rejectorId` from auth context, calls `leaveService.rejectLeaveRequest`, returns 200.
  - `cancelLeave(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `requestId` from params, `cancellationReason` from body, `cancellerId` from auth context, calls `leaveService.cancelLeaveRequest`, returns 200.
  - `getMyRequests(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `employeeId` from auth context, calls `leaveService.getEmployeeLeaveRequests`, returns 200.
  - `getPendingRequests(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `managerId` from auth context, calls `leaveService.getPendingRequestsForManager`, returns 200.
  - `getRequestById(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `requestId` from params, calls `leaveService.getLeaveRequestById`, returns 200 or 404.

Use Zod (already in dependencies) for request body validation. Map domain errors (`NotFoundError`, `ConflictError`, `ValidationError`) to appropriate HTTP status codes.

This phase depends on: `src/modules/leave/leave.service.interface.ts` from Phase 5 (for `ILeaveService`), `src/modules/leave/leave.model.ts` from Phase 4 (for `CreateLeaveRequestDto`, `LeaveRequest`), `src/shared/error-types.ts` from Phase 1 (for error classes). Read all three before generating any code.

Include Jest unit tests in `tests/unit/modules/leave/` mocking the service dependency.

## Phase 7: Phase 7: Leave routes and module wiring

Create the leave module's Fastify routes and the module index barrel file. Wire the module into the application.

Files to create/modify:
- `src/modules/leave/leave.routes.ts` — Export an async function `leaveRoutes(fastify: FastifyInstance, opts: { leaveService: ILeaveService }): Promise<void>`. Register routes:
  - `POST /api/leave/requests` → `LeaveController.submitLeave`
  - `GET /api/leave/requests` → `LeaveController.getMyRequests`
  - `GET /api/leave/requests/:requestId` → `LeaveController.getRequestById`
  - `GET /api/leave/manager/pending` → `LeaveController.getPendingRequests`
  - `PATCH /api/leave/requests/:requestId/approve` → `LeaveController.approveLeave`
  - `PATCH /api/leave/requests/:requestId/reject` → `LeaveController.rejectLeave`
  - `PATCH /api/leave/requests/:requestId/cancel` → `LeaveController.cancelLeave`

- `src/modules/leave/index.ts` — Barrel file exporting: `LeaveRequest`, `CreateLeaveRequestDto`, `ILeaveRepository`, `LeaveRepository`, `ILeaveService`, `LeaveService`, `LeaveController`, `leaveRoutes`.

- `src/app.ts` (MODIFY existing file) — Import `leaveRoutes` from `./modules/leave/leave.routes`, instantiate `LeaveRepository` (with Knex), `BalanceRepository` (with Knex), `LeaveService` (with repos), `LeaveController` (with service), and register `leaveRoutes` with the Fastify instance. Read the existing `src/app.ts` before modifying.

This phase depends on: `src/modules/leave/leave.controller.ts` from Phase 6, `src/modules/leave/leave.service.ts` from Phase 5, `src/modules/leave/leave.repository.ts` from Phase 4, `src/modules/balance/balance.repository.ts` from Phase 3, `src/shared/db/connection.ts` (existing), `src/app.ts` (existing). Read all before generating any code.

Include Jest integration tests in `tests/integration/modules/leave/` using Fastify's `inject` method.

## Phase 8: Phase 8: Database migrations

Create Knex migration files for the three core tables. These migrations must exist before any integration tests or production deployment can run.

Files to create:
- `src/shared/db/migrations/001_create_leave_policies.ts` — Knex migration with `up` (creates `leave_policies` table with columns: `id` UUID primary key, `policy_name` varchar not null, `leave_type_id` varchar not null, `entitlement_days` integer not null, `accrual_rate` decimal nullable, `max_accumulation` integer nullable, `minimum_notice_days` integer not null default 0, `requires_manager_approval` boolean not null default true, `is_active` boolean not null default true, `created_at` timestamptz not null default now(), `updated_at` timestamptz not null default now()) and `down` (drops table). Add unique constraint on `leave_type_id` where `is_active = true`.

- `src/shared/db/migrations/002_create_leave_balances.ts` — Knex migration with `up` (creates `leave_balances` table with columns: `id` UUID primary key, `employee_id` varchar not null, `leave_type_id` varchar not null, `policy_id` UUID not null references leave_policies, `total_entitlement` integer not null, `used_days` integer not null default 0, `remaining_days` integer not null, `pending_days` integer not null default 0, `fiscal_year` integer not null, `status` varchar not null default 'ACTIVE', `created_at` timestamptz not null default now(), `updated_at` timestamptz not null default now()) and `down`. Add unique constraint on `(employee_id, leave_type_id, fiscal_year)`.

- `src/shared/db/migrations/003_create_leave_requests.ts` — Knex migration with `up` (creates `leave_requests` table with all canonical columns: `id` UUID primary key, `employee_id` varchar not null, `leave_type_id` varchar not null, `start_date` date not null, `end_date` date not null, `reason` text nullable, `status` varchar not null default 'SUBMITTED', `approved_by` varchar null, `approved_at` timestamptz null, `rejected_by` varchar null, `rejected_at` timestamptz null, `rejection_reason` text null, `cancelled_by` varchar null, `cancelled_at` timestamptz null, `cancellation_reason` text null, `duration_days` integer not null, `is_emergency` boolean not null default false, `created_at` timestamptz not null default now(), `updated_at` timestamptz not null default now()) and `down`. Add index on `(employee_id, status)` and on `(status)`.

- `src/shared/db/knexfile.ts` — Knex configuration reading `DATABASE_URL` from environment, with migration directory pointing to `src/shared/db/migrations/`.

This phase depends on: `src/shared/types/index.ts` from Phase 1 (for enum values used in check constraints or defaults). Read it before generating migration files.

No unit tests needed for migrations — they are validated by running `knex migrate:latest` in CI.

## Phase 9: Phase 9: Balance service

Create the balance module's service layer for querying employee balances and initializing balances from policies.

Files to create:
- `src/modules/balance/balance.service.interface.ts` — Define `IBalanceService` interface with methods:
  - `getEmployeeBalances(employeeId: string): Promise<LeaveBalance[]>`
  - `getEmployeeBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>`
  - `initializeBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance>`
  - `getRemainingDays(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<number>`

- `src/modules/balance/balance.service.ts` — Implement `BalanceService` class implementing `IBalanceService`. Constructor takes `ILeaveBalanceRepository` and `ILeavePolicyRepository` (injected). Business logic:
  - `getEmployeeBalances`: delegates to repository's `findByEmployee`.
  - `getEmployeeBalance`: delegates to repository's `findByEmployeeAndType`.
  - `initializeBalance`: looks up the active `LeavePolicy` for the given `leaveTypeId` via `ILeavePolicyRepository.findByLeaveTypeId`, computes `totalEntitlement` and `remainingDays` from the policy's `entitlementDays`, creates a new `LeaveBalance` record with status `ACTIVE`. Throws `NotFoundError` if no active policy exists.
  - `getRemainingDays`: fetches balance and returns `remainingDays`, or 0 if no balance exists.

This phase depends on: `src/modules/balance/balance.model.ts` from Phase 3 (for `LeaveBalance`, `ILeaveBalanceRepository`), `src/modules/policy/policy.model.ts` from Phase 2 (for `ILeavePolicyRepository`, `LeavePolicy`), `src/shared/types/index.ts` from Phase 1 (for `LeaveBalanceStatus`), `src/shared/error-types.ts` from Phase 1 (for `NotFoundError`). Read all four before generating any code.

Include Jest unit tests in `tests/unit/modules/balance/` mocking both repository dependencies.

## Phase 10: Phase 10: Balance routes and end-to-end integration

Create the balance module's controller, routes, and barrel file. Wire into the application and add end-to-end integration tests.

Files to create/modify:
- `src/modules/balance/balance.controller.ts` — Implement `BalanceController` class. Constructor takes `IBalanceService` (injected). Methods:
  - `getBalances(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `employeeId` from auth context, calls `balanceService.getEmployeeBalances`, returns 200.
  - `getBalance(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts `employeeId` from auth context, `leaveTypeId` and `fiscalYear` from query params, calls `balanceService.getEmployeeBalance`, returns 200 or 404.
  - `getRemainingDays(request: FastifyRequest, reply: FastifyReply): Promise<void>` — Extracts params, calls `balanceService.getRemainingDays`, returns 200 with `{ remainingDays: number }`.

- `src/modules/balance/balance.routes.ts` — Export async function `balanceRoutes(fastify: FastifyInstance, opts: { balanceService: IBalanceService }): Promise<void>`. Register routes:
  - `GET /api/balance` → `BalanceController.getBalances`
  - `GET /api/balance/:leaveTypeId` → `BalanceController.getBalance`
  - `GET /api/balance/:leaveTypeId/remaining` → `BalanceController.getRemainingDays`

- `src/modules/balance/index.ts` — Barrel file exporting: `LeaveBalance`, `ILeaveBalanceRepository`, `BalanceRepository`, `IBalanceService`, `BalanceService`, `BalanceController`, `balanceRoutes`.

- `src/app.ts` (MODIFY existing file) — Import `balanceRoutes` from `./modules/balance/balance.routes`, instantiate `PolicyRepository`, `BalanceService`, `BalanceController`, and register `balanceRoutes`. Read the existing `src/app.ts` before modifying.

This phase depends on: `src/modules/balance/balance.service.interface.ts` from Phase 9, `src/modules/balance/balance.service.ts` from Phase 9, `src/modules/balance/balance.model.ts` from Phase 3, `src/modules/balance/balance.repository.ts` from Phase 3, `src/modules/policy/policy.repository.ts` from Phase 2, `src/shared/error-types.ts` from Phase 1, `src/app.ts` (existing). Read all before generating any code.

Include Jest integration tests in `tests/integration/modules/balance/` using Fastify's `inject` method, and end-to-end tests covering the full leave request → approval → balance deduction flow in `tests/integration/e2e/leave-flow.test.ts`.
