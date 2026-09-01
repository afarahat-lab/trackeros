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

<!-- gestalt:architecture feature=f5a0dfb3-f8f1-4335-94b2-5d8d22cf459f START -->
## Leave management module — reconciled architecture (merge validation 2026-09-01)

### Stack compliance
- Language: TypeScript, Node 20, npm, Jest, Fastify, React Native, PostgreSQL, modular-monolith.
- Corrections applied: use Fastify only (no express); use Knex query builder for repository queries and migrations; use Fastify JSON schema validation for API-boundary input validation; prune class-validator/zod/express dependencies.

### Canonical names
- Entity/table names: Employee/employees, LeaveRequest/leave_requests, LeaveBalance/leave_balances, LeavePolicy/leave_policies, Notification/notifications, AuditLog/audit_logs.
- Repository interfaces: ILeaveRequestRepository, ILeaveBalanceRepository, ILeavePolicyRepository, IEmployeeRepository, INotificationRepository, IAuditLogRepository.
- Concrete repositories: LeaveRequestRepository, LeaveBalanceRepository, LeavePolicyRepository, EmployeeRepository, NotificationRepository, AuditLogRepository (all PostgreSQL via Knex).
- Services: LeaveService, LeaveBalanceService, LeavePolicyService, EmployeeService, NotificationService, AuditService.
- Enums: LeaveType = annual | sick | emergency | unpaid | maternity | paternity; LeaveStatus = DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED; EmploymentStatus = ACTIVE | INACTIVE | TERMINATED; NotificationStatus = PENDING | SENT | READ | ARCHIVED; AuditAction = CREATE | UPDATE | DELETE | APPROVE | REJECT; UserRole = employee | manager | hr_admin.

### Domain entities and lifecycle states
- Employee: ACTIVE, INACTIVE, TERMINATED.
- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. State machine: DRAFT→SUBMITTED→(APPROVED|REJECTED); SUBMITTED→CANCELLED (owner only); APPROVED/REJECTED/CANCELLED are terminal.
- LeaveBalance: ACTIVE, CLOSED.
- LeavePolicy: ACTIVE, INACTIVE.
- Notification: PENDING, SENT, READ, ARCHIVED.
- AuditLog: no lifecycle states (immutable).
- LeaveType: enum, no lifecycle states.

### Binding business rules
- startDate <= endDate; invalid otherwise.
- Only the applicant's manager (Employee referenced by managerId) may approve/reject; approver must not be the applicant.
- LeaveRequest may only transition to APPROVED/REJECTED from SUBMITTED; DRAFT must be submitted first; SUBMITTED may be CANCELLED by owner; APPROVED/REJECTED/CANCELLED are terminal.
- Approving decrements LeaveBalance.remainingDays and increments usedDays by the request's day count for the matching leaveType and fiscalYear; remainingDays must not go below zero.
- LeaveRequest may only be created against an ACTIVE LeavePolicy whose leaveType matches the request's leaveType.
- Every state-changing operation writes an AuditLog record.
- LeaveBalance.remainingDays = totalEntitlement - usedDays, always non-negative.

### Conceptual tables (no DDL)
- employees: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at. PK id. FK manager_id -> employees.id. Indexes: employee_number unique, email unique, manager_id, employment_status.
- leave_policies: id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at. PK id. Indexes: leave_type, is_active.
- leave_requests: id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at. PK id. FKs employee_id -> employees.id, approved_by -> employees.id. Indexes: employee_id, status, start_date/end_date, leave_type. Note: leave_type is the LeaveType enum value, not a FK to leave_policies.
- leave_balances: id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at. PK id. FKs employee_id -> employees.id, policy_id -> leave_policies.id. Indexes: employee_id, policy_id, fiscal_year, unique (employee_id, policy_id, fiscal_year).
- notifications: id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at. PK id. FK recipient_id -> employees.id. Indexes: recipient_id, status, related_entity_type/related_entity_id.
- audit_logs: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at. PK id. FK performed_by -> employees.id. Indexes: entity_type/entity_id, performed_by, performed_at, action.

### Repository interfaces and concrete implementations
- ILeaveRequestRepository / LeaveRequestRepository: create, findById, findByEmployee, findByStatus, findByQuery, update, updateStatus, delete.
- ILeaveBalanceRepository / LeaveBalanceRepository: findByEmployee, findByEmployeeAndPolicy, findByEmployeeAndFiscalYear, create, update, commitDays.
- ILeavePolicyRepository / LeavePolicyRepository: findById, findByLeaveType, findActive, create, update.
- IEmployeeRepository / EmployeeRepository: findById, findByEmployeeNumber, findByEmail, findByManager, create, update, softDelete.
- INotificationRepository / NotificationRepository: create, findByRecipient, findByEntity, updateStatus, markRead.
- IAuditLogRepository / AuditLogRepository: record, findByEntity, findByActor, findByTimeRange.
All concrete repositories use PostgreSQL via Knex query builder.

### Module boundaries
- shared-types: enums, DTOs, ValidationResult, UserRole.
- shared-db: IUnitOfWork, Knex instance, connection pool, base repository helpers.
- audit: AuditLog entity, AuditLogRepository, AuditService.
- employee: Employee entity, EmployeeRepository, EmployeeService.
- policy: LeavePolicy entity, LeavePolicyRepository, LeavePolicyService.
- balance: LeaveBalance entity, LeaveBalanceRepository, LeaveBalanceService.
- notification: Notification entity, NotificationRepository, NotificationService.
- auth: JWT auth middleware, requireRole RBAC guard.
- leave: LeaveRequest entity, LeaveRequestRepository, LeaveService, LeaveController, leave routes.
Dependencies flow inward only; leave depends on audit/balance/policy/employee/notification/auth and shared-types/shared-db; no cycles.

### Dependency map
- leave -> shared-types, shared-db, audit, balance, policy, employee, notification, auth.
- balance -> shared-types, shared-db.
- policy -> shared-types, shared-db.
- employee -> shared-types, shared-db.
- audit -> shared-types, shared-db.
- notification -> shared-types, shared-db.
- auth -> shared-types.

### Recommended phases
1. Shared types & data-access foundation (3 files).
2. Audit module (3 files).
3. Employee module (3 files).
4. Policy module (3 files).
5. Balance module (3 files).
6. Notification module (3 files).
7. Auth & RBAC (2 files).
8. Leave module domain + service (3 files).
9. Leave controller & routes (2 files).

### Cross-cutting contracts
- Auth: request.user = { id: string; role: UserRole }; UserRole = employee | manager | hr_admin; JWT bearer verified by auth middleware; RBAC enforced by requireRole(...) route guard, never inline.
- Error response: { error: string; code: string }; validation failure -> 400; authentication failure -> 401; authorization failure -> 403; not found -> 404.
- Transaction: service owns unit of work; IUnitOfWork.withTransaction<T>(fn: (trx: Knex.Transaction) => Promise<T>) is the only place issuing BEGIN/COMMIT/ROLLBACK; repository methods that join a caller's transaction take an optional Knex.Transaction as last parameter (default shared Knex instance); approve/reject flow (status update + balance commit + audit record) must be atomic.

### Open questions
See openQuestions list for unresolved foundational semantics: day-count derivation, fiscal-year boundary handling, RBAC authorization matrix, balance rounding/bounds, background jobs, and local dev auth strategy.
<!-- gestalt:architecture feature=f5a0dfb3-f8f1-4335-94b2-5d8d22cf459f END -->
