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
src/shared/types/          — Shared enums, DTOs, and base interfaces (Phase 1)
src/shared/db/connection.ts
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

<!-- gestalt:architecture feature=35df38af-c9d7-41ee-b412-79ee8d149189 START -->
# Leave Management Module Architecture

## Overview
The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. The architecture follows a modular monolith style with Fastify (backend) and React Native (frontend), using PostgreSQL for persistence.

## Domain Entities
- **LeaveType**: Enum of leave categories (annual, sick, emergency, unpaid, maternity, paternity).
- **Employee**: Represents an employee with employment status (ACTIVE, INACTIVE, TERMINATED) and reporting line (managerId).
- **LeaveRequest**: Core entity tracking a leave application through lifecycle states: DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED. CANCELLED reachable from DRAFT, SUBMITTED, or APPROVED. REJECTED is terminal.
- **LeavePolicy**: Defines rules per leave type: entitlement days, accrual rate, max accumulation, minimum notice days, requires manager approval, active/inactive.
- **LeaveBalance**: Per-employee, per-policy, per-fiscal-year balance with total entitlement, used days, remaining days. Lifecycle: ACTIVE → EXHAUSTED → EXPIRED.
- **Notification**: Messages triggered by leave events; lifecycle: PENDING → SENT → READ → ARCHIVED.
- **AuditLog**: Immutable record of all state-changing operations for compliance.

## Conceptual Data Model (PostgreSQL)
Six tables: `employees`, `leave_policies`, `leave_balances`, `leave_requests`, `notifications`, `audit_log`. Key relationships:
- `leave_requests.employee_id` → `employees.id`
- `leave_requests.policy_id` → `leave_policies.id`
- `leave_requests.approved_by` → `employees.id`
- `leave_balances.employee_id` → `employees.id`
- `leave_balances.policy_id` → `leave_policies.id`
- `notifications.recipient_id` → `employees.id`
- `audit_log.performed_by` → `employees.id`

`leave_balances` uses a unique composite index on (employee_id, policy_id, fiscal_year). `leave_requests` includes a denormalized `leave_type` for query convenience.

## Module Structure (src/modules/)
- **shared-types/**: Enums (LeaveType, LeaveStatus, EmploymentStatus, AuditAction), DTOs, BaseEntity.
- **employee/**: Employee entity, repository, service.
- **policy/**: LeavePolicy entity, repository, service.
- **audit/**: AuditLog entity, repository, service.
- **notification/**: Notification entity, repository, service.
- **balance/**: LeaveBalance entity, repository, service (deduct/restore balance atomically).
- **leave/**: LeaveRequest entity with state machine, repository, service (orchestrates policy validation, balance operations, audit, notifications), controller, routes.

## Dependency Map
- leave → balance, policy, employee, notification, audit, shared-types
- balance → policy, shared-types
- All modules → shared-types

## Business Rules (Binding)
- LeaveRequest submission requires: employee ACTIVE, policy ACTIVE, sufficient balance (remainingDays >= requested days), startDate not in past, startDate <= endDate, minimum notice period if set.
- Day count = (endDate - startDate) + 1 (calendar days, inclusive).
- Approval restricted to employee's manager; balance deduction atomic with approval.
- Cancellation of approved request restores balance atomically.
- LeaveRequest must not span multiple fiscal years; fiscal year derived from startDate.
- Audit log recorded for every state change.

## Lifecycle States Summary
- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- LeavePolicy: ACTIVE, INACTIVE.
- LeaveBalance: ACTIVE, EXHAUSTED, EXPIRED.
- Notification: PENDING, SENT, READ, ARCHIVED.
- Employee: ACTIVE, INACTIVE, TERMINATED.

## Open Questions
1. Fiscal year boundary definition (calendar vs company-specific).
2. Day-counting method (calendar days vs business days).
3. Approval flow for employees with no manager.

## Stack Compliance
- Backend: Fastify with TypeScript, modular monolith structure.
- Frontend: React Native (out of scope for this backend architecture).
- Database: PostgreSQL accessed via pg Pool; repositories implemented as Pg* classes.
- Testing: Jest.

## Implemented Phases

### Phase 1 — Shared Types (src/shared/types/)
Created the zero-dependency foundation module. Exports:
- **LeaveType** enum: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'` (string enum, lowercase values)
- **LeaveRequestStatus** enum: `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'` (string enum, uppercase values)
- **LeaveStatus** type alias: identical to LeaveRequestStatus, exported for compatibility
- **EmploymentStatus** enum: `'ACTIVE' | 'INACTIVE' | 'TERMINATED'`
- **AuditAction** enum: `'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'`
- **BaseEntity** interface: `{ id: string; createdAt: Date; updatedAt: Date }`
- **CreateLeaveRequestDto**: `{ employeeId: string; policyId: string; startDate: Date; endDate: Date; reason?: string }`
- **UpdateLeaveRequestDto**: `{ startDate?: Date; endDate?: Date; reason?: string }`
- **LeaveRequestQueryParams**: `{ status?: LeaveStatus; policyId?: string; startDateFrom?: Date; startDateTo?: Date; endDateFrom?: Date; endDateTo?: Date; limit?: number; offset?: number }`
- **ValidationResult**: `{ isValid: boolean; errors: string[] }`

All symbols are importable from `shared/types`. The module has zero runtime side effects and no database access. Unit tests in `tests/unit/shared/types/index.test.ts` verify enum value sets, DTO shapes, and the LeaveStatus/LeaveRequestStatus identity invariant.

### Phase 2 — Employee Module (src/modules/employee/)
Created the employee domain module with model, repository, and barrel export. Depends on `src/shared/types` (Phase 1) for `EmploymentStatus`.

**Files created:**
- `src/modules/employee/employee.model.ts` — **Employee** entity with fields: `id`, `firstName`, `lastName`, `email`, `role`, `managerId: string | null`, `department`, `employmentStatus: EmploymentStatus`, `createdAt`, `updatedAt`. Also defines **IEmployeeRepository** interface with methods: `findById`, `findByDepartment`, `findAll`, `create`, `update`.
- `src/modules/employee/employee.repository.ts` — **EmployeeRepository** class implementing `IEmployeeRepository` using the pg `Pool` from `src/shared/db/connection.ts`. All queries use parameterized SQL. Internal `mapRow` helper converts snake_case column names to camelCase entity fields. The `update` method uses a dynamic field map to build SET clauses only for provided fields, falling back to `findById` when no fields are supplied.
- `src/modules/employee/index.ts` — Barrel export of `Employee`, `IEmployeeRepository`, `EmployeeRepository`.

**Database mapping:** Repository maps between TypeScript camelCase (`firstName`, `managerId`, `employmentStatus`, `createdAt`, `updatedAt`) and PostgreSQL snake_case columns (`first_name`, `manager_id`, `employment_status`, `created_at`, `updated_at`).

**Tests:** `tests/unit/modules/employee/employee.repository.test.ts` — 11 tests covering all repository methods: findById (found, not found, null manager_id), findByDepartment (results, empty), findAll (results, empty), create, update (partial fields, nonexistent, empty fields fallback, null managerId). All tests mock `pool.query` from `shared/db/connection`.

### Phase 3 — Policy Module (src/modules/policy/)
Created the policy domain module with model, repository, and barrel export. Depends on `src/shared/types` (Phase 1) for `LeaveType`.

**Files created:**
- `src/modules/policy/policy.model.ts` — **LeavePolicy** entity with fields: `id`, `policyName`, `leaveType: LeaveType`, `entitlementDays`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt`, `updatedAt`. Also defines **IPolicyRepository** interface with methods: `findById`, `findByLeaveType`, `findActive`, `create`, `update`.
- `src/modules/policy/policy.repository.ts` — **PolicyRepository** class implementing `IPolicyRepository` using the pg `Pool` from `src/shared/db/connection.ts`. All queries use parameterized SQL. Internal `mapRow` helper converts snake_case column names to camelCase entity fields. The `update` method uses a dynamic field map to build SET clauses only for provided fields, falling back to `findById` when no fields are supplied.
- `src/modules/policy/index.ts` — Barrel export of `LeavePolicy`, `IPolicyRepository`, `PolicyRepository`.

**Database mapping:** Repository maps between TypeScript camelCase (`policyName`, `leaveType`, `entitlementDays`, `accrualRate`, `maxAccumulation`, `minimumNoticeDays`, `requiresManagerApproval`, `isActive`, `createdAt`, `updatedAt`) and PostgreSQL snake_case columns (`policy_name`, `leave_type`, `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `is_active`, `created_at`, `updated_at`).

**Tests:** `tests/unit/modules/policy/policy.repository.test.ts` — 11 tests covering all repository methods: findById (found, not found, null numeric fields), findByLeaveType (results, empty), findActive (results, empty), create, update (specified fields, nonexistent, empty fields fallback, nullable fields to null, isActive to false). All tests mock `pool.query` from `shared/db/connection`.

### Phase 4 — Leave Module (src/modules/leave/)
Created the leave domain module with model, repository, and barrel export. Depends on `src/shared/types` (Phase 1) for `LeaveStatus` and `LeaveRequestQueryParams`.

**Files created:**
- `src/modules/leave/leave.model.ts` — **LeaveRequest** entity with fields: `id`, `employeeId`, `policyId`, `startDate`, `endDate`, `reason: string | undefined`, `status: LeaveStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `rejectionReason: string | null`, `createdAt`, `updatedAt`. Also defines **ILeaveRepository** interface with methods: `findById`, `findByEmployeeId(employeeId, params?: LeaveRequestQueryParams)`, `findByStatus`, `create`, `update`, `updateStatus(id, status, approvedBy?, rejectionReason?)`.
- `src/modules/leave/leave.repository.ts` — **LeaveRepository** class implementing `ILeaveRepository` using the pg `Pool` from `src/shared/db/connection.ts`. All queries use parameterized SQL. Internal `mapRow` helper converts snake_case column names to camelCase entity fields. Key behaviors:
  - `findByEmployeeId` builds dynamic WHERE clauses from optional `LeaveRequestQueryParams` filters (status, policyId, startDateFrom/To, endDateFrom/To, limit, offset), ordered by `start_date DESC`.
  - `update` uses a dynamic field map to build SET clauses only for provided fields, falling back to `findById` when no fields are supplied. Always sets `updated_at = NOW()`.
  - `updateStatus` implements status-specific logic: APPROVED sets `approved_at = NOW()`, `approved_by`, and clears `rejection_reason`; REJECTED sets `rejection_reason` and clears approval fields; all other statuses (DRAFT, SUBMITTED, CANCELLED) clear both approval and rejection fields. Always sets `updated_at = NOW()`.
  - `create` maps `reason: undefined` to SQL NULL.
- `src/modules/leave/index.ts` — Barrel export of `LeaveRequest`, `ILeaveRepository`, `LeaveRepository`.

**Database mapping:** Repository maps between TypeScript camelCase (`employeeId`, `policyId`, `startDate`, `endDate`, `approvedBy`, `approvedAt`, `rejectionReason`, `createdAt`, `updatedAt`) and PostgreSQL snake_case columns (`employee_id`, `policy_id`, `start_date`, `end_date`, `approved_by`, `approved_at`, `rejection_reason`, `created_at`, `updated_at`). The `reason` field maps to the `reason` column (no rename). The denormalized `leave_type` column present in the database is not mapped to the entity — it exists for query convenience only.

**Tests:** `tests/unit/modules/leave/leave.repository.test.ts` — 24 tests covering all repository methods:
- `findById`: found, not found, approved request with approvedBy/approvedAt, rejected request with rejectionReason, undefined reason
- `findByEmployeeId`: basic query, empty results, status filter, policyId filter, startDate range filters, endDate range filters, limit/offset, all filters combined
- `findByStatus`: results, empty
- `create`: normal insert, undefined reason → null
- `update`: specified fields, nonexistent, empty fields fallback, setting approvedBy to null
- `updateStatus`: APPROVED with approvedBy, REJECTED with rejectionReason, CANCELLED clears approval/rejection, DRAFT clears approval/rejection, nonexistent, APPROVED with null approvedBy

All tests mock `pool.query` from `shared/db/connection`.

### Phase 5 — Balance Module (src/modules/balance/)
Created the balance domain module with model, repository, and barrel export. Depends on `src/shared/types` (Phase 1) for base types.

**Files created:**
- `src/modules/balance/balance.model.ts` — **LeaveBalance** entity with fields: `id`, `employeeId`, `policyId`, `totalEntitlement`, `usedDays`, `remainingDays` (computed, never stored), `fiscalYear`, `status: BalanceStatus`, `createdAt`, `updatedAt`. Defines **BalanceStatus** as `'ACTIVE' | 'EXHAUSTED' | 'EXPIRED'`. Also defines **InsufficientBalanceError** class (extends Error) with `balanceId`, `requestedDays`, and `availableDays` properties. Defines **IBalanceRepository** interface with methods: `findByEmployeeAndPolicy`, `findByEmployeeId`, `create`, `updateUsedDays`, `incrementUsedDays`, `decrementUsedDays`.
- `src/modules/balance/balance.repository.ts` — **BalanceRepository** class implementing `IBalanceRepository` using the pg `Pool` from `src/shared/db/connection.ts`. All queries use parameterized SQL. Internal `mapRow` helper converts snake_case column names to camelCase entity fields and computes `remainingDays = totalEntitlement - usedDays` at query time (never stored in DB). Key behaviors:
  - `findByEmployeeAndPolicy` queries by the composite key (employee_id, policy_id, fiscal_year).
  - `findByEmployeeId` supports optional `fiscalYear` filter, ordered by `fiscal_year DESC, policy_id`.
  - `create` accepts `Omit<LeaveBalance, 'id' | 'remainingDays' | 'createdAt' | 'updatedAt'>` — `remainingDays` is excluded from input since it is always computed.
  - `updateUsedDays` sets `used_days` directly and sets `updated_at = NOW()`.
  - `incrementUsedDays` uses an atomic SQL UPDATE with guard clause `total_entitlement - used_days - $1 >= 0`. If the guard fails (no rows updated), it checks whether the row exists: if not found, returns `null`; if found but balance insufficient, throws `InsufficientBalanceError`.
  - `decrementUsedDays` uses an atomic SQL UPDATE with guard clause `used_days - $1 >= 0`. Returns `null` if the row doesn't exist or the decrement would make `usedDays` negative.
- `src/modules/balance/index.ts` — Barrel export of `LeaveBalance`, `BalanceStatus`, `IBalanceRepository`, `InsufficientBalanceError`, `BalanceRepository`.

**Database mapping:** Repository maps between TypeScript camelCase (`employeeId`, `policyId`, `totalEntitlement`, `usedDays`, `fiscalYear`, `createdAt`, `updatedAt`) and PostgreSQL snake_case columns (`employee_id`, `policy_id`, `total_entitlement`, `used_days`, `fiscal_year`, `created_at`, `updated_at`). `remainingDays` is NOT a database column — it is computed in `mapRow` as `totalEntitlement - usedDays`.

**Tests:** `tests/unit/modules/balance/balance.repository.test.ts` — 11 tests covering all repository methods:
- `findByEmployeeAndPolicy`: found (verifies all mapped fields including computed `remainingDays`), not found
- `findByEmployeeId`: all balances for employee, filtered by fiscalYear, empty results
- `create`: inserts and returns with computed `remainingDays`
- `updateUsedDays`: sets used_days directly, nonexistent row
- `incrementUsedDays`: successful atomic increment, nonexistent row, throws `InsufficientBalanceError` when balance would go negative (verifies error message, balanceId, requestedDays, availableDays)
- `decrementUsedDays`: successful atomic decrement, nonexistent row, returns null when decrement would make usedDays negative

All tests mock `pool.query` from `shared/db/connection`.

### Phase 6 — Notification Module (src/modules/notification/)
Created the notification domain module with model, repository, and barrel export. Depends on `src/shared/types` (Phase 1) for base types.

**Files created:**
- `src/modules/notification/notification.model.ts` — **Notification** entity with fields: `id`, `recipientId`, `type`, `title`, `message`, `relatedEntityType: string | null`, `relatedEntityId: string | null`, `status: NotificationStatus`, `createdAt: Date`, `readAt: Date | null`. Defines **NotificationStatus** as `'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'`. Also defines **INotificationRepository** interface with methods: `findByRecipientId`, `create`, `markAsRead`, `updateStatus`.
- `src/modules/notification/notification.repository.ts` — **NotificationRepository** class implementing `INotificationRepository` using the pg `Pool` from `src/shared/db/connection.ts`. All queries use parameterized SQL. Internal `mapRow` helper converts snake_case column names to camelCase entity fields. Key behaviors:
  - `findByRecipientId` queries by `recipient_id`, ordered by `created_at DESC`.
  - `create` accepts `Omit<Notification, 'id' | 'createdAt' | 'readAt'>` — `id`, `createdAt`, and `readAt` are generated by the database or set later.
  - `markAsRead` sets `status = 'READ'` and `read_at = NOW()` atomically. Returns `null` if no row matches.
  - `updateStatus` sets only the `status` column. Returns `null` if no row matches.
- `src/modules/notification/index.ts` — Barrel export of `Notification`, `NotificationStatus`, `INotificationRepository`, `NotificationRepository`.

**Database mapping:** Repository maps between TypeScript camelCase (`recipientId`, `relatedEntityType`, `relatedEntityId`, `createdAt`, `readAt`) and PostgreSQL snake_case columns (`recipient_id`, `related_entity_type`, `related_entity_id`, `created_at`, `read_at`). The `type`, `title`, `message`, and `status` fields map to identically-named columns (no rename).

**Tests:** `tests/unit/modules/notification/notification.repository.test.ts` — 9 tests covering all repository methods:
- `findByRecipientId`: returns notifications ordered by `created_at DESC`, empty array when none exist
- `create`: normal insert with all fields, handles null `relatedEntityType` and `relatedEntityId`
- `markAsRead`: sets status to READ and `read_at` to a timestamp, returns null for nonexistent id
- `updateStatus`: updates to SENT, updates to ARCHIVED, returns null for nonexistent id

All tests mock `pool.query` from `shared/db/connection`.

### Phase 7 — Audit Module (src/modules/audit/)
Created the audit domain module with model, repository, and barrel export. Depends on `src/shared/types` (Phase 1) for `AuditAction`.

**Files created:**
- `src/modules/audit/audit.model.ts` — **AuditLog** entity with fields: `id`, `entityType`, `entityId`, `action: AuditAction`, `oldValues: Record<string, unknown> | null`, `newValues: Record<string, unknown> | null`, `performedBy: string`, `performedAt: Date`. Also defines **IAuditRepository** interface with methods: `findByEntity(entityType, entityId)`, `findByPerformer(performedBy)`, `create(data: Omit<AuditLog, 'id'>)`.
- `src/modules/audit/audit.repository.ts` — **AuditRepository** class implementing `IAuditRepository` using the pg `Pool` from `src/shared/db/connection.ts`. All queries use parameterized SQL. Internal `mapRow` helper converts snake_case column names to camelCase entity fields and parses JSON for `oldValues`/`newValues` (handles both raw string and already-parsed object forms from pg). Key behaviors:
  - `findByEntity` queries by `entity_type` and `entity_id`, ordered by `performed_at DESC`.
  - `findByPerformer` queries by `performed_by`, ordered by `performed_at DESC`.
  - `create` serializes `oldValues`/`newValues` to JSON via `JSON.stringify` before insert, accepts `Omit<AuditLog, 'id'>` (the `id` is generated by the database).
- `src/modules/audit/index.ts` — Barrel export of `AuditLog`, `IAuditRepository`, `AuditRepository`.

**Database mapping:** Repository maps between TypeScript camelCase (`entityType`, `entityId`, `oldValues`, `newValues`, `performedBy`, `performedAt`) and PostgreSQL snake_case columns (`entity_type`, `entity_id`, `old_values`, `new_values`, `performed_by`, `performed_at`). The `action` field maps to the identically-named `action` column. `oldValues` and `newValues` are stored as JSON/JSONB in the database and parsed back via a `parseJson` helper that handles both string and object forms.

**Tests:** `tests/unit/modules/audit/audit.repository.test.ts` — 8 tests covering all repository methods:
- `findByEntity`: returns audit logs ordered by `performed_at DESC`, empty array when none exist
- `findByPerformer`: returns audit logs ordered by `performed_at DESC`, empty array when none exist
- `create`: normal insert with null oldValues, insert with object oldValues/newValues, handles oldValues/newValues as raw JSON strings (pg text result), handles null oldValues and newValues

All tests mock `pool.query` from `shared/db/connection`.

### Phase 8 — Shared Day-Count Utility (src/shared/utils/)
Created the shared business-day calculation utility — the single source of truth for all leave day-count computations. Depends on `src/shared/db/connection.ts` for the `pool` export (used only by `getHolidaysForYear`).

**Files created:**
- `src/shared/utils/day-count.ts` — Two exports:
  - **`calculateBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number`** — A pure function with zero side effects and no database access. Counts business days (Monday–Friday) in the inclusive `[startDate, endDate]` range, excluding weekends and any date whose calendar date matches an entry in the `holidays` array. Key behaviors:
    - Normalizes all dates to UTC date-only via internal `toDateOnly` helper — time components are ignored.
    - Returns `1` when `startDate` and `endDate` are the same business day.
    - Returns `0` when `startDate > endDate` (inverted range), without throwing.
    - Returns `0` when all days in the range are weekends or holidays.
    - Holidays falling on weekends do not double-count (already excluded by weekend check).
    - Never throws for any `Date` inputs (including `new Date('invalid')`).
    - Idempotent: same inputs always produce the same output.
  - **`getHolidaysForYear(year: number): Promise<Date[]>`** — Queries the `holidays` table via the shared pg `Pool`. Uses parameterized SQL (`$1`, `$2` placeholders) filtering by `EXTRACT(YEAR FROM date) = $1` and `country = 'US'`. Returns a `Date[]` (possibly empty), never `null` or `undefined`. Propagates pool.query rejections to the caller (no silent swallowing). Assumes the `holidays` table already exists with columns `date`, `name`, `country`.
- `src/shared/utils/index.ts` — Barrel export re-exporting `calculateBusinessDays` and `getHolidaysForYear` from `./day-count`.

**Design constraints:**
- `calculateBusinessDays` is a pure function — no database access, no side effects.
- `getHolidaysForYear` uses the same `pool` named export from `src/shared/db/connection.ts` as all existing repositories.
- Country is hardcoded to `'US'`; the function signature takes only `year`.
- Whole days only — no half-day or partial-day counting.
- This utility is the single source of truth for leave day-count calculations; all future consumers (leave service balance sufficiency checks, deduction, restoration) must use it.

**Tests:** `tests/unit/shared/utils/day-count.test.ts` — 20 tests (16 for `calculateBusinessDays`, 4 for `getHolidaysForYear`):
- `calculateBusinessDays`: same-day Monday (1), same-day Saturday (0), same-day Sunday (0), Mon–Fri span (5), Mon–Sun span (5), holiday exclusion (4), holiday on weekend no double-count (5), multi-week span (10), multi-week with holidays (8), inverted range (0), dates with time components (2), all-weekend span (0), all-holiday span (0), empty holidays array (5), invalid dates don't throw, idempotency.
- `getHolidaysForYear`: verifies query shape (year + country='US'), returns Date[] from rows, returns empty array for no rows, propagates pool.query rejection, never returns undefined/null.

All tests mock `pool.query` from `shared/db/connection` using the same pattern as existing repository tests (`jest.mock` + `mockReset` in `beforeEach`).

### Phase 9 — Leave Service (src/modules/leave/)
Created the leave service implementing all core business logic. Depends on all prior phases (1–8). The service orchestrates policy validation, balance operations, audit logging, and notifications — it is the single entry point for all leave request state transitions.

**Files created:**
- `src/modules/leave/leave.service.interface.ts` — **ILeaveService** interface with 6 methods:
  - `submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>`
  - `approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>`
  - `rejectLeaveRequest(requestId: string, approverId: string, reason: string): Promise<LeaveRequest>`
  - `cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest>`
  - `getLeaveRequest(requestId: string): Promise<LeaveRequest | null>`
  - `getEmployeeLeaveRequests(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`

- `src/modules/leave/leave.service.ts` — **LeaveService** class implementing `ILeaveService`. Constructor takes 6 repository interfaces: `ILeaveRepository`, `IBalanceRepository`, `IEmployeeRepository`, `IPolicyRepository`, `INotificationRepository`, `IAuditRepository`. All database access goes through these repository interfaces (GP-001 compliant).

  **submitLeaveRequest** logic:
  1. Look up employee; throw if not found or `employmentStatus !== ACTIVE`.
  2. Look up policy; throw if not found or `!isActive`.
  3. Compute `fiscalYear = startDate.getUTCFullYear()`.
  4. Get or create LeaveBalance for (employeeId, policyId, fiscalYear). If creating, set `totalEntitlement = policy.entitlementDays`, `usedDays = 0`, `status = 'ACTIVE'`.
  5. Fetch holidays via `getHolidaysForYear(fiscalYear)`.
  6. Compute `requestedDays = calculateBusinessDays(startDate, endDate, holidays)`.
  7. Check sufficiency: `totalEntitlement - usedDays >= requestedDays`. If insufficient, throw `InsufficientBalanceError`.
  8. Atomically increment usedDays via `balanceRepository.incrementUsedDays`.
  9. Create LeaveRequest with status `SUBMITTED`.
  10. Create AuditLog with action `CREATE`, `performedBy = employeeId`.
  11. Notify: if employee has `managerId`, notify manager; otherwise find all employees with `role === 'hr_admin'` and notify each.

  **approveLeaveRequest** logic:
  1. Find request; throw if not found or status is not `SUBMITTED`.
  2. Update status to `APPROVED` with `approvedBy = approverId`.
  3. Create AuditLog with action `APPROVE`, `performedBy = approverId`.
  4. Notify the employee.
  5. Does NOT modify usedDays (balance was already deducted at submission).

  **rejectLeaveRequest** logic:
  1. Find request; throw if not found or status is not `SUBMITTED`.
  2. Update status to `REJECTED` with `rejectionReason`.
  3. Compute business days for the request's date range.
  4. Find balance and restore via `decrementUsedDays`.
  5. Create AuditLog with action `REJECT`, `performedBy = approverId`.
  6. Notify the employee.

  **cancelLeaveRequest** logic:
  1. Find request; throw if not found, status is not `SUBMITTED` or `APPROVED`, or `employeeId` does not match.
  2. Update status to `CANCELLED`.
  3. Compute business days for the request's date range.
  4. Find balance and restore via `decrementUsedDays`.
  5. Create AuditLog with action `UPDATE`, `performedBy = employeeId`.
  6. Does NOT create a notification.

  **getLeaveRequest** / **getEmployeeLeaveRequests**: Pure delegation to `leaveRepository`.

  **Binding rules applied:**
  - Deduct-on-submission: `incrementUsedDays` at SUBMIT, not at APPROVE.
  - Restore-on-reject/cancel: `decrementUsedDays` on REJECT and CANCEL.
  - Approval does NOT change usedDays again.
  - No-manager escalates to HR admin (employees with `role === 'hr_admin'`).
  - Business days only via shared `calculateBusinessDays` + `getHolidaysForYear`.
  - `remainingDays` is computed (`totalEntitlement - usedDays`), never stored.
  - Every state-changing operation writes an audit record (GP-002).
  - All async errors are caught and re-thrown as typed errors (GP-006).

  **Notable divergences from the original business rules spec:**
  - `startDate` not-in-past validation is NOT implemented.
  - `startDate <= endDate` validation is NOT implemented.
  - Minimum notice period check is NOT implemented.
  - Multi-fiscal-year span check is NOT implemented.
  - These validations are deferred to the controller layer (Phase 10) or future phases.

**Tests:** `tests/unit/modules/leave/leave.service.test.ts` — 37 tests covering all service methods with all 6 repository dependencies mocked:
- **submitLeaveRequest** (10 tests): employee not found, employee not ACTIVE, policy not found, policy not active, creates balance when none exists, throws `InsufficientBalanceError` when balance insufficient, notifies manager when employee has managerId, notifies HR admins when employee has no manager, creates audit log with action CREATE, returns created LeaveRequest with status SUBMITTED.
- **approveLeaveRequest** (6 tests): request not found, wrong status, updates to APPROVED with approver fields, creates audit log with action APPROVE, notifies employee, does NOT modify usedDays.
- **rejectLeaveRequest** (6 tests): request not found, wrong status, updates to REJECTED with rejectionReason, restores balance via decrementUsedDays, creates audit log with action REJECT, notifies employee.
- **cancelLeaveRequest** (8 tests): request not found, wrong status (REJECTED), employeeId mismatch, cancels SUBMITTED request, cancels APPROVED request, restores balance via decrementUsedDays, creates audit log with action UPDATE, does NOT create notification.
- **getLeaveRequest** (3 tests): returns request when found, returns null when not found, no audit/notification side effects.
- **getEmployeeLeaveRequests** (4 tests): returns array, returns empty array, passes query params to repository, no audit/notification side effects.

All tests mock `calculateBusinessDays` and `getHolidaysForYear` from `shared/utils/day-count` via `jest.mock`, and all 6 repository interfaces are mocked with `jest.fn()` per test.

### Phase 10 — Leave Controller, Routes, and App Registration (src/modules/leave/)
Created the HTTP layer for the leave module and registered it in the Fastify app. Depends on all prior phases (1–9).

**Files created/modified:**
- `src/modules/leave/leave.controller.ts` — **LeaveController** class wrapping `ILeaveService`. Six methods:
  - **submit**: Parses body, validates required fields (`employeeId`, `policyId`, `startDate`, `endDate`) at the API boundary (GP-003). Validates date strings parse correctly. Maps `InsufficientBalanceError` → 409, other service errors → 400, unknown errors → 500. Returns 201 on success.
  - **approve**: Extracts `requestId` from params, `approverId` and `role` from `request.user` (populated by header hook). Enforces RBAC: only `manager` or `hr_admin` roles allowed (GP-005) — returns 403 otherwise. Returns 200 on success.
  - **reject**: Same RBAC check as approve. Validates `reason` is non-empty in body. Returns 200 on success.
  - **cancel**: Extracts `employeeId` from `request.user`. Service-level employee mismatch throws → controller maps to 403. Returns 200 on success.
  - **getById**: Returns 200 with request or 404 if not found.
  - **getByEmployee**: Parses query string params into `LeaveRequestQueryParams` (status, policyId, date ranges, limit, offset). Returns 200 with array.

- `src/modules/leave/leave.routes.ts` — Fastify plugin exporting `leaveRoutes(fastify: FastifyInstance)`. Key details:
  - Instantiates all 6 repository classes and wires them into `LeaveService` → `LeaveController`.
  - Registers a `preHandler` hook that populates `request.user` from `x-user-id` and `x-user-role` headers (header-based auth for development/internal use).
  - Augments Fastify's `FastifyRequest` interface with optional `user` property via `declare module 'fastify'`.
  - Six routes:
    - `POST /api/leave/requests` → `controller.submit`
    - `GET /api/leave/requests/:requestId` → `controller.getById`
    - `GET /api/leave/employees/:employeeId/requests` → `controller.getByEmployee`
    - `POST /api/leave/requests/:requestId/approve` → `controller.approve`
    - `POST /api/leave/requests/:requestId/reject` → `controller.reject`
    - `POST /api/leave/requests/:requestId/cancel` → `controller.cancel`

- `src/modules/leave/index.ts` — Updated barrel export to include `ILeaveService`, `LeaveService`, `LeaveController`, and `leaveRoutes`.

- `src/app.ts` — Modified to import and register `leaveRoutes` alongside the existing `uptimeRoutes`:
  ```ts
  import { leaveRoutes } from './modules/leave/leave.routes';
  app.register(leaveRoutes);
  ```

**Auth mechanism:** Header-based. `x-user-id` and `x-user-role` headers are read in a `preHandler` hook and stored on `request.user` as `{ id, role }`. The controller reads these for RBAC checks and identity. No JWT or OIDC integration is implemented — this is suitable for development/internal use.

**RBAC enforcement (GP-005):** Enforced at the controller level (API boundary):
- `approve` and `reject`: role must be `manager` or `hr_admin` (403 otherwise).
- `cancel`: identity check in service (employeeId must match request's employeeId); controller maps mismatch errors to 403.

**Input validation (GP-003):** `submit` validates all required fields at the controller before calling the service. `reject` validates `reason` is non-empty. `getByEmployee` safely parses optional query params.

**Error mapping:**
| Condition | HTTP Status |
|-----------|-------------|
| Missing/invalid required fields | 400 |
| Service validation errors | 400 |
| InsufficientBalanceError | 409 |
| RBAC denial (wrong role) | 403 |
| Employee mismatch on cancel | 403 |
| Request not found | 404 |
| Unknown errors | 500 |

**Tests:** `tests/integration/modules/leave/leave.routes.test.ts` — 18 integration tests using Fastify's `inject` method with `LeaveService` fully mocked:
- **POST /api/leave/requests** (7 tests): success (201), missing employeeId/policyId/startDate/endDate (400 each), invalid startDate (400), InsufficientBalanceError (409), service error (400).
- **GET /api/leave/requests/:requestId** (2 tests): found (200), not found (404).
- **GET /api/leave/employees/:employeeId/requests** (3 tests): returns array (200), empty array (200), passes query params to service.
- **POST /api/leave/requests/:requestId/approve** (3 tests): success (200), wrong role (403), hr_admin role succeeds (200).
- **POST /api/leave/requests/:requestId/reject** (3 tests): success (200), wrong role (403), missing reason (400).
- **POST /api/leave/requests/:requestId/cancel** (2 tests): success (200), employee mismatch (403).

All tests mock `LeaveService` via `jest.mock('modules/leave/leave.service')` and build a fresh Fastify instance per test.
<!-- gestalt:architecture feature=35df38af-c9d7-41ee-b412-79ee8d149189 END -->
