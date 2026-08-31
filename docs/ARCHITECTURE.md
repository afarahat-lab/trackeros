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
src/modules/LeaveStatus/    — LeaveStatus module
src/modules/BaseEntity/    — BaseEntity module
src/modules/LeaveRequest/    — LeaveRequest module
src/modules/LeaveType/    — LeaveType module
src/modules/LeavePolicy/    — LeavePolicy module
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

<!-- gestalt:architecture feature=b07feb33-7931-41ca-b4f7-c3dc02411147 START -->
## Leave Management Module — Reconciled Architecture

### Stack compliance
TypeScript, Fastify, PostgreSQL, modular monolith. All repository implementations use PostgreSQL via the shared `pg` Pool (`src/shared/db/connection.ts`).

### Canonical decisions
- Balance entity: `LeaveBalance` (not `Balance`).
- Leave request status enum: `LeaveStatus` with values `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED` (domain lifecycle; `PENDING` is not used).
- Audit entity: `AuditLog` (not `AuditRecord`/`Audit`), table `audit_logs`, repository `AuditLogRepository`/`PgAuditLogRepository`.
- Repository interfaces: `LeaveRequestRepository`, `LeaveBalanceRepository`, `EmployeeRepository`, `LeavePolicyRepository`, `AuditLogRepository`, `NotificationRepository`; concrete PostgreSQL implementations prefixed `Pg`.
- Table names are snake_case; domain entity attributes are camelCase.
- `leave_requests.leave_type_id` is a string enum value (`LeaveType`), not a foreign key to `leave_policies`; the governing policy is resolved by `leave_type` + `is_active`.

### Domain entities and lifecycle states
- `LeaveRequest`: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
- `LeaveBalance`: `ACTIVE`, `CLOSED`
- `Employee`: `ACTIVE`, `INACTIVE`, `TERMINATED`
- `LeavePolicy`: `ACTIVE`, `INACTIVE`
- `Notification`: `PENDING`, `SENT`, `READ`, `ARCHIVED`
- `AuditLog`: no lifecycle states
- `LeaveType`: enum (`annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`)

### Business rules (binding)
- Leave duration is inclusive calendar days: `endDate - startDate + 1`.
- A leave request is valid only when `startDate <= endDate`.
- Approving a leave request deducts its inclusive day count from `LeaveBalance.usedDays` and `remainingDays` atomically with the status change, audit record, and notification.
- A leave request cannot be approved if the requested inclusive day count exceeds `remainingDays` for the applicable policy and fiscal year.
- Only the employee's manager (`Employee.managerId`) may approve or reject a leave request.
- Cancelling an `APPROVED` leave request restores the previously deducted days.
- Every state-changing operation on a leave domain entity writes an `AuditLog` record (GP-002).
- A leave request may only be submitted by an employee whose `employmentStatus` is `ACTIVE`.
- A leave request may only reference a `LeavePolicy` whose `isActive` is `true`.

### Conceptual tables
- `leave_requests`: id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at. PK id. FKs employee_id -> employees.id, approved_by -> employees.id. Indexes: employee_id, status, start_date, leave_type_id.
- `leave_balances`: id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at. PK id. FKs employee_id -> employees.id, policy_id -> leave_policies.id. Indexes: employee_id, policy_id, fiscal_year, unique (employee_id, policy_id, fiscal_year).
- `employees`: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at. PK id. FK manager_id -> employees.id. Indexes: manager_id, unique email, unique employee_number.
- `leave_policies`: id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at. PK id. Indexes: leave_type, is_active.
- `audit_logs`: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at. PK id. FK performed_by -> employees.id. Indexes: (entity_type, entity_id), performed_at.
- `notifications`: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at. PK id. FK recipient_id -> employees.id. Indexes: recipient_id, status.

### Modules and dependencies
- `shared-types` (`src/shared/types/`): cross-module enums and shared DTOs.
- `shared-db` (`src/shared/db/`): `IUnitOfWork`, `UnitOfWork`, connection pool.
- `leave` (`src/modules/leave/`): orchestrates approval flow; depends on balance, notification, audit, employee, policy, shared-types, shared-db.
- `balance` (`src/modules/balance/`): balance arithmetic; depends on audit, shared-types, shared-db.
- `employee` (`src/modules/employee/`): employee data; depends on shared-types, shared-db.
- `policy` (`src/modules/policy/`): policy rules; depends on shared-types, shared-db.
- `notification` (`src/modules/notification/`): notifications; depends on shared-types, shared-db.
- `audit` (`src/modules/audit/`): audit logging; depends on shared-types, shared-db.

### Cross-cutting contracts
- **Auth**: `request.user: { id: string; role: UserRole }` populated by a JWT bearer auth middleware (Fastify preHandler). `UserRole = 'employee' | 'manager' | 'hr_admin'`. RBAC enforced by route-level `requireRole(...)` guard: create/cancel leave → employee (own resource); approve/reject → manager or hr_admin; balance/policy/audit reads → employee (own) or hr_admin.
- **Transaction**: The leave approval flow is a multi-step atomic write: update `leave_requests.status` to `APPROVED`, deduct `used_days` from `leave_balances`, write an `audit_logs` record, and create a notification. Repository methods that must join a caller's transaction take an optional client/executor parameter (defaulting to the shared `pg` Pool when omitted). The service owns the unit of work: it acquires a client from the pool, issues `BEGIN`, passes that client to each repository call (`LeaveRequestRepository.updateStatus`, `LeaveBalanceRepository.deduct`, `AuditLogRepository.create`, `NotificationRepository.create`), then `COMMIT` on success or `ROLLBACK` on any failure.
- **Error response**: Standard error shape `{ error: string; code: string }`. Validation failure → HTTP 400 (`VALIDATION_ERROR`); authentication failure → 401 (`UNAUTHORIZED`); authorization failure → 403 (`FORBIDDEN`); not found → 404 (`NOT_FOUND`). All async errors caught and mapped (GP-006); no unhandled rejections.

### Recommended phases
1. **Shared foundations (types + unit of work)** — establish shared enums/DTOs and `IUnitOfWork`; resolves `LeaveStatus` enum conflict. (4 files)
2. **Leaf modules: employee, policy, audit** — innermost domain modules with no cross-module service deps. (15 files)
3. **balance and notification** — balance depends on audit; both are prerequisites for leave orchestration. (10 files)
4. **leave orchestration module** — composes balance, notification, audit, employee, and policy inside a single `IUnitOfWork` transaction. (6 files)

### Open questions
See the reconciled `openQuestions` list for unresolved foundational semantics (partial-day granularity, remaining_days bounding, shared-types surface, PLAN.md drift).
<!-- gestalt:architecture feature=b07feb33-7931-41ca-b4f7-c3dc02411147 END -->
