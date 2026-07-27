# PLAN.md

## Phase 1: Phase 1: Shared enums and base types

Create src/shared/types/index.ts with the canonical enums and base interface used across all leave modules:
- `LeaveStatus` enum: PENDING, APPROVED, REJECTED, CANCELLED
- `EmploymentStatus` enum: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE
- `BaseEntity` interface: id (string), createdAt (Date), updatedAt (Date), deletedAt (Date | null)

Include Jest unit tests in tests/unit/shared/types/. No dependencies on any other phase — this is the foundational types file.

## Phase 2: Phase 2: LeaveType model and repository

Create src/modules/leave-type/leave-type.model.ts with the `LeaveType` interface: id (string), code (string), name (string), description (string), createdAt (Date), updatedAt (Date). Extend BaseEntity from src/shared/types/index.ts.

Create src/modules/leave-type/leave-type.repository.ts with `ILeaveTypeRepository` interface and `LeaveTypeRepository` class using Knex. Methods: findAll(), findById(id: string), findByCode(code: string). Use the existing db pool from src/shared/db/connection.ts.

Include Jest unit tests in tests/unit/modules/leave-type/. This phase depends on src/shared/types/index.ts from Phase 1 — read it before generating any code that references BaseEntity or enums.

## Phase 3: Phase 3: LeavePolicy model and repository

Create src/modules/policy/policy.model.ts with the `LeavePolicy` interface: id (string), policyName (string), leaveTypeId (string), entitlementDays (number), accrualRate (number | undefined), maxAccumulation (number | undefined), minimumNoticeDays (number | undefined), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date). Extend BaseEntity from src/shared/types/index.ts.

Create src/modules/policy/policy.repository.ts with `ILeavePolicyRepository` interface and `LeavePolicyRepository` class using Knex. Methods: findAll(), findById(id: string), findByLeaveTypeId(leaveTypeId: string), findActive(). Use the existing db pool from src/shared/db/connection.ts.

Include Jest unit tests in tests/unit/modules/policy/. This phase depends on src/shared/types/index.ts from Phase 1 and src/modules/leave-type/leave-type.model.ts from Phase 2 — read both before generating any code.

## Phase 4: Phase 4: Employee model and repository

Create src/modules/employee/employee.model.ts with the `Employee` interface: id (string), employeeNumber (string), firstName (string), lastName (string), email (string), managerId (string | null), department (string), hireDate (Date), terminationDate (Date | null), employmentStatus (EmploymentStatus), createdAt (Date), updatedAt (Date), deletedAt (Date | null). Import EmploymentStatus from src/shared/types/index.ts.

Create src/modules/employee/employee.repository.ts with `IEmployeeRepository` interface and `EmployeeRepository` class using Knex. Methods: findAll(), findById(id: string), findByEmployeeNumber(employeeNumber: string), findByManagerId(managerId: string), findByDepartment(department: string). Use the existing db pool from src/shared/db/connection.ts.

Include Jest unit tests in tests/unit/modules/employee/. This phase depends on src/shared/types/index.ts from Phase 1 — read it before generating any code that references EmploymentStatus.

## Phase 5: Phase 5: LeaveRequest model and repository

Create src/modules/leaverequest/leaverequest.model.ts with the `LeaveRequest` interface: id (string), employeeId (string), leaveTypeId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus), approvedBy (string | null), approvedAt (Date | null), createdAt (Date), updatedAt (Date). Import LeaveStatus from src/shared/types/index.ts.

Create src/modules/leaverequest/leaverequest.repository.ts with `ILeaveRequestRepository` interface and `LeaveRequestRepository` class using Knex. Methods: findAll(), findById(id: string), findByEmployeeId(employeeId: string), findByStatus(status: LeaveStatus), findByManagerId(managerId: string) — joining on employee to filter by manager, create(dto: CreateLeaveRequestDto), updateStatus(id: string, status: LeaveStatus, approvedBy: string | null). Define `CreateLeaveRequestDto` in the model file with employeeId, leaveTypeId, startDate, endDate, reason (optional). Use the existing db pool from src/shared/db/connection.ts.

Include Jest unit tests in tests/unit/modules/leaverequest/. This phase depends on src/shared/types/index.ts from Phase 1, src/modules/leavetype/leavetype.model.ts from Phase 2, and src/modules/employee/employee.model.ts from Phase 4 — read all three before generating any code.

## Phase 6: Phase 6: Leave balance service

Create src/modules/balance/balance.model.ts with the `LeaveBalance` interface: id (string), employeeId (string), leaveTypeId (string), entitlementDays (number), usedDays (number), pendingDays (number), remainingDays (number), year (number), createdAt (Date), updatedAt (Date).

Create src/modules/balance/balance.service.interface.ts with `ILeaveBalanceService` interface: getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance>, getBalancesForEmployee(employeeId: string, year: number): Promise<LeaveBalance[]>, deductDays(employeeId: string, leaveTypeId: string, days: number): Promise<LeaveBalance>, restoreDays(employeeId: string, leaveTypeId: string, days: number): Promise<LeaveBalance>.

Create src/modules/balance/balance.service.ts implementing ILeaveBalanceService. It must read LeavePolicy (from src/modules/policy/policy.model.ts, Phase 3) to determine entitlementDays, and read LeaveRequest (from src/modules/leaverequest/leaverequest.model.ts, Phase 5) to compute usedDays and pendingDays. Use a Knex-based repository inline or a simple balance.repository.ts in the same phase.

Include Jest unit tests in tests/unit/modules/balance/. This phase depends on src/shared/types/index.ts (Phase 1), src/modules/policy/policy.model.ts (Phase 3), and src/modules/leaverequest/leaverequest.model.ts (Phase 5) — read all three before generating any code.

## Phase 7: Phase 7: Leave application service

Create src/modules/leave/leave.service.interface.ts with `ILeaveService` interface:
- apply(dto: CreateLeaveRequestDto): Promise<LeaveRequest>
- approve(leaveRequestId: string, approverId: string): Promise<LeaveRequest>
- reject(leaveRequestId: string, approverId: string): Promise<LeaveRequest>
- cancel(leaveRequestId: string, employeeId: string): Promise<LeaveRequest>
- getById(id: string): Promise<LeaveRequest>
- getByEmployee(employeeId: string): Promise<LeaveRequest[]>
- getPendingForManager(managerId: string): Promise<LeaveRequest[]>

Create src/modules/leave/leave.service.ts implementing ILeaveService. The apply method must: validate the employee exists (via IEmployeeRepository from Phase 4), validate the leave type exists (via ILeaveTypeRepository from Phase 2), check the LeavePolicy for minimumNoticeDays and requiresManagerApproval (from Phase 3), check balance availability via ILeaveBalanceService (from Phase 6), and create the LeaveRequest via ILeaveRequestRepository (from Phase 5). The approve/reject methods must verify the approver is the employee's manager. Use dependency injection via constructor.

Include Jest unit tests in tests/unit/modules/leave/. This phase depends on all prior phase files — read src/shared/types/index.ts, src/modules/leave-type/leave-type.model.ts, src/modules/policy/policy.model.ts, src/modules/employee/employee.model.ts, src/modules/leaverequest/leaverequest.model.ts, and src/modules/balance/balance.service.interface.ts before generating any code.

## Phase 8: Phase 8: Leave controller and routes

Create src/modules/leave/leave.controller.ts with `LeaveController` class. Methods: apply(request, reply), approve(request, reply), reject(request, reply), cancel(request, reply), getById(request, reply), getMyRequests(request, reply), getPendingForManager(request, reply). Each method extracts params/body from the Fastify request, calls the corresponding ILeaveService method, and returns the appropriate HTTP response. Use Zod for request validation on the apply endpoint (validate CreateLeaveRequestDto shape).

Create src/modules/leave/leave.routes.ts exporting a Fastify plugin function `leaveRoutes` that registers all routes:
- POST /leave — apply (employee)
- PATCH /leave/:id/approve — approve (manager)
- PATCH /leave/:id/reject — reject (manager)
- PATCH /leave/:id/cancel — cancel (employee, own request)
- GET /leave/:id — get by ID
- GET /leave/me — get my requests
- GET /leave/pending — get pending for manager

Register the routes in src/app.ts by importing and calling app.register(leaveRoutes).

Include Jest unit tests in tests/unit/modules/leave/ for the controller. This phase depends on src/modules/leave/leave.service.interface.ts and src/modules/leave/leave.service.ts from Phase 7 — read both before generating any code. Also read src/app.ts to understand the existing route registration pattern.

## Phase 9: Phase 9: Audit logging for leave operations

Create src/modules/audit/audit.model.ts with the `AuditRecord` interface: id (string), entityType (string), entityId (string), action (string), changes (Record<string, unknown>), performedBy (string), performedAt (Date).

Create src/modules/audit/audit.service.interface.ts with `IAuditService` interface: log(entityType: string, entityId: string, action: string, changes: Record<string, unknown>, performedBy: string): Promise<AuditRecord>, getByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>.

Create src/modules/audit/audit.service.ts implementing IAuditService with a Knex-based repository inline. Use the existing db pool from src/shared/db/connection.ts.

Include Jest unit tests in tests/unit/modules/audit/. This phase depends on src/shared/types/index.ts from Phase 1 and src/modules/leaverequest/leaverequest.model.ts from Phase 5 — read both before generating any code.

## Phase 10: Phase 10: Integration wiring and module index

Create src/modules/leave/index.ts as the public entry point, re-exporting: LeaveRequest, CreateLeaveRequestDto from leaverequest.model.ts, ILeaveService from leave.service.interface.ts, LeaveService from leave.service.ts, LeaveController from leave.controller.ts, leaveRoutes from leave.routes.ts.

Create src/modules/balance/index.ts re-exporting LeaveBalance, ILeaveBalanceService, LeaveBalanceService.

Create src/modules/policy/index.ts re-exporting LeavePolicy, ILeavePolicyRepository, LeavePolicyRepository.

Create src/modules/leave-type/index.ts re-exporting LeaveType, ILeaveTypeRepository, LeaveTypeRepository.

Create src/modules/employee/index.ts re-exporting Employee, IEmployeeRepository, EmployeeRepository.

Create src/modules/audit/index.ts re-exporting AuditRecord, IAuditService, AuditService.

Wire the LeaveService constructor in leave.service.ts to accept IAuditService and log all state-changing operations (apply, approve, reject, cancel). Update the leave controller to pass the audit service.

Include Jest integration tests in tests/integration/modules/leave/ that verify the full flow: apply → approve → balance deduction. This phase depends on all prior phase files — read the key interfaces from Phases 2-9 before generating any code.
