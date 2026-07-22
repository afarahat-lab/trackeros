# PLAN.md

## Phase 1: Phase 1: Domain model, validation schemas, and repository

Create src/modules/leave/leave.model.ts with:
- LeaveRequestStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED)
- LeaveType enum (annual, sick, emergency, unpaid, maternity, paternity)
- LeaveRequest interface with all fields: id, employeeId, leaveTypeId, startDate, endDate, daysRequested, reason, status, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, createdAt, updatedAt
- CreateLeaveRequestDto interface (employeeId, leaveTypeId, startDate, endDate, reason)
- UpdateLeaveRequestDto interface (startDate, endDate, reason — all optional)
- LeaveRequestQueryParams interface (status, leaveTypeId, startDateFrom, startDateTo, endDateFrom, endDateTo, limit, offset — all optional)

Create src/modules/leave/leave.validation.ts with Zod schemas:
- createLeaveRequestSchema validating CreateLeaveRequestDto
- updateLeaveRequestSchema validating UpdateLeaveRequestDto
- leaveRequestQuerySchema validating LeaveRequestQueryParams

Create src/modules/leave/leave.repository.ts with:
- ILeaveRepository interface: findById(id), findByEmployeeId(employeeId, params), create(dto), update(id, dto), delete(id), findAll(params)
- KnexLeaveRepository class implementing ILeaveRepository using the pg Pool from src/shared/db/connection.ts

This phase depends on existing file src/shared/db/connection.ts — read it before generating any database code. Include Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts.

## Phase 2: Phase 2: Leave service with business logic

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface:
- submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>
- approveLeaveRequest(id: string, approverId: string): Promise<LeaveRequest>
- rejectLeaveRequest(id: string, rejectorId: string, reason: string): Promise<LeaveRequest>
- cancelLeaveRequest(id: string, cancellerId: string): Promise<LeaveRequest>
- getLeaveRequest(id: string): Promise<LeaveRequest>
- getEmployeeLeaveRequests(employeeId: string, params: LeaveRequestQueryParams): Promise<LeaveRequest[]>
- getAllLeaveRequests(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>

Create src/modules/leave/leave.service.ts with LeaveService class implementing ILeaveService. Business rules:
- submitLeaveRequest: validate with Zod schema, set status to SUBMITTED, set daysRequested from date diff, set createdAt/updatedAt
- approveLeaveRequest: only SUBMITTED requests can be approved, set status to APPROVED, set approvedBy/approvedAt
- rejectLeaveRequest: only SUBMITTED requests can be rejected, set status to REJECTED, set rejectedBy/rejectedAt/rejectionReason
- cancelLeaveRequest: only APPROVED requests can be cancelled, set status to CANCELLED, set cancelledBy/cancelledAt

This phase depends on src/modules/leave/leave.model.ts, src/modules/leave/leave.validation.ts, and src/modules/leave/leave.repository.ts from Phase 1 — read them before generating any code. Include Jest unit tests in tests/unit/modules/leave/leave.service.test.ts.

## Phase 3: Phase 3: Leave controller

Create src/modules/leave/leave.controller.ts with LeaveController class:
- Constructor takes ILeaveService
- submit(request: FastifyRequest, reply: FastifyReply): parse body with createLeaveRequestSchema, call service.submitLeaveRequest, return 201
- approve(request: FastifyRequest, reply: FastifyReply): extract id from params and approverId from request context, call service.approveLeaveRequest, return 200
- reject(request: FastifyRequest, reply: FastifyReply): extract id from params, rejectorId from context, reason from body, call service.rejectLeaveRequest, return 200
- cancel(request: FastifyRequest, reply: FastifyReply): extract id from params, cancellerId from context, call service.cancelLeaveRequest, return 200
- getById(request: FastifyRequest, reply: FastifyReply): extract id from params, call service.getLeaveRequest, return 200
- getByEmployee(request: FastifyRequest, reply: FastifyReply): extract employeeId from params, parse query with leaveRequestQuerySchema, call service.getEmployeeLeaveRequests, return 200
- getAll(request: FastifyRequest, reply: FastifyReply): parse query with leaveRequestQuerySchema, call service.getAllLeaveRequests, return 200

This phase depends on src/modules/leave/leave.model.ts, src/modules/leave/leave.validation.ts from Phase 1 and src/modules/leave/leave.service.interface.ts from Phase 2 — read them before generating. Include Jest unit tests in tests/unit/modules/leave/leave.controller.test.ts.

## Phase 4: Phase 4: Leave routes and module registration

Create src/modules/leave/leave.routes.ts with leaveRoutes async function:
- Register Fastify routes: POST /leave, PATCH /leave/:id/approve, PATCH /leave/:id/reject, PATCH /leave/:id/cancel, GET /leave/:id, GET /leave/employee/:employeeId, GET /leave
- Instantiate KnexLeaveRepository and LeaveService, wire into LeaveController
- Each route handler delegates to the corresponding controller method

Create src/modules/leave/index.ts as the public entry point exporting:
- All types from leave.model.ts
- ILeaveService from leave.service.interface.ts
- LeaveService from leave.service.ts
- leaveRoutes from leave.routes.ts

Update src/app.ts to register leaveRoutes via app.register(leaveRoutes).

This phase depends on src/modules/leave/leave.controller.ts from Phase 3, src/modules/leave/leave.service.ts from Phase 2, src/modules/leave/leave.repository.ts from Phase 1, and the existing src/app.ts — read them all before generating. Include Jest integration tests in tests/integration/modules/leave/leave.routes.test.ts.
