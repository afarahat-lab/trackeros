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

<!-- gestalt:architecture feature=9086d214-f416-4a0d-87b3-3d75d74d909d START -->
## Leave Management Module

### Overview
The Leave Management module enables employees to apply for annual, sick, emergency, and other leave types. Managers approve or reject requests. The system tracks leave balances per employee, per leave type, per fiscal year, enforcing policy rules and maintaining a full audit trail.

### Domain Entities
- **LeaveRequest** — Represents an employee's leave application. Lifecycle: `DRAFT → SUBMITTED → APPROVED/REJECTED`; can be `CANCELLED` from `DRAFT`, `SUBMITTED`, or `APPROVED`. On approval, balance is deducted; on cancellation from approved, balance is restored.
- **LeaveType** — Enum: `ANNUAL`, `SICK`, `EMERGENCY`, `UNPAID`, `MATERNITY`, `PATERNITY`.
- **LeavePolicy** — Rules for a leave type: entitlement days, accrual, max accumulation, minimum notice, approval requirement, etc. Lifecycle: `ACTIVE`, `INACTIVE`.
- **LeaveBalance** — Tracks an employee's entitlement, used, pending, and remaining days for a leave type and fiscal year. Status: `ACTIVE`, `EXHAUSTED`, `FROZEN`.
- **LeaveRequestStatus** — Enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`.
- **Employee** — External entity referenced by leave; includes `employmentStatus` (`ACTIVE`, `INACTIVE`, `TERMINATED`) and `managerId`.

### Business Rules (Binding)
1. `startDate ≤ endDate`; violation prevents submission.
2. Day count = `(endDate - startDate) + 1` (calendar days inclusive). Used for balance checks and deductions.
3. Before approval, `remainingDays` must be ≥ requested days; otherwise reject.
4. On approval, `usedDays` incremented, `remainingDays` recalculated; if zero, balance becomes `EXHAUSTED`.
5. On cancellation from `APPROVED`, `usedDays` decremented, balance restored; if was `EXHAUSTED`, returns to `ACTIVE`.
6. If `requiresManagerApproval = false`, auto-approve on submission.
7. If `minimumNoticeDays` set, `startDate` must be at least that many days after submission timestamp.
8. Only owning employee may submit/cancel `DRAFT`/`SUBMITTED`; only manager may approve/reject/cancel `APPROVED`.
9. `DRAFT` editable; `SUBMITTED` immutable except status.
10. Cannot submit if employee `employmentStatus` is `INACTIVE` or `TERMINATED`.
11. Fiscal year = calendar year of `startDate`; balance matched on `(employeeId, leaveType, fiscalYear)`. If no balance exists, create from policy before approval.
12. No overlapping `SUBMITTED`/`APPROVED` requests for same employee.
13. Manager cannot approve/reject own request; if no manager and approval required, escalation rule TBD (see open questions).

### Module Structure
```
src/
  shared/types/          # BaseEntity, LeaveType, LeaveRequestStatus
  modules/
    employee/            # Employee entity, repository, service
    leave-policy/        # LeavePolicy entity, repository, service
    leave-balance/       # LeaveBalance entity, repository, service
    leave-request/       # LeaveRequest entity, repository, service (orchestrator)
    audit-log/           # AuditLog entity, repository, service (cross-cutting)
```

### Dependencies
- `leave-request` → `leave-balance`, `leave-policy`, `audit-log`, `employee`, `shared-types`
- `leave-balance` → `audit-log`, `shared-types`
- `leave-policy` → `shared-types`
- `employee` → `shared-types`
- `audit-log` → `shared-types`

All dependencies flow inward; no circular edges.

### Conceptual Data Model
- **leave_requests**: `id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `status`, `reason`, `approved_by`, `approved_at`, `cancelled_at`, `rejection_reason`, `created_at`, `updated_at`
- **leave_balances**: `id`, `employee_id`, `leave_type`, `year`, `total_allocated`, `used_days`, `pending_days`, `status`, `created_at`, `updated_at`
- **leave_policies**: `id`, `leave_type`, `policy_name`, `entitlement_days`, `max_consecutive_days`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `requires_attachment`, `allow_negative_balance`, `accrual_enabled`, `accrual_rate_per_month`, `is_active`, `created_at`, `updated_at`
- **employees**: `id`, `email`, `full_name`, `role`, `manager_id`, `department`, `employment_status`, `created_at`, `updated_at`
- **audit_logs**: `id`, `entity_type`, `entity_id`, `action`, `actor_id`, `changes`, `timestamp`

### Implementation Phases
1. **Shared types, Employee, Audit-log** — foundation with zero upstream deps.
2. **Leave policy** — rules engine.
3. **Leave balance** — state tracking.
4. **Leave request** — orchestration, integrating all prior modules.

### Open Questions
- Day counting: calendar vs business days?
- Notice period measurement: from submission timestamp or start of day?
- Fiscal year definition: calendar, configurable, or rolling?
- Fractional days: whole only or decimal?
- Deduction timing: on submission or on approval?
- No-manager escalation: auto-approve, auto-reject, escalate, or block?

These must be resolved before implementation to finalize balance arithmetic, validation logic, and escalation flows.
<!-- gestalt:architecture feature=9086d214-f416-4a0d-87b3-3d75d74d909d END -->
