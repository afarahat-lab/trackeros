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
src/shared/db/connection.ts
src/shared/types/leave.types.ts
src/shared/base-repository.ts
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

<!-- gestalt:architecture feature=e52e7dc9-5a2d-453b-b5a3-9d187c6021f7 START -->
## Leave Management Module

### Domain Entities

- **LeaveRequest** — Central aggregate for leave applications. Lifecycle: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED` (terminal unless cancelled), `→ REJECTED` (terminal), `→ CANCELLED` (terminal from SUBMITTED, UNDER_REVIEW, or APPROVED).
- **Employee** — Organisation member with status `ACTIVE`, `ON_LEAVE`, `INACTIVE`, `PROBATION`. `managerId` defines the approval chain.
- **LeaveBalance** — Per-employee, per-type, per-year balance. Tracks `entitled`, `used`, `pending`, `carriedOver`, `remaining`. Status: `ACTIVE`, `EXHAUSTED`, `FROZEN`.
- **LeavePolicy** — Rules per leave type, optionally scoped by role/department. Versioned via `effectiveFrom`/`effectiveTo`. Status: `ACTIVE`, `SUPERSEDED`, `DEPRECATED`.
- **LeaveType** — Enumeration (`ANNUAL`, `SICK`, `EMERGENCY`). Stored as a reference table for extensibility.
- **AuditLog** — Immutable record of all state changes (GP-002).

### Conceptual Data Model (PostgreSQL)

| Table | Key Fields | Notes |
|-------|------------|-------|
| `employee` | id, user_id, email, role, manager_id, department, status | RBAC via role; manager hierarchy for approvals |
| `leave_type` | id, code, label, is_active | Reference data for leave categories |
| `leave_policy` | id, leave_type_id, role, department, entitlement_per_year, max_consecutive_days, min_notice_hours, requires_approval, requires_documentation, probation_eligible, allow_carry_over, carry_over_cap, effective_from, effective_to, status | Scoped policies; only one ACTIVE per (type, role, dept) at a time |
| `leave_balance` | id, employee_id, leave_type_id, leave_policy_id, year, entitled, used, pending, carried_over, remaining, status | Unique per (employee, type, year); updated atomically on approval/cancellation |
| `leave_request` | id, employee_id, leave_type_id, leave_policy_id, status, start_date, end_date, total_days, manager_id, reviewed_by, submitted_at, reviewed_at | Overlap detection via date-range indexes; manager_id for routing |
| `audit_log` | id, entity_type, entity_id, action, actor_id, changes, created_at | Immutable; supports GP-002 |

### Module Structure (Fastify + TypeScript)

```
src/modules/
  leave-type/          # Enum + reference model
  leave-status/        # Status enum + transition rules
  employee/            # Employee model, repo, service
  audit-log/           # Audit model, repo, service (cross-cutting)
  leave-policy/        # Policy model, repo, service
  leave-balance/       # Balance model, repo, service
  notification/        # Notification model, repo, service
  leave-request/       # Orchestrator: model, repo, service, controller, routes, DTOs
```

### Dependency Map (acyclic)

```
leave-request ──→ leave-balance ──→ leave-policy ──→ leave-type
    │                 │                  │
    │                 │                  └──→ audit-log
    │                 │
    │                 └──→ employee ──→ audit-log
    │
    ├──→ leave-status (leaf)
    ├──→ notification ──→ employee
    └──→ audit-log (leaf)
```

### Business Rules Summary

- **BR-001** Submission: employee ACTIVE, policy ACTIVE, notice period met (except EMERGENCY), max consecutive days not exceeded, sufficient balance, no overlapping approved leave. Moves `DRAFT → SUBMITTED`, increments `pending`.
- **BR-002** Approval/Rejection: only designated manager. Approval: `SUBMITTED/UNDER_REVIEW → APPROVED`, `used += days`, `pending -= days`. Rejection: `→ REJECTED`, `pending -= days`.
- **BR-003** Cancellation: employee cancels own request if SUBMITTED, UNDER_REVIEW, or APPROVED. Restores balance if previously approved.
- **BR-004** Balance initialisation: new year creates balance from policy entitlement + carry-over (capped).
- **BR-005** Overlap prevention: checked at submission and approval.
- **BR-006** Emergency leave bypasses `minNoticeHours`.
- **BR-007** Sick leave may require documentation; manager can move to UNDER_REVIEW while waiting.
- **BR-008** Probation employees only eligible for leave types with `probationEligible = true`.

### Golden Principles Compliance

- **GP-001 (Repository pattern)**: All state changes go through repository interfaces with concrete `Pg*` implementations backed by PostgreSQL via `pg` Pool.
- **GP-002 (Audit trail)**: Every create/update/status transition on leave_request, leave_balance, leave_policy, and employee writes an immutable `audit_log` record.
- **GP-005 (RBAC)**: Employee `role` field enforces access control; controller layer checks that the caller is the employee (submit/cancel) or the designated manager (approve/reject).

### Lifecycle States (all domain-introduced states reflected)

- **LeaveRequest**: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELLED
- **Employee**: ACTIVE, ON_LEAVE, INACTIVE, PROBATION
- **LeaveBalance**: ACTIVE, EXHAUSTED, FROZEN
- **LeavePolicy**: ACTIVE, SUPERSEDED, DEPRECATED
- **LeaveType**: (static, no lifecycle)
- **AuditLog**: (immutable, no lifecycle)

### Implementation Phases

1. **Foundation**: `leave-type`, `leave-status`, `audit-log`, `employee`
2. **Policy & Notification**: `leave-policy`, `notification`
3. **Balance**: `leave-balance`
4. **Core**: `leave-request` (orchestrator)

All modules use Fastify for HTTP, Jest for testing, and follow the modular-monolith structure with clear service boundaries.

### Phase 1 — Built

- `src/shared/types/leave.types.ts` — TypeScript enums: `LeaveType` (ANNUAL, SICK, EMERGENCY), `LeaveRequestStatus` (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), `LeaveBalanceStatus` (ACTIVE, EXHAUSTED, EXPIRED), `EmployeeStatus` (ACTIVE, ON_LEAVE, INACTIVE, PROBATION)
- `src/shared/base-repository.ts` — Generic `IBaseRepository<T>` interface with `findById`, `findAll`, `create`, `update`, `delete`
- Tests: `tests/unit/shared/leave.types.test.ts`, `tests/unit/shared/base-repository.test.ts`

### Phase 2 — Built

- `src/modules/leave/leave.model.ts` — `LeaveRequest` interface (id, employeeId, leaveType, leavePolicyId, startDate, endDate, totalDays, reason, status, managerId, managerComment, submittedAt, reviewedAt, createdAt, updatedAt) and `CreateLeaveRequestDto` (omits id, status, and timestamps). Imports `LeaveType` and `LeaveRequestStatus` from shared types.
- `src/modules/leave/leave.repository.ts` — `ILeaveRepository` interface extending `IBaseRepository<LeaveRequest>` with `findByEmployeeId(employeeId)` and `findByStatus(status)`. `KnexLeaveRepository` class implements it using Knex query builder backed by the `pg` Pool from `src/shared/db/connection.ts`. Constructor accepts an optional `Knex` instance for testability; defaults to a Knex instance wired to the shared pool. Table name: `leave_requests`. Private `toLeaveRequest` mapper converts raw rows to `LeaveRequest` objects, handling nullability of `managerId`, `managerComment`, `submittedAt`, `reviewedAt` and parsing date strings.
- Tests: `tests/unit/modules/leave/leave.model.test.ts` (validates LeaveRequest and CreateLeaveRequestDto shapes, nullable fields, DTO omission of id/status/timestamps), `tests/unit/modules/leave/leave.repository.test.ts` (structural interface test via a stub class, and full KnexLeaveRepository tests using a mocked Knex instance covering findById, findAll, findByEmployeeId, findByStatus, create, update, delete, and date/null handling in toLeaveRequest)

### Phase 3 — Built

- `src/modules/employee/employee.model.ts` — `Employee` interface (id, userId, firstName, lastName, email, role, managerId, department, designation, dateOfJoining, status, createdAt, updatedAt) using `EmployeeStatus` from shared types. `managerId` is `string | null`. `CreateEmployeeDto` omits `id`, `createdAt`, and `updatedAt` but includes `status` so callers can set the initial employee status (e.g. PROBATION).
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository` interface extending `IBaseRepository<Employee>` with `findByUserId(userId)`, `findByEmail(email)`, `findByManagerId(managerId)`, `findByDepartment(department)`, and `findByStatus(status)`. `KnexEmployeeRepository` class implements it using Knex query builder backed by the `pg` Pool from `src/shared/db/connection.ts`. Constructor accepts an optional `Knex` instance for testability; defaults to a Knex instance wired to the shared pool. Table name: `employees`. Private `toEmployee` mapper converts raw rows to `Employee` objects, handling null `managerId` via `?? null` and parsing date strings for `dateOfJoining`, `createdAt`, `updatedAt`. Exports a `RepositoryError` class wrapping the original error for consistent error handling.
- Tests: `tests/unit/modules/employee/employee.model.test.ts` (validates Employee and CreateEmployeeDto shapes, null managerId, all four EmployeeStatus values), `tests/unit/modules/employee/employee.repository.test.ts` (structural interface test via a stub class implementing all IEmployeeRepository methods, and full KnexEmployeeRepository tests using a mocked Knex instance covering findById, findAll, findByUserId, findByEmail, findByManagerId, findByDepartment, findByStatus, create, update, delete, null managerId handling, date parsing, and RepositoryError propagation)

### Phase 4 — Built

- `src/modules/balance/balance.model.ts` — `LeaveBalance` interface (id, employeeId, leaveType, leavePolicyId, entitled, used, pending, carriedOver, remaining, year, status, createdAt, updatedAt) using `LeaveType` and `LeaveBalanceStatus` from shared types. `remaining` is a stored numeric field (not computed). `CreateLeaveBalanceDto` omits `id`, `createdAt`, and `updatedAt` but includes all other fields including `remaining` and `status`.
- `src/modules/balance/balance.repository.ts` — `ILeaveBalanceRepository` interface extending `IBaseRepository<LeaveBalance>` with `findByEmployeeId(employeeId)`, `findByEmployeeIdAndYear(employeeId, year)`, `findByEmployeeIdAndLeaveType(employeeId, leaveType, year)`, and `findByStatus(status)`. `KnexLeaveBalanceRepository` class implements it using Knex query builder backed by the `pg` Pool from `src/shared/db/connection.ts`. Constructor accepts an optional `Knex` instance for testability; defaults to a Knex instance wired to the shared pool. Table name: `leave_balances`. Private `toLeaveBalance` mapper converts raw rows to `LeaveBalance` objects, parsing date strings for `createdAt`/`updatedAt` and casting numeric fields. Exports a `RepositoryError` class wrapping the original error for consistent error handling.
- Tests: `tests/unit/modules/balance/balance.model.test.ts` (validates LeaveBalance and CreateLeaveBalanceDto shapes, all three LeaveType values, all three LeaveBalanceStatus values, zero-value support for used/pending/carriedOver, EXHAUSTED status with zero remaining), `tests/unit/modules/balance/balance.repository.test.ts` (structural interface test via a stub class implementing all ILeaveBalanceRepository methods, and full KnexLeaveBalanceRepository tests using a mocked Knex instance covering findById, findAll, findByEmployeeId, findByEmployeeIdAndYear, findByEmployeeIdAndLeaveType, findByStatus, create, update, delete, date parsing, numeric field handling, and RepositoryError propagation)

<!-- gestalt:architecture feature=e52e7dc9-5a2d-453b-b5a3-9d187c6021f7 END -->
