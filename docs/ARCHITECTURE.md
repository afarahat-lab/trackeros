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

<!-- gestalt:architecture feature=7f3a8cc3-b777-42b1-b2e3-a0c62205ede1 START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities

- **LeaveType** — enum: `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity` (feature scope: annual, sick, emergency).
- **LeaveStatus** — lifecycle enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`.
- **LeaveRequest** — employee application; tracks status transitions with actor/timestamp fields (`approvedBy`, `rejectedBy`, `cancelledBy`).
- **LeavePolicy** — rules per leave type: entitlement days, notice period, manager approval flag, accrual caps, active flag.
- **LeaveBalance** — per-employee, per-policy, per-fiscal-year balance: `totalEntitlement`, `usedDays`, `remainingDays`, status (`ACTIVE`, `EXHAUSTED`, `CLOSED`).
- **Employee** — organisational employee with `managerId` self-reference; `employmentStatus` (`ACTIVE`, `INACTIVE`, `TERMINATED`) controls eligibility.
- **AuditLog** — immutable record of state changes (GP-002).

### Business Rules (Binding)

1. Day counting is inclusive calendar days: `(endDate - startDate + 1)`. No exclusion of weekends/holidays.
2. Only ACTIVE employees can submit leave.
3. Submission validates `minimumNoticeDays` from policy.
4. Submission checks `remainingDays >= requested days` for the fiscal year (calendar year of `startDate`).
5. On APPROVED, balance is deducted atomically (`usedDays += days`, `remainingDays -= days`).
6. On CANCELLED (from APPROVED), balance is restored atomically.
7. Only the employee's direct manager (`Employee.managerId`) may approve/reject; self-approval forbidden.
8. When `requiresManagerApproval` is false, request auto-approves (DRAFT → APPROVED, skipping SUBMITTED).
9. `endDate >= startDate` enforced.
10. Fiscal year = calendar year of `startDate`.

### Conceptual Tables

- **employees** — `id`, `employee_number`, `first_name`, `last_name`, `email` (unique), `role`, `manager_id` (FK self), `department`, `hire_date`, `termination_date`, `employment_status`, timestamps, soft-delete.
- **leave_policies** — `id`, `policy_name`, `leave_type`, `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `is_active`, `is_paid`, timestamps.
- **leave_requests** — `id`, `employee_id` (FK), `leave_type_id` (FK), `start_date`, `end_date`, `status`, `reason`, `approved_by` (FK), `approved_at`, `rejected_by` (FK), `rejected_at`, `cancelled_by` (FK), `cancelled_at`, timestamps.
- **leave_balances** — `id`, `employee_id` (FK), `policy_id` (FK), `fiscal_year`, `total_entitlement`, `used_days`, `remaining_days`, `status`, timestamps. Unique composite `(employee_id, policy_id, fiscal_year)`.
- **audit_logs** — `id`, `entity_type`, `entity_id`, `action`, `changed_by` (FK), `changes` (JSON), `created_at`.

### Modules & Dependencies

| Module | Path | Key Contents |
|--------|------|-------------|
| shared-types | `src/shared/types/` | `LeaveType`, `LeaveStatus` enums |
| employee | `src/modules/employee/` | Employee model, repo, service |
| policy | `src/modules/policy/` | LeavePolicy model, repo, service |
| balance | `src/modules/balance/` | LeaveBalance model, repo, service |
| leave | `src/modules/leave/` | LeaveRequest model, repo, service, controller, routes |
| notification | `src/modules/notification/` | Notification service |
| audit | `src/modules/audit/` | AuditLog model, repo, service |

Dependencies flow inward: `leave` → `balance`, `policy`, `employee`, `notification`, `audit`, `shared-types`; `balance` → `policy`, `audit`, `shared-types`; `policy` → `shared-types`; `employee` → `shared-types`.

### Cross-Cutting Contracts

- **Auth**: `request.user: { id: string; role: UserRole }` where `UserRole = 'employee' | 'manager' | 'hr_admin'`. JWT verified by Fastify hook; RBAC via `requireRole(...)` guard.
- **Transaction**: Multi-step writes (approve/reject/cancel) use an optional `client: PoolClient` parameter on repository methods (`updateStatus`, `deductDays`, `upsert`, `create`). Service acquires client, `BEGIN`, passes to repos, `COMMIT`/`ROLLBACK`.
- **Error Response**: `{ error: string; code: string }`. 400 validation, 401 auth, 403 forbidden, 404 not found, 500 internal.

### Recommended Build Phases

1. Shared types (enums)
2. Audit module
3. Employee module
4. Policy module
5. Balance module
6. Notification module
7. Leave model & repository
8. Leave service
9. Leave controller & routes

### Open Questions

1. Fiscal year configurability (calendar vs custom).
2. Overlap detection policy (none, SUBMITTED+APPROVED, APPROVED only).
3. Cross-year balance splitting (single year vs split).
4. Balance initialisation strategy (eager vs lazy).
5. Balance deduction timing (on approval per domain rule, but two-phase alternatives exist).
<!-- gestalt:architecture feature=7f3a8cc3-b777-42b1-b2e3-a0c62205ede1 END -->
