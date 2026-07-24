# PLAN.md

## Phase 1: Phase 1: Shared leave domain types

Create src/shared/types/leave.ts with three enums used across all leave modules:
- `LeaveType` enum: ANNUAL, SICK, EMERGENCY
- `LeaveRequestStatus` enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `BalanceStatus` enum: ACTIVE, EXHAUSTED, FROZEN

Also create src/shared/types/index.ts as a barrel re-export of leave.ts.

Include Jest unit tests in tests/unit/shared/types/ verifying each enum has the correct members.

No dependencies on prior phases — this is the foundation.

## Phase 2: Phase 2: LeavePolicy model and repository

Create src/modules/policy/policy.model.ts with the `LeavePolicy` interface:
- id: string, policyName: string, leaveType: LeaveType, entitlementDays: number, accrualRate: number | null, maxAccumulation: number | null, minimumNoticeDays: number | null, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date

Create src/modules/policy/policy.repository.ts with `IPolicyRepository` interface and `PolicyRepository` class using Knex. Methods: findById, findAll, findByLeaveType, create, update, softDelete (set isActive=false).

This phase depends on src/shared/types/leave.ts from Phase 1 — read it before generating any code that references LeaveType. Also depends on src/shared/db/connection.ts for the Knex instance.

Include Jest unit tests in tests/unit/modules/policy/.

## Phase 3: Phase 3: LeaveRequest model and repository

Create src/modules/leave/leave.model.ts with the `LeaveRequest` interface:
- id: string, employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveRequestStatus, approvedBy: string | null, approvedAt: Date | null, rejectionReason: string | null, createdAt: Date, updatedAt: Date

Also define `CreateLeaveRequestDto` with fields: employeeId, leavePolicyId, startDate, endDate, reason (optional).

Create src/modules/leave/leave.repository.ts with `ILeaveRepository` interface and `LeaveRepository` class using Knex. Methods: findById, findByEmployeeId, findByStatus, create, updateStatus (approve/reject/cancel), findOverlapping (to detect date conflicts).

This phase depends on src/shared/types/leave.ts from Phase 1 for LeaveRequestStatus. Also depends on src/shared/db/connection.ts.

Include Jest unit tests in tests/unit/modules/leave/.

## Phase 4: Phase 4: LeaveBalance model and repository

Create src/modules/balance/balance.model.ts with the `LeaveBalance` interface:
- id: string, employeeId: string, policyId: string, totalEntitlement: number, usedDays: number, remainingDays: number, fiscalYear: number, status: BalanceStatus, createdAt: Date, updatedAt: Date

Create src/modules/balance/balance.repository.ts with `IBalanceRepository` interface and `BalanceRepository` class using Knex. Methods: findByEmployeeAndPolicy, findByEmployeeId, findByFiscalYear, create, updateUsedDays (atomic increment), updateStatus.

This phase depends on src/shared/types/leave.ts from Phase 1 for BalanceStatus. Also depends on src/shared/db/connection.ts.

Include Jest unit tests in tests/unit/modules/balance/.

## Phase 5: Phase 5: Knex database migrations

Create Knex migration files under src/db/migrations/:

1. `001_create_leave_policies.ts` — creates `leave_policies` table with columns matching the LeavePolicy interface from Phase 2 (src/modules/policy/policy.model.ts). Include `leave_type` as an enum-backed varchar.

2. `002_create_leave_requests.ts` — creates `leave_requests` table with columns matching the LeaveRequest interface from Phase 3 (src/modules/leave/leave.model.ts). Include foreign keys to employees and leave_policies.

3. `003_create_leave_balances.ts` — creates `leave_balances` table with columns matching the LeaveBalance interface from Phase 4 (src/modules/balance/balance.model.ts). Include a unique constraint on (employee_id, policy_id, fiscal_year).

Also create src/db/knexfile.ts with Knex configuration reading DATABASE_URL from environment.

This phase depends on the model files from Phases 2, 3, and 4 — read them before generating migrations to ensure column names and types match exactly.

## Phase 6: Phase 6: Leave service layer

Create src/modules/leave/leave.service.interface.ts with `ILeaveService` interface:
- submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>
- approveLeave(requestId: string, approverId: string): Promise<LeaveRequest>
- rejectLeave(requestId: string, approverId: string, reason: string): Promise<LeaveRequest>
- cancelLeave(requestId: string, employeeId: string): Promise<LeaveRequest>
- getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]>
- getPendingRequests(managerId: string): Promise<LeaveRequest[]>

Create src/modules/leave/leave.service.ts with `LeaveService` implementing ILeaveService. Business logic: on submit, validate no overlapping approved requests exist; on approve, atomically update the LeaveBalance (usedDays, remainingDays) via BalanceRepository; on reject, set rejectionReason; on cancel, revert balance if previously approved.

This phase depends on:
- src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts from Phase 3
- src/modules/balance/balance.repository.ts from Phase 4
- src/modules/policy/policy.repository.ts from Phase 2
- src/shared/types/leave.ts from Phase 1

Include Jest unit tests in tests/unit/modules/leave/ for the service.

## Phase 7: Phase 7: Leave controller and routes

Create src/modules/leave/leave.controller.ts with `LeaveController` class that delegates to ILeaveService. Methods:
- submit(req, reply)
- approve(req, reply)
- reject(req, reply)
- cancel(req, reply)
- getMyRequests(req, reply)
- getPendingForManager(req, reply)

Create src/modules/leave/leave.routes.ts registering Fastify routes:
- POST /leave — submit a leave request
- PATCH /leave/:id/approve — manager approval
- PATCH /leave/:id/reject — manager rejection
- PATCH /leave/:id/cancel — employee cancellation
- GET /leave/my — employee's own requests
- GET /leave/pending — manager's pending approvals

Use Zod schemas for request validation on each route.

Create src/modules/leave/index.ts as barrel export.

This phase depends on src/modules/leave/leave.service.interface.ts and src/modules/leave/leave.service.ts from Phase 6, and src/modules/leave/leave.model.ts from Phase 3.

Include Jest integration tests in tests/integration/modules/leave/.

## Phase 8: Phase 8: Register leave routes in app

Update src/app.ts to register the leave routes plugin from src/modules/leave/leave.routes.ts alongside the existing uptimeRoutes. Add `import { leaveRoutes } from './modules/leave/leave.routes'` and call `app.register(leaveRoutes)`.

This phase depends on src/modules/leave/leave.routes.ts from Phase 7 and the existing src/app.ts.

Include a Jest integration test in tests/integration/app/ that verifies the leave routes are registered and respond correctly.

## Phase 9: Phase 9: Balance service and routes

Create src/modules/balance/balance.service.interface.ts with `IBalanceService` interface:
- getEmployeeBalances(employeeId: string): Promise<LeaveBalance[]>
- getBalanceForPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance>

Create src/modules/balance/balance.service.ts with `BalanceService` implementing IBalanceService.

Create src/modules/balance/balance.controller.ts and src/modules/balance/balance.routes.ts with:
- GET /balance/my — employee's own balances
- GET /balance/:employeeId — HR/manager view of an employee's balances

Create src/modules/balance/index.ts as barrel export.

This phase depends on src/modules/balance/balance.model.ts and src/modules/balance/balance.repository.ts from Phase 4.

Include Jest unit tests in tests/unit/modules/balance/ and integration tests in tests/integration/modules/balance/.

## Phase 10: Phase 10: Register balance routes and final integration

Update src/app.ts to register the balance routes plugin from src/modules/balance/balance.routes.ts alongside the existing uptimeRoutes and leaveRoutes. Add `import { balanceRoutes } from './modules/balance/balance.routes'` and call `app.register(balanceRoutes)`.

This phase depends on src/modules/balance/balance.routes.ts from Phase 9 and the updated src/app.ts from Phase 8.

Include a Jest integration test in tests/integration/app/ that verifies both leave and balance routes are registered and respond correctly. Run the full test suite to confirm no regressions.
