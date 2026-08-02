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
src/shared/types/           — Shared enums (LeaveType, LeaveStatus, AuditAction) and DTOs (LeaveRequestDTO, LeaveBalanceDTO) [Phase 1 complete]
src/modules/employee/employee.{model,repository}.ts — Employee entity + repository [Phase 2 complete]
src/modules/leave-policy/leave-policy.{model,repository}.ts — LeaveType + LeavePolicy entities + repository [Phase 3 complete]
src/modules/leave-balance/leave-balance.{model,repository}.ts — LeaveBalance entity + repository [Phase 4 complete]
src/modules/leave-request/leave-request.{model,repository}.ts — LeaveRequest entity + repository [Phase 5 complete]
```

### Planned modules (not yet built)

```
src/modules/audit/          — Phase 6
src/modules/notification/   — Phase 9
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

### audit_logs
- **Fields**: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at
- **PK**: id
- **FKs**: performed_by → employees.id
- **Indexes**: (entity_type, entity_id), performed_by, action, performed_at

### notifications
- **Fields**: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at
- **PK**: id
- **FKs**: recipient_id → employees.id
- **Indexes**: recipient_id, status, (recipient_id, status), (related_entity_type, related_entity_id)

## Module Boundaries

- **shared-types** (`src/shared/types/`): Enums (LeaveType, LeaveStatus, AuditAction) and DTOs. [Phase 1 complete]
- **employee** (`src/modules/employee/`): Employee entity, IEmployeeRepository, EmployeeRepository. [Phase 2 complete]
- **leave-policy** (`src/modules/leave-policy/`): LeaveType entity, LeavePolicy entity, ILeavePolicyRepository, LeavePolicyRepository. [Phase 3 complete]
- **leave-balance** (`src/modules/leave-balance/`): LeaveBalance entity, ILeaveBalanceRepository, LeaveBalanceRepository. [Phase 4 complete]
- **leave-request** (`src/modules/leave-request/`): LeaveRequest entity, ILeaveRequestRepository, LeaveRequestRepository. [Phase 5 complete]
- **audit** (`src/modules/audit/`): AuditRecord entity, IAuditRepository, IAuditService, AuditService.
- **notification** (`src/modules/notification/`): INotificationService, NotificationService.

## Dependency Map

- leave-request → shared-types, leave-balance, leave-policy, employee, audit, notification
- leave-balance → shared-types, leave-policy, audit
- leave-policy → shared-types
- employee → shared-types
- audit → shared-types
- notification → shared-types, employee

## Recommended Implementation Phases

1. **Shared types and audit foundation** (8 files): Enums, DTOs, audit module.
2. **Employee and leave-policy modules** (12 files): Manager lookup, policy rules.
3. **Leave-balance module** (8 files): Balance tracking, deduct/restore.
4. **Notification module** (4 files): Alerts on submit/approve/reject.
5. **Leave-request orchestration and API surface** (10 files): Fastify routes, full workflow orchestration.

## Open Questions

- Fiscal year definition (calendar vs custom)
- Day counting method (calendar vs business days)
- Half-day leave support
- Balance initialization strategy (pre-seed vs lazy)
<!-- gestalt:architecture feature=e207b7c2-5967-4897-aeeb-2fac2e370ce3 END -->
