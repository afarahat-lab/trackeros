# PLAN.md

## Phase 1: Phase 1: Shared enums — LeaveType and LeaveStatus

Create `src/shared/types/leave-type.enum.ts` with the LeaveType enum (values: 'annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity'). Create `src/shared/types/leave-status.enum.ts` with the LeaveStatus enum (values: 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'). Create `src/shared/types/index.ts` as a barrel export re-exporting both enums. Include Jest unit tests in `tests/unit/shared/types/` verifying all enum values.

## Phase 2: Phase 2: LeavePolicy model and repositories

Create the leave-policy module at `src/modules/leave-policy/`. This phase depends on `src/shared/types/leave-type.enum.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` interface with attributes: id (string), policyName (string), leaveType (LeaveType, imported from `src/shared/types/leave-type.enum`), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date).
- `src/modules/leave-policy/leave-policy.repository.interface.ts` — Define `ILeavePolicyRepository` interface with methods: findAll(), findById(id: string), findByLeaveType(leaveType: LeaveType), create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>), update(id: string, policy: Partial<LeavePolicy>), delete(id: string).
- `src/modules/leave-policy/leave-policy.repository.ts` — Implement `PgLeavePolicyRepository` class implementing `ILeavePolicyRepository` using the pg pool from `src/shared/db/connection.ts`. Use parameterized queries.
- `src/modules/leave-policy/leave-type.repository.interface.ts` — Define `ILeaveTypeRepository` interface with methods: findAll(), findByValue(value: LeaveType).
- `src/modules/leave-policy/leave-type.repository.ts` — Implement `PgLeaveTypeRepository` class implementing `ILeaveTypeRepository`.

Include Jest unit tests in `tests/unit/modules/leave-policy/`.

## Phase 3: Phase 3: LeavePolicy service and routes

This phase depends on files from Phase 2: `src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.interface.ts`, `src/modules/leave-policy/leave-policy.repository.ts`, `src/modules/leave-policy/leave-type.repository.interface.ts`, `src/modules/leave-policy/leave-type.repository.ts`. Read them before generating any code.

Files to create:
- `src/modules/leave-policy/leave-policy.service.interface.ts` — Define `ILeavePolicyService` interface with methods: getPolicies(), getPolicyById(id: string), getPolicyByLeaveType(leaveType: LeaveType), createPolicy(dto: CreateLeavePolicyDto), updatePolicy(id: string, dto: UpdateLeavePolicyDto), deletePolicy(id: string). Also define `CreateLeavePolicyDto` and `UpdateLeavePolicyDto` types here.
- `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class implementing `ILeavePolicyService`, injecting `ILeavePolicyRepository` via constructor.
- `src/modules/leave-policy/leave-policy.routes.ts` — Fastify plugin exporting `leavePolicyRoutes`, registering GET/POST/PUT/DELETE routes under `/leave-policies`. Instantiate the service with the Pg repository.
- `src/modules/leave-policy/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-policy/`.

## Phase 4: Phase 4: LeaveBalance model and repository

Create the leave-balance module at `src/modules/leave-balance/`. This phase depends on `src/shared/types/leave-type.enum.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` interface with attributes: id (string), employeeId (string), leaveType (LeaveType, imported from `src/shared/types/leave-type.enum`), entitledDays (number), usedDays (number), pendingDays (number), remainingDays (number), year (number), createdAt (Date), updatedAt (Date).
- `src/modules/leave-balance/leave-balance.repository.interface.ts` — Define `ILeaveBalanceRepository` interface with methods: findByEmployeeId(employeeId: string), findByEmployeeIdAndLeaveType(employeeId: string, leaveType: LeaveType), findByEmployeeIdAndYear(employeeId: string, year: number), create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>), update(id: string, balance: Partial<LeaveBalance>).
- `src/modules/leave-balance/leave-balance.repository.ts` — Implement `PgLeaveBalanceRepository` class implementing `ILeaveBalanceRepository` using the pg pool from `src/shared/db/connection.ts`.

Include Jest unit tests in `tests/unit/modules/leave-balance/`.

## Phase 5: Phase 5: LeaveBalance service and routes

This phase depends on files from Phase 4: `src/modules/leave-balance/leave-balance.model.ts`, `src/modules/leave-balance/leave-balance.repository.interface.ts`, `src/modules/leave-balance/leave-balance.repository.ts`. Read them before generating any code.

Files to create:
- `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService` interface with methods: getBalances(employeeId: string), getBalanceByLeaveType(employeeId: string, leaveType: LeaveType), getBalanceForYear(employeeId: string, year: number), createBalance(dto: CreateLeaveBalanceDto), updateBalance(id: string, dto: UpdateLeaveBalanceDto). Also define `CreateLeaveBalanceDto` and `UpdateLeaveBalanceDto` types here.
- `src/modules/leave-balance/leave-balance.service.ts` — Implement `LeaveBalanceService` class implementing `ILeaveBalanceService`, injecting `ILeaveBalanceRepository` via constructor.
- `src/modules/leave-balance/leave-balance.routes.ts` — Fastify plugin exporting `leaveBalanceRoutes`, registering GET/POST/PUT routes under `/leave-balances`.
- `src/modules/leave-balance/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-balance/`.

## Phase 6: Phase 6: Audit model and repository

Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/leave-status.enum.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/audit/audit-record.model.ts` — Define the `AuditRecord` interface with attributes: id (string), entityType (string — e.g. 'LeaveRequest'), entityId (string), action (string — e.g. 'SUBMITTED', 'APPROVED', 'REJECTED'), performedBy (string), performedAt (Date), changes (Record<string, unknown> | null), createdAt (Date).
- `src/modules/audit/audit-log.repository.interface.ts` — Define `IAuditLogRepository` interface with methods: findByEntity(entityType: string, entityId: string), create(record: Omit<AuditRecord, 'id' | 'createdAt'>).
- `src/modules/audit/audit-log.repository.ts` — Implement `PgAuditLogRepository` class implementing `IAuditLogRepository` using the pg pool from `src/shared/db/connection.ts`.

Include Jest unit tests in `tests/unit/modules/audit/`.

## Phase 7: Phase 7: Audit service and routes

This phase depends on files from Phase 6: `src/modules/audit/audit-record.model.ts`, `src/modules/audit/audit-log.repository.interface.ts`, `src/modules/audit/audit-log.repository.ts`. Read them before generating any code.

Files to create:
- `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with methods: logEvent(record: CreateAuditRecordDto): Promise<AuditRecord>, getAuditTrail(entityType: string, entityId: string): Promise<AuditRecord[]>. Also define `CreateAuditRecordDto` type here.
- `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`, injecting `IAuditLogRepository` via constructor.
- `src/modules/audit/audit.routes.ts` — Fastify plugin exporting `auditRoutes`, registering GET routes under `/audit/:entityType/:entityId` and POST under `/audit`.
- `src/modules/audit/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/audit/`.

## Phase 8: Phase 8: LeaveRequest model and repository

Create the leave-request module at `src/modules/leave-request/`. This phase depends on `src/shared/types/leave-type.enum.ts` and `src/shared/types/leave-status.enum.ts` from Phase 1 — read both before generating any code.

Files to create:
- `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` interface with attributes: id (string), employeeId (string), leaveTypeId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus, imported from `src/shared/types/leave-status.enum`), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), rejectionReason (string | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt (Date), updatedAt (Date).
- `src/modules/leave-request/leave-request.repository.interface.ts` — Define `ILeaveRequestRepository` interface with methods: findAll(), findById(id: string), findByEmployeeId(employeeId: string), findByStatus(status: LeaveStatus), create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>), update(id: string, request: Partial<LeaveRequest>).
- `src/modules/leave-request/leave-request.repository.ts` — Implement `PgLeaveRequestRepository` class implementing `ILeaveRequestRepository` using the pg pool from `src/shared/db/connection.ts`.

Include Jest unit tests in `tests/unit/modules/leave-request/`.

## Phase 9: Phase 9: LeaveRequest service and routes

This phase depends on files from prior phases. Read these before generating any code:
- Phase 8: `src/modules/leave-request/leave-request.model.ts`, `src/modules/leave-request/leave-request.repository.interface.ts`, `src/modules/leave-request/leave-request.repository.ts`
- Phase 3: `src/modules/leave-policy/leave-policy.service.interface.ts`
- Phase 5: `src/modules/leave-balance/leave-balance.service.interface.ts`
- Phase 7: `src/modules/audit/audit.service.interface.ts`
- Phase 1: `src/shared/types/leave-status.enum.ts`, `src/shared/types/leave-type.enum.ts`

Files to create:
- `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService` interface with methods: submitRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approveRequest(id: string, approverId: string): Promise<LeaveRequest>, rejectRequest(id: string, rejectorId: string, reason: string): Promise<LeaveRequest>, cancelRequest(id: string, employeeId: string): Promise<LeaveRequest>, getRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>, getRequestsByStatus(status: LeaveStatus): Promise<LeaveRequest[]>, getRequestById(id: string): Promise<LeaveRequest>. Also define `CreateLeaveRequestDto` type here.
- `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` class implementing `ILeaveRequestService`. Inject `ILeaveRequestRepository`, `ILeavePolicyService`, `ILeaveBalanceService`, and `IAuditService` via constructor. Business logic: on submit, validate against policy (minimum notice, manager approval required), check balance has sufficient remaining days, set status to SUBMITTED, log audit event. On approve/reject, update status and approver/rejector fields, log audit event. On cancel, set status to CANCELLED, log audit event.
- `src/modules/leave-request/leave-request.routes.ts` — Fastify plugin exporting `leaveRequestRoutes`, registering GET/POST/PUT routes under `/leave-requests`. Wire up the service with all its dependencies.
- `src/modules/leave-request/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-request/`.

## Phase 10: Phase 10: Wire all leave modules into app.ts

Update `src/app.ts` to register all four leave module route plugins alongside the existing uptime routes. Read the existing `src/app.ts` before editing.

Import and register:
- `leavePolicyRoutes` from `src/modules/leave-policy/leave-policy.routes`
- `leaveBalanceRoutes` from `src/modules/leave-balance/leave-balance.routes`
- `auditRoutes` from `src/modules/audit/audit.routes`
- `leaveRequestRoutes` from `src/modules/leave-request/leave-request.routes`

Use `app.register()` for each. Ensure the existing `uptimeRoutes` registration is preserved. Verify the app compiles with `npm run build` and all existing tests pass.
