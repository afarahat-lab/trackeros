# PLAN.md

## Phase 1: Phase 1: Shared types, enums, and base repository

Create the foundational shared types and base repository that all leave-related modules depend on.

Create src/shared/types/index.ts with:
- LeaveType enum: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'
- LeaveRequestStatus enum: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
- BalanceStatus enum: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED'

Create src/shared/error.types.ts with:
- NotFoundError class (extends Error, takes entityName and id)
- ValidationError class (extends Error, takes message and optional details array)
- ConflictError class (extends Error, takes message)
- ForbiddenError class (extends Error, takes message)

Create src/shared/base.repository.ts with:
- Generic interface IBaseRepository<T> with methods: findById(id: string): Promise<T | null>, findAll(filter?: Record<string, unknown>): Promise<T[]>, create(entity: Partial<T>): Promise<T>, update(id: string, entity: Partial<T>): Promise<T>, delete(id: string): Promise<void>
- Abstract class KnexBaseRepository<T> that implements IBaseRepository<T>, takes a Knex instance and tableName in constructor, provides concrete implementations using Knex query builder. Import the pg pool from src/shared/db/connection.ts (which already exists) to create the Knex instance.

Include Jest unit tests in tests/unit/shared/ for error types and base repository.

## Phase 2: Phase 2: LeaveRequest model and repository

Create the LeaveRequest domain model, DTOs, and repository together so Aider sees both the type definitions and their usage in a single context.

Create src/modules/leave/leave.model.ts with:
- LeaveRequest interface: id, employeeId, leaveTypeId, startDate, endDate, reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), rejectionReason (string | undefined), cancelledBy (string | null), cancelledAt (Date | null), cancellationReason (string | undefined), createdAt, updatedAt
- CreateLeaveRequestDto interface: employeeId, leaveTypeId, startDate, endDate, reason (string | undefined)
- UpdateLeaveRequestDto interface: startDate?, endDate?, reason?
- LeaveRequestQueryParams interface: status?, leaveTypeId?, startDateFrom?, startDateTo?, endDateFrom?, endDateTo?, limit?, offset?

Create src/modules/leave/leave.repository.ts with:
- ILeaveRepository interface extending IBaseRepository<LeaveRequest> with additional methods: findByEmployeeId(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>, findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>, findByDateRange(startDate: Date, endDate: Date): Promise<LeaveRequest[]>
- KnexLeaveRepository class extending KnexBaseRepository<LeaveRequest> implementing ILeaveRepository

This phase depends on src/shared/types/index.ts and src/shared/base.repository.ts from Phase 1 — read them before generating any code that references their types.

Include Jest unit tests in tests/unit/modules/leave/ for the repository.

## Phase 3: Phase 3: LeaveBalance model and repository

Create the LeaveBalance domain model and repository together.

Create src/modules/balance/balance.model.ts with:
- LeaveBalance interface: id, employeeId, policyId, leaveType (LeaveType), totalEntitlement, usedDays, remainingDays, pendingDays, fiscalYearStart (Date), fiscalYearEnd (Date), status (BalanceStatus), createdAt, updatedAt

Create src/modules/balance/balance.repository.ts with:
- IBalanceRepository interface extending IBaseRepository<LeaveBalance> with additional methods: findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>, findByEmployeeAndType(employeeId: string, leaveType: LeaveType): Promise<LeaveBalance | null>, findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null>, deductDays(id: string, days: number): Promise<LeaveBalance>, restoreDays(id: string, days: number): Promise<LeaveBalance>, reservePendingDays(id: string, days: number): Promise<LeaveBalance>, releasePendingDays(id: string, days: number): Promise<LeaveBalance>
- KnexBalanceRepository class extending KnexBaseRepository<LeaveBalance> implementing IBalanceRepository

This phase depends on src/shared/types/index.ts (LeaveType, BalanceStatus) and src/shared/base.repository.ts from Phase 1 — read them before generating any code.

Include Jest unit tests in tests/unit/modules/balance/.

## Phase 4: Phase 4: LeavePolicy model and repository

Create the LeavePolicy domain model and repository together.

Create src/modules/policy/policy.model.ts with:
- LeavePolicy interface: id, policyName, leaveType (LeaveType), entitlementDays, accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), createdAt, updatedAt

Create src/modules/policy/policy.repository.ts with:
- IPolicyRepository interface extending IBaseRepository<LeavePolicy> with additional methods: findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>, findActivePolicies(): Promise<LeavePolicy[]>
- KnexPolicyRepository class extending KnexBaseRepository<LeavePolicy> implementing IPolicyRepository

This phase depends on src/shared/types/index.ts (LeaveType) and src/shared/base.repository.ts from Phase 1 — read them before generating any code.

Include Jest unit tests in tests/unit/modules/policy/.

## Phase 5: Phase 5: Leave service (business logic)

Create the leave service with business logic for the full leave request lifecycle.

Create src/modules/leave/leave.service.interface.ts with:
- ILeaveService interface: submit(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approve(requestId: string, approverId: string): Promise<LeaveRequest>, reject(requestId: string, rejectorId: string, reason: string): Promise<LeaveRequest>, cancel(requestId: string, cancelledById: string, reason?: string): Promise<LeaveRequest>, findById(id: string): Promise<LeaveRequest | null>, findByEmployeeId(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>

Create src/modules/leave/leave.service.ts with:
- LeaveService class implementing ILeaveService. Constructor takes ILeaveRepository and IBalanceRepository.
- submit(): validates dates (startDate before endDate, no past dates), checks balance via IBalanceRepository.findByEmployeeAndType for sufficient remainingDays, creates LeaveRequest with SUBMITTED status, calls balanceRepository.reservePendingDays
- approve(): loads request, validates status is SUBMITTED, sets approvedBy/approvedAt/status=APPROVED, calls balanceRepository.releasePendingDays then balanceRepository.deductDays
- reject(): loads request, validates status is SUBMITTED, sets rejectedBy/rejectedAt/rejectionReason/status=REJECTED, calls balanceRepository.releasePendingDays
- cancel(): loads request, validates status is APPROVED or SUBMITTED, sets cancelledBy/cancelledAt/cancellationReason/status=CANCELLED. If status was APPROVED, calls balanceRepository.restoreDays. If status was SUBMITTED, calls balanceRepository.releasePendingDays.

This phase depends on:
- src/shared/types/index.ts from Phase 1 (LeaveRequestStatus, LeaveType)
- src/shared/error.types.ts from Phase 1 (NotFoundError, ValidationError, ConflictError, ForbiddenError)
- src/modules/leave/leave.model.ts from Phase 2 (LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams)
- src/modules/leave/leave.repository.ts from Phase 2 (ILeaveRepository)
- src/modules/balance/balance.model.ts from Phase 3 (LeaveBalance)
- src/modules/balance/balance.repository.ts from Phase 3 (IBalanceRepository)

Read all dependency files before generating. Include Jest unit tests in tests/unit/modules/leave/ for the service.

## Phase 6: Phase 6: Leave controller

Create the leave controller that handles HTTP request/response mapping, input validation, and delegates to the leave service.

Create src/modules/leave/leave.controller.ts with:
- LeaveController class. Constructor takes ILeaveService.
- submit(req, reply): extracts body, validates with Zod schema matching CreateLeaveRequestDto (employeeId string, leaveTypeId string, startDate/endDate as ISO strings coerced to Date, reason optional string), calls service.submit(), returns 201 with LeaveRequest
- approve(req, reply): extracts requestId from params, approverId from authenticated user context (req.user.id placeholder), calls service.approve(), returns 200
- reject(req, reply): extracts requestId from params, body with reason, approverId from auth context, calls service.reject(), returns 200
- cancel(req, reply): extracts requestId from params, optional reason from body, userId from auth context, calls service.cancel(), returns 200
- findById(req, reply): extracts requestId from params, calls service.findById(), returns 200 or 404
- findByEmployeeId(req, reply): extracts employeeId from params, query params, calls service.findByEmployeeId(), returns 200

Use Zod for input validation (zod is already in package.json). Wrap all handlers in try/catch, mapping NotFoundError → 404, ValidationError → 400, ConflictError → 409, ForbiddenError → 403.

This phase depends on:
- src/modules/leave/leave.service.interface.ts from Phase 5 (ILeaveService)
- src/modules/leave/leave.model.ts from Phase 2 (LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams)
- src/shared/error.types.ts from Phase 1 (NotFoundError, ValidationError, ConflictError, ForbiddenError)

Read all dependency files before generating. Include Jest unit tests in tests/unit/modules/leave/ for the controller.

## Phase 7: Phase 7: Leave routes and module registration

Create the Fastify routes for the leave module and wire everything together.

Create src/modules/leave/leave.routes.ts with:
- leaveRoutes async function (fastify: FastifyInstance): registers routes:
  - POST /leave/requests → controller.submit
  - GET /leave/requests/:requestId → controller.findById
  - GET /leave/requests/employee/:employeeId → controller.findByEmployeeId
  - POST /leave/requests/:requestId/approve → controller.approve
  - POST /leave/requests/:requestId/reject → controller.reject
  - POST /leave/requests/:requestId/cancel → controller.cancel
- Instantiate KnexLeaveRepository, KnexBalanceRepository, LeaveService, LeaveController inside the plugin function (or accept them via Fastify decorate).

Create src/modules/leave/index.ts barrel export:
- Re-export LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams from leave.model
- Re-export ILeaveRepository, KnexLeaveRepository from leave.repository
- Re-export ILeaveService, LeaveService from leave.service(.interface)
- Re-export LeaveController from leave.controller
- Re-export leaveRoutes from leave.routes

Update src/app.ts to register leaveRoutes alongside the existing uptimeRoutes.

This phase depends on:
- src/modules/leave/leave.controller.ts from Phase 6 (LeaveController)
- src/modules/leave/leave.service.ts from Phase 5 (LeaveService)
- src/modules/leave/leave.repository.ts from Phase 2 (KnexLeaveRepository)
- src/modules/balance/balance.repository.ts from Phase 3 (KnexBalanceRepository)
- src/shared/db/connection.ts (existing, for Knex instance)
- src/app.ts (existing, to register routes)

Read all dependency files before generating. Include Jest integration tests in tests/integration/modules/leave/ for the routes.
