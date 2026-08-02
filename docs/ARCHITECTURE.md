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
src/modules/notification/notification.{model,repository,service.interface,service}.ts
src/modules/notification/index.ts
src/modules/audit/audit.{model,repository}.ts
src/modules/audit/index.ts
src/shared/db/connection.ts
src/shared/types/           — Shared type definitions (Phase 1)
  base-entity.interface.ts   — BaseEntity interface
  enums.ts                   — LeaveType enum (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY) and LeaveRequestStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) consolidated into a single file
  leave-request.dto.ts       — CreateLeaveRequestDto, UpdateLeaveRequestDto
  index.ts                   — Barrel export
src/shared/utils/
  day-count.ts               — countBusinessDays(startDate, endDate, holidays): number
src/shared/holidays/         — Holiday reference data (Phase 6)
  holiday.model.ts           — Holiday interface (id, date, name, country)
  holiday.repository.ts      — IHolidayRepository + PgHolidayRepository
  index.ts                   — Barrel export
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
| `shared-holidays` | `src/shared/holidays/` | Holiday reference data — model and repository for public holidays |
| `employee` | `src/modules/employee/` | Employee entity, repository, service, controller, routes |
| `policy` | `src/modules/policy/` | LeavePolicy entity, repository, service |
| `balance` | `src/modules/balance/` | LeaveBalance entity, repository, service, controller, routes |
| `notification` | `src/modules/notification/` | Notification service, repository |
| `audit` | `src/modules/audit/` | Audit log repository |
| `leave` | `src/modules/leave/` | LeaveRequest entity, repository, service (orchestrator), controller, routes |

### Dependency Map

- `leave` → `balance`, `policy`, `employee`, `notification`, `audit`, `shared-types`, `shared-utils`, `shared-holidays`
- All other modules → `shared-types` only

### Conceptual Tables

- **employees**: `id`, `employee_number`, `first_name`, `last_name`, `email`, `manager_id`, `department`, `hire_date`, `termination_date`, `employment_status`, `created_at`, `updated_at`, `deleted_at`
- **leave_policies**: `id`, `policy_name`, `leave_type`, `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `is_active`, `created_at`, `updated_at`
- **leave_requests**: `id`, `employee_id`, `leave_policy_id`, `start_date`, `end_date`, `reason`, `status`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `cancelled_by`, `cancelled_at`, `created_at`, `updated_at`
- **leave_balances**: `id`, `employee_id`, `leave_policy_id`, `total_entitlement`, `used_days`, `fiscal_year`, `status`, `created_at`, `updated_at`
- **audit_logs**: `id`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, `performed_by`, `performed_at`, `ip_address`, `user_agent`, `created_at`
- **notifications**: `id`, `recipient_id`, `recipient_email`, `subject`, `body`, `sent_at`, `status`, `created_at`, `updated_at`
- **holidays**: `id`, `date`, `name`, `country`

### Implementation Phases

1. **Shared types** — enums (consolidated `enums.ts`), base entity interface, DTOs, day-count utility ✅ (Phase 1 complete)
2. **Employee module** — employee CRUD, manager hierarchy ✅ (Phase 2 complete)
3. **Policy module** — leave policy CRUD, validation rules ✅ (Phase 3 complete)
4. **Balance module** — balance tracking, deduction/restoration ✅ (Phase 4 complete)
5. **Leave module (model + repository)** — LeaveRequest entity, repository with overlap queries ✅ (Phase 5 complete)
6. **Holidays module** — holiday reference data model and repository ✅ (Phase 6 complete)
7. **Notification module** — notification dispatch ✅ (Phase 7 complete)
8. **Audit module** — audit trail recording ✅ (Phase 8 complete)
9. **Leave service** — full leave workflow orchestration

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

### Holidays Module — Built (Phase 6)

**Files delivered:**
- `src/shared/holidays/holiday.model.ts` — `Holiday` interface with fields: `id` (string), `date` (Date), `name` (string), `country` (string). Does NOT extend `BaseEntity` — holidays are reference data, not domain entities.
- `src/shared/holidays/holiday.repository.ts` — `IHolidayRepository` interface (2 methods: `findByDateRange`, `findByYear`) + `PgHolidayRepository` implementation using the shared `pool` from `src/shared/db/connection.ts`. Includes a private `HolidayRow` interface and `rowToHoliday` mapper.
- `src/shared/holidays/index.ts` — barrel export of `Holiday`, `IHolidayRepository`, `PgHolidayRepository`
- `tests/unit/shared/holidays/holiday.repository.test.ts` — Jest unit tests mocking the pg pool, covering `findByDateRange`, `findByYear`, empty results, and error cases (connection refused, query timeout)

**Design decisions:**
- `Holiday` does NOT extend `BaseEntity` — it is reference/lookup data, not a domain entity with lifecycle tracking. This matches the PLAN.md specification.
- `rowToHoliday` normalizes dates by parsing the ISO date string from the database row and constructing a local-date `new Date(year, month - 1, day)`. This ensures compatibility with `countBusinessDays` which uses local-time getters for date comparison.
- Located under `src/shared/holidays/` rather than `src/modules/` — holidays are shared infrastructure consumed by the leave service, not a standalone domain module.
- `findByDateRange` uses an inclusive SQL range (`date >= $1 AND date <= $2`) ordered by date.
- `findByYear` uses `EXTRACT(YEAR FROM date) = $1` for calendar-year filtering.
- No `create`/`update`/`delete` methods — holidays are assumed to be seeded reference data managed externally.

**Out of scope (deferred):** Database migrations for the holidays table, holiday seed data, integration with the leave service's business-day counting pipeline.

### Notification Module — Built (Phase 7)

**Files delivered:**
- `src/modules/notification/notification.model.ts` — `NotificationStatus` type (`'PENDING' | 'SENT' | 'FAILED'`), `Notification` interface extending `BaseEntity` with fields: `recipientId` (string), `recipientEmail` (string), `subject` (string), `body` (string), `sentAt` (Date | null), `status` (NotificationStatus)
- `src/modules/notification/notification.repository.ts` — `INotificationRepository` interface (3 methods: `create`, `updateStatus`, `findByRecipient`) + `PgNotificationRepository` implementation using the shared `pool` from `src/shared/db/connection.ts`. Includes a private `NotificationRow` interface and `rowToNotification` mapper for snake_case → camelCase conversion.
- `src/modules/notification/notification.service.interface.ts` — `INotificationService` interface with 2 methods: `notifyLeaveSubmitted(employeeId, leaveRequestId)`, `notifyLeaveStatusChange(employeeId, leaveRequestId, oldStatus, newStatus)`
- `src/modules/notification/notification.service.ts` — `NotificationService` implementing `INotificationService`. Constructor takes `INotificationRepository`. Both methods derive `recipientEmail` as `${employeeId}@example.com`, create a `PENDING` notification via the repository, and log success/failure. Errors are caught and logged but never re-thrown — notifications are best-effort and must not block the calling workflow.
- `src/modules/notification/index.ts` — barrel export of `Notification`, `NotificationStatus`, `INotificationRepository`, `PgNotificationRepository`, `INotificationService`, `NotificationService`
- `tests/unit/modules/notification/notification.service.test.ts` — Jest unit tests mocking the repository, covering both service methods, email derivation, error handling (Error and non-Error rejections), and verifying notifications are always created with `status: 'PENDING'` and `sentAt: null`

**Design decisions:**
- `Notification` extends `BaseEntity` — follows the same pattern as all other domain modules (Employee, LeavePolicy, LeaveBalance, LeaveRequest). This gives it `id`, `createdAt`, `updatedAt` via the shared base interface.
- `NotificationStatus` is a union type (`'PENDING' | 'SENT' | 'FAILED'`), not a plain `string`.
- `updateStatus` automatically sets `sentAt` to `now` when the status transitions to `'SENT'`, using `COALESCE($3, sent_at)` in the SQL to avoid overwriting an existing `sentAt`.
- `create` generates `id` via `randomUUID()` and populates `createdAt`/`updatedAt` server-side (same pattern as prior modules).
- `BaseEntity` is imported from the deep path `../../shared/types/base-entity.interface` (same pattern as all prior modules).
- The service is intentionally fire-and-forget: both `notifyLeaveSubmitted` and `notifyLeaveStatusChange` catch all errors internally and log them. They never throw, so a notification failure cannot abort a leave workflow transaction. This is a deliberate architectural choice — notifications are a side effect, not part of the transactional boundary.
- `recipientEmail` is derived from `employeeId` using the `${employeeId}@example.com` convention. This is a placeholder; real email resolution will come from the Employee module in a future integration phase.
- No controller or routes are included — the notification module is consumed programmatically by the leave service (Phase 9), not exposed as an HTTP API.

**Out of scope (deferred):** Actual email sending (currently stubbed — log + persist only), database migrations for the notifications table, integration with the Employee module for real email resolution, notification read/acknowledgement endpoints.

### Audit Module — Built (Phase 8)

**Files delivered:**
- `src/modules/audit/audit.model.ts` — `AuditLog` interface extending `BaseEntity` with fields: `actorId` (string), `action` (string — e.g. `'LEAVE_SUBMITTED'`, `'LEAVE_APPROVED'`, `'LEAVE_REJECTED'`, `'LEAVE_CANCELLED'`), `targetId` (string), `targetType` (string — e.g. `'LeaveRequest'`), `details` (Record<string, unknown> | null), `timestamp` (Date)
- `src/modules/audit/audit.repository.ts` — `IAuditLogRepository` interface (3 methods: `create`, `findByTarget`, `findByActor`) + `PgAuditLogRepository` implementation using the shared `pool` from `src/shared/db/connection.ts`. Includes a private `AuditLogRow` interface and `rowToAuditLog` mapper for snake_case → camelCase conversion.
- `src/modules/audit/index.ts` — barrel export of `AuditLog`, `IAuditLogRepository`, `PgAuditLogRepository`
- `tests/unit/modules/audit/audit.repository.test.ts` — Jest unit tests mocking the pg pool, covering `create` (with details, null details, unique constraint violation, pool error), `findByTarget` (matching rows, empty results, pool error, query timeout), and `findByActor` (matching rows, empty results, pool error, query timeout)

**Design decisions:**
- `AuditLog` extends `BaseEntity` — follows the same pattern as all other domain modules. This gives it `id`, `createdAt`, `updatedAt` via the shared base interface.
- `action` is typed as `string` (not a union of specific action literals) — this keeps the audit module open for extension to other domain actions beyond leave management without requiring model changes.
- `targetType` is typed as `string` (not a union) — same rationale: the audit module is a generic cross-cutting concern, not leave-specific.
- `details` is `Record<string, unknown> | null` — flexible payload for storing action-specific context (e.g., old/new status values, rejection reasons). Nullable for actions that carry no extra context.
- `timestamp` is a separate field from `createdAt` — `timestamp` records when the audited action occurred (set by the caller), while `createdAt` records when the audit row was inserted. This allows the audit trail to faithfully record action timing even if the audit write is slightly delayed.
- `BaseEntity` is imported from the deep path `../../shared/types/base-entity.interface` (same pattern as all prior modules).
- `create` generates `id` via `randomUUID()` and populates `createdAt`/`updatedAt` server-side (same pattern as prior modules).
- `findByTarget` returns audit entries for a specific entity (e.g., all audit records for leave request `lr-001`), ordered by `timestamp DESC` (most recent first).
- `findByActor` returns all audit entries performed by a specific user, ordered by `timestamp DESC`.
- No `update` method — audit entries are immutable by design. Once written, they are never modified.

**Out of scope (deferred):** Database migrations for the `audit_logs` table, integration with the leave service for automatic audit record writing on state changes, audit log retention/purging policies.

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
