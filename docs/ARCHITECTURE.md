# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest
- Backend: Fastify
- Frontend: React Native
- Database: PostgreSQL

## Module structure (as built)

```
src/modules/status/status.{model,service.interface,service}.ts
src/modules/uptime/uptime.{model,service.interface,service,routes}.ts
src/shared/db/connection.ts
src/shared/types/           — Shared enums (LeaveType, LeaveStatus, AuditAction) and DTOs (LeaveRequestDTO, LeaveBalanceDTO). LeaveType members use lowercase identifiers matching their string values (annual, sick, emergency, unpaid, maternity, paternity). [Phase 1 complete]
src/shared/utils/business-day.ts — countBusinessDays(startDate, endDate, holidays) utility; DEFAULT_HOLIDAYS constant (empty placeholder). [Phase 10 complete]
src/modules/employee/employee.{model,repository,service.interface,service}.ts — Employee entity + repository + service [Phase 2, 8 complete]
src/modules/leave-policy/leave-policy.{model,repository,service.interface,service}.ts — LeaveType + LeavePolicy entities + repository + service [Phase 7 complete]
src/modules/leave-balance/leave-balance.{model,repository,service.interface,service}.ts — LeaveBalance entity + repository + service. remainingDays computed as totalEntitlement - usedDays at read time, never stored. [Phase 4, 9 complete]
src/modules/leave-request/leave-request.{model,repository,service.interface,service,controller,routes}.ts — LeaveRequest entity + repository + service + controller + Fastify routes. [Phase 5, 10 complete]
src/modules/audit/audit.{model,repository}.ts — AuditRecord entity + repository. Uses `audit_records` table with a `details` JSON column (not the `audit_logs`/`old_values`/`new_values` shape from the reconciled architecture). [Phase 6 complete]
src/modules/notification/notification.{service.interface,service}.ts — Notification service (console-log stub) [Phase 9 complete]
```

### Planned modules (not yet built)

```
(none — all planned leave-management modules are built)
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against
- Modules live under `src/modules/<name>/` with flat file naming: `<name>.model.ts`, `<name>.repository.ts`, `<name>.service.ts`, `<name>.service.interface.ts`, `<name>.routes.ts`, `<name>.controller.ts`, and barrel `index.ts`.
- Tests mirror the `src/` structure under `tests/` with `.test.ts` extension.

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=e207b7c2-5967-4897-aeeb-2fac2e370ce3 START -->
# Leave Management Module Architecture

## Overview

The leave management module enables employees to apply for annual, sick, emergency, and other leave types. Managers approve or reject requests. The system tracks leave balances per employee per leave type per fiscal year, enforcing business rules around eligibility, overlap, minimum notice, and balance sufficiency.

## Domain Entities

### LeaveRequest
- **Attributes**: id, employeeId, leaveTypeId, startDate, endDate, reason, rejectionReason, status, approvedBy, approvedAt, cancelledAt, createdAt, updatedAt
- **Lifecycle**: DRAFT → SUBMITTED → (APPROVED | REJECTED | CANCELLED). DRAFT → CANCELLED also allowed. Terminal states: APPROVED, REJECTED, CANCELLED.
- **Key rules**: startDate ≤ endDate; day count = (endDate - startDate) + 1; rejectionReason required on REJECTED; overlap check on SUBMITTED; auto-approval when policy.requiresManagerApproval === false.

### LeaveType
- **Attributes**: id, code, label, description, isActive, createdAt, updatedAt
- **Lifecycle**: ACTIVE, INACTIVE
- **Codes**: annual, sick, emergency, unpaid, maternity, paternity (controlled vocabulary).

### LeavePolicy
- **Attributes**: id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt
- **Lifecycle**: ACTIVE, INACTIVE
- **Key rule**: At most one active policy per leaveTypeId.

### LeaveBalance
- **Attributes**: id, employeeId, leaveTypeId, policyId, totalEntitlement, usedDays, pendingDays, remainingDays, fiscalYear, status, createdAt, updatedAt
- **Lifecycle**: ACTIVE, EXHAUSTED, FROZEN
- **Equation**: remainingDays = totalEntitlement - usedDays (computed at read time, never stored)
- **Transitions**: EXHAUSTED when remainingDays = 0; FROZEN when employee terminated; recovers to ACTIVE if pendingDays released.

### Employee
- **Attributes**: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt
- **Lifecycle**: ACTIVE, INACTIVE, TERMINATED
- **Key rule**: Only ACTIVE employees can create/submit leave requests.

## Conceptual Table Specifications

### leave_types
- **Fields**: id, code, label, description, is_active, created_at, updated_at
- **PK**: id
- **Indexes**: code (unique)

### leave_policies
- **Fields**: id, policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at
- **PK**: id
- **FKs**: leave_type_id → leave_types.id
- **Indexes**: leave_type_id, is_active, (leave_type_id, is_active) unique

### employees
- **Fields**: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at
- **PK**: id
- **FKs**: manager_id → employees.id
- **Indexes**: employee_number (unique), email (unique), manager_id, employment_status, department

### leave_requests
- **Fields**: id, employee_id, leave_type_id, start_date, end_date, reason, rejection_reason, status, approved_by, approved_at, cancelled_at, created_at, updated_at
- **PK**: id
- **FKs**: employee_id → employees.id; leave_type_id → leave_types.id; approved_by → employees.id
- **Indexes**: employee_id, status, start_date, end_date, (employee_id, status), (leave_type_id, status)

### leave_balances
- **Fields**: id, employee_id, leave_type_id, policy_id, total_entitlement, used_days, pending_days, fiscal_year, status, created_at, updated_at
- **PK**: id
- **FKs**: employee_id → employees.id; leave_type_id → leave_types.id; policy_id → leave_policies.id
- **Indexes**: employee_id, (employee_id, fiscal_year) unique, policy_id, fiscal_year, leave_type_id

### audit_records (as built — diverges from reconciled audit_logs spec)
- **Fields**: id, entity_type, entity_id, action, performed_by, details, created_at
- **PK**: id
- **FKs**: performed_by → employees.id
- **Indexes**: (entity_type, entity_id), performed_by, action
- **Divergence note**: The reconciled architecture specified `audit_logs` with `old_values`/`new_values`/`performed_at`/`updated_at` columns. The implementation uses `audit_records` with a single `details` JSON column and `created_at` (no `updated_at`). This is the as-built shape; future phases may reconcile.

### notifications
- **Fields**: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at
- **PK**: id
- **FKs**: recipient_id → employees.id
- **Indexes**: recipient_id, status, (recipient_id, status), (related_entity_type, related_entity_id)

## Module Boundaries

- **shared-types** (`src/shared/types/`): Enums (LeaveType, LeaveStatus, AuditAction) and DTOs. LeaveType members use lowercase identifiers (annual, sick, emergency, unpaid, maternity, paternity). [Phase 1 complete]
- **shared-utils** (`src/shared/utils/`): `countBusinessDays(startDate, endDate, holidays)` — counts weekdays (Mon–Fri) between two dates inclusive, excluding weekends and provided holidays. `DEFAULT_HOLIDAYS` is an empty array placeholder. [Phase 10 complete]
- **employee** (`src/modules/employee/`): Employee entity, IEmployeeRepository, EmployeeRepository, IEmployeeService, EmployeeService. [Phase 2, 8 complete]
- **leave-policy** (`src/modules/leave-policy/`): LeaveType entity, LeavePolicy entity, ILeavePolicyRepository, LeavePolicyRepository, ILeavePolicyService, LeavePolicyService. [Phase 7 complete]
- **leave-balance** (`src/modules/leave-balance/`): LeaveBalance entity, ILeaveBalanceRepository, LeaveBalanceRepository, ILeaveBalanceService, LeaveBalanceService. [Phase 4, 9 complete]
- **leave-request** (`src/modules/leave-request/`): LeaveRequest entity, ILeaveRequestRepository, LeaveRequestRepository, ILeaveRequestService, LeaveRequestService, LeaveRequestController, leaveRequestRoutes Fastify plugin. [Phase 5, 10 complete]
- **audit** (`src/modules/audit/`): AuditRecord entity, IAuditRepository, AuditRepository. [Phase 6 complete]
- **notification** (`src/modules/notification/`): INotificationService, NotificationService (console-log stub). [Phase 9 complete]

## Dependency Map

- leave-request → shared-types, shared-utils, leave-balance, leave-policy, employee, audit, notification
- leave-balance → shared-types, leave-policy, audit
- leave-policy → shared-types
- employee → shared-types
- audit → shared-types
- notification → shared-types, employee

## Leave-Request Service Design (Phase 10 as-built)

### Service layer (`LeaveRequestService`)

Implements `ILeaveRequestService`. Constructor-injected dependencies: `ILeaveRequestRepository`, `ILeaveBalanceService`, `IEmployeeService`, `ILeavePolicyService`, `IAuditRepository`, `INotificationService`.

**Custom error classes** (defined in `leave-request.service.ts`):
- `InvalidStateTransitionError` — thrown when a transition is not allowed from the current status.
- `UnauthorizedApproverError` — thrown when the approver is neither the employee's manager nor an HR admin.
- `RequestOwnershipError` — thrown when an employee tries to act on a request they don't own.

**Methods**:

- `submitDraft(requestId, employeeId)`: Validates ownership (employeeId must match request.employeeId). Validates current status is DRAFT. Looks up active policy. Computes business days via `countBusinessDays`. Initializes balance if needed. Atomically deducts days. If employee has no manager (`managerId === null`), logs escalation to HR admin (does not block submission). Updates status to SUBMITTED. Creates audit record. Sends notification.

- `approveRequest(requestId, approverId)`: Validates current status is SUBMITTED. Looks up the request's employee. Authorizes if `approverId === employee.managerId` OR (`employee.managerId === null` AND `approverId !== employeeId`). Sets `approvedBy` and `approvedAt`. Updates status to APPROVED. Creates audit. Sends notification.

- `rejectRequest(requestId, approverId, rejectionReason)`: Requires non-empty rejectionReason. Validates current status is SUBMITTED. Same authorization check as approve. Restores balance days. Sets rejectionReason. Updates status to REJECTED. Creates audit. Sends notification.

- `cancelRequest(requestId, employeeId)`: Validates ownership. Validates current status is SUBMITTED or APPROVED. Restores balance days (days were deducted on submit). Sets `cancelledAt`. Updates status to CANCELLED. Creates audit. Sends notification.

- `getRequestById(id)`, `getEmployeeRequests(employeeId)`, `getPendingForManager(managerId)`: Read-through to repository.

### Controller layer (`LeaveRequestController`)

Reads authenticated user identity from `request.user` (Fastify request decoration with shape `{ id: string; role: string }`). If `request.user` is absent/undefined, returns 401.

**RBAC approach (as-built divergence)**: RBAC is enforced at the **service layer** via custom error classes (`UnauthorizedApproverError`, `RequestOwnershipError`), not at the controller boundary. The controller maps these error classes to HTTP status codes:
- `RequestOwnershipError` → 403
- `UnauthorizedApproverError` → 403
- `InvalidStateTransitionError` → 409
- Other `Error` → 400
- Unknown → 500

**HR-admin identification (as-built divergence)**: The implementation does NOT use `request.user.role` for HR-admin checks. Instead, it uses the heuristic `employee.managerId === null && approverId !== request.employeeId` — i.e., if the employee has no manager, any authenticated user who is not the employee themselves can act as approver. The `request.user.role` field is accepted by the controller type but never read or checked.

**Endpoints** (registered by `leaveRequestRoutes` Fastify plugin under `/api/leave-requests`):
- `POST /api/leave-requests/:requestId/submit`
- `POST /api/leave-requests/:requestId/approve`
- `POST /api/leave-requests/:requestId/reject`
- `POST /api/leave-requests/:requestId/cancel`
- `GET /api/leave-requests/:requestId`
- `GET /api/leave-requests/my`
- `GET /api/leave-requests/pending`

### Routes wiring (`leaveRequestRoutes`)

The routes plugin manually instantiates all dependencies (repositories, services) and wires them together. It does NOT use a DI container. Imports are direct from individual module files, not from barrel `index.ts` — the `leave-request/index.ts` barrel was not updated in this phase and still only exports model + repository.

### `index.ts` barrel (not updated)

The `src/modules/leave-request/index.ts` barrel still only re-exports `LeaveRequest`, `ILeaveRequestRepository`, and `LeaveRequestRepository`. The service, controller, and routes are not exported from the barrel. This is a known gap.

## Recommended Implementation Phases

1. **Shared types and audit foundation** (8 files): Enums, DTOs, audit module. ✅ Complete
2. **Employee and leave-policy modules** (12 files): Manager lookup, policy rules. ✅ Complete
3. **Leave-balance module** (8 files): Balance tracking, deduct/restore. ✅ Complete
4. **Notification module** (4 files): Alerts on submit/approve/reject. ✅ Complete
5. **Leave-request orchestration and API surface** (10 files): Fastify routes, full workflow orchestration. ✅ Complete

## Open Questions

- Fiscal year definition (calendar vs custom)
- Day counting method (calendar vs business days) — resolved: business days (Mon–Fri) via `countBusinessDays`
- Half-day leave support
- Balance initialization strategy (pre-seed vs lazy) — resolved: lazy initialization on first submit
- HR-admin role check via `request.user.role` vs managerId heuristic — current implementation uses managerId heuristic; future phases may adopt role-based check
<!-- gestalt:architecture feature=e207b7c2-5967-4897-aeeb-2fac2e370ce3 END -->
