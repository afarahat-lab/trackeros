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
src/modules/notification/notification.{model,repository,service}.ts   — entity + repository + service (no service interface, no errors.ts, no index.ts)
src/modules/auth/{authenticated-user,auth.middleware,auth.errors,local-users,rbac,fastify.d.ts}.ts + index.ts   — JWT auth middleware + route-level RBAC guard
src/modules/leave/leave.{model,repository}.ts + index.ts   — entity + repository (no service, no controller, no routes yet)
src/shared/types/leave.types.ts + index.ts   — enums, DTOs, ValidationResult
src/shared/db/connection.ts + unit-of-work.ts + index.ts   — pg Pool, IUnitOfWork
src/shared/leave/day-count.ts + index.ts   — inclusive day-count helper
```

The leave module is partially built: the domain model and repository are
committed (Phase 8a); the service, controller and routes are still pending
(Phases 8b/9).

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

## Notification module — implemented (Phase 6)

The notification module implements the `INotificationRepository` /
`NotificationRepository` contract from the reconciled architecture above, plus
the `NotificationService` facade (added in a later phase). It ships the
entity, the repository and the service — no service interface, no `errors.ts`,
and no `index.ts` public entry point.

- `notification.model.ts` — `Notification` entity plus
  `CreateNotificationInput` payload. `id`/`createdAt` are generated by the
  repository; `status` defaults to `PENDING` and `readAt` is null until
  `markRead` is called. `relatedEntityType` and `relatedEntityId` are
  optional in the input but must be provided together (or both omitted) —
  the repository rejects a mismatched pair with `INVALID_NOTIFICATION`.
- `notification.repository.ts` — `INotificationRepository` interface and
  `NotificationRepository` using raw `pg` parameterized SQL against the
  shared pool. Write methods (`create`, `updateStatus`, `markRead`) take an
  optional `PoolClient` as their last parameter to join a caller's
  transaction; read methods (`findByRecipient`, `findByEntity`) always use
  the shared pool. `updateStatus` and `markRead` throw
  `NotificationNotFoundError` (code `NOTIFICATION_NOT_FOUND`) when no row
  matches; `markRead` sets `status = READ` and stamps `read_at`. The
  `NotificationNotFoundError` class is declared in the repository file (not a
  separate `errors.ts`), extending `RepositoryError` imported from the
  employee module's public entry point.
- `notification.service.ts` — `NotificationService`, a thin delegating facade
  over the repository exposing exactly five methods (`create`,
  `findByRecipient`, `findByEntity`, `updateStatus`, `markRead`). The
  repository is injectable (defaults to `NotificationRepository`). Write
  methods forward the optional `PoolClient` as their last parameter; read
  methods pass no client. The service adds no business logic, no validation,
  no audit writes, and no transaction orchestration of its own — repository
  errors (e.g. `NotificationNotFoundError`, `INVALID_NOTIFICATION`) propagate
  unchanged. No background fanout (no BullMQ/queue).

Note: the plan (Phase 6) listed three files (model/repository/service) and a
`NotificationService`; the implementation ships the model and repository
first, then the service in a later phase. Unlike the audit/employee/policy/
balance modules, the notification module has no service interface, no
`errors.ts`, and no `index.ts` — the `NotificationNotFoundError` lives in the
repository file, and the module currently has no public entry point, so other
modules cannot yet import from it via `index.ts`.

## Auth module — implemented (Phase 7)

The auth module implements the JWT auth middleware and the route-level RBAC
guard from the reconciled architecture above. It ships the middleware, the
RBAC helpers, the principal type, the seeded local identities, the error type,
the Fastify request augmentation and a public entry point.

- `authenticated-user.ts` — `AuthenticatedUser` interface
  (`{ id: string; role: UserRole }`), the principal populated onto
  `request.user` after successful JWT verification; plus `isUserRole`, a type
  guard narrowing a decoded JWT `role` claim to the `UserRole` enum (so a
  token can never grant a role outside `employee | manager | hr_admin`).
- `auth.middleware.ts` — `authenticate`, a Fastify `preHandler` hook that
  verifies a bearer JWT and populates `request.user`. On any failure it sends
  `401` with the `{ error, code }` shape and leaves `request.user` unset.
  Reads the secret from `process.env.JWT_SECRET` and fails closed
  (`AUTH_NOT_CONFIGURED`) when unset — never a hardcoded fallback. Distinguishes
  `TOKEN_EXPIRED` from `INVALID_TOKEN`; rejects tokens whose subject is not a
  seeded local user or whose role is not a valid `UserRole`. Only this hook
  sets `request.user`; handlers must never assign it.
- `local-users.ts` — `LocalUser` interface and `LOCAL_USERS`, the seeded
  development identities (two employees, one manager, one hr_admin) with no
  credentials; `findLocalUserById` is the lookup the middleware uses to
  validate the token subject.
- `rbac.ts` — `hasRole` (role-rank comparison: manager inherits employee,
  hr_admin supersedes both), `isOwnResource` (principal id equals the
  resource's `employeeId`), `isSubordinate` (applicant reports directly to the
  manager AND is not the manager themself — self-approval always denied), and
  `requireRole(required)`, a route-level guard returning a `preHandler` that
  rejects with `403` / `FORBIDDEN`. RBAC is enforced at the route boundary
  only, never inline in a service.
- `auth.errors.ts` — `AuthenticationError` carrying a stable machine `code`
  surfaced in the `{ error, code }` response body.
- `fastify.d.ts` — module augmentation adding `user?: AuthenticatedUser` to
  `FastifyRequest`.
- `index.ts` — public entry point exporting the principal type, the
  middleware, the RBAC helpers and the local-user lookup.

RBAC matrix (as implemented): employee acts on OWN resources; manager inherits
employee permissions and additionally approves/rejects subordinates' requests
(never their own); hr_admin acts on ALL. Ownership is
`principal.id === resource.employeeId`; subordination is
`applicant.managerId === manager.id && applicant.id !== manager.id`, with the
applicant's `managerId` read via the employee module (never a direct
employees-table query from the leave module).

Note: the plan (Phase 7) named only two files (`auth.middleware.ts`,
`rbac.ts`); the implementation additionally ships `authenticated-user.ts`,
`local-users.ts`, `auth.errors.ts`, `fastify.d.ts` and `index.ts`. The
"RBAC authorization matrix" and "local dev auth strategy" open questions from
the reconciled architecture are now resolved by this module: local dev auth
uses seeded `LOCAL_USERS` (no mock OIDC provider), and the role matrix is the
own/subordinate/all hierarchy above.

## Leave module — implemented (Phase 8a)

The leave module is the first half of the leave domain: the `LeaveRequest`
entity and the `ILeaveRequestRepository` / `LeaveRequestRepository` contract
from the reconciled architecture above. The service, controller and routes
are still pending (Phases 8b/9).

- `leave.model.ts` — `LeaveRequest` entity with exactly the canonical fields
  (`id`, `employeeId`, `leaveType`, `startDate`, `endDate`, `reason`,
  `status`, `approvedBy`, `approvedAt`, `createdAt`, `updatedAt`).
  `leaveType`/`status` are typed with the `LeaveType`/`LeaveStatus` enums
  imported from `src/shared/types` (not re-declared). `reason` is
  `string | undefined`; `approvedBy`/`approvedAt` are `string | null` /
  `Date | null`. `id`, `status`, `approvedBy`, `approvedAt`, `createdAt` and
  `updatedAt` are generated by the repository and never caller-supplied on
  create. The doc comment records the lifecycle (PENDING immediately, no
  DRAFT/SUBMITTED; PENDING→APPROVED|REJECTED; PENDING→CANCELLED owner-only;
  terminal states) and notes that the repository persists transitions but
  does not enforce their legality (the service owns that).
- `leave.repository.ts` — `ILeaveRequestRepository` interface and
  `LeaveRequestRepository` using raw `pg` parameterized SQL against the
  shared pool. Write methods (`create`, `update`, `updateStatus`, `delete`)
  take an optional `PoolClient` as their last parameter to join a caller's
  transaction; read methods (`findById`, `findByEmployee`, `findByStatus`,
  `findByQuery`) always use the shared pool. `create` defaults `status` to
  `PENDING` and `approvedBy`/`approvedAt` to null, generates `id` via
  `randomUUID`, and stamps `createdAt`/`updatedAt` with `new Date()`.
  `update` builds a dynamic SET clause from only the supplied fields
  (`startDate`, `endDate`, `reason`) and always sets `updated_at`, throwing
  `LeaveNotFoundError` when no row matches. `updateStatus` persists the new
  status and, for the terminal `APPROVED`/`REJECTED` states, stamps
  `approvedBy` (from the optional argument, else null) and `approvedAt`
  (`new Date()`); for non-terminal states both are set to null. `delete`
  removes the row and throws `LeaveNotFoundError` when no row matches.
  `findByQuery` builds a dynamic WHERE from the supplied criteria
  (`status`, `leaveType`, `startDateFrom`/`startDateTo`,
  `endDateFrom`/`endDateTo`) plus `limit`/`offset`, all parameterized.
  Unique-constraint violations (pg code `23505`) are detected via an
  `isPgError`/`isPgUniqueViolation` guard (unknown + type guards, no `any`)
  and mapped to `UniqueConstraintError` (code `DUPLICATE_LEAVE_REQUEST`).
  `LeaveNotFoundError` (code `LEAVE_NOT_FOUND`) extends `RepositoryError`
  imported from the employee module's public entry point; the shared
  `RepositoryError`/`UniqueConstraintError` are likewise imported, not
  re-declared.
- `index.ts` — public entry point exporting the `LeaveRequest` type, the
  repository (class + interface) and `LeaveNotFoundError`.

Note: the phase spec's constraint "no module index.ts" was not followed — the
implementation ships `index.ts` (public entry point), matching the
audit/employee/policy/balance/auth modules and the project's dependency rule
that modules import from each other only through their public entry point.
The spec also listed `findById`/`findByEmployee`/`findByStatus` among the
"write methods" accepting an optional `PoolClient`; the implementation treats
those as read methods (shared pool only), consistent with every sibling
repository. The repository exposes the full `ILeaveRequestRepository` surface
(create, findById, findByEmployee, findByStatus, findByQuery, update,
updateStatus, delete) from the reconciled architecture; business-rule
enforcement (startDate<=endDate, active-policy check, balance deduction,
audit writes, RBAC) is explicitly out of scope here and owned by the
service/controller phases.
