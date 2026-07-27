# PLAN.md

## Phase 1: Phase 1: Shared types, errors, and base repository

Create three files that form the shared foundation for all leave-related modules:

1. `src/shared/types/index.ts` — Define and export the canonical enums: `LeaveType` (values: ANNUAL, SICK, EMERGENCY), `LeaveRequestStatus` (values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and `EmploymentStatus` (values: ACTIVE, ON_LEAVE, TERMINATED, SUSPENDED). These enums are referenced by every domain model in later phases.

2. `src/shared/errors.ts` — Define base error classes: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ConflictError`. Each extends `Error` and carries a `statusCode` number. These are used by repositories and services throughout the feature.

3. `src/shared/base.repository.ts` — Define an abstract generic class `BaseRepository<T>` with methods: `findById(id: string): Promise<T | null>`, `findAll(filters?: Record<string, unknown>): Promise<T[]>`, `create(entity: Partial<T>): Promise<T>`, `update(id: string, updates: Partial<T>): Promise<T>`, `delete(id: string): Promise<void>`. Import the existing `pool` from `src/shared/db/connection.ts` and use it as the protected `db` property. This class is extended by every concrete repository in later phases.

Include Jest unit tests in `tests/unit/shared/` for the error classes and base repository.

## Phase 2: Phase 2: Employee model and repository

Create the employee domain model and repository together so Aider sees field definitions and their usage in a single context.

1. `src/modules/employee/employee.model.ts` — Define the `Employee` interface with all canonical attributes: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: EmploymentStatus`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`. Import `EmploymentStatus` from `src/shared/types/index.ts` (created in Phase 1).

2. `src/modules/employee/employee.repository.ts` — Implement `EmployeeRepository` extending `BaseRepository<Employee>` from `src/shared/base.repository.ts`. Add employee-specific query methods: `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findByDepartment(department: string): Promise<Employee[]>`. Use the `pool` from `src/shared/db/connection.ts` via the base class. Import `Employee` from `./employee.model.ts`.

3. `src/modules/employee/index.ts` — Barrel export of `Employee` and `EmployeeRepository`.

Include Jest unit tests in `tests/unit/modules/employee/`.

## Phase 3: Phase 3: LeavePolicy model and repository

Create the leave policy domain model and repository together.

1. `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with all canonical attributes: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/index.ts` (Phase 1).

2. `src/modules/policy/policy.repository.ts` — Implement `PolicyRepository` extending `BaseRepository<LeavePolicy>` from `src/shared/base.repository.ts`. Add policy-specific query methods: `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findActive(): Promise<LeavePolicy[]>`. Import `LeavePolicy` from `./policy.model.ts` and `LeaveType` from `src/shared/types/index.ts`.

3. `src/modules/policy/index.ts` — Barrel export of `LeavePolicy` and `PolicyRepository`.

Include Jest unit tests in `tests/unit/modules/policy/`.

## Phase 4: Phase 4: LeaveBalance model and repository

Create the leave balance domain model and repository together.

1. `src/modules/balance/balance.model.ts` — Define the `LeaveBalance` interface with all canonical attributes: `id: string`, `employeeId: string`, `leaveTypeId: string`, `entitledDays: number`, `usedDays: number`, `pendingDays: number`, `carriedForwardDays: number`, `year: number`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveBalanceDto` with the fields needed to initialize a balance record. Import `LeaveType` from `src/shared/types/index.ts` (Phase 1).

2. `src/modules/balance/balance.repository.ts` — Implement `BalanceRepository` extending `BaseRepository<LeaveBalance>` from `src/shared/base.repository.ts`. Add balance-specific query methods: `findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>`, `findByEmployeeAndLeaveType(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>`, `updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>`. Import `LeaveBalance` and `CreateLeaveBalanceDto` from `./balance.model.ts`.

3. `src/modules/balance/index.ts` — Barrel export of `LeaveBalance`, `CreateLeaveBalanceDto`, and `BalanceRepository`.

This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/policy/policy.model.ts` from Phase 3 — read them before generating any code that references their types.

Include Jest unit tests in `tests/unit/modules/balance/`.

## Phase 5: Phase 5: LeaveRequest model and repository

Create the leave request domain model and repository together.

1. `src/modules/leave/leave.model.ts` — Define the `LeaveRequest` interface with all canonical attributes: `id: string`, `employeeId: string`, `leaveTypeId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveRequestDto` with the fields needed to submit a new leave request (employeeId, leaveTypeId, startDate, endDate, reason). Import `LeaveRequestStatus` from `src/shared/types/index.ts` (Phase 1).

2. `src/modules/leave/leave.repository.ts` — Implement `LeaveRepository` extending `BaseRepository<LeaveRequest>` from `src/shared/base.repository.ts`. Add leave-specific query methods: `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findByDateRange(startDate: Date, endDate: Date): Promise<LeaveRequest[]>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>`, `updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string): Promise<LeaveRequest>`. Import `LeaveRequest` and `CreateLeaveRequestDto` from `./leave.model.ts` and `LeaveRequestStatus` from `src/shared/types/index.ts`.

3. `src/modules/leave/index.ts` — Barrel export of `LeaveRequest`, `CreateLeaveRequestDto`, and `LeaveRepository`.

This phase depends on `src/shared/types/index.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/policy/policy.model.ts` from Phase 3 — read them before generating any code that references their types.

Include Jest unit tests in `tests/unit/modules/leave/`.

## Phase 6: Phase 6: LeaveService — business logic

Create the leave service with all business logic for the leave request lifecycle.

1. `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods: `submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>`, `rejectLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>`, `cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest>`, `getEmployeeLeaveRequests(employeeId: string): Promise<LeaveRequest[]>`, `getPendingApprovals(managerId: string): Promise<LeaveRequest[]>`. Import `LeaveRequest` and `CreateLeaveRequestDto` from `./leave.model.ts`.

2. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor takes `EmployeeRepository`, `LeaveRepository`, `PolicyRepository`, and `BalanceRepository` as dependencies. Business rules: (a) On submit — validate employee exists and is ACTIVE, validate leave policy exists and is active, check for overlapping requests, check sufficient balance, set status to SUBMITTED. (b) On approve — validate approver is the employee's manager, set status to APPROVED, update balance usedDays. (c) On reject — validate approver is manager, set status to REJECTED. (d) On cancel — validate requester owns the request and it's in SUBMITTED state, set status to CANCELLED. Use `NotFoundError`, `ValidationError`, `ConflictError` from `src/shared/errors.ts`.

This phase depends on all model/repository files from Phases 1-5. Read `src/modules/employee/employee.model.ts`, `src/modules/employee/employee.repository.ts`, `src/modules/leave/leave.model.ts`, `src/modules/leave/leave.repository.ts`, `src/modules/policy/policy.model.ts`, `src/modules/policy/policy.repository.ts`, `src/modules/balance/balance.model.ts`, `src/modules/balance/balance.repository.ts`, and `src/shared/errors.ts` before generating.

Include Jest unit tests in `tests/unit/modules/leave/`.

## Phase 7: Phase 7: Leave routes — Fastify endpoints

Create the Fastify route handlers for the leave module.

1. `src/modules/leave/leave.routes.ts` — Define and export `leaveRoutes` as an async Fastify plugin function. Register the following endpoints:

- `POST /leave/requests` — Submit a new leave request. Body validated against `CreateLeaveRequestDto`. Calls `leaveService.submitLeaveRequest()`. Returns 201 with the created `LeaveRequest`.
- `GET /leave/requests/:id` — Get a single leave request by ID. Returns 200 or 404.
- `GET /leave/requests/employee/:employeeId` — Get all leave requests for an employee. Returns 200 with `LeaveRequest[]`.
- `GET /leave/requests/pending/:managerId` — Get pending approvals for a manager. Returns 200 with `LeaveRequest[]`.
- `PATCH /leave/requests/:id/approve` — Approve a leave request. Body: `{ approverId: string }`. Returns 200.
- `PATCH /leave/requests/:id/reject` — Reject a leave request. Body: `{ approverId: string }`. Returns 200.
- `PATCH /leave/requests/:id/cancel` — Cancel a leave request. Body: `{ employeeId: string }`. Returns 200.

Instantiate `LeaveService` with its repository dependencies inside the plugin. Use Fastify's built-in error handling — map `NotFoundError` to 404, `ValidationError` to 400, `ConflictError` to 409, `UnauthorizedError` to 403.

This phase depends on `src/modules/leave/leave.service.ts` and `src/modules/leave/leave.service.interface.ts` from Phase 6, plus all model/repository files from Phases 1-5. Read them before generating.

Include Jest unit tests in `tests/unit/modules/leave/`.

## Phase 8: Phase 8: Register leave routes in app.ts

Wire the leave routes into the Fastify application.

1. `src/app.ts` — Modify the existing file to import and register `leaveRoutes` from `src/modules/leave/leave.routes.ts`. Add `app.register(leaveRoutes)` alongside the existing `app.register(uptimeRoutes)`. This is a small, focused change to the existing app bootstrap.

This phase depends on `src/modules/leave/leave.routes.ts` from Phase 7. Read `src/app.ts` (existing) and `src/modules/leave/leave.routes.ts` before modifying.

No new test files needed — the existing integration tests and the route unit tests from Phase 7 cover this wiring.
