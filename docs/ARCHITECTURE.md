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
src/modules/employee/employee.{model,repository}.ts
src/modules/employee/index.ts
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
src/shared/types/           — Shared type definitions (Phase 1)
  base-entity.interface.ts   — BaseEntity interface
  enums.ts                   — LeaveType enum (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY) and LeaveRequestStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) consolidated into a single file
  leave-request.dto.ts       — CreateLeaveRequestDto, UpdateLeaveRequestDto
  index.ts                   — Barrel export
src/shared/utils/
  day-count.ts               — countBusinessDays(startDate, endDate, holidays): number
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

## Shared utilities

### countBusinessDays

`src/shared/utils/day-count.ts` — the single shared day-count function used by all call sites (balance sufficiency check, deduction, restoration).

- Counts business days (Mon–Fri) in the inclusive range `[startDate, endDate]`.
- Excludes weekends (Saturday/Sunday) and the provided `holidays: Date[]` array.
- Returns 0 when `startDate > endDate`.
- Holiday comparison uses `isSameDay()` which compares local date components (year, month, day).

**Known divergence from UTC spec:** The current implementation uses local-time getters (`getDay()`, `getFullYear()`, `getMonth()`, `getDate()`, `setHours()`) rather than UTC-based comparison. The clarification spec mandates normalizing every date to UTC midnight and comparing on the `YYYY-MM-DD` ISO date string. This will be corrected in a future phase.

<!-- gestalt:architecture feature=c8e3d826-436d-4da1-aaf8-6a4bd895c61c START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities

- **LeaveRequestStatus** (enum): `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
- **LeaveType** (enum): `ANNUAL`, `SICK`, `EMERGENCY`, `UNPAID`, `MATERNITY`, `PATERNITY`
- **LeaveRequest** (aggregate root): `id`, `employeeId`, `leavePolicyId`, `startDate`, `endDate`, `reason`, `status`, `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `cancelledBy`, `cancelledAt`, `createdAt`, `updatedAt`
- **LeavePolicy**: `id`, `policyName`, `leaveType`, `entitlementDays`, `accrualRate`, `maxAccumulation`, `minimumNoticeDays`, `requiresManagerApproval`, `isActive`, `createdAt`, `updatedAt`
- **LeaveBalance**: `id`, `employeeId`, `leavePolicyId`, `totalEntitlement`, `usedDays`, `fiscalYear`, `status` (`ACTIVE`, `EXHAUSTED`, `CLOSED`), `createdAt`, `updatedAt`
- **Employee**: `id`, `employeeNumber`, `firstName`, `lastName`, `email`, `managerId`, `department`, `hireDate`, `terminationDate`, `employmentStatus`, `createdAt`, `updatedAt`

### Business Rules (Binding)

1. **Lifecycle transitions**: DRAFT → SUBMITTED (employee), SUBMITTED → APPROVED/REJECTED (manager), SUBMITTED/APPROVED → CANCELLED (employee/admin). DRAFT can be deleted. APPROVED, REJECTED, CANCELLED are terminal.
2. **Inclusive day count**: `days = endDate - startDate + 1`. Both start and end dates count as leave days.
3. **Balance deduction on APPROVED**: `usedDays += days`, `remainingDays -= days`. If `remainingDays` reaches 0, status → EXHAUSTED.
4. **Balance restoration on CANCELLED (of APPROVED)**: `usedDays -= days`, `remainingDays += days`. If status was EXHAUSTED and `remainingDays > 0`, status → ACTIVE.
5. **Sufficiency check**: Before SUBMIT or APPROVE, `remainingDays >= days` must hold (skipped for UNPAID leave).
6. **Manager approval**: If `requiresManagerApproval = true` or leave type is SICK/EMERGENCY, the employee's manager must approve. Otherwise auto-approve on submission.
7. **Minimum notice**: `startDate - submissionDate >= minimumNoticeDays` (calendar days). Emergency leave exempt.
8. **RBAC**: Employee owns submit/cancel; manager owns approve/reject; admin overrides all.
9. **Date validity**: `startDate <= endDate`.
10. **No overlapping**: No other APPROVED or SUBMITTED request for the same employee with intersecting `[startDate, endDate]`.
11. **Fiscal year**: Determined from `startDate`: Jan–Jun → calendar year; Jul–Dec → calendar year + 1 (July–June fiscal calendar).

### Module Structure

| Module | Path | Responsibilities |
|--------|------|------------------|
| `shared-types` | `src/shared/types/` | Enums, base interfaces, common DTOs |
| `shared-utils` | `src/shared/utils/` | `countBusinessDays` — single shared day-count function |
| `employee` | `src/modules/employee/` | Employee entity, repository, service, controller, routes |
| `policy` | `src/modules/policy/` | LeavePolicy entity, repository, service |
| `balance` | `src/modules/balance/` | LeaveBalance entity, repository, service, controller, routes |
| `notification` | `src/modules/notification/` | Notification service, repository |
| `audit` | `src/modules/audit/` | Audit log repository |
| `leave` | `src/modules/leave/` | LeaveRequest entity, repository, service (orchestrator), controller, routes |

### Dependency Map

- `leave` → `balance`, `policy`, `employee`, `notification`, `audit`, `shared-types`, `shared-utils`
- All other modules → `shared-types` only

### Conceptual Tables

- **employees**: `id`, `employee_number`, `first_name`, `last_name`, `email`, `manager_id`, `department`, `hire_date`, `termination_date`, `employment_status`, `created_at`, `updated_at`, `deleted_at`
- **leave_policies**: `id`, `policy_name`, `leave_type`, `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `is_active`, `created_at`, `updated_at`
- **leave_requests**: `id`, `employee_id`, `leave_policy_id`, `start_date`, `end_date`, `reason`, `status`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `cancelled_by`, `cancelled_at`, `created_at`, `updated_at`
- **leave_balances**: `id`, `employee_id`, `leave_policy_id`, `total_entitlement`, `used_days`, `fiscal_year`, `status`, `created_at`, `updated_at`
- **audit_logs**: `id`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, `performed_by`, `performed_at`, `ip_address`, `user_agent`, `created_at`
- **notifications**: `id`, `recipient_id`, `type`, `title`, `message`, `related_entity_type`, `related_entity_id`, `status`, `created_at`, `read_at`

### Implementation Phases

1. **Shared types** — enums (consolidated `enums.ts`), base entity interface, DTOs, day-count utility ✅ (Phase 1 complete)
2. **Employee module** — employee CRUD, manager hierarchy ✅ (Phase 2 complete)
3. **Policy module** — leave policy CRUD, validation rules ✅ (Phase 3 complete)
4. **Balance module** — balance tracking, deduction/restoration ✅ (Phase 4 complete)
5. **Leave module (model + repository)** — LeaveRequest entity, repository with overlap queries ✅ (Phase 5 complete)
6. **Notification module** — notification dispatch
7. **Audit module** — audit trail recording
8. **Leave service** — full leave workflow orchestration

### Employee Module — Built (Phase 2)

**Files delivered:**
- `src/modules/employee/employee.model.ts` — `Employee` interface extending `BaseEntity` with fields: `employeeNumber`, `firstName`, `lastName`, `email`, `managerId` (string | null), `department` (string), `hireDate`, `terminationDate` (Date | null), `employmentStatus` (string)
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository` interface (7 methods: `findById`, `findByEmployeeNumber`, `findByEmail`, `findByManagerId`, `findAll`, `create`, `update`) + `PgEmployeeRepository` implementation using the shared `pool` from `src/shared/db/connection.ts`
- `src/modules/employee/index.ts` — barrel export of `Employee`, `IEmployeeRepository`, `PgEmployeeRepository`
- `tests/unit/modules/employee/employee.repository.test.ts` — Jest unit tests mocking the pg pool, covering all CRUD paths and error cases

**Design decisions:**
- `department` is typed as `string` (non-null), matching the reconciled architecture and PLAN.md
- `employmentStatus` is typed as `string` (not a union), matching PLAN.md literal instruction
- `deletedAt` is omitted from the Employee model (soft-delete is a DB-only concern for now)
- `BaseEntity` is imported from the deep path `../../shared/types/base-entity.interface` rather than the shared barrel, per PLAN.md literal instruction
- `create` generates `id` via `randomUUID()` and populates `createdAt`/`updatedAt` server-side
- `update` does a read-then-write: fetches the existing row, merges, then updates all columns

**Out of scope (deferred):** Employee service, controller, routes, RBAC enforcement, audit record writing, database migrations, soft-delete operations.

### Policy Module — Built (Phase 3)

**Files delivered:**
- `src/modules/policy/policy.model.ts` — `LeavePolicy` interface extending `BaseEntity` with fields: `policyName` (string), `leaveType` (LeaveType), `entitlementDays` (number), `accrualRate` (number | null), `maxAccumulation` (number | null), `minimumNoticeDays` (number | null), `requiresManagerApproval` (boolean), `isActive` (boolean)
- `src/modules/policy/policy.repository.ts` — `ILeavePolicyRepository` interface (5 methods: `findById`, `findByLeaveType`, `findActive`, `create`, `update`) + `PgLeavePolicyRepository` implementation using the shared `pool` from `src/shared/db/connection.ts`. Includes a private `rowToLeavePolicy` mapper for snake_case → camelCase conversion.
- `src/modules/policy/index.ts` — barrel export of `LeavePolicy`, `ILeavePolicyRepository`, `PgLeavePolicyRepository`
- `tests/unit/modules/policy/policy.repository.test.ts` — Jest unit tests mocking the pg pool, covering all CRUD paths, `findByLeaveType`, `findActive`, and error cases (connection refused, unique constraint violation, query timeout)

**Design decisions:**
- `LeaveType` is imported from `../../shared/types/enums` (the consolidated enums file from Phase 1)
- `BaseEntity` is imported from the deep path `../../shared/types/base-entity.interface` (same pattern as employee module)
- `create` generates `id` via `randomUUID()` and populates `createdAt`/`updatedAt` server-side (same pattern as employee module)
- `update` does a read-then-write: fetches the existing row via `findById`, merges with partial data, then updates all columns (same pattern as employee module)
- `findByLeaveType` returns the first matching row (or null) — assumes one active policy per leave type
- `findActive` filters on `is_active = true`

**Out of scope (deferred):** Policy service, controller, routes, validation rules enforcement, database migrations.

### Balance Module — Built (Phase 4)

**Files delivered:**
- `src/modules/balance/balance.model.ts` — `LeaveBalanceStatus` type (`'ACTIVE' | 'EXHAUSTED' | 'CLOSED'`), `LeaveBalance` interface extending `BaseEntity` with fields: `employeeId` (string), `leavePolicyId` (string), `totalEntitlement` (number), `usedDays` (number), `fiscalYear` (number), `status` (LeaveBalanceStatus). Also defines `LeaveBalanceWithRemaining` extending `LeaveBalance` with a computed `remainingDays: number` field.
- `src/modules/balance/balance.repository.ts` — `ILeaveBalanceRepository` interface (4 methods: `findByEmployeeAndPolicy`, `findByEmployeeId`, `create`, `updateUsedDays`) + `PgLeaveBalanceRepository` implementation using the shared `pool` from `src/shared/db/connection.ts`. Includes a private `rowToLeaveBalance` mapper for snake_case → camelCase conversion that computes `remainingDays` at query time.
- `src/modules/balance/index.ts` — barrel export of `LeaveBalance`, `LeaveBalanceStatus`, `LeaveBalanceWithRemaining`, `ILeaveBalanceRepository`, `PgLeaveBalanceRepository`
- `tests/unit/modules/balance/balance.repository.test.ts` — Jest unit tests mocking the pg pool, covering all CRUD paths, `remainingDays` computation, and error cases (connection refused, unique constraint violation, query timeout)

**Design decisions:**
- `remainingDays` is **never stored** in the database — it is computed at query time in `rowToLeaveBalance` as `totalEntitlement - usedDays`. This matches the binding rule that `remainingDays` is a derived value.
- `LeaveBalanceWithRemaining` is a separate interface extending `LeaveBalance` that adds the computed `remainingDays` field. All repository methods return `LeaveBalanceWithRemaining` (not plain `LeaveBalance`), so callers always have access to the computed remaining balance.
- `updateUsedDays` performs an atomic `UPDATE … SET used_days = $1, updated_at = $2 WHERE id = $3 RETURNING *` — the single mutation point for balance deduction and restoration. The caller (future leave service) is responsible for computing the new `usedDays` value before calling this method.
- `status` is typed as the `LeaveBalanceStatus` union type, not a plain `string`.
- `BaseEntity` is imported from the deep path `../../shared/types/base-entity.interface` (same pattern as employee and policy modules).
- `create` generates `id` via `randomUUID()` and populates `createdAt`/`updatedAt` server-side (same pattern as prior modules).
- `findByEmployeeAndPolicy` looks up a balance by the composite key `(employee_id, leave_policy_id, fiscal_year)`.

**Out of scope (deferred):** Balance service, controller, routes, status transition logic (ACTIVE→EXHAUSTED→CLOSED), database migrations.

### Leave Module — Built (Phase 5)

**Files delivered:**
- `src/modules/leave/leave.model.ts` — `LeaveRequest` interface extending `BaseEntity` with fields: `employeeId` (string), `leavePolicyId` (string), `startDate` (Date), `endDate` (Date), `reason` (string | undefined), `status` (LeaveRequestStatus), `approvedBy` (string | null), `approvedAt` (Date | null), `rejectedBy` (string | null), `rejectedAt` (Date | null), `rejectionReason` (string | null), `cancelledBy` (string | null), `cancelledAt` (Date | null)
- `src/modules/leave/leave.repository.ts` — `ILeaveRequestRepository` interface (6 methods: `findById`, `findByEmployeeId`, `findByStatus`, `findByEmployeeAndDateRange`, `create`, `update`) + `PgLeaveRequestRepository` implementation using the shared `pool` from `src/shared/db/connection.ts`. Includes a private `LeaveRequestRow` interface and `rowToLeaveRequest` mapper for snake_case → camelCase conversion.
- `src/modules/leave/index.ts` — barrel export of `LeaveRequest`, `ILeaveRequestRepository`, `PgLeaveRequestRepository`
- `tests/unit/modules/leave/leave.repository.test.ts` — Jest unit tests mocking the pg pool, covering all CRUD paths, `findByEmployeeAndDateRange` overlap logic, and error cases (connection refused, unique constraint violation, query timeout)

**Design decisions:**
- `reason` is typed as `string | undefined` (not `string | null`), matching the model's optional field semantics. The `rowToLeaveRequest` mapper converts `null` from the database to `undefined` via `row.reason ?? undefined`.
- `LeaveRequestStatus` is imported from `../../shared/types/enums` (the consolidated enums file from Phase 1).
- `BaseEntity` is imported from the deep path `../../shared/types/base-entity.interface` (same pattern as employee, policy, and balance modules).
- `create` generates `id` via `randomUUID()` and populates `createdAt`/`updatedAt` server-side (same pattern as prior modules).
- `update` does a read-then-write: fetches the existing row via `findById`, merges with partial data, then updates all columns (same pattern as prior modules).
- `findByEmployeeAndDateRange` uses overlap logic: `start_date <= $3 AND end_date >= $2` — this finds any existing request whose date range intersects with the queried range, supporting the "no overlapping" business rule.
- `LeaveRequestRow` is a private interface (not exported) used only for mapping database rows.

**Out of scope (deferred):** Leave service (orchestration with business rules), controller, routes, RBAC enforcement, audit record writing, database migrations.

### Open Questions

- Carry-over rules for unused leave days
- Minimum leave granularity (full/half days or hours)
- Treatment of weekends and public holidays in day counting
- Cross-fiscal-year leave request day allocation

### Stack Compliance

- Language: TypeScript (Node 20)
- Framework: Fastify (API routes)
- Frontend: React Native (out of scope for this module, but API designed for mobile consumption)
- Database: PostgreSQL (accessed via `pg` Pool)
- Testing: Jest
- Architecture: Modular monolith with clear module boundaries and dependency direction (shared-types ← domain modules ← orchestration)
<!-- gestalt:architecture feature=c8e3d826-436d-4da1-aaf8-6a4bd895c61c END -->
