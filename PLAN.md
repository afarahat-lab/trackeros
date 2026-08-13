# PLAN.md

## Phase 1: Phase 1: Shared Enums (LeaveStatus, LeaveTypeCode)

Create the shared enum files under src/shared/types/:

1. `src/shared/types/leave-status.enum.ts` — Define and export the LeaveStatus enum with members: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. Use a TypeScript string enum or const object with a union type.

2. `src/shared/types/leave-type-code.enum.ts` — Define and export the LeaveTypeCode enum with members: annual, sick, emergency, unpaid, maternity, paternity.

3. `src/shared/types/index.ts` — Barrel file that re-exports everything from leave-status.enum.ts and leave-type-code.enum.ts.

Include Jest unit tests in `tests/unit/shared/types/` verifying each enum value exists and the barrel re-exports correctly.

No prior phase dependencies — this is the foundation.

## Phase 2: Phase 2: LeaveType model + repository (leave-policy module)

Create the LeaveType domain model and its repository in the leave-policy module.

Files to create:
1. `src/modules/leave-policy/leave-type.model.ts` — Define and export the LeaveType interface with EXACT fields: id: string, code: LeaveTypeCode (import from `src/shared/types/leave-type-code.enum.ts` from Phase 1), label: string, description: string | undefined, isActive: boolean, createdAt: Date, updatedAt: Date.

2. `src/modules/leave-policy/leave-type.repository.interface.ts` — Define and export ILeaveTypeRepository interface with methods: findAll(), findById(id: string), findByCode(code: LeaveTypeCode), create(dto: CreateLeaveTypeDto), update(id: string, dto: UpdateLeaveTypeDto), delete(id: string). Also define CreateLeaveTypeDto and UpdateLeaveTypeDto in this file (or a sibling DTO file).

3. `src/modules/leave-policy/leave-type.repository.ts` — Implement LeaveTypeRepository class implementing ILeaveTypeRepository. Use the existing pg Pool from `src/shared/db/connection.ts`. Write parameterized SQL queries. No ORM — use the pool directly.

4. `src/modules/leave-policy/index.ts` — Barrel file re-exporting LeaveType, ILeaveTypeRepository, LeaveTypeRepository, CreateLeaveTypeDto, UpdateLeaveTypeDto.

Include Jest unit tests in `tests/unit/modules/leave-policy/` for the repository (mock the pool).

This phase depends on `src/shared/types/leave-type-code.enum.ts` from Phase 1 — read it before generating any code that references LeaveTypeCode.

## Phase 3: Phase 3: LeavePolicy model + repository (leave-policy module)

Create the LeavePolicy domain model and its repository in the leave-policy module.

Files to create:
1. `src/modules/leave-policy/leave-policy.model.ts` — Define and export the LeavePolicy interface with EXACT fields: id: string, policyName: string, leaveTypeId: string, entitlementDays: number, accrualRate: number | undefined, maxAccumulation: number | undefined, minimumNoticeDays: number | undefined, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date.

2. `src/modules/leave-policy/leave-policy.repository.interface.ts` — Define and export ILeavePolicyRepository interface with methods: findAll(), findById(id: string), findByLeaveTypeId(leaveTypeId: string), findActiveByLeaveTypeId(leaveTypeId: string), create(dto: CreateLeavePolicyDto), update(id: string, dto: UpdateLeavePolicyDto), delete(id: string). Also define CreateLeavePolicyDto and UpdateLeavePolicyDto.

3. `src/modules/leave-policy/leave-policy.repository.ts` — Implement LeavePolicyRepository class implementing ILeavePolicyRepository. Use the existing pg Pool from `src/shared/db/connection.ts`. Write parameterized SQL queries.

4. Update `src/modules/leave-policy/index.ts` — Add re-exports for LeavePolicy, ILeavePolicyRepository, LeavePolicyRepository, and the DTOs alongside the Phase 2 exports.

Include Jest unit tests in `tests/unit/modules/leave-policy/` for the LeavePolicy repository.

This phase depends on `src/modules/leave-policy/leave-type.model.ts` and `src/modules/leave-policy/index.ts` from Phase 2 — read them before generating any code.

## Phase 4: Phase 4: LeaveBalance model + repository (leave-balance module)

Create the LeaveBalance domain model and its repository in the leave-balance module.

Files to create:
1. `src/modules/leave-balance/leave-balance.model.ts` — Define and export the LeaveBalance interface with EXACT fields: id: string, employeeId: string, policyId: string, totalEntitlement: number, usedDays: number, pendingDays: number, remainingDays: number, fiscalYear: number, status: 'ACTIVE' | 'CLOSED', createdAt: Date, updatedAt: Date.

2. `src/modules/leave-balance/leave-balance.repository.interface.ts` — Define and export ILeaveBalanceRepository interface with methods: findByEmployeeId(employeeId: string), findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number), findByEmployeeIdAndPolicyId(employeeId: string, policyId: string, fiscalYear: number), create(dto: CreateLeaveBalanceDto), update(id: string, dto: UpdateLeaveBalanceDto), createBatch(dtos: CreateLeaveBalanceDto[]). Also define CreateLeaveBalanceDto and UpdateLeaveBalanceDto.

3. `src/modules/leave-balance/leave-balance.repository.ts` — Implement LeaveBalanceRepository class implementing ILeaveBalanceRepository. Use the existing pg Pool from `src/shared/db/connection.ts`.

4. `src/modules/leave-balance/index.ts` — Barrel file re-exporting LeaveBalance, ILeaveBalanceRepository, LeaveBalanceRepository, and DTOs.

Include Jest unit tests in `tests/unit/modules/leave-balance/` for the repository.

This phase depends on `src/modules/leave-policy/leave-policy.model.ts` from Phase 3 (LeaveBalance references policyId) — read it before generating.

## Phase 5: Phase 5: LeaveRequest model + repository (leave-request module)

Create the LeaveRequest domain model and its repository in the leave-request module.

Files to create:
1. `src/modules/leave-request/leave-request.model.ts` — Define and export the LeaveRequest interface with EXACT fields: id: string, employeeId: string, leaveTypeId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveStatus (import from `src/shared/types/leave-status.enum.ts` from Phase 1), approvedBy: string | null, approvedAt: Date | null, rejectedBy: string | null, rejectedAt: Date | null, rejectionReason: string | undefined, createdAt: Date, updatedAt: Date.

2. `src/modules/leave-request/leave-request.repository.interface.ts` — Define and export ILeaveRequestRepository interface with methods: findById(id: string), findByEmployeeId(employeeId: string), findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeStatuses: LeaveStatus[]), create(dto: CreateLeaveRequestDto), updateStatus(id: string, status: LeaveStatus, metadata: StatusUpdateMetadata), findByStatus(status: LeaveStatus). Also define CreateLeaveRequestDto, StatusUpdateMetadata, and UpdateLeaveRequestDto.

3. `src/modules/leave-request/leave-request.repository.ts` — Implement LeaveRequestRepository class implementing ILeaveRequestRepository. Use the existing pg Pool. The findOverlapping method must query for SUBMITTED/APPROVED requests where date ranges intersect for the same employee.

4. `src/modules/leave-request/index.ts` — Barrel file re-exporting LeaveRequest, ILeaveRequestRepository, LeaveRequestRepository, and DTOs.

Include Jest unit tests in `tests/unit/modules/leave-request/` for the repository.

This phase depends on `src/shared/types/leave-status.enum.ts` from Phase 1 and `src/modules/leave-policy/leave-type.model.ts` from Phase 2 — read both before generating.

## Phase 6: Phase 6: AuditRecord model + repository (audit module)

Create the AuditRecord domain model and its repository in the audit module.

Files to create:
1. `src/modules/audit/audit-record.model.ts` — Define and export the AuditRecord interface with fields: id: string, entityType: string, entityId: string, action: string, performedBy: string, changes: Record<string, unknown>, createdAt: Date.

2. `src/modules/audit/audit-record.repository.interface.ts` — Define and export IAuditRepository interface with methods: create(dto: CreateAuditRecordDto), findByEntity(entityType: string, entityId: string), findByPerformer(performedBy: string, limit?: number). Also define CreateAuditRecordDto.

3. `src/modules/audit/audit-record.repository.ts` — Implement AuditRepository class implementing IAuditRepository. Use the existing pg Pool.

4. `src/modules/audit/index.ts` — Barrel file re-exporting AuditRecord, IAuditRepository, AuditRepository, and DTOs.

Include Jest unit tests in `tests/unit/modules/audit/` for the repository.

No prior phase dependencies beyond the shared db connection — this is a standalone supporting module.

## Phase 7: Phase 7: Notification model + repository (notification module)

Create the Notification domain model and its repository in the notification module.

Files to create:
1. `src/modules/notification/notification.model.ts` — Define and export the Notification interface with EXACT fields: id: string, recipientId: string, type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED', title: string, message: string, relatedEntityType: 'LeaveRequest', relatedEntityId: string, status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED', createdAt: Date, readAt: Date | null.

2. `src/modules/notification/notification.repository.interface.ts` — Define and export INotificationRepository interface with methods: create(dto: CreateNotificationDto), findByRecipient(recipientId: string), markAsSent(id: string), markAsRead(id: string), createBatch(dtos: CreateNotificationDto[]). Also define CreateNotificationDto.

3. `src/modules/notification/notification.repository.ts` — Implement NotificationRepository class implementing INotificationRepository. Use the existing pg Pool.

4. `src/modules/notification/index.ts` — Barrel file re-exporting Notification, INotificationRepository, NotificationRepository, and DTOs.

Include Jest unit tests in `tests/unit/modules/notification/` for the repository.

No prior phase dependencies beyond the shared db connection — this is a standalone supporting module.

## Phase 8: Phase 8: LeavePolicyService (leave-policy module)

Create the LeavePolicyService in the leave-policy module.

Files to create:
1. `src/modules/leave-policy/leave-policy.service.interface.ts` — Define and export ILeavePolicyService interface with methods: getPolicyForLeaveType(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy>, getActivePolicies(): Promise<LeavePolicy[]>, calculateEntitlement(policy: LeavePolicy, hireDate: Date, fiscalYear: number): number (implements the BINDING rule: annual lump-sum allocation at fiscal year start; mid-year hires pro-rated by whole months remaining, rounded down), validatePolicy(policy: LeavePolicy): boolean.

2. `src/modules/leave-policy/leave-policy.service.ts` — Implement LeavePolicyService class implementing ILeavePolicyService. Inject ILeavePolicyRepository and ILeaveTypeRepository (from Phase 2 and Phase 3). The calculateEntitlement method must: determine fiscal year start (Jan 1), if hireDate is before Jan 1 of fiscalYear → full entitlementDays; if hireDate is within fiscalYear → pro-rate: entitlementDays * (whole months remaining / 12), rounded down. maxAccumulation caps the result.

3. Update `src/modules/leave-policy/index.ts` — Add re-exports for ILeavePolicyService and LeavePolicyService.

Include Jest unit tests in `tests/unit/modules/leave-policy/` for the service, testing pro-ration edge cases (hire Jan 15 → 11 months, hire Dec 1 → 0 months, hire before fiscal year → full).

This phase depends on `src/modules/leave-policy/leave-type.model.ts`, `src/modules/leave-policy/leave-type.repository.interface.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.interface.ts` from Phase 3 — read all before generating.

## Phase 9: Phase 9: LeaveBalanceService (leave-balance module)

Create the LeaveBalanceService in the leave-balance module.

Files to create:
1. `src/modules/leave-balance/leave-balance.service.interface.ts` — Define and export ILeaveBalanceService interface with methods: getBalancesForEmployee(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>, initializeBalancesForEmployee(employeeId: string, hireDate: Date): Promise<LeaveBalance[]> (auto-creates balances for all active leave types using LeavePolicyService.calculateEntitlement), getAvailableBalance(employeeId: string, policyId: string, fiscalYear: number): number (returns remainingDays - pendingDays), reserveDays(employeeId: string, policyId: string, days: number, fiscalYear: number): Promise<void> (increments pendingDays), finalizeDeduction(employeeId: string, policyId: string, days: number, fiscalYear: number): Promise<void> (moves pendingDays to usedDays), releaseReservation(employeeId: string, policyId: string, days: number, fiscalYear: number): Promise<void> (decrements pendingDays).

2. `src/modules/leave-balance/leave-balance.service.ts` — Implement LeaveBalanceService class implementing ILeaveBalanceService. Inject ILeaveBalanceRepository (Phase 4) and ILeavePolicyService (Phase 8). The initializeBalancesForEmployee method must: fetch all active policies via LeavePolicyService, for each policy call calculateEntitlement with the employee's hireDate and current fiscal year, then create a LeaveBalance record. The reserveDays method must check that (remainingDays - pendingDays) >= days before reserving. The finalizeDeduction method must decrement pendingDays AND increment usedDays atomically.

3. Update `src/modules/leave-balance/index.ts` — Add re-exports for ILeaveBalanceService and LeaveBalanceService.

Include Jest unit tests in `tests/unit/modules/leave-balance/` for the service, testing reservation, deduction, release, and insufficient-balance rejection.

This phase depends on `src/modules/leave-balance/leave-balance.model.ts` and `src/modules/leave-balance/leave-balance.repository.interface.ts` from Phase 4, and `src/modules/leave-policy/leave-policy.service.interface.ts` from Phase 8 — read all before generating.

## Phase 10: Phase 10: LeaveRequestService + routes (leave-request module)

Create the LeaveRequestService and Fastify routes in the leave-request module — the core business logic integrating all prior phases.

Files to create:
1. `src/modules/leave-request/leave-request.service.interface.ts` — Define and export ILeaveRequestService interface with methods:
   - createDraft(employeeId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest>
   - submit(id: string, employeeId: string): Promise<LeaveRequest> — validates no overlapping SUBMITTED/APPROVED requests for same employee; reserves days via LeaveBalanceService.reserveDays; transitions DRAFT→SUBMITTED
   - approve(id: string, managerId: string): Promise<LeaveRequest> — verifies manager is direct manager of employee (or HR if no manager); finalizes deduction via LeaveBalanceService.finalizeDeduction; creates AuditRecord; creates Notification (LEAVE_APPROVED); transitions SUBMITTED→APPROVED
   - reject(id: string, managerId: string, reason: string): Promise<LeaveRequest> — verifies manager authority; releases reservation via LeaveBalanceService.releaseReservation; creates AuditRecord; creates Notification (LEAVE_REJECTED); transitions SUBMITTED→REJECTED
   - cancel(id: string, employeeId: string): Promise<LeaveRequest> — if SUBMITTED: release reservation; if APPROVED: reverse deduction (negative finalize); creates AuditRecord; creates Notification (LEAVE_CANCELLED); transitions →CANCELLED
   - getById(id: string): Promise<LeaveRequest>
   - getByEmployee(employeeId: string): Promise<LeaveRequest[]>

2. `src/modules/leave-request/leave-request.service.ts` — Implement LeaveRequestService. Inject ILeaveRequestRepository (Phase 5), ILeaveBalanceService (Phase 9), IAuditRepository (Phase 6), INotificationRepository (Phase 7), ILeavePolicyService (Phase 8). Implement all BINDING rules:
   - Overlap detection: before submit, call findOverlapping with excludeStatuses=[CANCELLED, REJECTED, DRAFT]
   - Day counting: compute business days (exclude Sat/Sun; public holidays from a hardcoded list or config)
   - Emergency leave (code='emergency'): skip minimumNoticeDays check; still requires manager approval
   - Fiscal year: determine from startDate (calendar year Jan 1 – Dec 31)
   - No-manager escalation: if employee has no managerId, approval goes to HR (hardcoded HR role check or config)
   - RBAC: employees only operate on own records; managers only on direct reports

3. `src/modules/leave-request/leave-request.routes.ts` — Fastify route definitions:
   - POST /api/leave-requests (create draft)
   - GET /api/leave-requests (list own)
   - GET /api/leave-requests/:id
   - PATCH /api/leave-requests/:id/submit
   - PATCH /api/leave-requests/:id/approve
   - PATCH /api/leave-requests/:id/reject
   - PATCH /api/leave-requests/:id/cancel
   Each route extracts employee/manager identity from request context (JWT auth assumed), validates input, calls service, returns JSON.

4. Update `src/modules/leave-request/index.ts` — Add re-exports for ILeaveRequestService, LeaveRequestService, and the routes plugin.

Include Jest unit tests in `tests/unit/modules/leave-request/` for the service (mock all injected dependencies) covering: successful submit, overlap rejection, approve with deduction, reject with release, cancel from SUBMITTED, cancel from APPROVED, emergency bypass of notice period, insufficient balance rejection.

This phase depends on ALL prior phases — read these before generating:
- `src/shared/types/leave-status.enum.ts` (Phase 1)
- `src/modules/leave-policy/leave-type.model.ts` (Phase 2)
- `src/modules/leave-policy/leave-policy.model.ts` (Phase 3)
- `src/modules/leave-policy/leave-policy.service.interface.ts` (Phase 8)
- `src/modules/leave-balance/leave-balance.service.interface.ts` (Phase 9)
- `src/modules/leave-request/leave-request.model.ts` and `src/modules/leave-request/leave-request.repository.interface.ts` (Phase 5)
- `src/modules/audit/audit-record.repository.interface.ts` (Phase 6)
- `src/modules/notification/notification.repository.interface.ts` (Phase 7)
