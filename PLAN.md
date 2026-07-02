# PLAN.md

## Phase 1: Phase 1: Shared leave type enums

Create src/shared/types/leave.types.ts with the canonical enums: LeaveType (ANNUAL, SICK, EMERGENCY), LeaveStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), LeaveRequestStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), BalanceStatus (ACTIVE, EXHAUSTED, FROZEN), NotificationType, AuditAction, EntityType. Create src/shared/types/index.ts as a barrel re-export of leave.types.ts. These enums are the foundational shared types referenced by all downstream modules. No dependencies on other phases.

## Phase 2: Phase 2: Leave domain model and repository

Create src/modules/leave/leave.model.ts with TypeScript interfaces: LeaveRequest (id, employeeId, leavePolicyId, startDate, endDate, reason, status: LeaveRequestStatus, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, createdAt, updatedAt), CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams. Import LeaveRequestStatus from src/shared/types/leave.types.ts (Phase 1). Create src/modules/leave/leave.repository.ts with ILeaveRepository interface declaring CRUD and query methods for LeaveRequest. Also create src/modules/leave/index.ts barrel export. This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references its types.

## Phase 3: Phase 3: LeavePolicy domain model and repository

Create src/modules/policy/policy.model.ts with TypeScript interfaces: LeavePolicy (id, policyName, leaveType: LeaveType, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt), LeavePolicyQueryParams. Import LeaveType from src/shared/types/leave.types.ts (Phase 1). Create src/modules/policy/policy.repository.ts with ILeavePolicyRepository interface declaring findById, findAll, findByLeaveType, findActive, create, update methods. Create src/modules/policy/index.ts barrel export. This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references its types.

## Phase 4: Phase 4: LeaveBalance domain model and repository

Create src/modules/balance/balance.model.ts with TypeScript interfaces: LeaveBalance (id, employeeId, leavePolicyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status: BalanceStatus, createdAt, updatedAt), LeaveBalanceQueryParams. Import BalanceStatus from src/shared/types/leave.types.ts (Phase 1). Create src/modules/balance/balance.repository.ts with ILeaveBalanceRepository interface declaring findByEmployeeId, findByEmployeeAndPolicy, findByFiscalYear, create, update, deductDays methods. Create src/modules/balance/index.ts barrel export. This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references its types.

## Phase 5: Phase 5: Employee domain model and repository

Create src/modules/employee/employee.model.ts with TypeScript interfaces: Employee (id, firstName, lastName, email, departmentId, managerId, role, isActive, createdAt, updatedAt), CreateEmployeeDto, UpdateEmployeeDto. Create src/modules/employee/employee.repository.ts with IEmployeeRepository interface declaring findById, findByEmail, findByManager, findByDepartment, findAll, create, update methods, and a concrete EmployeeRepository class implementing IEmployeeRepository using the pg pool from src/shared/db/connection.ts (already exists). Create src/modules/employee/index.ts barrel export. Include Jest unit tests in tests/unit/modules/employee/employee.repository.test.ts. This phase depends on src/shared/types/leave.types.ts from Phase 1 and src/shared/db/connection.ts (existing).

## Phase 6: Phase 6: LeavePolicy service

Create src/modules/policy/policy.service.interface.ts with IPolicyService interface declaring: getPolicyById, getPolicyByLeaveType, getActivePolicies, validatePolicyForRequest (checks minimumNoticeDays, requiresManagerApproval, isActive). Create src/modules/policy/policy.service.ts with PolicyService class implementing IPolicyService. PolicyService depends on ILeavePolicyRepository from src/modules/policy/policy.repository.ts (Phase 3). Create tests/unit/modules/policy/policy.service.test.ts with Jest unit tests mocking the repository. This phase depends on src/modules/policy/policy.model.ts and src/modules/policy/policy.repository.ts from Phase 3 — read both before generating.

## Phase 7: Phase 7: LeaveBalance service

Create src/modules/balance/balance.service.interface.ts with IBalanceService interface declaring: getBalance, getBalancesByEmployee, checkSufficientBalance, reserveDays, releaseDays, deductDays, getRemainingDays. Create src/modules/balance/balance.service.ts with BalanceService class implementing IBalanceService. BalanceService depends on ILeaveBalanceRepository from src/modules/balance/balance.repository.ts (Phase 4). Create tests/unit/modules/balance/balance.service.test.ts with Jest unit tests mocking the repository. This phase depends on src/modules/balance/balance.model.ts and src/modules/balance/balance.repository.ts from Phase 4 — read both before generating.

## Phase 8: Phase 8: Leave application service

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring: submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, getLeaveRequestById, getLeaveRequestsByEmployee, getPendingRequestsForManager. Create src/modules/leave/leave.service.ts with LeaveService class implementing ILeaveService. LeaveService orchestrates the leave lifecycle: on submit, validates policy via IPolicyService (Phase 6), checks balance via IBalanceService (Phase 7), persists via ILeaveRepository (Phase 2); on approve/reject, updates status and adjusts balance. Inject all dependencies via constructor. Create tests/unit/modules/leave/leave.service.test.ts with Jest unit tests mocking all dependencies. This phase depends on src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts from Phase 2, src/modules/policy/policy.service.interface.ts from Phase 6, and src/modules/balance/balance.service.interface.ts from Phase 7 — read all before generating.

## Phase 9: Phase 9: Leave validation schemas

Create src/modules/leave/leave.validation.ts with Zod schemas: createLeaveRequestSchema (validates employeeId, leavePolicyId, startDate, endDate, reason), approveLeaveRequestSchema (validates approverNotes), rejectLeaveRequestSchema (validates rejectionReason), cancelLeaveRequestSchema, getLeaveRequestSchema (validates id param), getLeaveRequestsQuerySchema (validates employeeId, status, dateRange query params). Import LeaveRequestStatus from src/shared/types/leave.types.ts (Phase 1). Export inferred TypeScript types alongside schemas. This phase depends on src/modules/leave/leave.model.ts from Phase 2 and src/shared/types/leave.types.ts from Phase 1 — read both before generating.

## Phase 10: Phase 10: Leave controller and routes

Create src/modules/leave/leave.controller.ts with LeaveController class. Constructor injects ILeaveService (from Phase 8). Methods: submitLeave, approveLeave, rejectLeave, cancelLeave, getLeaveRequest, getLeaveRequests, getPendingRequests — each method handles HTTP request/response, delegates to ILeaveService, and returns appropriate status codes. Create src/modules/leave/leave.routes.ts that registers all leave endpoints on a FastifyInstance: POST /leaves, GET /leaves, GET /leaves/:id, PATCH /leaves/:id/approve, PATCH /leaves/:id/reject, PATCH /leaves/:id/cancel, GET /leaves/pending. Apply Zod validation schemas from src/modules/leave/leave.validation.ts (Phase 9) as Fastify preHandler hooks. Register routes in src/app.ts alongside the existing uptimeRoutes. Create tests/unit/modules/leave/leave.controller.test.ts with Jest unit tests mocking ILeaveService. This phase depends on src/modules/leave/leave.service.interface.ts from Phase 8, src/modules/leave/leave.validation.ts from Phase 9, and src/app.ts (existing) — read all before generating.
