# PLAN.md

## Phase 1: Phase 1: Shared enums and business-days utility

Create the foundational shared types and utility that every downstream module depends on.

Files to create:
- `src/shared/types/leave-type-code.enum.ts` — Define the `LeaveTypeCode` enum with members: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY.
- `src/shared/types/leave-request-status.enum.ts` — Define the `LeaveRequestStatus` enum with members: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- `src/shared/utils/business-days.ts` — Implement and export `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number`. Exclude weekends (Saturday/Sunday) and the provided holidays array. Normalize all dates to UTC midnight for calendar-date comparison. Count whole business days only. For now, accept holidays as a parameter (the holidays table/repository comes in a later phase).
- `src/shared/types/index.ts` — Barrel re-export of both enums.

Include Jest unit tests in `tests/unit/shared/types/` for enum value correctness and in `tests/unit/shared/utils/business-days.test.ts` covering: weekday range with no holidays, range spanning a weekend, range with holidays, same-day (zero days), and end-before-start (error).

## Phase 2: Phase 2: Employee module (model + repository)

Build the Employee domain model and repository. This phase depends on no prior phase files (Employee has no dependency on the enums from Phase 1).

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` interface with exact fields: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string, hireDate: Date, terminationDate: Date | null, employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED', createdAt: Date, updatedAt: Date.
- `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findAll(): Promise<Employee[]>. Implement `EmployeeRepository` class using the existing `pool` from `src/shared/db/connection.ts`. Use parameterized SQL queries via `pg` Pool.
- `src/modules/employee/index.ts` — Barrel export of model and repository.

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts` — mock the pg Pool, test findById returns Employee or null, findByEmployeeNumber, and findAll.

## Phase 3: Phase 3: LeaveType module (model + repository)

Build the LeaveType domain model and repository. This phase depends on `src/shared/types/leave-type-code.enum.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/leave-type/leave-type.model.ts` — Define the `LeaveType` interface with exact fields: id: string, code: LeaveTypeCode (import from `src/shared/types/leave-type-code.enum.ts`), name: string, description: string | undefined, isActive: boolean, createdAt: Date, updatedAt: Date.
- `src/modules/leave-type/leave-type.repository.ts` — Define `ILeaveTypeRepository` interface with methods: findById(id: string): Promise<LeaveType | null>, findByCode(code: LeaveTypeCode): Promise<LeaveType | null>, findAllActive(): Promise<LeaveType[]>. Implement `LeaveTypeRepository` class using the existing `pool` from `src/shared/db/connection.ts` with parameterized SQL.
- `src/modules/leave-type/index.ts` — Barrel export of model and repository.

Include Jest unit tests in `tests/unit/modules/leave-type/leave-type.repository.test.ts` — mock the pg Pool, test findById, findByCode, findAllActive.

## Phase 4: Phase 4: LeavePolicy module (model + repository + service interface)

Build the LeavePolicy domain model, repository, and service interface. This phase depends on `src/modules/leave-type/leave-type.model.ts` from Phase 3 — read it before generating any code that references LeaveType or leaveTypeId.

Files to create:
- `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` interface with exact fields: id: string, policyName: string, leaveTypeId: string, entitlementDays: number, accrualRate: number | undefined, maxAccumulation: number | undefined, minimumNoticeDays: number | undefined, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date.
- `src/modules/leave-policy/leave-policy.repository.ts` — Define `ILeavePolicyRepository` interface with methods: findById(id: string): Promise<LeavePolicy | null>, findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>, findAllActive(): Promise<LeavePolicy[]>. Implement `LeavePolicyRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/leave-policy/leave-policy.service.interface.ts` — Define `ILeavePolicyService` interface with method: getPolicyForLeaveType(leaveTypeId: string): Promise<LeavePolicy | null>.
- `src/modules/leave-policy/index.ts` — Barrel export of model, repository, and service interface.

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`.

## Phase 5: Phase 5: LeaveBalance module (model + repository + service interface)

Build the LeaveBalance domain model, repository, and service interface. This phase depends on `src/modules/employee/employee.model.ts` from Phase 2 and `src/modules/leave-policy/leave-policy.model.ts` from Phase 4 — read both before generating any code.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` interface with exact fields: id: string, employeeId: string, leavePolicyId: string, totalEntitlement: number, usedDays: number, fiscalYear: number, status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED', createdAt: Date, updatedAt: Date. Do NOT include a stored `remainingDays` field — it is always computed as `totalEntitlement - usedDays` at query time per the binding business rules.
- `src/modules/leave-balance/leave-balance.repository.ts` — Define `ILeaveBalanceRepository` interface with methods: findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>. Implement `LeaveBalanceRepository` class using the existing `pool` from `src/shared/db/connection.ts`. The repository must compute `remainingDays` in its read methods as `totalEntitlement - usedDays` and return it as a derived property on the result objects.
- `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService` interface with methods: getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance & { remainingDays: number }>, deductDays(employeeId: string, leavePolicyId: string, fiscalYear: number, days: number): Promise<void>, restoreDays(employeeId: string, leavePolicyId: string, fiscalYear: number, days: number): Promise<void>.
- `src/modules/leave-balance/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`.

## Phase 6: Phase 6: LeaveRequest module (model + repository)

Build the LeaveRequest domain model and repository. This phase depends on `src/shared/types/leave-request-status.enum.ts` from Phase 1, `src/modules/employee/employee.model.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts` from Phase 4 — read all three before generating any code.

Files to create:
- `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` interface with exact fields: id: string, employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveRequestStatus (import from `src/shared/types/leave-request-status.enum.ts`), approvedBy: string | null, approvedAt: Date | null, createdAt: Date, updatedAt: Date. Also define `CreateLeaveRequestDto` with fields: employeeId, leavePolicyId, startDate, endDate, reason (optional).
- `src/modules/leave-request/leave-request.repository.ts` — Define `ILeaveRequestRepository` interface with methods: findById(id: string): Promise<LeaveRequest | null>, findByEmployee(employeeId: string): Promise<LeaveRequest[]>, findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>, create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string | null, approvedAt?: Date | null): Promise<LeaveRequest>. Implement `LeaveRequestRepository` class using the existing `pool` from `src/shared/db/connection.ts` with parameterized SQL.
- `src/modules/leave-request/index.ts` — Barrel export of model and repository.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.repository.test.ts`.

## Phase 7: Phase 7: LeaveRequest service (business logic)

Implement the LeaveRequest service with full business logic. This phase depends on `src/modules/leave-balance/leave-balance.service.interface.ts` from Phase 5 and `src/modules/leave-request/leave-request.model.ts` + `src/modules/leave-request/leave-request.repository.ts` from Phase 6 — read all before generating.

Files to create:
- `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService` interface with methods: submit(dto: CreateLeaveRequestDto, actorId: string, actorRole: 'employee' | 'manager' | 'hr_admin'): Promise<LeaveRequest>, approve(leaveRequestId: string, approverId: string, approverRole: 'manager' | 'hr_admin'): Promise<LeaveRequest>, reject(leaveRequestId: string, approverId: string, approverRole: 'manager' | 'hr_admin'): Promise<LeaveRequest>, cancel(leaveRequestId: string, actorId: string, actorRole: 'employee' | 'manager' | 'hr_admin'): Promise<LeaveRequest>, getById(leaveRequestId: string): Promise<LeaveRequest | null>, getByEmployee(employeeId: string): Promise<LeaveRequest[]>.
- `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` class. Key business rules to enforce:
  - **submit**: Validate startDate not in past, startDate <= endDate. Look up the LeavePolicy to check minimumNoticeDays. Compute business days via `countBusinessDays` from Phase 1 (pass an empty holidays array for now). Look up LeaveBalance for the employee+policy+fiscalYear (fiscalYear = calendar year of startDate). Check remainingDays >= computed days; if not, throw error. Atomically increment usedDays on the balance. Set status to SUBMITTED. If employee has no manager (managerId is null), the request is escalated to hr_admin — do NOT auto-approve.
  - **approve**: Verify approver is the employee's manager OR hr_admin (when managerId is null). Set status to APPROVED, set approvedBy and approvedAt. Do NOT change usedDays again.
  - **reject**: Same authorization as approve. Set status to REJECTED. Restore usedDays on the balance.
  - **cancel**: Only the employee who owns the request (or a manager/hr_admin) may cancel. Set status to CANCELLED. If the prior status was SUBMITTED, restore usedDays.
  - **RBAC**: Thread actor role into every method; the service enforces authorization, not the controller.
- `src/modules/leave-request/index.ts` — Update barrel export to include service interface and service.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.service.test.ts` — mock all repository dependencies, test each method's happy path and error paths (insufficient balance, unauthorized approver, past startDate, etc.).

## Phase 8: Phase 8: LeaveRequest controller + routes

Build the Fastify controller and routes for the LeaveRequest API surface. This phase depends on `src/modules/leave-request/leave-request.service.interface.ts` and `src/modules/leave-request/leave-request.service.ts` from Phase 7 — read both before generating.

Files to create:
- `src/modules/leave-request/leave-request.controller.ts` — Implement the controller class. Each handler:
  - Reads `request.user` (populated by existing auth middleware) — return 401 if absent.
  - Validates inputs at the API boundary (GP-003): startDate not in past, startDate <= endDate, required fields present — return 400 with descriptive error on invalid input.
  - Delegates to `LeaveRequestService`, passing `request.user.id` and `request.user.role` as actor parameters.
  - Catches all errors and returns appropriate HTTP status codes.
  - Never logs PII (GP-004).
- `src/modules/leave-request/leave-request.routes.ts` — Register Fastify routes:
  - `POST /leave-requests` — submit a new leave request (employee only)
  - `GET /leave-requests/:id` — get by ID (RBAC: employee sees own, manager/hr_admin sees any)
  - `GET /leave-requests` — list (filtered by employeeId query param; RBAC enforced)
  - `PATCH /leave-requests/:id/approve` — approve (manager/hr_admin only)
  - `PATCH /leave-requests/:id/reject` — reject (manager/hr_admin only)
  - `PATCH /leave-requests/:id/cancel` — cancel (employee owns, or manager/hr_admin)
- `src/modules/leave-request/index.ts` — Update barrel export to include controller and routes.
- `src/app.ts` — Register `leaveRequestRoutes` on the Fastify app (import from `src/modules/leave-request`).

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.controller.test.ts` — mock the service, test each route handler for correct status codes, RBAC enforcement, and input validation.

## Phase 9: Phase 9: AuditLog + Notification modules (models + repositories)

Build the AuditLog and Notification domain models and repositories. These are supporting modules needed for GP-002 (audit records) and leave notifications. This phase depends on `src/modules/leave-request/leave-request.model.ts` from Phase 6 for understanding the entity types that will be audited.

Files to create (approximately 5-6):
- `src/modules/audit-log/audit-log.model.ts` — Define the `AuditLog` interface with exact fields: id: string, entityType: string, entityId: string, action: string, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, performedBy: string, performedAt: Date, createdAt: Date.
- `src/modules/audit-log/audit-log.repository.ts` — Define `IAuditLogRepository` interface with methods: create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>, findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>. Implement `AuditLogRepository` class using the existing `pool` from `src/shared/db/connection.ts`. Also define `IAuditService` interface with method: log(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void>. Implement `AuditService` class that wraps the repository.
- `src/modules/audit-log/index.ts` — Barrel export.
- `src/modules/notification/notification.model.ts` — Define the `Notification` interface with exact fields: id: string, recipientId: string, type: 'LEAVE_APPLIED' | 'LEAVE_DECISION' | 'BALANCE_LOW', message: string, isRead: boolean, createdAt: Date.
- `src/modules/notification/notification.repository.ts` — Define `INotificationRepository` interface with methods: create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>, findByRecipient(recipientId: string): Promise<Notification[]>, markAsRead(id: string): Promise<void>. Implement `NotificationRepository` class. Also define `INotificationService` interface with method: notify(recipientId: string, type: Notification['type'], message: string): Promise<void>. Implement `NotificationService` class.
- `src/modules/notification/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/audit-log/` and `tests/unit/modules/notification/`.

## Phase 10: Phase 10: Service implementations + audit/notification integration

Implement the LeavePolicy and LeaveBalance services, and integrate audit logging and notifications into the LeaveRequest service. This phase depends on `src/modules/leave-policy/leave-policy.service.interface.ts` from Phase 4, `src/modules/leave-balance/leave-balance.service.interface.ts` from Phase 5, `src/modules/audit-log/` and `src/modules/notification/` from Phase 9, and `src/modules/leave-request/leave-request.service.ts` from Phase 7 — read all before generating.

Files to create/modify (approximately 5):
- `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class implementing `ILeavePolicyService`. The `getPolicyForLeaveType` method delegates to `ILeavePolicyRepository.findByLeaveTypeId` and returns the first active policy (or null).
- `src/modules/leave-policy/index.ts` — Update barrel export to include the service implementation.
- `src/modules/leave-balance/leave-balance.service.ts` — Implement `LeaveBalanceService` class implementing `ILeaveBalanceService`. `getBalance` delegates to repository and computes remainingDays. `deductDays` atomically increments usedDays (throws if remaining would go below zero). `restoreDays` decrements usedDays (floor at zero). Both deductDays and restoreDays use the repository's `updateUsedDays` method.
- `src/modules/leave-balance/index.ts` — Update barrel export to include the service implementation.
- `src/modules/leave-request/leave-request.service.ts` — UPDATE the existing service to inject `IAuditService` and `INotificationService`. On submit: emit audit record (entityType='LeaveRequest', action='SUBMITTED') and notify the employee's manager (or hr_admin if no manager) with type 'LEAVE_APPLIED'. On approve/reject: emit audit record and notify the employee with type 'LEAVE_DECISION'. On cancel: emit audit record.

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.service.test.ts` and `tests/unit/modules/leave-balance/leave-balance.service.test.ts`. Update existing leave-request service tests to verify audit and notification calls.
