# PLAN.md

## Phase 1: Phase 1: Shared leave enums

Create src/shared/types/index.ts with three enums needed by all leave domain models:

- `LeaveType` enum: 'annual' | 'sick' | 'emergency'
- `LeaveRequestStatus` enum: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
- `BalanceStatus` enum: 'active' | 'exhausted' | 'frozen'

This file has no dependencies on any other project file. Include a Jest unit test at tests/unit/shared/types.test.ts that verifies all enum values are defined and distinct.

## Phase 2: Phase 2: Shared base repository and error types

Create two shared utility files that the leave repository will extend:

1. `src/shared/error-types.ts` — Define `NotFoundError`, `ValidationError`, and `ConflictError` classes extending the native `Error`. Each carries an optional `details` property of type `unknown`.

2. `src/shared/base-repository.ts` — Define a generic abstract class `BaseRepository<T>` that accepts the pg `Pool` from `src/shared/db/connection.ts` (already exists — read it before generating). Provide protected methods: `query(text, params)` delegating to `pool.query`, and abstract `findById(id: string): Promise<T | null>`.

Include Jest unit tests at `tests/unit/shared/error-types.test.ts` and `tests/unit/shared/base-repository.test.ts`.

## Phase 3: Phase 3: LeavePolicy model and repository

Create the LeavePolicy domain model and its repository in the leave module. This phase depends on `src/shared/types/index.ts` from Phase 1 (for `LeaveType`) and `src/shared/base-repository.ts` + `src/shared/db/connection.ts` from Phase 2 — read those before generating.

Files to create:
- `src/modules/leave/leave-policy.model.ts` — Define the `LeavePolicy` interface with all attributes from the architecture: id, policyName, leaveType (import LeaveType from `src/shared/types/index.ts`), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, allowsNegativeBalance, maxConsecutiveDays, createdAt, updatedAt.
- `src/modules/leave/leave-policy.repository.ts` — Define `ILeavePolicyRepository` interface and implement `LeavePolicyRepository` class extending `BaseRepository<LeavePolicy>` from `src/shared/base-repository.ts`. Include methods: `findById`, `findAll`, `findByLeaveType`, `create`, `update`, `softDelete`.

Include Jest unit tests at `tests/unit/modules/leave/leave-policy.repository.test.ts`.

## Phase 4: Phase 4: LeaveBalance model and repository

Create the LeaveBalance domain model and its repository. This phase depends on `src/shared/types/index.ts` from Phase 1 (for `BalanceStatus`) and `src/shared/base-repository.ts` + `src/shared/db/connection.ts` from Phase 2 — read those before generating.

Files to create:
- `src/modules/leave/leave-balance.model.ts` — Define the `LeaveBalance` interface with all attributes from the architecture: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, pendingDays, fiscalYear, status (import BalanceStatus from `src/shared/types/index.ts`), createdAt, updatedAt.
- `src/modules/leave/leave-balance.repository.ts` — Define `ILeaveBalanceRepository` interface and implement `LeaveBalanceRepository` class extending `BaseRepository<LeaveBalance>`. Include methods: `findById`, `findByEmployeeId`, `findByEmployeeAndPolicy`, `create`, `update`, `upsert`.

Include Jest unit tests at `tests/unit/modules/leave/leave-balance.repository.test.ts`.

## Phase 5: Phase 5: LeaveRequest model and repository

Create the LeaveRequest domain model and its repository. This phase depends on `src/shared/types/index.ts` from Phase 1 (for `LeaveRequestStatus`), `src/shared/base-repository.ts` + `src/shared/db/connection.ts` from Phase 2, and `src/modules/leave/leave-policy.model.ts` from Phase 3 — read those before generating.

Files to create:
- `src/modules/leave/leave-request.model.ts` — Define the `LeaveRequest` interface with all attributes from the architecture: id, employeeId, leavePolicyId, startDate, endDate, reason, status (import LeaveRequestStatus from `src/shared/types/index.ts`), approvedBy, approvedAt, cancelledBy, cancelledAt, cancellationReason, createdAt, updatedAt. Also define `CreateLeaveRequestDto` with fields: employeeId, leavePolicyId, startDate, endDate, reason (optional).
- `src/modules/leave/leave-request.repository.ts` — Define `ILeaveRequestRepository` interface and implement `LeaveRequestRepository` class extending `BaseRepository<LeaveRequest>`. Include methods: `findById`, `findByEmployeeId`, `findByStatus`, `findPendingByManager`, `create`, `updateStatus`, `cancel`.

Include Jest unit tests at `tests/unit/modules/leave/leave-request.repository.test.ts`.

## Phase 6: Phase 6: Leave service

Create the leave service layer that orchestrates business logic across all three repositories. This phase depends on all prior phases — read these files before generating:
- `src/shared/types/index.ts` (Phase 1)
- `src/shared/error-types.ts` (Phase 2)
- `src/modules/leave/leave-policy.model.ts` + `src/modules/leave/leave-policy.repository.ts` (Phase 3)
- `src/modules/leave/leave-balance.model.ts` + `src/modules/leave/leave-balance.repository.ts` (Phase 4)
- `src/modules/leave/leave-request.model.ts` + `src/modules/leave/leave-request.repository.ts` (Phase 5)

Files to create:
- `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods: `applyForLeave(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approveRequest(requestId: string, approverId: string): Promise<LeaveRequest>`, `rejectRequest(requestId: string, approverId: string): Promise<LeaveRequest>`, `cancelRequest(requestId: string, employeeId: string, reason?: string): Promise<LeaveRequest>`, `getEmployeeBalance(employeeId: string, policyId: string): Promise<LeaveBalance>`, `getEmployeeBalances(employeeId: string): Promise<LeaveBalance[]>`.
- `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor takes `ILeaveRequestRepository`, `ILeavePolicyRepository`, `ILeaveBalanceRepository`. Business rules: validate policy exists and is active, check sufficient balance (remainingDays - pendingDays >= requested days), enforce minimumNoticeDays, enforce maxConsecutiveDays, update pendingDays on apply, move pendingDays to usedDays on approval, release pendingDays on rejection/cancellation. Throw `ValidationError` or `NotFoundError` from `src/shared/error-types.ts` as appropriate.

Include Jest unit tests at `tests/unit/modules/leave/leave.service.test.ts`.

## Phase 7: Phase 7: Leave controller

Create the leave controller that bridges HTTP requests to the service layer. This phase depends on Phase 6 — read these files before generating:
- `src/modules/leave/leave.service.interface.ts` + `src/modules/leave/leave.service.ts` (Phase 6)
- `src/modules/leave/leave-request.model.ts` (Phase 5)
- `src/shared/error-types.ts` (Phase 2)

Files to create:
- `src/modules/leave/leave.controller.ts` — Implement `LeaveController` class. Constructor takes `ILeaveService`. Methods: `apply`, `approve`, `reject`, `cancel`, `getBalance`, `getBalances`. Each method accepts Fastify `FastifyRequest` / `FastifyReply` types, extracts and validates inputs (GP-003), calls the corresponding service method, and returns appropriate HTTP status codes (201 for create, 200 for updates/queries, 404 for not found, 409 for conflicts, 422 for validation errors). Use `zod` (already in package.json) for input validation schemas.

Include Jest unit tests at `tests/unit/modules/leave/leave.controller.test.ts`.

## Phase 8: Phase 8: Leave routes and module index

Wire the leave module into Fastify routes and create the module's public entry point. This phase depends on Phase 7 — read these files before generating:
- `src/modules/leave/leave.controller.ts` (Phase 7)
- `src/modules/leave/leave.service.ts` (Phase 6)
- `src/modules/leave/leave-request.repository.ts` (Phase 5)
- `src/modules/leave/leave-policy.repository.ts` (Phase 3)
- `src/modules/leave/leave-balance.repository.ts` (Phase 4)
- `src/shared/db/connection.ts` (existing)

Files to create:
- `src/modules/leave/leave.routes.ts` — Export an async function `leaveRoutes(fastify: FastifyInstance)` that instantiates repositories (using the pool from `src/shared/db/connection.ts`), the `LeaveService`, and the `LeaveController`, then registers the following routes:
  - `POST /leave/requests` → controller.apply
  - `PATCH /leave/requests/:id/approve` → controller.approve
  - `PATCH /leave/requests/:id/reject` → controller.reject
  - `PATCH /leave/requests/:id/cancel` → controller.cancel
  - `GET /leave/balances/:employeeId` → controller.getBalances
  - `GET /leave/balances/:employeeId/:policyId` → controller.getBalance
- `src/modules/leave/index.ts` — Re-export all public types: `LeaveRequest`, `CreateLeaveRequestDto`, `LeavePolicy`, `LeaveBalance`, `ILeaveService`, `LeaveService`, `LeaveController`, `leaveRoutes`.

Then update `src/app.ts` (existing) to register `leaveRoutes` alongside the existing `uptimeRoutes`. Read `src/app.ts` before modifying.

Include Jest integration tests at `tests/integration/leave/leave.routes.test.ts`.
