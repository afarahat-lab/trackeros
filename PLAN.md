# PLAN.md

## Phase 1: Phase 1 — Shared foundations (types, errors, unit-of-work)

Create the shared foundation files that every later module imports. All paths below are the AUTHORITATIVE module boundaries — do not relocate any symbol.

1. src/shared/types/index.ts — define the canonical enums and cross-module DTOs:
   - LeaveStatus enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED (persisted string values, per DOMAIN.md).
   - LeaveTypeCode enum: ANNUAL, SICK, EMERGENCY (plus unpaid/maternity/paternity per DOMAIN.md scheme).
   - AuditAction enum: CREATE, UPDATE, DELETE, APPROVE, REJECT.
   - NotificationStatus enum: PENDING, SENT, READ, ARCHIVED.
   - EmploymentStatus enum: ACTIVE, TERMINATED, ON_LEAVE.
   - EmployeeRole enum: EMPLOYEE, MANAGER, ADMIN.
   - CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams interfaces. Use the EXACT canonical field names from the entity shapes (e.g. CreateLeaveRequestDto: employeeId, leaveTypeCode, startDate, endDate, reason; UpdateLeaveRequestDto: startDate, endDate, reason, status).

2. src/shared/errors/index.ts — define AppError base class (message, statusCode, code) and subclasses: ValidationError (400), NotFoundError (404), UnauthorizedError (401), ForbiddenError (403), ConflictError (409).

3. src/shared/db/unit-of-work.ts — define IUnitOfWork interface with withTransaction<T>(work: (tx: unknown) => Promise<T>): Promise<T>, and PgUnitOfWork implementation using the existing pool from src/shared/db/connection.ts (read it first). PgUnitOfWork opens a client, BEGIN/COMMIT/ROLLBACK, and reuses the client within the transaction.

Include Jest unit tests in tests/unit/shared/ for the error classes and enums. This phase depends on the existing src/shared/db/connection.ts (read it before generating PgUnitOfWork).

## Phase 2: Phase 2 — employee, leave-type, and policy modules

Build three reference-data modules. Each module lives under its declared directory and exposes a public index.ts. Use the EXACT canonical entity field shapes below — do not rename, split, add, or omit fields.

1. src/modules/employee/ — Employee model (id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus), IEmployeeRepository + PgEmployeeRepository, IEmployeeService + EmployeeService, and public index.ts. Import EmployeeRole and EmploymentStatus from src/shared/types/index.ts (Phase 1).

2. src/modules/leave-type/ — LeaveType model (code, name, requiresApproval, maxConsecutiveDays, isPaid), ILeaveTypeRepository + PgLeaveTypeRepository, ILeaveTypeService + LeaveTypeService, public index.ts. Import LeaveTypeCode from src/shared/types/index.ts.

3. src/modules/policy/ — LeavePolicy model (id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status), IPolicyRepository + PgLeavePolicyRepository, IPolicyService + PolicyService, public index.ts.

Repositories use the existing pool from src/shared/db/connection.ts and the shared error types from src/shared/errors/index.ts. Include Jest unit tests in tests/unit/modules/ for each module's service. This phase depends on Phase 1 files: src/shared/types/index.ts and src/shared/errors/index.ts — read them before generating any code that references their types.

## Phase 3: Phase 3 — audit and notification modules

Build two modules, each under its declared directory with a public index.ts. Use the EXACT canonical entity field shapes.

1. src/modules/audit/ — AuditLog model (id, actorId, action, entityType, entityId, beforeState, afterState, occurredAt), IAuditRepository + PgAuditLogRepository, IAuditService + AuditService, public index.ts. Import AuditAction from src/shared/types/index.ts.

2. src/modules/notification/ — Notification model (id, recipientId, type, title, message, relatedEntityType, relatedEntityId, status, createdAt, readAt), INotificationRepository + PgNotificationRepository, INotificationService + NotificationService, public index.ts. Import NotificationStatus from src/shared/types/index.ts.

Notifications are SYNCHRONOUS direct inserts (no BullMQ) — the service inserts within the caller's transaction boundary. Repositories use the pool from src/shared/db/connection.ts and error types from src/shared/errors/index.ts. Include Jest unit tests in tests/unit/modules/ for each service. This phase depends on Phase 1 files: src/shared/types/index.ts and src/shared/errors/index.ts — read them before generating code referencing their types.

## Phase 4: Phase 4 — balance module

Build the balance module under src/modules/balance/ with a public index.ts. Use the EXACT canonical LeaveBalance field shape: id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays.

Create:
- src/modules/balance/balance.model.ts — LeaveBalance interface.
- src/modules/balance/balance.repository.ts — IBalanceRepository + PgLeaveBalanceRepository (uses pool from src/shared/db/connection.ts).
- src/modules/balance/balance.service.ts — IBalanceService + BalanceService.
- src/modules/balance/index.ts — public exports.

The service MUST implement the BINDING accrual and carry-forward rules: grant the FULL entitlement at the start of each accrual period (no pro-rata); on period close, carry forward min(unused, carryForwardDays) into the next OPEN period (hard cap, days above cap forfeited). Import LeaveTypeCode from src/shared/types/index.ts and error types from src/shared/errors/index.ts. Include Jest unit tests in tests/unit/modules/balance/ covering accrual and carry-forward. This phase depends on Phase 1 files (src/shared/types/index.ts, src/shared/errors/index.ts) and Phase 2's src/modules/leave-type/index.ts and src/modules/policy/index.ts (for LeaveTypeCode and carryForwardDays) — read them before generating code referencing their types.

## Phase 5: Phase 5 — validation module

Build the validation module under src/modules/validation/ with a public index.ts.

Create:
- src/modules/validation/validation.model.ts — ValidationResult model (e.g. { valid: boolean; errors: string[] }).
- src/modules/validation/validation.service.ts — IValidationService + ValidationService.
- src/modules/validation/index.ts — public exports.

The service implements the BINDING day-count rule ONCE as a shared helper: requestedDays = endDate - startDate + 1 (INCLUSIVE, all calendar days, no weekend/holiday exclusion, whole-day only). Expose this helper (e.g. calculateRequestedDays) so every consumer (sufficiency checks, balance deduction, policy max-duration enforcement) calls it — do not re-derive per module. Also implement date-range validation (startDate <= endDate) and balance-sufficiency checks against LeaveBalance (entitledDays - usedDays - pendingDays >= requestedDays).

Import LeaveTypeCode and CreateLeaveRequestDto from src/shared/types/index.ts, error types from src/shared/errors/index.ts, and LeaveBalance from src/modules/balance/index.ts (Phase 4). Include Jest unit tests in tests/unit/modules/validation/ covering inclusive day counting and sufficiency. This phase depends on Phase 1 (src/shared/types/index.ts, src/shared/errors/index.ts) and Phase 4 (src/modules/balance/index.ts) — read them before generating code referencing their types.

## Phase 6: Phase 6 — leave module (service + controller + routes)

Build the leave module under src/modules/leave/ with a public index.ts. Use the EXACT canonical LeaveRequest field shape: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt.

Create:
- src/modules/leave/leave.model.ts — LeaveRequest interface.
- src/modules/leave/leave.repository.ts — ILeaveRepository + PgLeaveRequestRepository (uses pool from src/shared/db/connection.ts).
- src/modules/leave/leave.service.ts — ILeaveService + LeaveService (orchestration).
- src/modules/leave/leave.routes.ts — Fastify routes.
- src/modules/leave/index.ts — public exports.

Per BINDING rule 5, routes call services DIRECTLY (matching the existing src/modules/uptime/uptime.routes.ts pattern) — do NOT create a separate controller file. The service orchestrates the full workflow: create (DRAFT), submit (SUBMITTED), approve/reject (APPROVED/REJECTED). The approve/reject transaction MUST run inside PgUnitOfWork.withTransaction (from src/shared/db/unit-of-work.ts) and atomically perform: status change + balance update (usedDays/pendingDays) + audit log insert + synchronous notification insert. requestedDays is computed via the shared helper from src/modules/validation/index.ts (Phase 5) — never re-derive it.

Import from: src/shared/types/index.ts (LeaveStatus, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams), src/shared/errors/index.ts, src/shared/db/unit-of-work.ts, src/modules/balance/index.ts, src/modules/audit/index.ts, src/modules/notification/index.ts, src/modules/validation/index.ts. Include Jest unit tests in tests/unit/modules/leave/ for the service orchestration. This phase depends on Phases 1, 3, 4, and 5 — read those index.ts files before generating code referencing their types.
