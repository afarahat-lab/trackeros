# PLAN.md

## Phase 1: Phase 1: Shared leave type enums

Create src/shared/types/leave.types.ts with the canonical enumerations:
- LeaveType enum: ANNUAL, SICK, EMERGENCY
- LeaveStatus enum: PENDING, APPROVED, REJECTED, CANCELLED

This file is the foundational type dependency for every subsequent phase. No other files are created or modified in this phase. Include a Jest unit test at tests/unit/shared/types/leave.types.test.ts that verifies all enum values are defined.

## Phase 2: Phase 2: Employee module — model, repository, service

Create the employee module with model, repository, and service. This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating.

Files to create:
- src/modules/employee/employee.model.ts — Employee interface (id: UUID, name: string, email: string, managerId: UUID | null, department: string | null, employmentDate: Date, createdAt: Date, updatedAt: Date) and CreateEmployeeDto, UpdateEmployeeDto
- src/modules/employee/employee.repository.ts — IEmployeeRepository interface and EmployeeRepository class using pg Pool from src/shared/db/connection.ts. Methods: findById(id), findByManagerId(managerId), findAll(), create(dto), update(id, dto)
- src/modules/employee/employee.service.interface.ts — IEmployeeService interface with methods: getEmployeeById(id), getManagerForEmployee(employeeId), getDirectReports(managerId)
- src/modules/employee/employee.service.ts — EmployeeService implementing IEmployeeService, injecting IEmployeeRepository via constructor
- tests/unit/modules/employee/employee.repository.test.ts — Jest unit tests for EmployeeRepository with mocked pg Pool

## Phase 3: Phase 3: Policy module — model, repository, service

Create the policy module with model, repository, and service. This phase depends on src/shared/types/leave.types.ts from Phase 1 (for LeaveType) and src/modules/employee/employee.model.ts from Phase 2 — read both before generating.

Files to create:
- src/modules/policy/policy.model.ts — LeavePolicy interface (id: UUID, leaveType: LeaveType, entitlementDays: number, carryOverLimit: number, requiresApproval: boolean, createdAt: Date, updatedAt: Date) and CreateLeavePolicyDto, UpdateLeavePolicyDto. Import LeaveType from src/shared/types/leave.types.ts.
- src/modules/policy/policy.repository.ts — ILeavePolicyRepository interface and LeavePolicyRepository class using pg Pool from src/shared/db/connection.ts. Methods: findByLeaveType(leaveType), findAll(), create(dto), update(id, dto).
- src/modules/policy/policy.service.interface.ts — IPolicyService interface with methods: getPolicyForLeaveType(leaveType), getAllPolicies(), validateEntitlement(leaveType, requestedDays).
- src/modules/policy/policy.service.ts — PolicyService implementing IPolicyService, injecting ILeavePolicyRepository via constructor.
- tests/unit/modules/policy/policy.repository.test.ts — Jest unit tests for LeavePolicyRepository with mocked pg Pool.

## Phase 4: Phase 4: Balance module — model, repository, service

Create the balance module with model, repository, and service. This phase depends on src/shared/types/leave.types.ts from Phase 1 (for LeaveType) and src/modules/employee/employee.model.ts from Phase 2 — read both before generating.

Files to create:
- src/modules/balance/balance.model.ts — LeaveBalance interface (id: UUID, employeeId: UUID, leaveType: LeaveType, balance: number, fiscalYear: number, createdAt: Date, updatedAt: Date) and CreateLeaveBalanceDto, UpdateLeaveBalanceDto. Import LeaveType from src/shared/types/leave.types.ts.
- src/modules/balance/balance.repository.ts — ILeaveBalanceRepository interface and LeaveBalanceRepository class using pg Pool from src/shared/db/connection.ts. Methods: findByEmployeeAndType(employeeId, leaveType, fiscalYear), findByEmployee(employeeId), create(dto), updateBalance(id, newBalance), decrementBalance(id, days).
- src/modules/balance/balance.service.interface.ts — IBalanceService interface with methods: getBalance(employeeId, leaveType, fiscalYear), getBalancesForEmployee(employeeId), initializeBalance(employeeId, leaveType, fiscalYear, entitlementDays), deductBalance(employeeId, leaveType, fiscalYear, days), restoreBalance(employeeId, leaveType, fiscalYear, days).
- src/modules/balance/balance.service.ts — BalanceService implementing IBalanceService, injecting ILeaveBalanceRepository via constructor.
- tests/unit/modules/balance/balance.repository.test.ts — Jest unit tests for LeaveBalanceRepository with mocked pg Pool.

## Phase 5: Phase 5: Notification module — model, repository, service

Create the notification module with model, repository, and service. This phase depends on src/shared/types/leave.types.ts from Phase 1 and src/modules/employee/employee.model.ts from Phase 2 — read both before generating.

Files to create:
- src/modules/notification/notification.model.ts — Notification interface (id: UUID, recipientId: UUID, type: string, title: string, body: string, metadata: Record<string, unknown> | null, status: 'PENDING' | 'SENT' | 'FAILED', createdAt: Date) and CreateNotificationDto. Notification type constants: LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, BALANCE_LOW.
- src/modules/notification/notification.repository.ts — INotificationRepository interface and NotificationRepository class using pg Pool from src/shared/db/connection.ts. Methods: findByRecipient(recipientId), create(dto), updateStatus(id, status).
- src/modules/notification/notification.service.interface.ts — INotificationService interface with methods: notifyLeaveSubmitted(recipientId, leaveRequestId), notifyLeaveApproved(recipientId, leaveRequestId), notifyLeaveRejected(recipientId, leaveRequestId), notifyBalanceLow(recipientId, leaveType, remainingDays).
- src/modules/notification/notification.service.ts — NotificationService implementing INotificationService, injecting INotificationRepository via constructor.
- tests/unit/modules/notification/notification.repository.test.ts — Jest unit tests for NotificationRepository with mocked pg Pool.

## Phase 6: Phase 6: Leave module — model and repository

Create the leave module model and repository. This phase depends on:
- src/shared/types/leave.types.ts from Phase 1 (for LeaveType, LeaveStatus)
- src/modules/employee/employee.model.ts from Phase 2 (for Employee type reference)
Read both before generating.

Files to create:
- src/modules/leave/leave.model.ts — LeaveRequest interface with canonical attributes: id: UUID, employeeId: UUID, leaveType: LeaveType, startDate: Date, endDate: Date, status: LeaveStatus, reason: string | null, managerId: UUID | null, createdAt: Date, updatedAt: Date. Also CreateLeaveRequestDto (employeeId, leaveType, startDate, endDate, reason?) and UpdateLeaveRequestDto (status?, managerId?, reason?). Import LeaveType and LeaveStatus from src/shared/types/leave.types.ts.
- src/modules/leave/leave.repository.ts — ILeaveRepository interface and LeaveRepository class using pg Pool from src/shared/db/connection.ts. Methods: findById(id), findByEmployeeId(employeeId), findByManagerId(managerId), findByStatus(status), create(dto), update(id, dto), updateStatus(id, status, managerId).
- tests/unit/modules/leave/leave.repository.test.ts — Jest unit tests for LeaveRepository with mocked pg Pool.

## Phase 7: Phase 7: Leave module — service with workflow orchestration

Create the leave service that orchestrates the full leave request lifecycle across dependent modules. This phase depends on ALL prior phases — read these files before generating:
- src/shared/types/leave.types.ts (Phase 1)
- src/modules/employee/employee.service.interface.ts (Phase 2)
- src/modules/policy/policy.service.interface.ts (Phase 3)
- src/modules/balance/balance.service.interface.ts (Phase 4)
- src/modules/notification/notification.service.interface.ts (Phase 5)
- src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts (Phase 6)

Files to create:
- src/modules/leave/leave.service.interface.ts — ILeaveService interface with methods: submitLeaveRequest(dto: CreateLeaveRequestDto), approveLeaveRequest(requestId: UUID, managerId: UUID), rejectLeaveRequest(requestId: UUID, managerId: UUID), cancelLeaveRequest(requestId: UUID, employeeId: UUID), getLeaveRequestById(id: UUID), getLeaveRequestsByEmployee(employeeId: UUID), getPendingRequestsForManager(managerId: UUID).
- src/modules/leave/leave.service.ts — LeaveService implementing ILeaveService. Constructor injects: ILeaveRepository, IEmployeeService, IPolicyService, IBalanceService, INotificationService. submitLeaveRequest validates employee exists, resolves manager from employee hierarchy, validates against policy entitlement, checks balance sufficiency, creates PENDING LeaveRequest, and sends notification. approveLeaveRequest validates manager authorization, transitions to APPROVED, deducts balance, sends notification. rejectLeaveRequest validates manager authorization, transitions to REJECTED, sends notification. cancelLeaveRequest validates employee ownership and PENDING status, transitions to CANCELLED. All state-changing methods wrap operations in explicit error handling.
- tests/unit/modules/leave/leave.service.test.ts — Jest unit tests for LeaveService with all dependencies mocked.

## Phase 8: Phase 8: Leave module — Zod validation schemas

Create Zod validation schemas for all leave request API inputs. This phase depends on:
- src/shared/types/leave.types.ts from Phase 1 (for LeaveType, LeaveStatus)
- src/modules/leave/leave.model.ts from Phase 6 (for CreateLeaveRequestDto, UpdateLeaveRequestDto shapes)
Read both before generating.

Files to create:
- src/modules/leave/leave.validation.ts — Zod schemas:
  - createLeaveRequestSchema: validates employeeId (UUID), leaveType (enum ANNUAL|SICK|EMERGENCY), startDate (ISO date string), endDate (ISO date string, must be >= startDate), reason (optional string, max 1000 chars)
  - approveLeaveRequestSchema: validates requestId (UUID)
  - rejectLeaveRequestSchema: validates requestId (UUID), reason (optional string)
  - cancelLeaveRequestSchema: validates requestId (UUID)
  - getLeaveRequestsQuerySchema: validates optional filters (status, leaveType, employeeId)
  - Export inferred TypeScript types from each schema
- tests/unit/modules/leave/leave.validation.test.ts — Jest unit tests covering valid inputs, invalid inputs, edge cases (endDate before startDate, invalid leaveType, missing required fields).

## Phase 9: Phase 9: Leave module — controller

Create the leave controller that bridges Fastify request/response handling with the leave service. This phase depends on:
- src/modules/leave/leave.service.interface.ts from Phase 7 (for ILeaveService method signatures)
- src/modules/leave/leave.validation.ts from Phase 8 (for Zod schemas and inferred types)
Read both before generating.

Files to create:
- src/modules/leave/leave.controller.ts — LeaveController class with methods:
  - submitLeaveRequest(request, reply): parse body with createLeaveRequestSchema, extract authenticated employeeId from request (JWT), call leaveService.submitLeaveRequest(), return 201 with created LeaveRequest
  - approveLeaveRequest(request, reply): parse params with approveLeaveRequestSchema, extract managerId from JWT, call leaveService.approveLeaveRequest(), return 200
  - rejectLeaveRequest(request, reply): parse params + body with rejectLeaveRequestSchema, extract managerId from JWT, call leaveService.rejectLeaveRequest(), return 200
  - cancelLeaveRequest(request, reply): parse params with cancelLeaveRequestSchema, extract employeeId from JWT, call leaveService.cancelLeaveRequest(), return 200
  - getLeaveRequestById(request, reply): parse params, call leaveService.getLeaveRequestById(), return 200
  - getMyLeaveRequests(request, reply): extract employeeId from JWT, call leaveService.getLeaveRequestsByEmployee(), return 200
  - getPendingRequestsForMyTeam(request, reply): extract managerId from JWT, call leaveService.getPendingRequestsForManager(), return 200
  Each method wraps calls in try/catch with proper error responses (400, 403, 404, 500). Constructor injects ILeaveService.
- tests/unit/modules/leave/leave.controller.test.ts — Jest unit tests for LeaveController with mocked ILeaveService, Fastify request/reply objects.

## Phase 10: Phase 10: Leave module — Fastify routes and app registration

Create the leave Fastify routes and register them in the app. This phase depends on:
- src/modules/leave/leave.validation.ts from Phase 8 (for Zod schemas)
- src/modules/leave/leave.controller.ts from Phase 9 (for LeaveController)
- src/app.ts (existing file — read before modifying)
Read all before generating.

Files to create/modify:
- src/modules/leave/leave.routes.ts — Export leaveRoutes async function that registers on FastifyInstance:
  - POST /api/leave/requests → submitLeaveRequest (employee role)
  - GET /api/leave/requests/:id → getLeaveRequestById (authenticated)
  - GET /api/leave/requests → getMyLeaveRequests (employee role)
  - GET /api/leave/requests/pending/team → getPendingRequestsForMyTeam (manager role)
  - POST /api/leave/requests/:id/approve → approveLeaveRequest (manager role)
  - POST /api/leave/requests/:id/reject → rejectLeaveRequest (manager role)
  - POST /api/leave/requests/:id/cancel → cancelLeaveRequest (employee role)
  Each route applies Zod validation via Fastify schema (preHandler hook), extracts JWT claims for RBAC, instantiates LeaveController with its dependencies (LeaveService → all injected services), and wraps in error handling.
- src/modules/leave/index.ts — Public barrel export: LeaveRequest, CreateLeaveRequestDto, ILeaveService, LeaveService, LeaveController, leaveRoutes, leave validation schemas.
- src/app.ts — MODIFY: add `import { leaveRoutes } from './modules/leave/leave.routes'` and `app.register(leaveRoutes)` after the existing uptimeRoutes registration.
- tests/unit/modules/leave/leave.routes.test.ts — Jest integration-style tests using Fastify's inject() method with mocked service layer.
