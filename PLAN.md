# PLAN.md

## Phase 1: Phase 1: Shared enums and base repository interface

Create src/shared/types/leave.types.ts with TypeScript enums: LeaveType (ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), LeaveBalanceStatus (ACTIVE, EXHAUSTED, EXPIRED), EmployeeStatus (ACTIVE, ON_LEAVE, INACTIVE, PROBATION). Also create src/shared/base-repository.ts with a generic IBaseRepository<T> interface defining findById, findAll, create, update, delete method signatures. Include Jest unit tests in tests/unit/shared/ that verify enum values and that the base repository interface is structurally sound. This phase has no dependencies on prior phases — only on the existing src/shared/db/connection.ts for the db pool type reference.

## Phase 2: Phase 2: LeaveRequest model + repository

Create src/modules/leave/leave.model.ts with the LeaveRequest interface (all attributes: id, employeeId, leaveType, leavePolicyId, startDate, endDate, totalDays, reason, status, managerId, managerComment, submittedAt, reviewedAt, createdAt, updatedAt) and CreateLeaveRequestDto (omit id, status, timestamps). Create src/modules/leave/leave.repository.ts with ILeaveRepository interface (extending IBaseRepository<LeaveRequest>) and KnexLeaveRepository class using the db pool from src/shared/db/connection.ts. This phase depends on src/shared/types/leave.types.ts and src/shared/base-repository.ts from Phase 1 — read those before generating. Include Jest unit tests in tests/unit/modules/leave/.

## Phase 3: Phase 3: Employee model + repository

Create src/modules/employee/employee.model.ts with the Employee interface (id, userId, firstName, lastName, email, role, managerId, department, designation, dateOfJoining, status, createdAt, updatedAt) using EmployeeStatus from src/shared/types/leave.types.ts. Create src/modules/employee/employee.repository.ts with IEmployeeRepository interface and KnexEmployeeRepository class. This phase depends on src/shared/types/leave.types.ts and src/shared/base-repository.ts from Phase 1 — read those before generating. Include Jest unit tests in tests/unit/modules/employee/.

## Phase 4: Phase 4: LeaveBalance model + repository

Create src/modules/balance/balance.model.ts with the LeaveBalance interface (id, employeeId, leaveType, leavePolicyId, entitled, used, pending, carriedOver, remaining as computed, year, status, createdAt, updatedAt) using LeaveType and LeaveBalanceStatus from src/shared/types/leave.types.ts. Create src/modules/balance/balance.repository.ts with ILeaveBalanceRepository interface and KnexLeaveBalanceRepository class. This phase depends on src/shared/types/leave.types.ts and src/shared/base-repository.ts from Phase 1 — read those before generating. Include Jest unit tests in tests/unit/modules/balance/.

## Phase 5: Phase 5: LeaveService — business logic

Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring apply(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approve(leaveId: string, managerId: string, comment?: string): Promise<LeaveRequest>, reject(leaveId: string, managerId: string, comment: string): Promise<LeaveRequest>, cancel(leaveId: string, employeeId: string): Promise<LeaveRequest>, getById(id: string): Promise<LeaveRequest>, getByEmployee(employeeId: string): Promise<LeaveRequest[]>. Create src/modules/leave/leave.service.ts with LeaveService class implementing ILeaveService. It must validate: employee exists and is ACTIVE (via IEmployeeRepository), leave balance has sufficient remaining days (via ILeaveBalanceRepository), date range is valid, and enforce status transitions (DRAFT→SUBMITTED→APPROVED/REJECTED, DRAFT/SUBMITTED→CANCELLED). This phase depends on src/modules/leave/leave.model.ts and src/modules/leave/leave.repository.ts from Phase 2, src/modules/employee/employee.repository.ts from Phase 3, src/modules/balance/balance.repository.ts from Phase 4, and src/shared/types/leave.types.ts from Phase 1 — read all before generating. Include Jest unit tests in tests/unit/modules/leave/.

## Phase 6: Phase 6: LeaveController + routes

Create src/modules/leave/leave.controller.ts with LeaveController class that wraps ILeaveService calls and handles HTTP concerns (status codes, error formatting). Create src/modules/leave/leave.routes.ts as a Fastify plugin registering endpoints: POST /leave (apply), GET /leave/:id, GET /leave/employee/:employeeId, PATCH /leave/:id/approve, PATCH /leave/:id/reject, PATCH /leave/:id/cancel. Apply Zod validation schemas on request bodies. Register routes in src/app.ts. This phase depends on src/modules/leave/leave.service.interface.ts and src/modules/leave/leave.service.ts from Phase 5, and src/modules/leave/leave.model.ts from Phase 2 — read all before generating. Include Jest integration tests in tests/integration/modules/leave/.

## Phase 7: Phase 7: Leave module index + public API surface

Create src/modules/leave/index.ts as the public entry point exporting LeaveRequest, CreateLeaveRequestDto, ILeaveService, LeaveService, LeaveController, leaveRoutes. Re-export only the public API surface. This phase depends on all files in src/modules/leave/ from Phases 2, 5, and 6 — read them before generating. Include a Jest unit test in tests/unit/modules/leave/ that verifies the index barrel exports all expected symbols.

## Phase 8: Phase 8: Employee + Balance service layers

Create src/modules/employee/employee.service.interface.ts with IEmployeeService (getById, getByManager, isActive). Create src/modules/employee/employee.service.ts implementing it via IEmployeeRepository. Create src/modules/balance/balance.service.interface.ts with IBalanceService (getBalance, deductPending, restorePending, commitUsed). Create src/modules/balance/balance.service.ts implementing it via ILeaveBalanceRepository. These services are needed for the leave workflow but are separate modules. This phase depends on src/modules/employee/employee.repository.ts from Phase 3 and src/modules/balance/balance.repository.ts from Phase 4 — read those before generating. Include Jest unit tests in tests/unit/modules/employee/ and tests/unit/modules/balance/.

## Phase 9: Phase 9: Knex database migrations

Create Knex migration files in src/db/migrations/: one for leave_requests table (columns matching LeaveRequest model fields with UUID primary key, foreign keys to employees, status enum, timestamps), one for employees table (matching Employee model), one for leave_balances table (matching LeaveBalance model with unique constraint on employeeId+leaveType+year). Create src/db/knexfile.ts with Knex configuration reading DATABASE_URL from environment. This phase depends on src/modules/leave/leave.model.ts from Phase 2, src/modules/employee/employee.model.ts from Phase 3, and src/modules/balance/balance.model.ts from Phase 4 — read those before generating migration column definitions. Include a Jest test in tests/unit/db/ that verifies migration files exist and are parseable.

## Phase 10: Phase 10: Employee + Balance routes and module indexes

Create src/modules/employee/employee.controller.ts and src/modules/employee/employee.routes.ts with Fastify endpoints: GET /employee/:id, GET /employee/manager/:managerId. Create src/modules/employee/index.ts barrel export. Create src/modules/balance/balance.controller.ts and src/modules/balance/balance.routes.ts with endpoints: GET /balance/:employeeId, GET /balance/:employeeId/:leaveType. Create src/modules/balance/index.ts barrel export. Register both route plugins in src/app.ts. Apply Zod validation on route params. This phase depends on src/modules/employee/employee.service.interface.ts and src/modules/employee/employee.service.ts from Phase 8, and src/modules/balance/balance.service.interface.ts and src/modules/balance/balance.service.ts from Phase 8 — read those before generating. Include Jest integration tests in tests/integration/modules/employee/ and tests/integration/modules/balance/.
