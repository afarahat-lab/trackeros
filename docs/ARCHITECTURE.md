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

Implemented so far (committed):

```
src/modules/audit/audit.{model,repository,service,service.interface}.ts + index.ts
src/modules/employee/employee.{model,repository,service,service.interface,errors}.ts + index.ts
src/modules/policy/policy.{model,repository,service,service.interface,errors}.ts + index.ts
src/modules/balance/balance.{model,repository,service,service.interface,errors}.ts + index.ts
src/modules/status/status.{model,service,service.interface}.ts + index.ts
src/modules/uptime/uptime.{model,routes,service,service.interface}.ts + index.ts
src/shared/types/leave.types.ts + index.ts   — enums, DTOs, ValidationResult
src/shared/db/connection.ts + unit-of-work.ts + index.ts   — pg Pool, IUnitOfWork
src/shared/leave/day-count.ts + index.ts   — inclusive day-count helper
```

Remaining domain modules (leave, notification, auth)
are planned per the reconciled architecture below and not yet built.

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
- Corrections applied: use Fastify only (no express); use raw `pg` parameterized SQL (`Pool`/`PoolClient`) for repository queries (no Knex in queries); use Fastify JSON schema validation for API-boundary input validation; prune class-validator/zod/express dependencies.

### Canonical names
- Entity/table names: Employee/employees, LeaveRequest/leave_requests, LeaveBalance/leave_balances, LeavePolicy/leave_policies, Notification/notifications, AuditLog/audit_logs.
- Repository interfaces: ILeaveRequestRepository, ILeaveBalanceRepository, ILeavePolicyRepository, IEmployeeRepository, INotificationRepository, IAuditLogRepository.
- Concrete repositories: LeaveRequestRepository, LeaveBalanceRepository, LeavePolicyRepository, EmployeeRepository, NotificationRepository, AuditLogRepository (all PostgreSQL via raw `pg`).
- Services: LeaveService, LeaveBalanceService, LeavePolicyService, EmployeeService, NotificationService, AuditService.
- Enums: LeaveType = annual | sick | emergency | unpaid | maternity | paternity; LeaveStatus = PENDING | APPROVED | REJECTED | CANCELLED; EmploymentStatus = ACTIVE | INACTIVE | TERMINATED; NotificationStatus = PENDING | SENT | READ | ARCHIVED; AuditAction = CREATE | UPDATE | DELETE | APPROVE | REJECT; UserRole = employee | manager | hr_admin.

### Domain entities and lifecycle states
- Employee: ACTIVE, INACTIVE, TERMINATED.
- LeaveRequest: PENDING, APPROVED, REJECTED, CANCELLED. State machine: PENDING→(APPROVED|REJECTED); PENDING→CANCELLED (owner only); APPROVED/REJECTED/CANCELLED are terminal. Requests are created as PENDING immediately — there is no DRAFT/SUBMITTED state.
- LeaveBalance: ACTIVE, CLOSED.
- LeavePolicy: ACTIVE, INACTIVE.
- Notification: PENDING, SENT, READ, ARCHIVED.
- AuditLog: no lifecycle states (immutable).
- LeaveType: enum, no lifecycle states.

### Binding business rules
- startDate <= endDate; invalid otherwise.
- Only the applicant's manager (Employee referenced by managerId) may approve/reject; approver must not be the applicant.
- LeaveRequest may only transition to APPROVED/REJECTED from PENDING; PENDING may be CANCELLED by owner; APPROVED/REJECTED/CANCELLED are terminal.
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
All concrete repositories use PostgreSQL via raw `pg` parameterized SQL.

### Module boundaries
- shared-types: enums, DTOs, ValidationResult, UserRole.
- shared-db: IUnitOfWork, `pg` Pool instance, connection pool, base repository helpers.
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
- Transaction: service owns unit of work; `IUnitOfWork` exposes `begin()` / `commit()` / `rollback()` plus an optional `client?: PoolClient` acquired from the shared pool — it is the only place issuing BEGIN/COMMIT/ROLLBACK; repository methods that join a caller's transaction take an optional `PoolClient` as last parameter (default shared pool); approve/reject flow (status update + balance commit + audit record) must be atomic.

### Day-count derivation (resolved in Phase 1)
- `countLeaveDays(startDate, endDate)` in `src/shared/leave/day-count.ts` is the single shared pure helper: `days = (endDate - startDate) + 1`, inclusive, no weekend/holiday exclusion. Dates are normalized to UTC calendar days so the result is a whole number independent of time-of-day and DST. The same count is used for both the balance-sufficiency check and the balance deduction.

### Open questions
See openQuestions list for unresolved foundational semantics: fiscal-year boundary handling, RBAC authorization matrix, balance rounding/bounds, background jobs, and local dev auth strategy.
<!-- gestalt:architecture feature=f5a0dfb3-f8f1-4335-94b2-5d8d22cf459f END -->

## Audit module — implemented (Phase 2)

The audit module is the first domain module committed. It implements the
`IAuditLogRepository` / `AuditLogRepository` and `IAuditService` /
`AuditService` contracts from the reconciled architecture above.

- `audit.model.ts` — `AuditLog` entity (immutable, no lifecycle states) and
  `AuditLogInput` (the caller-supplied payload; `id`/`createdAt`/`updatedAt`
  are generated by the repository, `performedAt` defaults to now).
- `audit.repository.ts` — `IAuditLogRepository` interface and
  `AuditLogRepository` using raw `pg` parameterized SQL against the shared
  pool. `record` takes an optional `PoolClient` as its last parameter to join
  a caller's transaction; read methods (`findByEntity`, `findByActor`,
  `findByTimeRange`) always use the shared pool. `old_values`/`new_values`
  are stored as `jsonb`.
- `audit.service.interface.ts` — `IAuditService` (record + the three finders).
- `audit.service.ts` — `AuditService`, a thin delegating facade over the
  repository; the repository is injectable (defaults to `AuditLogRepository`).
- `index.ts` — public entry point exporting the entity/input types, the
  repository (class + interface) and the service (class + interface).

Note: the plan named the service interface `AuditServiceInterface`; the
implementation names it `IAuditService` (matching the `I*Repository`
convention) and splits it into its own `audit.service.interface.ts` file.

## Employee module — implemented (Phase 3)

The employee module implements the `IEmployeeRepository` /
`EmployeeRepository` and `IEmployeeService` / `EmployeeService` contracts
from the reconciled architecture above.

- `employee.model.ts` — `Employee` entity plus `CreateEmployeeInput` and
  `UpdateEmployeeInput` payloads. `id`/`createdAt`/`updatedAt`/`deletedAt`
  are generated by the repository; `terminationDate` is null while the
  employee is not terminated; `employmentStatus` defaults to ACTIVE on
  create.
- `employee.repository.ts` — `IEmployeeRepository` interface and
  `EmployeeRepository` using raw `pg` parameterized SQL against the shared
  pool. Write methods (`create`, `update`, `softDelete`) take an optional
  `PoolClient` as their last parameter to join a caller's transaction; read
  methods (`findById`, `findByEmployeeNumber`, `findByEmail`,
  `findByManager`) always use the shared pool. `softDelete` sets `deleted_at`
  (soft delete); all reads filter `deleted_at IS NULL`. Unique-constraint
  violations (pg code `23505`) on `employee_number`/`email` are mapped to
  `UniqueConstraintError`.
- `employee.errors.ts` — `RepositoryError` base class plus
  `UniqueConstraintError` (takes a caller-supplied `code`; the employee
  repository passes `DUPLICATE_EMPLOYEE`) and `EmployeeNotFoundError` (code
  `EMPLOYEE_NOT_FOUND`). The `RepositoryError`/`UniqueConstraintError` pair
  is reused by the policy module, which passes `DUPLICATE_POLICY`.
- `employee.service.interface.ts` — `IEmployeeService`.
- `employee.service.ts` — `EmployeeService`, a thin delegating facade over
  the repository; the repository is injectable (defaults to
  `EmployeeRepository`).
- `index.ts` — public entry point exporting the entity/input types, the
  repository (class + interface), the service (class + interface) and the
  error types.

Note: the plan named the service interface `EmployeeServiceInterface`; the
implementation names it `IEmployeeService` (matching the `I*Repository`
convention) and splits it into its own `employee.service.interface.ts` file,
mirroring the audit module. The plan also listed only three files
(model/repository/service); the implementation additionally ships
`employee.errors.ts` (typed repository errors with stable machine codes) and
`index.ts` (public entry point).

## Policy module — implemented (Phase 4)

The policy module implements the `ILeavePolicyRepository` /
`LeavePolicyRepository` and `ILeavePolicyService` / `LeavePolicyService`
contracts from the reconciled architecture above.

- `policy.model.ts` — `LeavePolicy` entity plus `CreateLeavePolicyInput` and
  `UpdateLeavePolicyInput` payloads. `id`/`createdAt`/`updatedAt` are
  generated by the repository and never caller-supplied. Lifecycle state is
  expressed via the boolean `isActive` (ACTIVE / INACTIVE); there is no soft
  delete for policies. Optional numeric fields (`accrualRate`,
  `maxAccumulation`, `minimumNoticeDays`) map to NULL when omitted;
  `requiresManagerApproval` defaults to false and `isActive` defaults to true
  on create.
- `policy.repository.ts` — `ILeavePolicyRepository` interface and
  `LeavePolicyRepository` using raw `pg` parameterized SQL against the shared
  pool. Write methods (`create`, `update`) take an optional `PoolClient` as
  their last parameter to join a caller's transaction; read methods
  (`findById`, `findByLeaveType`, `findActive`) always use the shared pool.
  `update` builds a dynamic SET clause from only the supplied fields and
  throws `PolicyNotFoundError` when no row matches. Unique-constraint
  violations (pg code `23505`) are mapped to `UniqueConstraintError`.
- `policy.errors.ts` — `PolicyNotFoundError` (code `POLICY_NOT_FOUND`),
  extending the imported `RepositoryError`. The base `RepositoryError` and the
  shared `UniqueConstraintError` (code `DUPLICATE_POLICY`) are imported from
  the employee module's public entry point, not re-declared locally.
- `policy.service.interface.ts` — `ILeavePolicyService`.
- `policy.service.ts` — `LeavePolicyService`, a thin delegating facade over
  the repository; the repository is injectable (defaults to
  `LeavePolicyRepository`).
- `index.ts` — public entry point exporting the entity/input types, the
  repository (class + interface), the service (class + interface) and the
  error types.

Note: the plan named the service interface `LeavePolicyServiceInterface`; the
implementation names it `ILeavePolicyService` (matching the `I*Repository`
convention) and splits it into its own `policy.service.interface.ts` file,
mirroring the audit and employee modules. The plan also listed only three
files (model/repository/service); the implementation additionally ships
`policy.errors.ts` (typed repository errors with stable machine codes) and
`index.ts` (public entry point).

## Balance module — implemented (Phase 5)

The balance module implements the `ILeaveBalanceRepository` /
`LeaveBalanceRepository` and `ILeaveBalanceService` / `LeaveBalanceService`
contracts from the reconciled architecture above.

- `balance.model.ts` — `LeaveBalance` entity plus `CreateLeaveBalanceInput`
  and `UpdateLeaveBalanceInput` payloads. `id`/`createdAt`/`updatedAt` are
  generated by the repository and never caller-supplied. `usedDays` and
  `remainingDays` are non-negative integers with no rounding, and
  `remainingDays` is always `totalEntitlement - usedDays`. `status` is a
  plain string restricted to `'ACTIVE' | 'CLOSED'` (typed as
  `LeaveBalanceStatus`, not a TS enum); it defaults to `'ACTIVE'` on create.
  A balance is uniquely identified by `(employeeId, policyId, fiscalYear)`.
- `balance.repository.ts` — `ILeaveBalanceRepository` interface and
  `LeaveBalanceRepository` using raw `pg` parameterized SQL against the shared
  pool. Write methods (`create`, `update`, `commitDays`) take an optional
  `PoolClient` as their last parameter to join a caller's transaction; read
  methods (`findById`, `findByEmployee`, `findByEmployeeAndPolicy`,
  `findByEmployeeAndFiscalYear`) always use the shared pool. `update` builds a
  dynamic SET clause from only the supplied fields and throws
  `BalanceNotFoundError` when no row matches. `commitDays` atomically
  increments `used_days` and decrements `remaining_days` by the same integer
  amount, guarded by `remaining_days >= $4` so it rejects (never clamps) any
  commit that would drive `remainingDays` below zero — throwing
  `InsufficientBalanceError` when the guard fails and `BalanceNotFoundError`
  when no matching row exists. Unique-constraint violations (pg code `23505`)
  on `(employee_id, policy_id, fiscal_year)` are mapped to
  `UniqueConstraintError` (code `DUPLICATE_BALANCE`).
- `balance.errors.ts` — `BalanceNotFoundError` (code `BALANCE_NOT_FOUND`) and
  `InsufficientBalanceError` (code `INSUFFICIENT_BALANCE`), both extending the
  imported `RepositoryError`. The base `RepositoryError` and the shared
  `UniqueConstraintError` are imported from the employee module's public entry
  point, not re-declared locally.
- `balance.service.interface.ts` — `ILeaveBalanceService`.
- `balance.service.ts` — `LeaveBalanceService`, a thin delegating facade over
  the repository; the repository is injectable (defaults to
  `LeaveBalanceRepository`).
- `index.ts` — public entry point exporting the entity/input types, the
  repository (class + interface), the service (class + interface) and the
  error types.

Note: the plan named the service interface `LeaveBalanceServiceInterface`; the
implementation names it `ILeaveBalanceService` (matching the `I*Repository`
convention) and splits it into its own `balance.service.interface.ts` file,
mirroring the audit, employee and policy modules. The plan also listed only
three files (model/repository/service); the implementation additionally ships
`balance.errors.ts` (typed repository errors with stable machine codes) and
`index.ts` (public entry point). The phase spec's constraint that the balance
module add "only `BalanceNotFoundError` locally" was not followed literally —
the implementation also adds `InsufficientBalanceError` (code
`INSUFFICIENT_BALANCE`) to distinguish the "no matching row" case from the
"insufficient remaining days" case in `commitDays`. The spec's mention of an
`IUnitOfWork` with `withTransaction(fn)` was likewise not adopted; the balance
service follows the established optional-`PoolClient` pattern used by the
audit, employee and policy modules, leaving transaction orchestration to the
future leave service.
