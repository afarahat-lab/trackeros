# PLAN.md

## Phase 1: Phase 1: Shared enums — LeaveType and LeaveStatus

Create src/shared/types/index.ts with two enums:

- LeaveType: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY
- LeaveStatus: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED

These are the canonical enum definitions referenced by all leave-related modules. No dependencies on other project files. Include a Jest unit test at tests/unit/shared/types.test.ts verifying all enum values are defined.

## Phase 2: Phase 2: LeavePolicy model and repository

Create src/modules/policy/policy.model.ts with the LeavePolicy interface (id, policyName, leaveType: LeaveType, entitlementDays, accrualRate?, maxAccumulation?, minimumNoticeDays?, requiresManagerApproval, isActive, createdAt, updatedAt) and CreateLeavePolicyDto / UpdateLeavePolicyDto types.

Create src/modules/policy/policy.repository.ts with IPolicyRepository interface and PolicyRepository class using the pg pool from src/shared/db/connection.ts. Implement findByLeaveType, findById, findAll, create, update, and soft-delete (set isActive=false).

This phase depends on src/shared/types/index.ts from Phase 1 — read it before generating any code that references LeaveType.

Include Jest unit tests in tests/unit/modules/policy/.

## Phase 3: Phase 3: LeaveRequest model and repository

Create src/modules/leave/leave.model.ts with the LeaveRequest interface (id, employeeId, policyId, startDate, endDate, durationDays (derived), reason?, status: LeaveStatus, approvedBy: string | null, approvedAt: Date | null, rejectionReason?, createdAt, updatedAt) and CreateLeaveRequestDto / UpdateLeaveRequestDto types.

Create src/modules/leave/leave.repository.ts with ILeaveRepository interface and LeaveRepository class using the pg pool from src/shared/db/connection.ts. Implement findByEmployeeId, findById, findByStatus, create, update, and findAll with optional status filter.

This phase depends on:
- src/shared/types/index.ts from Phase 1 — read it before generating any code that references LeaveStatus
- src/modules/policy/policy.model.ts from Phase 2 — read it to understand the policyId foreign key shape

Include Jest unit tests in tests/unit/modules/leave/.

## Phase 4: Phase 4: LeaveBalance model and repository

Create src/modules/balance/balance.model.ts with the LeaveBalance interface (id, employeeId, policyId, leaveType: LeaveType, entitlementDays, usedDays, pendingDays, remainingDays (derived: entitlementDays - usedDays - pendingDays), accruedDays, year: number, createdAt, updatedAt) and CreateLeaveBalanceDto / UpdateLeaveBalanceDto types.

Create src/modules/balance/balance.repository.ts with IBalanceRepository interface and BalanceRepository class using the pg pool from src/shared/db/connection.ts. Implement findByEmployeeId, findByEmployeeIdAndLeaveType, findByEmployeeIdAndYear, create, update (increment usedDays/pendingDays atomically), and upsert.

This phase depends on:
- src/shared/types/index.ts from Phase 1 — read it before generating any code that references LeaveType
- src/modules/policy/policy.model.ts from Phase 2 — read it to understand the policyId foreign key shape

Include Jest unit tests in tests/unit/modules/balance/.

## Phase 5: Phase 5: Leave service — apply, approve, reject, cancel

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring: apply(employeeId, dto), approve(requestId, managerId), reject(requestId, managerId, reason), cancel(requestId, employeeId), findById(id), findByEmployeeId(employeeId).

Create src/modules/leave/leave.service.ts with LeaveService implementing ILeaveService. Business logic:
- apply: validate policy exists and isActive, check minimumNoticeDays, check balance has enough remainingDays, create LeaveRequest with SUBMITTED status, increment balance pendingDays
- approve: verify status is SUBMITTED, set status=APPROVED, approvedBy, approvedAt, move pendingDays→usedDays on balance
- reject: verify status is SUBMITTED, set status=REJECTED, rejectionReason, release pendingDays on balance
- cancel: verify ownership, status must be SUBMITTED or APPROVED, set CANCELLED, release pendingDays/usedDays

This phase depends on:
- src/shared/types/index.ts from Phase 1
- src/modules/policy/policy.model.ts and src/modules/policy/policy.repository.ts from Phase 2
- src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts from Phase 3
- src/modules/balance/balance.model.ts and src/modules/balance/balance.repository.ts from Phase 4

Include Jest unit tests in tests/unit/modules/leave/leave.service.test.ts.

## Phase 6: Phase 6: Leave controller and routes

Create src/modules/leave/leave.controller.ts with LeaveController class that wraps ILeaveService and provides request-handler methods: apply, approve, reject, cancel, getById, getByEmployeeId. Each method extracts params/body from the Fastify request and delegates to the service.

Create src/modules/leave/leave.routes.ts exporting a Fastify plugin function that registers:
- POST /leave — apply (employee submits leave)
- GET /leave/:id — getById
- GET /leave/employee/:employeeId — getByEmployeeId
- PATCH /leave/:id/approve — approve (manager)
- PATCH /leave/:id/reject — reject (manager)
- PATCH /leave/:id/cancel — cancel (employee)

Create src/modules/leave/index.ts as the public barrel exporting LeaveRequest, CreateLeaveRequestDto, ILeaveService, LeaveService, leaveRoutes.

This phase depends on:
- src/modules/leave/leave.model.ts from Phase 3
- src/modules/leave/leave.service.interface.ts and src/modules/leave/leave.service.ts from Phase 5

Include Jest integration tests in tests/integration/modules/leave/leave.routes.test.ts.

## Phase 7: Phase 7: Policy service, controller, and routes

Create src/modules/policy/policy.service.interface.ts with IPolicyService interface: findAll, findById, findByLeaveType, create, update, deactivate.

Create src/modules/policy/policy.service.ts with PolicyService implementing IPolicyService. Wraps IPolicyRepository from Phase 2. create/update validate that leaveType is a valid LeaveType enum value.

Create src/modules/policy/policy.controller.ts with PolicyController wrapping IPolicyService.

Create src/modules/policy/policy.routes.ts exporting a Fastify plugin registering:
- GET /policies — findAll
- GET /policies/:id — findById
- GET /policies/type/:leaveType — findByLeaveType
- POST /policies — create (HR)
- PATCH /policies/:id — update (HR)
- DELETE /policies/:id — deactivate (soft-delete)

Create src/modules/policy/index.ts barrel export.

This phase depends on:
- src/shared/types/index.ts from Phase 1
- src/modules/policy/policy.model.ts and src/modules/policy/policy.repository.ts from Phase 2

Include Jest integration tests in tests/integration/modules/policy/.

## Phase 8: Phase 8: Balance service, controller, and routes

Create src/modules/balance/balance.service.interface.ts with IBalanceService interface: getByEmployeeId, getByEmployeeIdAndLeaveType, getByEmployeeIdAndYear, initializeBalance (for new employees).

Create src/modules/balance/balance.service.ts with BalanceService implementing IBalanceService. Wraps IBalanceRepository from Phase 4. initializeBalance reads the matching LeavePolicy to get entitlementDays and creates a new LeaveBalance row.

Create src/modules/balance/balance.controller.ts with BalanceController wrapping IBalanceService.

Create src/modules/balance/balance.routes.ts exporting a Fastify plugin registering:
- GET /balances/employee/:employeeId — getByEmployeeId
- GET /balances/employee/:employeeId/type/:leaveType — getByEmployeeIdAndLeaveType
- GET /balances/employee/:employeeId/year/:year — getByEmployeeIdAndYear
- POST /balances/initialize — initializeBalance (HR)

Create src/modules/balance/index.ts barrel export.

This phase depends on:
- src/shared/types/index.ts from Phase 1
- src/modules/balance/balance.model.ts and src/modules/balance/balance.repository.ts from Phase 4
- src/modules/policy/policy.repository.ts from Phase 2 (for reading policy entitlementDays)

Include Jest integration tests in tests/integration/modules/balance/.

## Phase 9: Phase 9: Database migrations for leave tables

Create Knex migration files under src/db/migrations/:

1. create_leave_policies table: id (uuid PK), policy_name (varchar), leave_type (varchar, check constraint against LeaveType enum values), entitlement_days (int), accrual_rate (decimal nullable), max_accumulation (int nullable), minimum_notice_days (int nullable), requires_manager_approval (boolean default true), is_active (boolean default true), created_at, updated_at.

2. create_leave_requests table: id (uuid PK), employee_id (varchar), policy_id (uuid FK→leave_policies), start_date (date), end_date (date), duration_days (int generated), reason (text nullable), status (varchar, check constraint against LeaveStatus enum values), approved_by (varchar nullable), approved_at (timestamptz nullable), rejection_reason (text nullable), created_at, updated_at.

3. create_leave_balances table: id (uuid PK), employee_id (varchar), policy_id (uuid FK→leave_policies), leave_type (varchar), entitlement_days (int), used_days (int default 0), pending_days (int default 0), accrued_days (int default 0), year (int), created_at, updated_at. Add unique constraint on (employee_id, leave_type, year).

This phase depends on src/shared/types/index.ts from Phase 1 for the enum value lists used in CHECK constraints. No code files from other phases are imported — migrations are standalone SQL/DDL.

## Phase 10: Phase 10: Wire leave, policy, and balance routes into app.ts

Update src/app.ts to register the leave, policy, and balance route plugins alongside the existing uptimeRoutes. Import leaveRoutes from src/modules/leave/index.ts, policyRoutes from src/modules/policy/index.ts, and balanceRoutes from src/modules/balance/index.ts. Call app.register() for each.

This phase depends on:
- src/modules/leave/index.ts from Phase 6
- src/modules/policy/index.ts from Phase 7
- src/modules/balance/index.ts from Phase 8

Include a Jest integration smoke test in tests/integration/app.test.ts that verifies the new routes are registered (e.g., a 200 from GET /policies and appropriate responses from the leave/balance endpoints).
