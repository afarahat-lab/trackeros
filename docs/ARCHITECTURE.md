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

## Module structure

```
src/modules/leave/leave.{model,repository,service,controller,routes}.ts
src/modules/balance/balance.{model,repository,service,controller,routes}.ts
src/modules/employee/employee.{model,repository,service,controller,routes}.ts
src/modules/policy/policy.{model,repository,service,controller,routes}.ts
src/modules/notification/notification.{model,repository,service,controller,routes}.ts
src/modules/leave-policy/    — LeavePolicy module (model, repository)
src/modules/LeaveStatus/    — LeaveStatus module
src/modules/BaseEntity/    — BaseEntity module
src/modules/LeaveRequest/    — LeaveRequest module
src/modules/LeaveType/    — LeaveType module
src/modules/AuditLog/    — AuditLog module
src/modules/AuditRecord/    — AuditRecord module
src/modules/AuditServiceInterface/    — AuditServiceInterface module
src/shared/db connection.ts
src/shared/base repository.ts
src/shared/error types.ts
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=219727ae-a952-461a-b605-c6d40c0c1e42 START -->
# Leave Management Module — Reconciled Architecture

## Domain Entities

### LeaveRequest
- **Attributes**: id, employeeId, leaveTypeId, leavePolicyId, startDate, endDate, daysCount, reason, status (LeaveRequestStatus), approvedBy, approvedAt, cancelledBy, cancelledAt, createdAt, updatedAt
- **Lifecycle**: DRAFT → SUBMITTED → (APPROVED | REJECTED | CANCELLED); APPROVED → CANCELLED; DRAFT → CANCELLED
- **Purpose**: Central aggregate for leave applications. daysCount is derived from startDate/endDate per the chosen day-counting rule.

### LeaveRequestStatus
- **Values**: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- **Purpose**: Value object governing valid state transitions.

### LeavePolicy
- **Attributes**: id, policyName, leaveType (LeaveType), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt
- **Lifecycle**: ACTIVE, INACTIVE
- **Purpose**: Defines rules and entitlements for a leave type.

### LeaveType
- **Values**: annual, sick, emergency, unpaid, maternity, paternity
- **Purpose**: Enumeration of leave categories.

### Employee
- **Attributes**: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus (ACTIVE | INACTIVE | TERMINATED), createdAt, updatedAt, deletedAt
- **Lifecycle**: ACTIVE, INACTIVE, TERMINATED
- **Purpose**: Represents an employee; owns balances, submits requests, and managers approve/reject.

### LeaveBalance
- **Attributes**: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status (ACTIVE | EXHAUSTED | CLOSED), createdAt, updatedAt
- **Lifecycle**: ACTIVE → EXHAUSTED (remainingDays=0) or CLOSED (fiscal year end); EXHAUSTED → ACTIVE on cancellation reversal; CLOSED is terminal.
- **Purpose**: Tracks entitlement, consumption, and remaining balance per policy per fiscal year. Updated atomically on APPROVED and CANCELLED (from APPROVED) transitions.

### Notification
- **Attributes**: id, recipientId, type (LEAVE_SUBMITTED | LEAVE_APPROVED | LEAVE_REJECTED | LEAVE_CANCELLED), title, message, relatedEntityType, relatedEntityId, status (PENDING | SENT | READ | ARCHIVED), createdAt, readAt
- **Lifecycle**: PENDING → SENT → READ → ARCHIVED
- **Purpose**: Notifies employees/managers of leave events.

### AuditLog
- **Attributes**: id, entityType, entityId, action, oldValues, newValues, performedBy, performedAt, ipAddress, userAgent, createdAt
- **Purpose**: Immutable record of every LeaveRequest state transition.

## Conceptual Tables

### employees
- **Fields**: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at
- **PK**: id
- **FKs**: manager_id → employees.id
- **Indexes**: email (unique), employee_number (unique), manager_id, department, employment_status

### leave_types
- **Fields**: id, code, name, description, is_active, created_at, updated_at
- **PK**: id
- **Indexes**: code (unique), is_active

### leave_policies
- **Fields**: id, policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at
- **PK**: id
- **FKs**: leave_type_id → leave_types.id
- **Indexes**: leave_type_id, is_active, (leave_type_id, is_active)

### leave_requests
- **Fields**: id, employee_id, leave_type_id, leave_policy_id, start_date, end_date, days_count, reason, status, approved_by, approved_at, cancelled_by, cancelled_at, created_at, updated_at
- **PK**: id
- **FKs**: employee_id → employees.id, leave_type_id → leave_types.id, leave_policy_id → leave_policies.id, approved_by → employees.id
- **Indexes**: employee_id, status, leave_type_id, (employee_id, status), (status, employee_id), start_date, end_date

### leave_balances
- **Fields**: id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at
- **PK**: id
- **FKs**: employee_id → employees.id, leave_policy_id → leave_policies.id
- **Indexes**: employee_id, (employee_id, fiscal_year), leave_policy_id, unique (employee_id, leave_policy_id, fiscal_year)

### audit_logs
- **Fields**: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at
- **PK**: id
- **Indexes**: (entity_type, entity_id), performed_by, performed_at, action

### notifications
- **Fields**: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at
- **PK**: id
- **FKs**: recipient_id → employees.id
- **Indexes**: recipient_id, status, (recipient_id, status), (related_entity_type, related_entity_id)

## Module Boundaries

| Module | Path | Owns |
|--------|------|------|
| shared-types | src/shared/types/ | LeaveType, LeaveRequestStatus, UserRole enums |
| employee | src/modules/employee/ | Employee entity, IEmployeeRepository, PgEmployeeRepository, IEmployeeService, EmployeeService |
| leave-policy | src/modules/leave-policy/ | LeavePolicy entity, ILeavePolicyRepository, PgLeavePolicyRepository, ILeavePolicyService, LeavePolicyService |
| leave-balance | src/modules/leave-balance/ | LeaveBalance entity, ILeaveBalanceRepository, PgLeaveBalanceRepository, ILeaveBalanceService, LeaveBalanceService |
| leave-request | src/modules/leave-request/ | LeaveRequest entity, ILeaveRequestRepository, PgLeaveRequestRepository, ILeaveRequestService, LeaveRequestService |
| audit | src/modules/audit/ | AuditLog entity, IAuditLogRepository, PgAuditLogRepository, IAuditService, AuditService |
| notification | src/modules/notification/ | Notification entity, INotificationRepository, PgNotificationRepository, INotificationService, NotificationService |

## Dependency Map

- leave-request → leave-balance, leave-policy, audit, notification, employee, shared-types
- leave-balance → leave-policy, audit, employee, shared-types
- leave-policy → shared-types
- audit → shared-types
- notification → shared-types
- employee → shared-types

## Recommended Implementation Phases

1. **Shared types + Employee foundation** — Zero-dependency enums and employee data access.
2. **Audit + Notification cross-cutting modules** — Required by all state-changing operations.
3. **Leave Policy module** — Defines entitlement rules consumed by balance and request modules.
4. **Leave Balance module** — Owns balance lifecycle; deduct on approval, restore on cancellation.
5. **Leave Request module** — Orchestrates full request lifecycle with validation, state transitions, balance updates, audit, and notifications.
6. **Routes, controllers, and RBAC wiring** — Fastify route registration, auth middleware, RBAC guards.

## Cross-Cutting Contracts

### Auth Contract
`request.user: { id: string; role: UserRole }` — UserRole = 'employee' | 'manager' | 'hr_admin'. JWT bearer token verified by auth middleware (Fastify preHandler hook) that populates request.user. RBAC enforced by requireRole(...) route-level guard, never inline. Employees submit/cancel their own requests; managers approve/reject requests for their direct reports; hr_admin can configure policies and view all balances.

### Transaction Contract
Multi-step writes (leave approval: update leave_requests.status + deduct leave_balances.used_days/remaining_days + insert audit_log; leave cancellation after approval: update leave_requests.status + restore leave_balances + insert audit_log) must be atomic. Repository methods that must join a caller's transaction accept an optional `client: PoolClient` parameter. When `client` is provided, the method uses it for all queries and does NOT release it. When omitted, the method acquires a client from the shared pool, executes, and releases it. The calling service owns the unit of work: it acquires a client from the pool, calls BEGIN, passes the client to each participating repository method, then calls COMMIT on success or ROLLBACK on error, and finally releases the client.

### Error Response Contract
Standard error shape: `{ error: string; code: string }`. Validation failure → HTTP 400 (code: VALIDATION_ERROR). Authentication failure → 401 (code: UNAUTHORIZED). Authorization failure → 403 (code: FORBIDDEN). Not found → 404 (code: NOT_FOUND). Insufficient balance → 422 (code: INSUFFICIENT_BALANCE). Policy violation (e.g. exceeds max consecutive days, insufficient notice, overlapping requests) → 422 (code: POLICY_VIOLATION).

## Open Questions

1. **Day counting**: Inclusive, exclusive, or business days? (affects daysCount, balance checks, notice period)
2. **Notice period submission date**: createdAt or SUBMITTED transition date? Calendar or business days?
3. **Overlap definition**: Are adjacent date ranges considered overlapping?
4. **Fiscal year definition**: Calendar year, custom fiscal year, or rolling 12-month?
5. **Carryover policy**: Full carryover, capped, or use-it-or-lose-it?
6. **Emergency leave accounting**: Separate pool or draws from annual/sick?
<!-- gestalt:architecture feature=219727ae-a952-461a-b605-c6d40c0c1e42 END -->
