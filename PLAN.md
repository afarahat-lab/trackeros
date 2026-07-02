# PLAN.md

## Phase 1: Phase 1: Shared leave type enums

Create src/shared/types/index.ts with three canonical enums:

- `LeaveType` enum with values: ANNUAL, SICK, EMERGENCY
- `LeaveRequestStatus` enum with values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, REVOKED
- `BalanceStatus` enum with values: ACTIVE, EXHAUSTED, FROZEN

These are the foundational types referenced by all downstream domain models (LeavePolicy, LeaveRequest, LeaveBalance). No other files exist yet — this is the first phase. Include a Jest unit test at tests/unit/shared/types.spec.ts that verifies enum value membership.

## Phase 2: Phase 2: LeavePolicy model and repository

Create src/modules/policy/policy.model.ts with the LeavePolicy interface containing all canonical attributes: id, policyName, leaveType (import LeaveType from src/shared/types/index.ts), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, allowNegativeBalance, maxConsecutiveDays, isActive, createdAt, updatedAt.

Also create src/modules/policy/policy.repository.ts with IPolicyRepository interface and PolicyRepository class. The repository must use the pg pool from src/shared/db/connection.ts. Implement methods: findById, findByLeaveType, findAllActive, create, update, softDelete (set isActive=false).

This phase depends on src/shared/types/index.ts from Phase 1 — read it before generating any code that references LeaveType. Include Jest unit tests at tests/unit/modules/policy/policy.repository.spec.ts.

## Phase 3: Phase 3: LeaveRequest model and repository

Create src/modules/leave/leave.model.ts with the LeaveRequest interface containing all canonical attributes: id, employeeId, leavePolicyId, leaveType (import LeaveType from src/shared/types/index.ts), startDate, endDate, reason, status (import LeaveRequestStatus from src/shared/types/index.ts), approvedBy, approvedAt, rejectionReason, createdAt, updatedAt.

Also create src/modules/leave/leave.repository.ts with ILeaveRepository interface and LeaveRepository class. The repository must use the pg pool from src/shared/db/connection.ts. Implement methods: findById, findByEmployeeId, findByStatus, findByEmployeeIdAndStatus, create, updateStatus (approve/reject/cancel/revoke transitions), findOverlapping (detect date-range conflicts for the same employee).

This phase depends on src/shared/types/index.ts from Phase 1 — read it before generating any code that references LeaveType or LeaveRequestStatus. Include Jest unit tests at tests/unit/modules/leave/leave.repository.spec.ts.

## Phase 4: Phase 4: LeaveBalance model and repository

Create src/modules/balance/balance.model.ts with the LeaveBalance interface containing all canonical attributes: id, employeeId, leavePolicyId, leaveType (import LeaveType from src/shared/types/index.ts), totalEntitlement, usedDays, remainingDays, pendingDays, fiscalYear, status (import BalanceStatus from src/shared/types/index.ts), createdAt, updatedAt.

Also create src/modules/balance/balance.repository.ts with IBalanceRepository interface and BalanceRepository class. The repository must use the pg pool from src/shared/db/connection.ts. Implement methods: findByEmployeeIdAndLeaveType, findByEmployeeId, findByEmployeeIdAndFiscalYear, create, updateBalance (atomic increment/decrement of usedDays/remainingDays/pendingDays), findOrCreateForFiscalYear.

This phase depends on src/shared/types/index.ts from Phase 1 — read it before generating any code that references LeaveType or BalanceStatus. Include Jest unit tests at tests/unit/modules/balance/balance.repository.spec.ts.

## Phase 5: Phase 5: LeavePolicy service

Create src/modules/policy/policy.service.interface.ts with IPolicyService interface declaring: getPolicyById, getPoliciesByLeaveType, getAllActivePolicies, createPolicy, updatePolicy, deactivatePolicy.

Create src/modules/policy/policy.service.ts with PolicyService class implementing IPolicyService. The service wraps PolicyRepository from src/modules/policy/policy.repository.ts (Phase 2). It must import LeavePolicy from src/modules/policy/policy.model.ts and LeaveType from src/shared/types/index.ts.

This phase depends on src/modules/policy/policy.model.ts and src/modules/policy/policy.repository.ts from Phase 2 — read both before generating. Include Jest unit tests at tests/unit/modules/policy/policy.service.spec.ts that mock the repository.

## Phase 6: Phase 6: Leave application service

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring: submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, revokeLeaveRequest, getLeaveRequestById, getEmployeeLeaveRequests, getPendingRequestsForManager.

Create src/modules/leave/leave.service.ts with LeaveService class implementing ILeaveService. This is the core business logic phase. The service must:

- Depend on LeaveRepository from src/modules/leave/leave.repository.ts (Phase 3)
- Depend on BalanceRepository from src/modules/balance/balance.repository.ts (Phase 4)
- Depend on PolicyService from src/modules/policy/policy.service.ts (Phase 5)

Key business rules to implement:
- On submit: validate against LeavePolicy (entitlement, notice period, max consecutive days), check for overlapping requests, reserve pendingDays on LeaveBalance
- On approve: move pendingDays to usedDays, set approvedBy/approvedAt
- On reject: release pendingDays, set rejectionReason
- On cancel/revoke: release usedDays back to remainingDays

This phase depends on files from Phases 3, 4, and 5 — read them all before generating. Include Jest unit tests at tests/unit/modules/leave/leave.service.spec.ts that mock all dependencies.

## Phase 7: Phase 7: Policy routes

Create src/modules/policy/policy.routes.ts with Fastify route handlers for the policy CRUD surface. Routes: GET /policies, GET /policies/:id, GET /policies/type/:leaveType, POST /policies, PUT /policies/:id, DELETE /policies/:id (soft-delete).

Create src/modules/policy/index.ts barrel export re-exporting LeavePolicy, IPolicyService, PolicyService, and policyRoutes.

The routes depend on PolicyService from src/modules/policy/policy.service.ts (Phase 5). Use Fastify's request/reply pattern consistent with the existing uptimeRoutes in src/modules/uptime/uptime.routes.ts. Include Jest integration tests at tests/integration/modules/policy/policy.routes.spec.ts.

## Phase 8: Phase 8: Leave routes

Create src/modules/leave/leave.routes.ts with Fastify route handlers for the leave request lifecycle. Routes: POST /leave/requests (submit), GET /leave/requests (employee's own requests), GET /leave/requests/:id, GET /leave/requests/pending (manager view of pending approvals), PATCH /leave/requests/:id/approve, PATCH /leave/requests/:id/reject, PATCH /leave/requests/:id/cancel, PATCH /leave/requests/:id/revoke.

Create src/modules/leave/index.ts barrel export re-exporting LeaveRequest, ILeaveService, LeaveService, and leaveRoutes.

The routes depend on LeaveService from src/modules/leave/leave.service.ts (Phase 6). Use Fastify's request/reply pattern consistent with the existing uptimeRoutes in src/modules/uptime/uptime.routes.ts. Include Jest integration tests at tests/integration/modules/leave/leave.routes.spec.ts.

## Phase 9: Phase 9: Balance service and routes

Create src/modules/balance/balance.service.interface.ts with IBalanceService interface declaring: getEmployeeBalances, getEmployeeBalanceByLeaveType, getBalanceSummary (all types for an employee with remaining/pending/used breakdown).

Create src/modules/balance/balance.service.ts with BalanceService class implementing IBalanceService. The service wraps BalanceRepository from src/modules/balance/balance.repository.ts (Phase 4).

Create src/modules/balance/balance.routes.ts with Fastify route handlers: GET /balances (employee's own balances), GET /balances/:leaveType, GET /balances/summary.

Create src/modules/balance/index.ts barrel export re-exporting LeaveBalance, IBalanceService, BalanceService, and balanceRoutes.

This phase depends on src/modules/balance/balance.model.ts and src/modules/balance/balance.repository.ts from Phase 4 — read both before generating. Include Jest unit tests at tests/unit/modules/balance/balance.service.spec.ts and integration tests at tests/integration/modules/balance/balance.routes.spec.ts.

## Phase 10: Phase 10: Database migrations for leave domain tables

Create Knex migration files for the three leave domain tables. Set up the Knex configuration if not already present.

Create db/migrations/001_create_leave_policies.ts — columns matching LeavePolicy interface from src/modules/policy/policy.model.ts (Phase 2): id (UUID PK), policy_name, leave_type (enum), entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, allow_negative_balance, max_consecutive_days, is_active, created_at, updated_at.

Create db/migrations/002_create_leave_requests.ts — columns matching LeaveRequest interface from src/modules/leave/leave.model.ts (Phase 3): id (UUID PK), employee_id, leave_policy_id (FK → leave_policies), leave_type (enum), start_date, end_date, reason, status (enum), approved_by, approved_at, rejection_reason, created_at, updated_at. Add indexes on employee_id, status, and (employee_id, start_date, end_date) for overlap detection.

Create db/migrations/003_create_leave_balances.ts — columns matching LeaveBalance interface from src/modules/balance/balance.model.ts (Phase 4): id (UUID PK), employee_id, leave_policy_id (FK → leave_policies), leave_type (enum), total_entitlement, used_days, remaining_days, pending_days, fiscal_year, status (enum), created_at, updated_at. Add unique constraint on (employee_id, leave_type, fiscal_year).

This phase depends on the model files from Phases 2, 3, and 4 — read them before generating migrations to ensure column names and types match exactly.
