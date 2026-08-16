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

## Module structure (implemented)

```
src/shared/
  db/connection.ts              — PostgreSQL connection pool (pg Pool)
  types/
    leave-type.enum.ts          — LeaveType const object + union type
    leave-request-status.enum.ts — LeaveRequestStatus const object + union type
    index.ts                    — barrel export

src/modules/
  employee/
    employee.model.ts           — Employee interface
    employee.repository.ts      — IEmployeeRepository + EmployeeRepository
    employee.service.interface.ts — IEmployeeService interface
    employee.service.ts         — EmployeeService implementation
    index.ts                    — barrel export
  policy/
    policy.model.ts             — LeavePolicy interface
    policy.repository.ts        — IPolicyRepository + PolicyRepository
    policy.service.interface.ts — IPolicyService interface
    policy.service.ts           — PolicyService implementation
    index.ts                    — barrel export
  balance/
    balance.model.ts            — LeaveBalance interface
    balance.repository.ts       — IBalanceRepository + BalanceRepository
    balance.service.interface.ts — IBalanceService interface
    balance.service.ts          — BalanceService implementation
    index.ts                    — barrel export
  leave/
    leave.model.ts              — LeaveRequest interface
    leave.repository.ts         — ILeaveRepository + LeaveRepository
    index.ts                    — barrel export
  audit/
    audit.model.ts              — AuditLog interface
    audit.repository.ts         — IAuditRepository + AuditRepository
    audit.service.interface.ts  — IAuditService interface
    audit.service.ts            — AuditService implementation
    index.ts                    — barrel export
  status/                       — pre-existing status module
  uptime/                       — pre-existing uptime module (health-check routes)
```

## Module structure (planned — not yet built)

```
src/modules/leave/leave.{service,controller,routes}.ts
src/modules/notification/notification.{model,repository,service,controller,routes}.ts
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

## Implemented details

### Shared types

`LeaveType` and `LeaveRequestStatus` are implemented as `const` objects with
derived union types (not TypeScript `enum`), following the project's strict
TypeScript conventions. Each also exports a `*_VALUES` array for runtime
iteration and validation.

### Repository pattern

All repositories accept an optional `Pool | PoolClient` in their constructor,
defaulting to the shared pool. This enables services to pass a transaction
`PoolClient` for atomic multi-repository operations — the service owns the
unit of work (`BEGIN`/`COMMIT`/`ROLLBACK`), and repositories remain
transaction-agnostic.

### Column mapping

Repositories use `snake_case` column names in SQL and map to `camelCase`
TypeScript properties via private `rowTo*` helper functions. This is the
convention for all database-backed modules.

### Employee module

`Employee` models a company employee with fields: `id`, `employeeNumber`,
`firstName`, `lastName`, `email`, `managerId`, `department`, `hireDate`,
`terminationDate`, `employmentStatus` (`ACTIVE` | `INACTIVE` | `TERMINATED`),
`createdAt`, `updatedAt`, `deletedAt`.

`IEmployeeRepository` provides: `findById`, `findByEmployeeNumber`, `findAll`,
`create`, `update`, `softDelete`.

`IEmployeeService` provides:
- `getById(id)` — delegates to repository
- `getByEmployeeNumber(employeeNumber)` — delegates to repository
- `isActive(id)` — returns `true` only when `employmentStatus === 'ACTIVE'`
  AND `terminationDate` is `null`; returns `false` for missing employees
- `getManagerId(id)` — returns the employee's `managerId` or `null` if not
  found or no manager assigned

`EmployeeService` injects `IEmployeeRepository` and delegates read operations
directly. The `isActive` check is the key business rule: both status and
absence of a termination date are required.

### Policy module

`LeavePolicy` models a leave policy with fields: `id`, `policyName`,
`leaveType` (LeaveType), `entitlementDays`, `accrualRate`, `maxAccumulation`,
`minimumNoticeDays`, `requiresManagerApproval`, `isActive`, `createdAt`,
`updatedAt`.

`IPolicyRepository` provides: `findById`, `findByLeaveType`, `findAllActive`,
`create`, `update`.

`IPolicyService` provides:
- `getById(id)` — delegates to repository
- `getByLeaveType(leaveType)` — delegates to repository
- `getAllActive()` — delegates to repository

`PolicyService` injects `IPolicyRepository` and is a thin pass-through with
no additional business logic at this layer.

### Balance module

`LeaveBalance` tracks per-employee, per-policy, per-fiscal-year entitlement
and usage. The `IBalanceRepository` interface provides:

- `findById`, `findByEmployeeAndPolicy`, `findByEmployeeAndFiscalYear` — lookups
- `create` — insert a new balance row
- `update` — partial update of mutable fields (totalEntitlement, usedDays,
  remainingDays, fiscalYear, status); `employeeId` and `policyId` are
  immutable after creation
- `updateUsedDays` — targeted atomic update of `usedDays` and `remainingDays`
  for transaction-safe deduction/restoration

The `BalanceRepository` maps the `leave_balances` table columns:
`employee_id`, `leave_policy_id`, `total_entitlement`, `used_days`,
`remaining_days`, `fiscal_year`, `status`.

`IBalanceService` provides:
- `getBalance(employeeId, policyId)` — delegates to repository
- `getAvailableDays(employeeId, policyId)` — returns `remainingDays` from the
  balance, or `0` if no balance exists
- `reserveDays(employeeId, policyId, days)` — reduces `remainingDays` by the
  reserved amount; throws if `days <= 0`, no balance exists, or insufficient
  remaining days. Reservation is modeled implicitly: `remainingDays` is
  decremented immediately (no separate pending-reservation column).
- `releaseReservation(employeeId, policyId, days)` — increases `remainingDays`
  by the released amount; throws if `days <= 0` or no balance exists
- `deductDays(employeeId, policyId, days)` — increases `usedDays` via
  `updateUsedDays` while keeping `remainingDays` unchanged (remaining was
  already reduced during `reserveDays`); throws if `days <= 0` or no balance
  exists
- `initializeBalancesForEmployee(employeeId)` — creates a balance for every
  active policy for the current calendar year, skipping policies that already
  have a balance. Applies mid-year hire pro-rating via
  `computeProRatedEntitlement`: full-year employees get the full entitlement;
  hires in the current fiscal year get `floor(entitlement × remainingWholeMonths / 12)`;
  future-year hires get 0. A hire on the 1st of a month counts that month;
  otherwise the hire month is excluded.

`BalanceService` injects `IBalanceRepository`, `IPolicyRepository`, and
`IEmployeeRepository`. The `IEmployeeRepository` dependency (not originally
in the plan) is required by `initializeBalancesForEmployee` to look up the
employee's `hireDate` for pro-rating.

**Business rules encoded:**
- Fiscal year = calendar year (current year from `new Date().getFullYear()`)
- Annual lump-sum entitlement upfront on Jan 1 for existing employees
- Mid-year hire pro-rating: whole months remaining, rounded down
- No carry-over (balances are per fiscal year)
- No negative balance (reserve throws on insufficient remaining days)
- Zero-entitlement balances are created with status `EXHAUSTED`

### Leave module

`LeaveRequest` models an employee's leave application with lifecycle states
`DRAFT → SUBMITTED → APPROVED | REJECTED` (any non-terminal → `CANCELLED`).
The `ILeaveRepository` interface provides:

- `findById` — single lookup by primary key
- `findByEmployee` — all requests for an employee, ordered by `start_date DESC`
- `findByEmployeeAndStatus` — requests filtered by employee + status
- `findOverlapping` — overlapping `SUBMITTED`/`APPROVED` requests for the same
  employee in a date range, with optional `excludeId` for update scenarios
- `create` — insert a new leave request row
- `update` — partial update of mutable fields (`startDate`, `endDate`,
  `reason`, `status`, `approvedBy`, `approvedAt`); `employeeId` and
  `leavePolicyId` are immutable after creation
- `findPendingByEmployee` — convenience lookup for `SUBMITTED` requests

The `LeaveRepository` maps the `leave_requests` table columns:
`employee_id`, `leave_policy_id`, `start_date`, `end_date`, `reason`,
`status`, `approved_by`, `approved_at`, `created_at`, `updated_at`.

### Audit module

`AuditLog` is an immutable record of state changes, supporting GP-002
("All state-changing operations write an audit record"). The `IAuditRepository`
interface provides:

- `create` — insert a new audit log entry; accepts `entityType`, `entityId`,
  `action`, `oldValues` (JSONB), `newValues` (JSONB), `performedBy`, and
  `performedAt`
- `findByEntity` — retrieve all audit entries for a given entity type + id,
  ordered by `performed_at DESC`

The `AuditRepository` maps the `audit_logs` table columns: `entity_type`,
`entity_id`, `action`, `old_values`, `new_values`, `performed_by`,
`performed_at`, `created_at`, `updated_at`. JSON fields (`old_values`,
`new_values`) are serialized via `JSON.stringify` on write and parsed back
to objects on read via a private `parseJsonField` helper.

`IAuditService` exposes a single `log(params)` method. `AuditService`
implements it by injecting `IAuditRepository` and delegating to
`repository.create`, setting `performedAt: new Date()` at the service
boundary so callers never supply their own timestamp.

<!-- gestalt:architecture feature=cb89b522-6bc0-439f-8a0d-f905145254ee START -->
## Leave Management Module — Reconciled Architecture

### Overview
Employees apply for annual, sick, and emergency leave. Managers approve or reject requests. The system tracks leave balances per employee, policy, and fiscal year. The module is built as a modular monolith with Fastify, TypeScript, and PostgreSQL.

### Domain Entities
- **LeaveRequest** — lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED; any non-terminal → CANCELLED.
- **LeaveRequestStatus** — enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **Employee** — lifecycle: ACTIVE, INACTIVE, TERMINATED.
- **LeavePolicy** — lifecycle: ACTIVE, INACTIVE.
- **LeaveType** — enum: annual, sick, emergency, unpaid, maternity, paternity.
- **LeaveBalance** — lifecycle: ACTIVE, EXHAUSTED, FROZEN.
- **AuditLog** — immutable record of state changes.

### Key Business Rules (Binding)
- Leave days counted inclusively: `(endDate - startDate) + 1`.
- Only ACTIVE employees can submit leave.
- Submission requires sufficient remaining balance (hard block — no negative balances).
- Approval must be by the employee's manager (or HR admin if no manager); self-approval forbidden.
- Approval deducts balance; cancellation restores it — both atomically in a transaction.
- No overlapping APPROVED or SUBMITTED requests for the same employee.
- Policy `minimumNoticeDays` gates submission timing.
- `requiresManagerApproval = false` triggers auto-approval (approvedBy/approvedAt null).
- Rejected requests are terminal; a new request must be created.
- Cross-fiscal-year requests split consumed days proportionally across affected years.

### Module Structure
| Module | Path | Owns |
|--------|------|------|
| shared-types | src/shared/types/ | LeaveType, LeaveRequestStatus enums |
| audit | src/modules/audit/ | AuditLog model, IAuditRepository, AuditRepository, IAuditService, AuditService |
| employee | src/modules/employee/ | Employee model, IEmployeeRepository/Service, implementations |
| policy | src/modules/policy/ | LeavePolicy model, IPolicyRepository/Service, implementations |
| balance | src/modules/balance/ | LeaveBalance model, IBalanceRepository/Service, implementations |
| notification | src/modules/notification/ | INotificationService, NotificationService |
| leave | src/modules/leave/ | LeaveRequest model, ILeaveRepository/Service, LeaveController, LeaveRoutes |

### Dependencies
- leave → shared-types, audit, employee, policy, balance, notification
- balance → shared-types, audit
- policy → shared-types

### Database Tables (Conceptual)
- **employees** — employee_number (unique), email (unique), manager_id FK, employment_status.
- **leave_policies** — leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active.
- **leave_requests** — employee_id FK, leave_policy_id FK, start_date, end_date, status, approved_by FK.
- **leave_balances** — employee_id FK, leave_policy_id FK, total_entitlement, used_days, remaining_days, fiscal_year, status; unique (employee_id, leave_policy_id, fiscal_year).
- **audit_logs** — entity_type, entity_id, action, old_values, new_values, performed_by FK, performed_at.

### Cross-Cutting Contracts

**Auth Contract**
- `request.user: { id: string; role: UserRole }` where `UserRole = 'employee' | 'manager' | 'hr_admin'`.
- JWT bearer token verified by auth middleware; RBAC enforced via `requireRole(...roles)` route guard.

**Transaction Contract**
- Repository methods that must join a caller's transaction accept an optional `PoolClient` parameter (defaults to shared pool).
- The service owns the unit of work: acquires client, `BEGIN`, passes client to repositories, `COMMIT`/`ROLLBACK`.
- Specifically: `ILeaveRequestRepository.updateStatus` and `ILeaveBalanceRepository.updateUsedDays`/`upsert` accept optional client.

**Error Response Contract**
- Shape: `{ error: string; code: string }`.
- 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND, 500 INTERNAL_ERROR.

### Open Questions
1. Fiscal year start date (calendar, configurable, or fixed).
2. Accrual model (lump-sum, monthly pro-rata, tenure-based).
3. Carry-over rule (capped, use-it-or-lose-it, unlimited).

### Recommended Implementation Phases
1. Shared types (LeaveType, LeaveRequestStatus) ✅
2. Audit module ✅
3. Employee module ✅ (model + repository)
4. Policy module ✅ (model + repository)
5. Balance module ✅ (model + repository)
6. Notification module
7. Leave module — model & contracts ✅
8. Leave module — repository & service implementation (repository ✅)
9. Leave module — controller & routes
10. Module index files
<!-- gestalt:architecture feature=cb89b522-6bc0-439f-8a0d-f905145254ee END -->
