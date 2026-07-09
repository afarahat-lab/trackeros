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
src/shared/types/index.ts
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

<!-- gestalt:architecture feature=b05db51f-a0dc-4cb4-93b3-8c6655f6f6af START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, emergency, unpaid, maternity, and paternity leave. Managers approve or reject requests. The system tracks leave balances per employee per policy per fiscal year, enforces policy rules (minimum notice, max accumulation, manager approval), and produces audit records for every state transition.

### Domain Entities

| Entity | Purpose | Lifecycle States |
|---|---|---|
| **Employee** | Represents an employee who applies for leave. Employment status governs eligibility. | ACTIVE, INACTIVE, TERMINATED |
| **LeaveRequest** | Core aggregate — an employee's leave application. Owns the approval lifecycle and triggers balance adjustments. | DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED |
| **LeavePolicy** | Rules and entitlements for a leave category. One active policy per LeaveType at any time. | ACTIVE, INACTIVE |
| **Balance** | Tracks entitlement, consumption, and remaining days for an employee-policy-fiscalYear tuple. Updated atomically on LeaveRequest state changes. | ACTIVE, EXHAUSTED, FROZEN |
| **Notification** | Informs employees and managers of leave events. Triggered by LeaveRequest state transitions. | PENDING, SENT, READ, ARCHIVED |
| **LeaveType** | Value enum: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY. No lifecycle. | — |

### Business Rules (reconciled)

- **BR-001** — Only ACTIVE employees may submit a LeaveRequest.
- **BR-002** — Sufficient balance required before APPROVED: `remainingDays >= requestedDays` for the matching Balance.
- **BR-003** — Balance deduction on approval: `usedDays` increased, `remainingDays` decreased atomically within the same transaction.
- **BR-004** — Balance restoration on cancellation from APPROVED: previously deducted days restored.
- **BR-005** — Max accumulation cap: `remainingDays` must not exceed `LeavePolicy.maxAccumulation` on initialization/rollover.
- **BR-006** — Minimum notice enforcement (bypassed for EMERGENCY leave).
- **BR-007** — Date validity: `startDate <= endDate`; `startDate` must not be in the past at submission.
- **BR-008** — Manager approval: if `requiresManagerApproval=true`, `approvedBy` must match `employee.managerId`. If false, auto-approve on submission.
- **BR-009** — Overlapping requests: no two SUBMITTED or APPROVED requests with overlapping date ranges for the same employee and LeaveType.
- **BR-010** — Fiscal year alignment: if a request spans two fiscal years, days are prorated across each year's Balance.
- **BR-011** — Balance status transitions: EXHAUSTED when `remainingDays=0`; FROZEN when employee becomes INACTIVE or TERMINATED.
- **BR-012** — Audit on every LeaveRequest state change (GP-002).
- **BR-013** — Notification on state change: DRAFT→SUBMITTED (notify manager), SUBMITTED→APPROVED (notify employee), SUBMITTED→REJECTED (notify employee), APPROVED→CANCELLED (notify manager).
- **BR-014** — Policy active check: only `isActive=true` policies may be referenced by new requests.

### Conceptual Table Specifications

| Table | Key Fields | PK | FKs | Index Rationale |
|---|---|---|---|---|
| **employees** | id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at | id | manager_id → employees.id | email (unique lookup), manager_id (direct reports), employment_status (eligibility) |
| **leave_policies** | id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at | id | — | leave_type (unique policy lookup), is_active (enforcement filter) |
| **balances** | id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at | id | employee_id → employees.id, policy_id → leave_policies.id | employee_id (employee-scoped), (employee_id, policy_id, fiscal_year) composite unique (balance validation), fiscal_year (rollover), status (filtering) |
| **leave_requests** | id, employee_id, leave_type_id, start_date, end_date, reason, status, reviewer_id, reviewed_at, review_comment, created_at, updated_at | id | employee_id → employees.id, reviewer_id → employees.id, leave_type_id → leave_policies.id | employee_id (history), status (approval queues), reviewer_id (manager dashboard), (start_date, end_date) (overlap detection), leave_type_id (aggregation) |
| **audit_logs** | id, entity_type, entity_id, action, changed_by, old_values, new_values, created_at | id | changed_by → employees.id | (entity_type, entity_id) (record-scoped trail), changed_by (actor queries), created_at (time-range scans), action (operation filter) |
| **notifications** | id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at | id | recipient_id → employees.id | recipient_id (inbox), status (filtering), created_at (ordering), (related_entity_type, related_entity_id) (entity-scoped lookup) |

### Repository Interfaces & Concrete Implementations

| Interface | Concrete | Module | Key Methods |
|---|---|---|---|
| IEmployeeRepository | PgEmployeeRepository | employee | findById, findByEmail, findByManagerId, findAll, create, update |
| ILeaveRepository | PgLeaveRepository | leave | findById, findByEmployee, findPendingByManager, findOverlapping, create, updateStatus |
| IBalanceRepository | PgBalanceRepository | balance | findByEmployeeAndYear, findByEmployeeYearAndPolicy, create, updateUsed, initializeForEmployee |
| IPolicyRepository | PgPolicyRepository | policy | findByLeaveType, findActive, create, update, deactivate |
| INotificationRepository | PgNotificationRepository | notification | create, findByRecipient, updateStatus, markRead |
| IAuditRepository | PgAuditRepository | audit | create, findByEntity, findByActor, findByDateRange |

All backed by PostgreSQL via `pg Pool` (`src/shared/db/connection.ts`). GP-001 enforced — no direct DB access outside repositories.

### Service Interfaces

| Interface | Module | Key Methods |
|---|---|---|
| IEmployeeService | employee | findById, findByDepartment, findManager, isActive |
| ILeaveService | leave | submitRequest, approveRequest, rejectRequest, cancelRequest, findById, findByEmployee, findPendingByManager |
| IBalanceService | balance | getBalance, deductBalance, restoreBalance, initializeBalance, getAllBalances |
| IPolicyService | policy | getPolicy, validateRequest, getDefaultEntitlement, isLeaveTypeAllowed |
| INotificationService | notification | notifyManager, notifyEmployee, notifyApprovalChain |
| IAuditService | audit | record, findByEntity, findByActor |

### Module Boundaries & Dependency Map

```
employee  ←── balance
employee  ←── notification
employee  ←── leave
balance   ←── leave
policy    ←── leave
notification ←── leave
audit     ←── leave
```

- **employee**, **audit**, and **policy** have zero module dependencies.
- **balance** and **notification** depend only on **employee**.
- **leave** is the orchestrator — depends on all five other modules.
- No circular dependencies. All edges flow inward.

### Module Directory Convention

Following the existing lowercase dot-notation convention from `src/modules/status/` and `src/modules/uptime/`:

```
src/modules/employee/   → employee.model.ts, employee.repository.ts, employee.service.ts, employee.service.interface.ts, employee.routes.ts, index.ts
src/modules/leave/      → leave.model.ts, leave.repository.ts, leave.service.ts, leave.service.interface.ts, leave.routes.ts, index.ts
src/modules/balance/    → balance.model.ts, balance.repository.ts, balance.service.ts, balance.service.interface.ts, index.ts
src/modules/policy/     → policy.model.ts, policy.repository.ts, policy.service.ts, policy.service.interface.ts, index.ts
src/modules/notification/ → notification.model.ts, notification.repository.ts, notification.service.ts, notification.service.interface.ts, index.ts
src/modules/audit/      → audit.model.ts, audit.repository.ts, audit.service.ts, audit.service.interface.ts, index.ts
```

The existing PascalCase module directories (`LeaveStatus/`, `LeaveRequest/`, `LeaveType/`, `LeavePolicy/`, `AuditLog/`, `AuditRecord/`, `AuditServiceInterface/`, `BaseEntity/`) are superseded by this design and should be removed.

### Reconciliation Notes

1. **Balance schema normalization**: The data design proposed a denormalized `leave_balances` table with per-type columns (`annual_entitlement`, `sick_entitlement`, etc.). Reconciled to the domain design's normalized approach — one row per `(employee_id, policy_id, fiscal_year)` — so new leave types can be added without schema changes.

2. **Employee fields**: The data design omitted `employee_number`, `department`, `hire_date`, `termination_date`, and `employment_status`. These are required by the domain design (BR-001 eligibility check, BR-008 manager lookup). Added to the reconciled `employees` table.

3. **LeaveRequest fields**: The data design used `reviewer_id`/`reviewed_at`/`review_comment`. Reconciled to the domain's `approvedBy`/`approvedAt` naming, with `review_comment` retained as a useful addition. The `leave_type_id` FK now references `leave_policies.id` (not a standalone leave_types table) since LeaveType is a value enum.

4. **Audit fields**: The data design had `changes` (JSON). Reconciled to `old_values` + `new_values` from the domain design (BR-012) for structured before/after tracking.

5. **Missing notification table**: The data design omitted the `notifications` table entirely. Added from the domain design to support BR-013.

6. **Stack compliance**: All three specialist designs are Fastify + PostgreSQL + TypeScript compliant. No corrections needed.

7. **GP alignment**: GP-001 (repository pattern) — all DB access through repository interfaces. GP-002 (audit) — AuditService.record called on every LeaveRequest state transition. GP-003 (input validation) — enforced in routes layer. GP-005 (RBAC) — manager approval validated against `employee.managerId`; route guards enforce role checks.

### Recommended Build Phases

| Phase | Modules | Rationale | Est. Files |
|---|---|---|---|
| 1 | employee, audit | Zero dependencies. Employee provides identity/manager lookup for all other modules. Audit is cross-cutting (GP-002). | 10 |
| 2 | policy, balance | Policy is standalone. Balance depends only on employee. Both are prerequisites for leave orchestration. Build in parallel. | 10 |
| 3 | notification | Depends only on employee. Required before Phase 4 so state-change notifications fire from day one. | 6 |
| 4 | leave (orchestrator) | Depends on all other modules. LeaveService orchestrates submit/approve/reject/cancel with full policy validation, balance deduction/restoration, notifications, and audit. | 8 |
<!-- gestalt:architecture feature=b05db51f-a0dc-4cb4-93b3-8c6655f6f6af END -->
