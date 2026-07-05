# PLAN.md

## Phase 1: Phase 1: Shared leave types

Create src/shared/types/leave.types.ts with all shared enums and types used across leave, balance, and policy modules:

- `LeaveType` enum: ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, OTHER
- `LeaveStatus` enum: PENDING, APPROVED, REJECTED, CANCELLED
- `LeaveBalanceStatus` enum: ACTIVE, EXHAUSTED, EXPIRED
- `EmploymentStatus` enum: ACTIVE, TERMINATED, ON_LEAVE
- `NotificationType` enum: LEAVE_REQUEST_CREATED, LEAVE_REQUEST_APPROVED, LEAVE_REQUEST_REJECTED, LEAVE_REQUEST_CANCELLED, LEAVE_BALANCE_LOW, LEAVE_BALANCE_EXPIRING
- `AuditAction` enum: CREATE, UPDATE, DELETE
- `EntityType` enum: LEAVE_REQUEST, LEAVE_BALANCE, LEAVE_POLICY, EMPLOYEE, NOTIFICATION

This file has zero dependencies on other project files. Include Jest unit tests in tests/unit/shared/types/leave.types.test.ts verifying each enum has the correct members.

## Phase 2: Phase 2: Leave module — model and repository

Create the leave module domain model and repository together in a single phase.

Files to create:
- src/modules/leave/leave.model.ts — Define `LeaveRequest` interface with all attributes: id, employeeId, leaveTypeId, startDate, endDate, reason, status (LeaveStatus), approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, cancellationReason, createdAt, updatedAt. Also define `CreateLeaveRequestDto` (employeeId, leaveTypeId, startDate, endDate, reason?), `UpdateLeaveRequestDto` (Partial of status/reason fields), and `LeaveRequestQueryParams` (filters for employeeId, status, date range).
- src/modules/leave/leave.repository.ts — Define `ILeaveRepository` interface with methods: findById, findByEmployeeId, findByStatus, create, update, delete. Implement `LeaveRepository` class using the pg pool from src/shared/db/connection.ts. The repository must import and use the types from leave.model.ts.

This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references LeaveType, LeaveStatus, etc. Also depends on src/shared/db/connection.ts (already exists).

Include Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts.

## Phase 3: Phase 3: Leave module — service

Create the leave module service layer.

Files to create:
- src/modules/leave/leave.service.interface.ts — Define `ILeaveService` interface with methods: createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approveLeave(id: string, approverId: string): Promise<LeaveRequest>, rejectLeave(id: string, rejecterId: string, reason: string): Promise<LeaveRequest>, cancelLeave(id: string, cancellerId: string, reason: string): Promise<LeaveRequest>, getLeaveRequestById(id: string): Promise<LeaveRequest | null>, getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>, getLeaveRequestsByStatus(status: LeaveStatus): Promise<LeaveRequest[]>.
- src/modules/leave/leave.service.ts — Implement `LeaveService` class implementing ILeaveService. Inject ILeaveRepository via constructor. Business logic: validate date ranges (startDate before endDate), enforce that only PENDING requests can be approved/rejected, only APPROVED requests can be cancelled, set timestamps and actor IDs on status transitions.

This phase depends on:
- src/shared/types/leave.types.ts from Phase 1 (for LeaveStatus enum)
- src/modules/leave/leave.model.ts from Phase 2 (for LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto)
- src/modules/leave/leave.repository.ts from Phase 2 (for ILeaveRepository)

Include Jest unit tests in tests/unit/modules/leave/leave.service.test.ts with mocked repository.

## Phase 4: Phase 4: Leave module — controller and routes

Create the leave module HTTP layer.

Files to create:
- src/modules/leave/leave.controller.ts — Define `LeaveController` class. Inject ILeaveService via constructor. Methods: createLeaveRequest (POST body → CreateLeaveRequestDto), approveLeave (PATCH /:id/approve), rejectLeave (PATCH /:id/reject), cancelLeave (PATCH /:id/cancel), getLeaveRequestById (GET /:id), getLeaveRequestsByEmployee (GET /employee/:employeeId), getLeaveRequestsByStatus (GET /status/:status). Each method extracts params/body from Fastify request, calls service, and returns Fastify reply with appropriate status codes (201 for create, 200 for others, 404 for not found, 400 for validation errors).
- src/modules/leave/leave.routes.ts — Define `leaveRoutes` as a Fastify plugin function that registers all leave endpoints. Use Fastify schema validation for request bodies and params where applicable.
- src/modules/leave/index.ts — Barrel export: re-export LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams from leave.model.ts, ILeaveService from leave.service.interface.ts, LeaveService from leave.service.ts, ILeaveRepository from leave.repository.ts, LeaveRepository from leave.repository.ts, LeaveController from leave.controller.ts, leaveRoutes from leave.routes.ts.

This phase depends on:
- src/shared/types/leave.types.ts from Phase 1
- src/modules/leave/leave.model.ts from Phase 2
- src/modules/leave/leave.repository.ts from Phase 2
- src/modules/leave/leave.service.interface.ts from Phase 3
- src/modules/leave/leave.service.ts from Phase 3

Include Jest integration tests in tests/integration/modules/leave/leave.routes.test.ts using Fastify's inject method.

## Phase 5: Phase 5: Policy module — model and repository

Create the policy module domain model and repository.

Files to create:
- src/modules/policy/policy.model.ts — Define `LeavePolicy` interface with attributes: id, name, leaveType (LeaveType enum), defaultEntitlementDays, maxConsecutiveDays, requiresApproval, requiresDocumentation, isActive, fiscalYearStart, fiscalYearEnd, createdAt, updatedAt. Also define `CreateLeavePolicyDto` and `LeavePolicyQueryParams`.
- src/modules/policy/policy.repository.ts — Define `ILeavePolicyRepository` interface with methods: findById, findByLeaveType, findAll, create, update, delete. Implement `LeavePolicyRepository` class using the pg pool from src/shared/db/connection.ts.

This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references LeaveType.

Include Jest unit tests in tests/unit/modules/policy/policy.repository.test.ts.

## Phase 6: Phase 6: Policy module — service, controller, routes

Create the policy module service, controller, routes, and barrel export.

Files to create:
- src/modules/policy/policy.service.interface.ts — Define `ILeavePolicyService` with methods: createPolicy, updatePolicy, getPolicyById, getPolicyByLeaveType, getAllPolicies, deletePolicy.
- src/modules/policy/policy.service.ts — Implement `LeavePolicyService` class. Inject ILeavePolicyRepository. Business logic: validate entitlement days > 0, maxConsecutiveDays > 0, ensure leaveType uniqueness on create.
- src/modules/policy/policy.controller.ts — Define `PolicyController` class. Inject ILeavePolicyService. Standard CRUD endpoints.
- src/modules/policy/policy.routes.ts — Define `policyRoutes` Fastify plugin with schema validation.
- src/modules/policy/index.ts — Barrel export for all policy module symbols.

This phase depends on:
- src/shared/types/leave.types.ts from Phase 1
- src/modules/policy/policy.model.ts from Phase 5
- src/modules/policy/policy.repository.ts from Phase 5

Include Jest unit tests in tests/unit/modules/policy/policy.service.test.ts and integration tests in tests/integration/modules/policy/policy.routes.test.ts.

## Phase 7: Phase 7: Balance module — model and repository

Create the balance module domain model and repository.

Files to create:
- src/modules/balance/balance.model.ts — Define `LeaveBalance` interface with attributes: id, employeeId, policyId, leaveType (LeaveType), totalEntitlement, usedDays, remainingDays, fiscalYear, status (LeaveBalanceStatus), createdAt, updatedAt. Also define `CreateLeaveBalanceDto`, `UpdateLeaveBalanceDto`, and `LeaveBalanceQueryParams`.
- src/modules/balance/balance.repository.ts — Define `ILeaveBalanceRepository` interface with methods: findByEmployeeId, findByEmployeeIdAndLeaveType, findByEmployeeIdAndFiscalYear, create, update, deductDays, restoreDays. Implement `LeaveBalanceRepository` class using the pg pool from src/shared/db/connection.ts.

This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references LeaveType and LeaveBalanceStatus.

Include Jest unit tests in tests/unit/modules/balance/balance.repository.test.ts.

## Phase 8: Phase 8: Balance module — service, controller, routes

Create the balance module service, controller, routes, and barrel export.

Files to create:
- src/modules/balance/balance.service.interface.ts — Define `ILeaveBalanceService` with methods: getBalance, getBalancesByEmployee, createBalance, deductDays, restoreDays, getRemainingDays.
- src/modules/balance/balance.service.ts — Implement `LeaveBalanceService` class. Inject ILeaveBalanceRepository. Business logic: validate that remainingDays = totalEntitlement - usedDays, prevent negative remainingDays on deduction, enforce that only ACTIVE balances can be deducted from.
- src/modules/balance/balance.controller.ts — Define `BalanceController` class. Inject ILeaveBalanceService. Endpoints: GET /employee/:employeeId, GET /employee/:employeeId/leave-type/:leaveType, POST / (create), PATCH /:id/deduct, PATCH /:id/restore.
- src/modules/balance/balance.routes.ts — Define `balanceRoutes` Fastify plugin with schema validation.
- src/modules/balance/index.ts — Barrel export for all balance module symbols.

This phase depends on:
- src/shared/types/leave.types.ts from Phase 1
- src/modules/balance/balance.model.ts from Phase 7
- src/modules/balance/balance.repository.ts from Phase 7

Include Jest unit tests in tests/unit/modules/balance/balance.service.test.ts and integration tests in tests/integration/modules/balance/balance.routes.test.ts.

## Phase 9: Phase 9: Cross-module integration — leave approval triggers balance deduction

Wire the leave and balance modules together so that leave status transitions automatically update leave balances.

Files to modify:
- src/modules/leave/leave.service.ts — Update `LeaveService` to also accept `ILeaveBalanceService` in its constructor. In the `approveLeave` method, after setting status to APPROVED, call `balanceService.deductDays(employeeId, leaveTypeId, dayCount)` where dayCount is computed from (endDate - startDate). In the `cancelLeave` method, when cancelling an APPROVED leave, call `balanceService.restoreDays(employeeId, leaveTypeId, dayCount)`. Handle the case where no balance exists for the employee/leaveType combination by throwing a domain error.
- src/modules/leave/leave.service.interface.ts — No changes needed (interface stays the same; only implementation changes).

This phase depends on:
- src/modules/leave/leave.service.ts from Phase 3 (to modify)
- src/modules/leave/leave.service.interface.ts from Phase 3
- src/modules/balance/balance.service.interface.ts from Phase 8 (for ILeaveBalanceService type)
- src/modules/balance/balance.model.ts from Phase 7 (for LeaveBalance type)
- src/shared/types/leave.types.ts from Phase 1

Update existing Jest unit tests in tests/unit/modules/leave/leave.service.test.ts to also mock ILeaveBalanceService and verify balance deduction/restoration is called on approve/cancel.
