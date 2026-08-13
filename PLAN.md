# PLAN.md

## Phase 1: Phase 1: Shared types — enums and value types

Create `src/shared/types/index.ts` with all shared domain types that every downstream module depends on:

- `LeaveTypeCode` — union type: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
- `LeaveType` — interface with fields: `code: LeaveTypeCode`, `label: string`, `requiresDocumentation: boolean`, `isPaid: boolean`
- `LEAVE_TYPES` — const record mapping each `LeaveTypeCode` to its `LeaveType` properties (the canonical lookup table)
- `LeaveStatus` — enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
- `UserRole` — enum: `employee`, `manager`, `hr_admin`
- `DateRange` — interface: `startDate: Date`, `endDate: Date`
- `PaginationParams` — interface with `page: number`, `limit: number`
- `PaginationResult<T>` — generic interface with `data: T[]`, `total: number`, `page: number`, `limit: number`

Include Jest unit tests in `tests/unit/shared/types/` verifying each enum value and the LEAVE_TYPES lookup table.

## Phase 2: Phase 2: Employee model + repository

Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/employee/employee.model.ts` — `Employee` entity interface with exact fields: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `role: UserRole` (imported from `src/shared/types`), `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`. Also define `CreateEmployeeDto` and `UpdateEmployeeDto`.
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(params: PaginationParams): Promise<PaginationResult<Employee>>`, `create(dto: CreateEmployeeDto): Promise<Employee>`, `update(id: string, dto: UpdateEmployeeDto): Promise<Employee>`, `softDelete(id: string): Promise<void>`. Also provide a Knex-based `EmployeeRepository` implementation using the shared db pool from `src/shared/db/connection.ts`.
- `src/modules/employee/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/employee/` for the repository (mock the db pool).

## Phase 3: Phase 3: LeavePolicy model + repository

Create the leave-policy module at `src/modules/leave-policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/leave-policy/leave-policy.model.ts` — `LeavePolicy` entity interface with exact fields: `id: string`, `policyName: string`, `leaveType: LeaveTypeCode` (imported from `src/shared/types`), `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `requiresDocumentation: boolean`, `maxConsecutiveDays: number | null`, `allowNegativeBalance: boolean`, `accrualRule: string | null`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeavePolicyDto` and `UpdateLeavePolicyDto`.
- `src/modules/leave-policy/leave-policy.repository.ts` — `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveTypeCode): Promise<LeavePolicy | null>`, `findAllActive(): Promise<LeavePolicy[]>`, `findAll(params: PaginationParams): Promise<PaginationResult<LeavePolicy>>`, `create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>`, `update(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy>`. Knex-based `LeavePolicyRepository` implementation using `src/shared/db/connection.ts`.
- `src/modules/leave-policy/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/leave-policy/`.

## Phase 4: Phase 4: LeaveBalance model + repository

Create the leave-balance module at `src/modules/leave-balance/`. This phase depends on `src/shared/types/index.ts` (Phase 1), `src/modules/employee/employee.model.ts` (Phase 2), and `src/modules/leave-policy/leave-policy.model.ts` (Phase 3) — read all three before generating any code.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — `LeaveBalance` entity interface with exact fields: `id: string`, `employeeId: string`, `leavePolicyId: string`, `fiscalYear: number`, `totalEntitlement: number`, `usedDays: number`, `pendingDays: number`, `remainingDays: number` (computed as `totalEntitlement - usedDays - pendingDays`), `status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED'`, `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveBalanceDto` and `UpdateLeaveBalanceDto`.
- `src/modules/leave-balance/leave-balance.repository.ts` — `ILeaveBalanceRepository` interface with methods: `findById(id: string): Promise<LeaveBalance | null>`, `findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>`, `findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`, `create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>`, `update(id: string, dto: UpdateLeaveBalanceDto): Promise<LeaveBalance>`, `createForEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>` (auto-creates balances for all active leave policies). Knex-based `LeaveBalanceRepository` implementation using `src/shared/db/connection.ts`.
- `src/modules/leave-balance/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/leave-balance/`.

## Phase 5: Phase 5: LeaveRequest model + repository

Create the leave-request module at `src/modules/leave-request/`. This phase depends on `src/shared/types/index.ts` (Phase 1), `src/modules/employee/employee.model.ts` (Phase 2), and `src/modules/leave-policy/leave-policy.model.ts` (Phase 3) — read all three before generating any code.

Files to create:
- `src/modules/leave-request/leave-request.model.ts` — `LeaveRequest` entity interface with exact fields: `id: string`, `employeeId: string`, `leavePolicyId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveStatus` (imported from `src/shared/types`), `approvedBy: string | null`, `approvedAt: Date | null`, `managerNote: string | null`, `totalDays: number` (computed), `createdAt: Date`, `updatedAt: Date`. Also define `CreateLeaveRequestDto` and `UpdateLeaveRequestDto`.
- `src/modules/leave-request/leave-request.repository.ts` — `ILeaveRequestRepository` interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string, params: PaginationParams): Promise<PaginationResult<LeaveRequest>>`, `findByStatus(status: LeaveStatus, params: PaginationParams): Promise<PaginationResult<LeaveRequest>>`, `findByManager(managerId: string, params: PaginationParams): Promise<PaginationResult<LeaveRequest>>`, `findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<LeaveRequest[]>`, `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`, `update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest>`. Knex-based `LeaveRequestRepository` implementation using `src/shared/db/connection.ts`.
- `src/modules/leave-request/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/leave-request/`.

## Phase 6: Phase 6: AuditLog model + repository

Create the audit-log module at `src/modules/audit-log/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/audit-log/audit-log.model.ts` — `AuditRecord` entity interface with exact fields: `id: string`, `entityType: string`, `entityId: string`, `action: string`, `oldValues: Record<string, unknown> | null`, `newValues: Record<string, unknown> | null`, `performedBy: string`, `performedAt: Date`, `ipAddress: string | null`, `userAgent: string | null`, `createdAt: Date`. Also define `CreateAuditRecordDto`.
- `src/modules/audit-log/audit-log.repository.ts` — `IAuditLogRepository` interface with methods: `create(dto: CreateAuditRecordDto): Promise<AuditRecord>`, `findByEntity(entityType: string, entityId: string, params: PaginationParams): Promise<PaginationResult<AuditRecord>>`, `findByPerformer(performedBy: string, params: PaginationParams): Promise<PaginationResult<AuditRecord>>`. Knex-based `AuditLogRepository` implementation using `src/shared/db/connection.ts`.
- `src/modules/audit-log/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/audit-log/`.

## Phase 7: Phase 7: EmployeeService + LeavePolicyService

Add service layers to the employee and leave-policy modules. This phase depends on Phase 2 (`src/modules/employee/employee.model.ts`, `src/modules/employee/employee.repository.ts`), Phase 3 (`src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.ts`), and Phase 4 (`src/modules/leave-balance/leave-balance.repository.ts`) — read all before generating.

Files to create/modify (approximately 4 files):
- `src/modules/employee/employee.service.ts` — define `IEmployeeService` interface AND `EmployeeService` class in one file. Methods: `findById`, `findByEmployeeNumber`, `findByManagerId`, `findAll`, `create` (on create, auto-call `LeaveBalanceRepository.createForEmployee` to seed balances for all active leave policies), `update`, `softDelete`. Import `IEmployeeRepository` from `./employee.repository` and `ILeaveBalanceRepository` from `../leave-balance/leave-balance.repository`.
- `src/modules/employee/index.ts` — add barrel exports for `IEmployeeService` and `EmployeeService`.
- `src/modules/leave-policy/leave-policy.service.ts` — define `ILeavePolicyService` interface AND `LeavePolicyService` class. Methods: `findById`, `findByLeaveType`, `findAllActive`, `findAll`, `create`, `update`.
- `src/modules/leave-policy/index.ts` — add barrel exports for `ILeavePolicyService` and `LeavePolicyService`.

Include Jest unit tests in `tests/unit/modules/employee/` and `tests/unit/modules/leave-policy/` (mock repositories).

## Phase 8: Phase 8: LeaveBalanceService + LeaveRequestService + AuditLogService

Add service layers for leave-balance, leave-request, and audit-log modules. This phase depends on Phase 4 (`src/modules/leave-balance/leave-balance.repository.ts`), Phase 5 (`src/modules/leave-request/leave-request.repository.ts`), Phase 3 (`src/modules/leave-policy/leave-policy.repository.ts`), and Phase 6 (`src/modules/audit-log/audit-log.repository.ts`) — read all before generating.

Files to create (approximately 5 files):
- `src/modules/leave-balance/leave-balance.service.ts` — `ILeaveBalanceService` interface AND `LeaveBalanceService` class. Methods: `getBalance(employeeId, leavePolicyId, fiscalYear)`, `getAllBalances(employeeId, fiscalYear)`, `deductDays(employeeId, leavePolicyId, fiscalYear, days)` (move from pending to used on approval), `reserveDays(employeeId, leavePolicyId, fiscalYear, days)` (add to pending on submission), `releaseReservation(employeeId, leavePolicyId, fiscalYear, days)` (remove from pending on reject/cancel), `hasSufficientBalance(employeeId, leavePolicyId, fiscalYear, days)`.
- `src/modules/leave-balance/index.ts` — add barrel exports.
- `src/modules/leave-request/leave-request.service.ts` — `ILeaveRequestService` interface AND `LeaveRequestService` class. Methods: `submit(dto)` — validates no overlapping requests, checks balance via `ILeaveBalanceService`, reserves pending days, creates request with DRAFT→SUBMITTED, audits; `approve(id, approverId, note?)` — RBAC check (approver must be employee's manager or HR), moves pending→used in balance, sets status APPROVED, audits; `reject(id, approverId, note)` — releases reservation, sets REJECTED, audits; `cancel(id, employeeId)` — releases reservation if SUBMITTED/APPROVED, sets CANCELLED, audits; `findById`, `findByEmployee`, `findByManager`, `findByStatus`. Implements the BINDING business-day counting rule: count weekdays only (exclude Sat/Sun), both start and end inclusive, whole days only.
- `src/modules/leave-request/index.ts` — add barrel exports.
- `src/modules/audit-log/audit-log.service.ts` — `IAuditLogService` interface AND `AuditLogService` class. Methods: `log(dto)`, `getEntityHistory(entityType, entityId, params)`, `getUserActions(performedBy, params)`.
- `src/modules/audit-log/index.ts` — add barrel exports.

Include Jest unit tests in `tests/unit/modules/leave-balance/`, `tests/unit/modules/leave-request/`, and `tests/unit/modules/audit-log/`.

## Phase 9: Phase 9: LeaveController + Fastify routes

Create the leave-controller module at `src/modules/leave-controller/`. This phase depends on all service layers from Phases 7 and 8 — read `src/modules/leave-request/leave-request.service.ts`, `src/modules/leave-balance/leave-balance.service.ts`, `src/modules/employee/employee.service.ts`, `src/modules/leave-policy/leave-policy.service.ts`, and `src/modules/audit-log/audit-log.service.ts` before generating.

Files to create (approximately 2 files):
- `src/modules/leave-controller/leave.controller.ts` — `LeaveController` class with Fastify route handler methods. Endpoints:
  - `POST /leave-requests` — submit a new leave request (employee). Validates input with Zod, calls `LeaveRequestService.submit`. RBAC: employee acts on own behalf.
  - `GET /leave-requests/:id` — get a single request (employee sees own; manager sees reports'; HR sees all).
  - `GET /leave-requests` — list requests with pagination and optional status filter. RBAC scoping.
  - `PATCH /leave-requests/:id/approve` — manager/HR approves. Calls `LeaveRequestService.approve`.
  - `PATCH /leave-requests/:id/reject` — manager/HR rejects. Calls `LeaveRequestService.reject`.
  - `PATCH /leave-requests/:id/cancel` — employee cancels own request. Calls `LeaveRequestService.cancel`.
  - `GET /leave-balances` — employee views own balances for current fiscal year.
  - `GET /leave-policies` — list active leave policies (all authenticated users).
  - `GET /leave-requests/:id/audit` — audit trail for a request (HR only).
- `src/modules/leave-controller/leave.routes.ts` — Fastify plugin that instantiates `LeaveController` with its dependencies and registers all routes. Export as `leaveRoutes`.

Include Jest unit tests in `tests/unit/modules/leave-controller/` (mock all services, test RBAC enforcement and input validation).

## Phase 10: Phase 10: App wiring + Knex migrations

Wire the leave module into the Fastify application and create the database migrations. This phase depends on Phase 9 (`src/modules/leave-controller/leave.routes.ts`) — read it before modifying `src/app.ts`.

Files to create/modify (approximately 4 files):
- `src/app.ts` — modify to register `leaveRoutes` from `./modules/leave-controller/leave.routes` alongside the existing `uptimeRoutes`. Import and call `app.register(leaveRoutes)`.
- `knexfile.ts` — Knex configuration reading `DATABASE_URL` from environment, with migration directory `./migrations`.
- `migrations/001_create_employees.ts` — create `employees` table matching the Employee entity fields.
- `migrations/002_create_leave_policies.ts` — create `leave_policies` table matching LeavePolicy entity fields.
- `migrations/003_create_leave_balances.ts` — create `leave_balances` table matching LeaveBalance entity fields.
- `migrations/004_create_leave_requests.ts` — create `leave_requests` table matching LeaveRequest entity fields.
- `migrations/005_create_audit_records.ts` — create `audit_records` table matching AuditRecord entity fields.

Seed the canonical leave types (annual, sick, emergency, unpaid, maternity, paternity) as rows in `leave_policies` via a seed file `seeds/001_seed_leave_policies.ts`.

Include Jest integration tests in `tests/integration/` that spin up the Fastify app (via `app.ts`), hit the leave endpoints, and verify correct status codes and response shapes.
