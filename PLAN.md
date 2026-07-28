# PLAN.md

## Phase 1: Phase 1: Shared enums and types

Create src/shared/types/index.ts with three enums: LeaveType (values: ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and EmploymentStatus (values: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE). Export all from the index. Include Jest unit tests in tests/unit/shared/types.test.ts verifying each enum has the correct members. Approximately 2 files.

## Phase 2: Phase 1: Shared enums and base repository interface

Create two files:

1. src/shared/types/index.ts — Define and export three enums:
   - LeaveType: ANNUAL, SICK, EMERGENCY
   - LeaveRequestStatus: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
   - EmploymentStatus: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE

2. src/shared/base-repository.ts — Define and export a generic IBaseRepository<T> interface with methods: findById(id: string): Promise<T | null>, findAll(): Promise<T[]>, create(entity: T): Promise<T>, update(id: string, entity: Partial<T>): Promise<T | null>, delete(id: string): Promise<boolean>.

Include Jest unit tests in tests/unit/shared/types.test.ts and tests/unit/shared/base-repository.test.ts. Approximately 4 files.

## Phase 3: Phase 2: LeavePolicy model and repository

Create the LeavePolicy domain model and its repository in the same phase so Aider sees both the field definitions and their usage.

Files to create:
- src/modules/policy/policy.model.ts — Define and export the LeavePolicy interface with exact attributes: id: string, policyName: string, leaveType: LeaveType, entitlementDays: number, accrualRate: number | null, maxAccumulation: number | null, minimumNoticeDays: number | null, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date. Import LeaveType from src/shared/types/index.ts (created in Phase 1).
- src/modules/policy/policy.repository.ts — Define and export IPolicyRepository interface extending IBaseRepository<LeavePolicy> from src/shared/base-repository.ts (Phase 1). Add method findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>. Implement KnexPolicyRepository using the pg pool from src/shared/db/connection.ts.
- src/modules/policy/index.ts — Barrel export of all public symbols.

This phase depends on src/shared/types/index.ts and src/shared/base-repository.ts from Phase 1 — read them before generating any code. Include Jest unit tests in tests/unit/modules/policy/. Approximately 5 files.

## Phase 4: Phase 3: Employee model and repository

Create the Employee domain model and its repository together.

Files to create:
- src/modules/employee/employee.model.ts — Define and export the Employee interface with exact attributes: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, role: string, managerId: string | null, department: string | null, hireDate: Date, terminationDate: Date | null, employmentStatus: EmploymentStatus, createdAt: Date, updatedAt: Date, deletedAt: Date | null. Import EmploymentStatus from src/shared/types/index.ts (Phase 1).
- src/modules/employee/employee.repository.ts — Define and export IEmployeeRepository interface extending IBaseRepository<Employee> from src/shared/base-repository.ts (Phase 1). Add methods: findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findByEmail(email: string): Promise<Employee | null>, findByManagerId(managerId: string): Promise<Employee[]>, findByDepartment(department: string): Promise<Employee[]>. Implement KnexEmployeeRepository using the pg pool from src/shared/db/connection.ts.
- src/modules/employee/index.ts — Barrel export.

This phase depends on src/shared/types/index.ts and src/shared/base-repository.ts from Phase 1. Include Jest unit tests in tests/unit/modules/employee/. Approximately 5 files.

## Phase 5: Phase 4: LeaveRequest model and repository

Create the LeaveRequest domain model and its repository together.

Files to create:
- src/modules/leave/leave.model.ts — Define and export the LeaveRequest interface with exact attributes: id: string, employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveRequestStatus, approvedBy: string | null, approvedAt: Date | null, rejectedBy: string | null, rejectedAt: Date | null, rejectionReason: string | null, cancelledBy: string | null, cancelledAt: Date | null, createdAt: Date, updatedAt: Date. Also define CreateLeaveRequestDto with fields: employeeId, leavePolicyId, startDate, endDate, reason (optional). Import LeaveRequestStatus from src/shared/types/index.ts (Phase 1).
- src/modules/leave/leave.repository.ts — Define and export ILeaveRepository interface extending IBaseRepository<LeaveRequest> from src/shared/base-repository.ts (Phase 1). Add methods: findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>, findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>, findByDateRange(startDate: Date, endDate: Date): Promise<LeaveRequest[]>, findByEmployeeIdAndStatus(employeeId: string, status: LeaveRequestStatus): Promise<LeaveRequest[]>. Implement KnexLeaveRepository using the pg pool from src/shared/db/connection.ts.
- src/modules/leave/index.ts — Barrel export.

This phase depends on src/shared/types/index.ts and src/shared/base-repository.ts from Phase 1, src/modules/policy/policy.model.ts from Phase 2, and src/modules/employee/employee.model.ts from Phase 3. Read all before generating. Include Jest unit tests in tests/unit/modules/leave/. Approximately 5 files.

## Phase 6: Phase 5: LeavePolicy service

Create the LeavePolicy service layer for CRUD operations on leave policies.

Files to create:
- src/modules/policy/policy.service.interface.ts — Define and export IPolicyService interface with methods: getPolicyById(id: string): Promise<LeavePolicy | null>, getPolicyByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>, listActivePolicies(): Promise<LeavePolicy[]>, createPolicy(dto: CreatePolicyDto): Promise<LeavePolicy>, updatePolicy(id: string, dto: Partial<CreatePolicyDto>): Promise<LeavePolicy | null>, deactivatePolicy(id: string): Promise<boolean>.
- src/modules/policy/policy.service.ts — Implement PolicyService class implementing IPolicyService. Inject IPolicyRepository via constructor. All methods delegate to the repository with validation.
- Update src/modules/policy/index.ts — Add new exports.

Also define CreatePolicyDto in policy.model.ts (update the existing file): policyName, leaveType, entitlementDays, accrualRate (optional), maxAccumulation (optional), minimumNoticeDays (optional), requiresManagerApproval.

This phase depends on src/modules/policy/policy.model.ts and src/modules/policy/policy.repository.ts from Phase 2, and src/shared/types/index.ts from Phase 1. Read them before generating. Include Jest unit tests in tests/unit/modules/policy/. Approximately 4 files.

## Phase 7: Phase 6: LeaveRequest service

Create the LeaveRequest service layer for submitting, approving, rejecting, and cancelling leave requests.

Files to create:
- src/modules/leave/leave.service.interface.ts — Define and export ILeaveService interface with methods: submitRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approveRequest(requestId: string, approverId: string): Promise<LeaveRequest>, rejectRequest(requestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>, cancelRequest(requestId: string, cancelledById: string): Promise<LeaveRequest>, getRequestById(id: string): Promise<LeaveRequest | null>, getRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>, getPendingRequestsForManager(managerId: string): Promise<LeaveRequest[]>.
- src/modules/leave/leave.service.ts — Implement LeaveService class implementing ILeaveService. Inject ILeaveRepository, IPolicyRepository, IEmployeeRepository via constructor. On submit: validate the leave policy exists and is active, check for date conflicts, set status to SUBMITTED. On approve: verify approver is the employee's manager, set status to APPROVED, record approverId and timestamp. On reject: verify rejector is the employee's manager, set status to REJECTED, record rejectorId, timestamp, and reason. On cancel: set status to CANCELLED, record cancelledById and timestamp. All state-changing operations must validate inputs per GP-003.
- Update src/modules/leave/index.ts — Add new exports.

This phase depends on src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts from Phase 4, src/modules/policy/policy.repository.ts from Phase 2, src/modules/employee/employee.repository.ts from Phase 3, and src/shared/types/index.ts from Phase 1. Read all before generating. Include Jest unit tests in tests/unit/modules/leave/. Approximately 4 files.

## Phase 8: Phase 7: LeaveRequest controller

Create the LeaveRequest controller that handles HTTP request/response mapping for leave operations.

Files to create:
- src/modules/leave/leave.controller.ts — Define and export LeaveController class. Inject ILeaveService via constructor. Methods:
  - submit(req, reply): parse body as CreateLeaveRequestDto, call service.submitRequest, return 201 with LeaveRequest.
  - approve(req, reply): extract requestId from params and approverId from auth context, call service.approveRequest, return 200.
  - reject(req, reply): extract requestId from params, rejectorId from auth context, reason from body, call service.rejectRequest, return 200.
  - cancel(req, reply): extract requestId from params, cancelledById from auth context, call service.cancelRequest, return 200.
  - getById(req, reply): extract requestId from params, call service.getRequestById, return 200 or 404.
  - getByEmployee(req, reply): extract employeeId from params, call service.getRequestsByEmployee, return 200.
  - getPendingForManager(req, reply): extract managerId from auth context, call service.getPendingRequestsForManager, return 200.
  All methods wrap calls in try/catch per GP-006, returning appropriate HTTP status codes. Use Zod (already in dependencies) for input validation per GP-003.
- Update src/modules/leave/index.ts — Add new export.

This phase depends on src/modules/leave/leave.service.interface.ts and src/modules/leave/leave.model.ts from Phase 6 and Phase 4. Read them before generating. Include Jest unit tests in tests/unit/modules/leave/. Approximately 3 files.

## Phase 9: Phase 8: LeaveRequest routes and app registration

Create the Fastify route definitions for the leave module and register them in the app.

Files to create:
- src/modules/leave/leave.routes.ts — Define and export leaveRoutes async function (FastifyInstance) => Promise<void>. Register routes:
  - POST /leave/requests → controller.submit
  - GET /leave/requests/:requestId → controller.getById
  - GET /leave/requests/employee/:employeeId → controller.getByEmployee
  - GET /leave/requests/manager/pending → controller.getPendingForManager
  - PATCH /leave/requests/:requestId/approve → controller.approve
  - PATCH /leave/requests/:requestId/reject → controller.reject
  - PATCH /leave/requests/:requestId/cancel → controller.cancel
  Instantiate LeaveController with its dependencies (LeaveService → LeaveRepository, PolicyRepository, EmployeeRepository) using the pg pool from src/shared/db/connection.ts.
- Update src/modules/leave/index.ts — Add new export.
- Update src/app.ts — Import and register leaveRoutes alongside the existing uptimeRoutes.

This phase depends on src/modules/leave/leave.controller.ts from Phase 7, src/modules/leave/leave.service.ts from Phase 6, src/modules/leave/leave.repository.ts from Phase 4, src/modules/policy/policy.repository.ts from Phase 2, src/modules/employee/employee.repository.ts from Phase 3, and src/app.ts (existing). Read all before generating. Include Jest integration tests in tests/integration/modules/leave/. Approximately 4 files.

## Phase 10: Phase 9: Balance model and repository

Create the Balance domain model and repository for tracking employee leave balances.

Files to create:
- src/modules/balance/balance.model.ts — Define and export the Balance interface with attributes: id: string, employeeId: string, leavePolicyId: string, leaveType: LeaveType, totalEntitledDays: number, usedDays: number, pendingDays: number, remainingDays: number, year: number, createdAt: Date, updatedAt: Date. Import LeaveType from src/shared/types/index.ts (Phase 1).
- src/modules/balance/balance.repository.ts — Define and export IBalanceRepository interface extending IBaseRepository<Balance> from src/shared/base-repository.ts (Phase 1). Add methods: findByEmployeeIdAndYear(employeeId: string, year: number): Promise<Balance[]>, findByEmployeeIdAndLeaveType(employeeId: string, leaveType: LeaveType, year: number): Promise<Balance | null>, upsertBalance(balance: Balance): Promise<Balance>. Implement KnexBalanceRepository using the pg pool from src/shared/db/connection.ts.
- src/modules/balance/index.ts — Barrel export.

This phase depends on src/shared/types/index.ts and src/shared/base-repository.ts from Phase 1. Read them before generating. Include Jest unit tests in tests/unit/modules/balance/. Approximately 5 files.

## Phase 11: Phase 10: Balance service and leave-balance integration

Create the Balance service and integrate it with the leave approval workflow so balances are updated when leave is approved.

Files to create:
- src/modules/balance/balance.service.interface.ts — Define and export IBalanceService interface with methods: getBalanceForEmployee(employeeId: string, leaveType: LeaveType, year: number): Promise<Balance | null>, getAllBalancesForEmployee(employeeId: string, year: number): Promise<Balance[]>, initializeBalance(employeeId: string, leavePolicyId: string): Promise<Balance>, deductDays(employeeId: string, leaveType: LeaveType, days: number, year: number): Promise<Balance>, restoreDays(employeeId: string, leaveType: LeaveType, days: number, year: number): Promise<Balance>.
- src/modules/balance/balance.service.ts — Implement BalanceService class implementing IBalanceService. Inject IBalanceRepository and IPolicyRepository via constructor. initializeBalance reads the LeavePolicy to get entitlementDays and creates a new Balance record. deductDays reduces remainingDays and increases usedDays. restoreDays does the reverse (for cancellations).
- Update src/modules/leave/leave.service.ts (from Phase 6) — Modify the approveRequest method to call IBalanceService.deductDays after approval, calculating the number of working days between startDate and endDate. Modify cancelRequest to call IBalanceService.restoreDays when cancelling an approved request. Inject IBalanceService into LeaveService constructor.
- Update src/modules/leave/index.ts — No new exports needed (service interface unchanged).
- src/modules/balance/index.ts — Barrel export.

This phase depends on src/modules/balance/balance.model.ts and src/modules/balance/balance.repository.ts from Phase 9, src/modules/leave/leave.service.ts from Phase 6, src/modules/policy/policy.repository.ts from Phase 2, and src/shared/types/index.ts from Phase 1. Read all before generating. Include Jest unit tests in tests/unit/modules/balance/ and update tests/unit/modules/leave/leave.service.test.ts. Approximately 5 files.
