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

## Module structure (as-built)

```
src/modules/employee/
  employee.model.ts          — Employee entity, EmploymentStatus, IEmployeeRepository, domain errors
  employee.repository.ts     — EmployeeRepository (pg pool, parameterized SQL, soft-delete)
  employee.service.ts        — EmployeeService (getById, getByEmployeeNumber, getAll, getSubordinates, create, update, terminate)
  index.ts                   — barrel re-export

src/modules/policy/
  policy.model.ts            — LeavePolicy entity, IPolicyRepository, PolicyNotFoundError, DuplicateLeaveTypeError
  policy.repository.ts       — PolicyRepository (pg pool, parameterized SQL, duplicate detection on create)
  policy.service.ts          — PolicyService (getById, getByLeaveType, getAllActive, create, update, getEntitlementForType)
  index.ts                   — barrel re-export

src/modules/status/
  status.model.ts            — SystemStatus entity
  status.service.interface.ts
  status.service.ts
  index.ts

src/modules/uptime/
  uptime.model.ts            — UptimeStatus entity
  uptime.service.interface.ts
  uptime.service.ts
  uptime.routes.ts
  index.ts

src/shared/
  db/connection.ts           — PostgreSQL pool (pg)
  types/
    leave.types.ts           — LeaveRequestStatus, LeaveType, AuditAction enums; BaseEntity type
    index.ts                 — barrel re-export
```

### Planned modules (not yet built)

```
src/modules/leave/           — leave orchestration (Phase 6)
src/modules/balance/         — leave balances (Phase 5)
src/modules/audit/           — audit logging (Phase 4)
src/modules/notification/    — notifications (Phase 4)
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

## Employee module (Phase 2 — built)

### Entity

- **Employee** — organisation member. Fields: `id`, `employeeNumber`, `firstName`, `lastName`, `email`, `managerId`, `department`, `hireDate`, `terminationDate`, `employmentStatus` (`'ACTIVE' | 'INACTIVE' | 'TERMINATED'`), `createdAt`, `updatedAt`, `deletedAt`. Extends `BaseEntity` shape (id, createdAt, updatedAt) plus soft-delete.
- **Lifecycle**: ACTIVE ↔ INACTIVE → TERMINATED. TERMINATED is terminal — once set, it must not revert. `terminate()` sets `employmentStatus` to `'TERMINATED'` and `terminationDate` to now.
- **Uniqueness**: `employeeNumber` must be unique across non-soft-deleted employees. `create()` rejects duplicates with `DuplicateEmployeeNumberError`.
- **Soft-delete**: `deletedAt` non-null = logically deleted. All repository queries exclude soft-deleted rows.

### Repository

- `EmployeeRepository` implements `IEmployeeRepository`. All queries use parameterized SQL via the shared `pool` from `src/shared/db/connection.ts`. Table: `employees`.
- Methods: `findById`, `findByEmployeeNumber`, `findAll`, `findByManagerId`, `create`, `update`, `softDelete`.

### Service

- `EmployeeService` depends on `IEmployeeRepository` (constructor injection).
- Methods: `getById`, `getByEmployeeNumber`, `getAll`, `getSubordinates`, `create`, `update`, `terminate`.
- Domain errors: `EmployeeNotFoundError`, `EmployeeAlreadyTerminatedError`, `DuplicateEmployeeNumberError`.

### What was deferred

- Controller, routes, HTTP handlers — no HTTP surface exists yet.
- Database migration for `employees` table — assumed to exist.
- RBAC enforcement, JWT auth guards.
- Audit logging of employee mutations (GP-002 applies to LeaveRequest/LeaveBalance per reconciled architecture).
- Termination cascade logic (belongs to leave module, Phase 6).

## Policy module (Phase 3 — built)

### Entity

- **LeavePolicy** — rules per leave type. Fields: `id`, `policyName`, `leaveType` (`LeaveType` enum), `entitlementDays`, `accrualRate` (`number | undefined`), `maxAccumulation` (`number | undefined`), `minimumNoticeDays` (`number | undefined`), `requiresManagerApproval`, `isActive`, `createdAt`, `updatedAt`. Extends `BaseEntity`.
- **Uniqueness**: `leaveType` must be unique across all policies. `create()` rejects duplicates with `DuplicateLeaveTypeError`.

### Repository

- `PolicyRepository` implements `IPolicyRepository`. All queries use parameterized SQL via the shared `pool` from `src/shared/db/connection.ts`. Table: `leave_policies`.
- Methods: `findById`, `findByLeaveType`, `findAllActive`, `create`, `update`.
- `create` checks for existing policy with the same `leaveType` before inserting; throws `DuplicateLeaveTypeError` on conflict.
- `update` uses dynamic column mapping (`fieldMap`) to build SET clauses from the provided partial data; sets `updated_at = NOW()`.
- Private `mapRow` helper converts snake_case DB rows to camelCase domain objects.

### Service

- `PolicyService` depends on `IPolicyRepository` (constructor injection).
- Methods: `getById`, `getByLeaveType`, `getAllActive`, `create`, `update`, `getEntitlementForType`.
- `create` validates `entitlementDays > 0` before delegating to repository.
- `update` validates `entitlementDays > 0` if provided; checks policy existence first; delegates to repository.
- `getEntitlementForType(leaveType)` looks up the policy by leave type, verifies it is active, and returns `entitlementDays`. Throws `PolicyNotFoundError` if no active policy exists for the type.
- Domain errors: `PolicyNotFoundError`, `DuplicateLeaveTypeError`.

### What was deferred

- Controller, routes, HTTP handlers — no HTTP surface exists yet.
- Database migration for `leave_policies` table — assumed to exist.
- RBAC enforcement, JWT auth guards.
- Audit logging of policy mutations (GP-002 applies to LeaveRequest/LeaveBalance per reconciled architecture).

<!-- gestalt:architecture feature=e735cca3-597e-44fe-9270-69c735e34133 START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities

- **LeaveRequest** — employee time-off application. Lifecycle: DRAFT → SUBMITTED → {APPROVED | REJECTED}; DRAFT/SUBMITTED/APPROVED → CANCELLED. REJECTED and CANCELLED are terminal.
- **LeaveRequestStatus** — enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **LeaveType** — enum: annual, sick, emergency, unpaid, maternity, paternity.
- **LeavePolicy** — rules per leave type (entitlement, accrual, notice, approval). Lifecycle: ACTIVE ↔ INACTIVE → ARCHIVED.
- **LeaveBalance** — employee's entitlement, consumption, and pending days per policy per fiscal year. Lifecycle: ACTIVE ↔ EXHAUSTED (driven by remainingDays), ACTIVE/EXHAUSTED ↔ FROZEN (admin), ACTIVE/EXHAUSTED/FROZEN → CLOSED (year-end, terminal).
- **Employee** — organisation member; owns balances, submits requests, may act as manager. Lifecycle: ACTIVE ↔ INACTIVE → TERMINATED.
- **AuditLog** — immutable record of every state transition on LeaveRequest and LeaveBalance.

### Key Business Rules (binding)

1. **Day counting**: requestedDays = (endDate - startDate) + 1 (calendar days, inclusive). Notice period: today (day 0) to startDate (exclusive).
2. **State transitions**: only the allowed paths listed above; all others invalid.
3. **Submission validation**: startDate ≥ today, endDate ≥ startDate, employee ACTIVE, sufficient remainingDays (totalEntitlement - usedDays - pendingDays ≥ requestedDays), minimum notice met if policy requires.
4. **Approval**: only direct manager (or HR admin if no manager) may approve/reject; auto-approve if policy.requiresManagerApproval is false. On APPROVED, move pendingDays → usedDays (atomic).
5. **Cancellation of APPROVED**: restore usedDays → pendingDays (atomic).
6. **Overlap prevention**: no two SUBMITTED or APPROVED requests for same employee may overlap (DRAFT excluded).
7. **Balance lifecycle**: remainingDays = totalEntitlement - usedDays - pendingDays. EXHAUSTED when remainingDays = 0; returns to ACTIVE when > 0.
8. **Termination cascade**: employee TERMINATED → auto-reject SUBMITTED, cancel future APPROVED, close all balances, each with audit record.
9. **Audit**: every state transition on LeaveRequest and LeaveBalance writes an AuditLog record.

### Module Structure (modular monolith)

- `src/shared/types/` — shared enums and base types.
- `src/modules/employee/` — employee entity, repository, service.
- `src/modules/policy/` — leave policy entity, repository, service.
- `src/modules/balance/` — leave balance entity, repository, service.
- `src/modules/leave/` — leave request entity, repository, service, controller, routes (orchestrates all other modules).
- `src/modules/audit/` — audit log entity, repository, service.
- `src/modules/notification/` — notification entity, repository, service.

Dependencies flow inward: leave → {balance, policy, employee, audit, notification, shared-types}; balance → {policy, employee, shared-types}; policy → shared-types; employee → shared-types; audit → shared-types; notification → shared-types. No circular dependencies.

### Conceptual Data Model (PostgreSQL)

- **leave_requests** (id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at). PK: id. FKs: employee_id → employees.id, approved_by → employees.id. Indexes: employee_id, status, leave_type, approved_by, (employee_id, status), (approved_by, status).
- **leave_balances** (id, employee_id, policy_id, fiscal_year, total_entitlement, used_days, pending_days, carried_over, status, created_at, updated_at). PK: id. FKs: employee_id → employees.id, policy_id → leave_policies.id. Unique index on (employee_id, policy_id, fiscal_year).
- **leave_policies** (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at). PK: id. Unique index on leave_type; index on is_active.
- **employees** table assumed to exist (external module).

### Cross-cutting Contracts

- **Auth**: JWT bearer → `request.user: { id: string; role: 'employee' | 'manager' | 'hr_admin' }`. RBAC enforced by `requireRole(...)` Fastify route guard.
- **Error response**: `{ error: string; code: string; details?: unknown[] }`. Standard codes: VALIDATION_ERROR (400), UNAUTHORIZED (401), FORBIDDEN (403), NOT_FOUND (404), INSUFFICIENT_BALANCE (422), POLICY_VIOLATION (422).
- **Transaction**: Repository methods that participate in multi-step writes accept an optional `client: PoolClient`. The service owns the unit of work: acquires client, BEGIN, passes client to all repository calls, COMMIT/ROLLBACK. Key transactions: leave application (create request + deduct pendingDays), approval (update status + release pendingDays + commit usedDays), rejection/cancellation (update status + release pendingDays).

### Recommended Build Phases

1. Shared types (enums, base types)
2. Employee module
3. Policy module
4. Audit & Notification modules (parallel)
5. Balance module
6. Leave module (orchestration)

### Open Questions

- Calendar days vs business days for leave counting.
- Fiscal year boundary definition (calendar, fiscal, anniversary).
<!-- gestalt:architecture feature=e735cca3-597e-44fe-9270-69c735e34133 END -->
