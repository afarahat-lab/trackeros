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
- **LeaveBalance**: `id`, `employeeId`, `leavePolicyId`, `totalEntitlement`, `usedDays`, `remainingDays`, `fiscalYear`, `status` (`ACTIVE`, `EXHAUSTED`, `CLOSED`), `createdAt`, `updatedAt`
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
- **leave_balances**: `id`, `employee_id`, `leave_policy_id`, `total_entitlement`, `used_days`, `remaining_days`, `fiscal_year`, `status`, `created_at`, `updated_at`
- **audit_logs**: `id`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, `performed_by`, `performed_at`, `ip_address`, `user_agent`, `created_at`
- **notifications**: `id`, `recipient_id`, `type`, `title`, `message`, `related_entity_type`, `related_entity_id`, `status`, `created_at`, `read_at`

### Implementation Phases

1. **Shared types** — enums (consolidated `enums.ts`), base entity interface, DTOs, day-count utility ✅ (Phase 1 complete)
2. **Employee module** — employee CRUD, manager hierarchy
3. **Policy module** — leave policy CRUD, validation rules
4. **Balance module** — balance tracking, deduction/restoration
5. **Notification module** — notification dispatch
6. **Audit module** — audit trail recording
7. **Leave module** — full leave workflow orchestration

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
