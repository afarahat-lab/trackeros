# PLAN.md

## Phase 1: Phase 1: Shared enums and base types

Create src/shared/types/index.ts with the canonical enums: LeaveType (values: ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and EmploymentStatus (values: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE). These enums are referenced by all downstream domain models. Include Jest unit tests in tests/unit/shared/types/types.test.ts verifying each enum has the correct members.

## Phase 2: Phase 2: Base repository + Employee model and repository

Create src/shared/base.repository.ts with an abstract BaseRepository<T> class providing common Knex-based CRUD operations (findById, findAll, insert, update, delete) against the shared db connection from src/shared/db/connection.ts. Create src/modules/employee/employee.model.ts with the Employee interface matching the canonical attributes: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt. Import EmploymentStatus from src/shared/types/index.ts (Phase 1). Create src/modules/employee/employee.repository.ts with IEmployeeRepository interface and KnexEmployeeRepository class extending BaseRepository<Employee>. Include Jest unit tests in tests/unit/modules/employee/employee.repository.test.ts.

## Phase 3: Phase 3: LeavePolicy model and repository

Create src/modules/policy/policy.model.ts with the LeavePolicy interface matching canonical attributes: id, policyName, leaveType (import LeaveType from src/shared/types/index.ts from Phase 1), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt. Create src/modules/policy/policy.repository.ts with ILeavePolicyRepository interface and KnexLeavePolicyRepository class extending BaseRepository<LeavePolicy> from src/shared/base.repository.ts (Phase 2). Include a Knex migration in src/modules/policy/migrations/ creating the leave_policies table. Include Jest unit tests in tests/unit/modules/policy/policy.repository.test.ts.

## Phase 4: Phase 4: LeaveRequest model and repository

Create src/modules/leave/leave.model.ts with the LeaveRequest interface matching canonical attributes: id, employeeId, leavePolicyId, startDate, endDate, reason, status (import LeaveRequestStatus from src/shared/types/index.ts from Phase 1), approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, createdAt, updatedAt. Also define CreateLeaveRequestDto and UpdateLeaveRequestStatusDto in the same file. Create src/modules/leave/leave.repository.ts with ILeaveRequestRepository interface and KnexLeaveRequestRepository class extending BaseRepository<LeaveRequest> from src/shared/base.repository.ts (Phase 2). Include a Knex migration creating the leave_requests table. Include Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts.

## Phase 5: Phase 5: LeaveBalance model and repository

Create src/modules/balance/balance.model.ts with the LeaveBalance interface matching canonical attributes: id, employeeId, leavePolicyId, currentBalanceDays, usedDaysThisYear, accruedDaysThisYear, year, lastAccrualDate, createdAt, updatedAt. Import LeaveType from src/shared/types/index.ts (Phase 1). Create src/modules/balance/balance.repository.ts with ILeaveBalanceRepository interface and KnexLeaveBalanceRepository class extending BaseRepository<LeaveBalance> from src/shared/base.repository.ts (Phase 2). Include a Knex migration creating the leave_balances table. Include Jest unit tests in tests/unit/modules/balance/balance.repository.test.ts.

## Phase 6: Phase 6: Leave service (business logic)

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring methods: submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approveRequest(requestId: string, approverId: string): Promise<LeaveRequest>, rejectRequest(requestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>, cancelRequest(requestId: string, employeeId: string): Promise<LeaveRequest>, getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]>. Create src/modules/leave/leave.service.ts with LeaveService class implementing ILeaveService. The service must validate: the employee exists (via IEmployeeRepository from src/modules/employee/employee.repository.ts Phase 2), the leave policy is active (via ILeavePolicyRepository from src/modules/policy/policy.repository.ts Phase 3), the employee has sufficient balance (via ILeaveBalanceRepository from src/modules/balance/balance.repository.ts Phase 5), and enforce state-machine transitions on LeaveRequestStatus. Inject all repositories via constructor. Include Jest unit tests in tests/unit/modules/leave/leave.service.test.ts mocking all repository dependencies.

## Phase 7: Phase 7: Leave controller and routes

Create src/modules/leave/leave.controller.ts with LeaveController class that wraps ILeaveService from src/modules/leave/leave.service.interface.ts (Phase 6). Methods: submit, approve, reject, cancel, getByEmployee — each returning Fastify-compatible reply shapes. Create src/modules/leave/leave.routes.ts registering Fastify routes: POST /leave/requests, PATCH /leave/requests/:id/approve, PATCH /leave/requests/:id/reject, PATCH /leave/requests/:id/cancel, GET /leave/requests?employeeId=. Register the leave routes in src/app.ts alongside the existing uptimeRoutes. Include Jest integration tests in tests/integration/modules/leave/leave.routes.test.ts.

## Phase 8: Phase 8: Balance service

Create src/modules/balance/balance.service.interface.ts with IBalanceService interface declaring: getEmployeeBalances(employeeId: string): Promise<LeaveBalance[]>, getBalanceForPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null>, deductBalance(balanceId: string, days: number): Promise<LeaveBalance>, accrueBalance(balanceId: string, days: number): Promise<LeaveBalance>. Create src/modules/balance/balance.service.ts with BalanceService class implementing IBalanceService, depending on ILeaveBalanceRepository from src/modules/balance/balance.repository.ts (Phase 5). Include Jest unit tests in tests/unit/modules/balance/balance.service.test.ts.

## Phase 9: Phase 9: Balance controller and routes

Create src/modules/balance/balance.controller.ts with BalanceController wrapping IBalanceService from src/modules/balance/balance.service.interface.ts (Phase 8). Create src/modules/balance/balance.routes.ts with Fastify routes: GET /balances?employeeId=, GET /balances/:id. Register balance routes in src/app.ts. Include Jest integration tests in tests/integration/modules/balance/balance.routes.test.ts.
