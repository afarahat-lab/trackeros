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
src/shared/db/connection.ts
src/shared/db/base repository.ts
src/shared/error types.ts
src/shared/types/leave.types.ts
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

<!-- gestalt:architecture feature=a88212d7-6a1c-4612-8a09-8a5db627b262 START -->
## Leave Management — Feature Architecture

### Reconciled Design Summary

The three specialist designs (domain, data, application) have been reconciled into a single coherent architecture. Conflicts resolved, stack compliance verified, and completeness ensured.

---

### Domain Entities

| Entity | Purpose | Lifecycle States |
|--------|---------|-----------------|
| **LeaveRequest** | Central entity representing an employee's leave application. Tracks full lifecycle from draft through submission, approval/rejection, and optional cancellation. | DRAFT → SUBMITTED → APPROVED / REJECTED / CANCELLED |
| **LeavePolicy** | Defines rules and entitlements for a leave category (annual, sick, emergency, etc.). Governs entitlement days, accrual, notice periods, and approval requirements. | ACTIVE → INACTIVE → ARCHIVED |
| **LeaveBalance** | Tracks an employee's entitlement, usage, remaining, and pending days per policy per fiscal year. Authoritative source for balance queries. | ACTIVE → EXHAUSTED / FROZEN / CLOSED |
| **Employee** | Represents an employee. Actor who requests leave; subject whose balances are tracked. managerId links to approving manager. | ACTIVE → INACTIVE → TERMINATED |
| **LeaveType** (enum) | Enumeration: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY. Each maps to a LeavePolicy. | N/A (enum) |

**Naming reconciliation**: Domain's `leaveTypeId` on LeaveRequest was canonicalized to `leavePolicyId` — the FK points to `leave_policies.id`, not a type enum. The `LeaveType` enum is a property of `LeavePolicy`, not a direct FK on `LeaveRequest`.

---

### Business Rules (from domain design, preserved)

- **BR-001 — Balance Sufficiency**: Submission requires `remainingDays - pendingDays >= requested working days`. EXHAUSTED/FROZEN balances block submission.
- **BR-002 — Manager Approval**: Only the employee's manager (`employee.managerId`) may approve/reject. Self-approval prohibited.
- **BR-004 — Minimum Notice**: When `minimumNoticeDays > 0`, submission requires `(startDate - today) >= minimumNoticeDays`. EMERGENCY leave exempt.
- **BR-005 — Date Validity**: `startDate <= endDate`; startDate not in past at submission; both dates in same fiscal year as balance.
- **BR-006 — Active Employee Only**: Only `employmentStatus = ACTIVE` employees may create/submit requests.
- **BR-007 — Active Policy Only**: Only `isActive = true` policies may be referenced.
- **BR-008 — Balance Reservation on Submit**: DRAFT → SUBMITTED increments `pendingDays` by working days in request.

> Note: BR-003 was absent from the domain design (numbering gap). No rule was fabricated.

---

### Conceptual Table Specifications (no DDL)

#### `employees`
- **Fields**: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at
- **PK**: id
- **FKs**: manager_id → employees.id
- **Index rationale**: email (unique auth lookup), manager_id (direct-report queries), employment_status (eligibility filtering), department (team calendar views)

#### `leave_policies`
- **Fields**: id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at
- **PK**: id
- **Index rationale**: leave_type (filtered lookups by category), is_active (partial index on `is_active = true` for dropdowns)

#### `leave_balances`
- **Fields**: id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, pending_days, fiscal_year, status, created_at, updated_at
- **PK**: id
- **FKs**: employee_id → employees.id, leave_policy_id → leave_policies.id
- **Index rationale**: (employee_id, leave_policy_id, fiscal_year) unique constraint (one row per employee per policy per year), employee_id (dashboard listing), fiscal_year (accrual batch jobs)

#### `leave_requests`
- **Fields**: id, employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, cancelled_by, cancelled_at, cancellation_reason, created_at, updated_at
- **PK**: id
- **FKs**: employee_id → employees.id, leave_policy_id → leave_policies.id, approved_by → employees.id, rejected_by → employees.id, cancelled_by → employees.id
- **Index rationale**: employee_id (employee's own requests), status (pending-approval dashboards), start_date/end_date (calendar queries + overlap detection), approved_by (manager history), (employee_id, status) compound (my pending requests)

#### `audit_logs`
- **Fields**: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at
- **PK**: id
- **FKs**: performed_by → employees.id
- **Index rationale**: (entity_type, entity_id) (resource audit trail), performed_by (compliance queries), performed_at (time-range reports), action (approval-history views)

**Reconciliation note**: Data design was missing `rejected_by`, `rejected_at`, `rejection_reason`, `cancelled_by`, `cancelled_at`, `cancellation_reason` on `leave_requests` and `pending_days` on `leave_balances`. These were added from the domain design to ensure the full lifecycle is persisted.

---

### Repository Interfaces & Concrete Implementations

All repositories backed by PostgreSQL via shared connection pool at `src/shared/db/connection.ts`.

| Interface | Concrete | Module |
|-----------|----------|--------|
| `IEmployeeRepository` | `PgEmployeeRepository` | employee |
| `ILeavePolicyRepository` | `PgLeavePolicyRepository` | policy |
| `ILeaveBalanceRepository` | `PgLeaveBalanceRepository` | balance |
| `ILeaveRequestRepository` | `PgLeaveRequestRepository` | leave |
| `IAuditLogRepository` | `PgAuditLogRepository` | shared (cross-cutting) |

**Key repository methods** (reconciled from data design):

- **ILeaveRequestRepository**: `findById`, `findByEmployeeId`, `findByApproverId`, `findOverlapping`, `create`, `updateStatus`, `update`, `cancel`
- **ILeaveBalanceRepository**: `findByEmployeeId`, `findByEmployeeAndPolicy`, `create`, `update`, `deductDays`, `addPendingDays`
- **ILeavePolicyRepository**: `findById`, `findAllActive`, `findByLeaveType`, `create`, `update`, `deactivate`
- **IEmployeeRepository**: `findById`, `findByEmail`, `findByManagerId`, `findByDepartment`, `findActive`
- **IAuditLogRepository**: `create`, `findByEntity`, `findByPerformer`, `findByDateRange`

---

### Module Boundaries

| Module | Path | Owns |
|--------|------|------|
| **employee** | `src/modules/employee/` | model, repository, service interface, service, controller, routes, index |
| **policy** | `src/modules/policy/` | model, repository, service interface, service, controller, routes, index |
| **balance** | `src/modules/balance/` | model, repository, service interface, service, controller, routes, index |
| **notification** | `src/modules/notification/` | model, repository, service interface, service, controller, routes, index |
| **leave** | `src/modules/leave/` | model, repository, service interface, service, controller, routes, index |

---

### Dependency Map (no cycles)

```
employee ←── balance ←── policy
   ↑            ↑
   |            |
   └── notification
        ↑
        └────── leave ──────────┘
                 ↑
                 └── balance, employee, policy, notification
```

- **employee**: leaf — zero dependencies
- **policy**: leaf — zero dependencies
- **balance**: depends on employee + policy
- **notification**: depends on employee
- **leave**: depends on balance + employee + policy + notification (orchestrator)

---

### Service Interfaces (reconciled)

| Service | Key Methods |
|---------|------------|
| **IEmployeeService** | `getEmployee`, `getManager`, `getEmployeesByManager`, `isManagerOf` |
| **IPolicyService** | `getPolicy`, `getAllPolicies`, `getDefaultEntitlement`, `validateLeaveRequest`, `isLeaveTypeAllowed` |
| **IBalanceService** | `getBalance`, `getAllBalances`, `deductBalance`, `creditBalance`, `initializeBalances`, `hasSufficientBalance` |
| **INotificationService** | `notifyLeaveApplied`, `notifyLeaveApproved`, `notifyLeaveRejected`, `notifyLeaveCancelled`, `notifyBalanceLow` |
| **ILeaveService** | `applyLeave`, `approveLeave`, `rejectLeave`, `cancelLeave`, `getLeaveRequest`, `getLeaveRequestsByEmployee`, `getPendingLeaveRequests`, `getLeaveRequestsByStatus` |

**LeaveService is the orchestrator** — it coordinates the full leave lifecycle across balance, policy, employee, and notification. No other service calls across module boundaries at the service layer.

---

### Golden Principles Compliance

- **GP-001 (Repository pattern)**: All DB access through repository interfaces; services never query directly.
- **GP-002 (Audit records)**: Every state-changing operation in LeaveService and BalanceService writes to `audit_logs` via `IAuditLogRepository`.
- **GP-003 (Input validation)**: Controllers validate all inputs at API boundaries before delegating to services.
- **GP-004 (No sensitive data in logs)**: Audit logs capture entity state changes, never PII/passwords/tokens.
- **GP-005 (RBAC enforcement)**: Enforced at controller layer. Manager-only operations (`approveLeave`, `rejectLeave`, `getPendingLeaveRequests`) gated by role checks.
- **GP-006 (Error handling)**: All async operations wrapped; no unhandled promise rejections.

---

### Recommended Build Phases

| Phase | Title | Depends On | Files |
|-------|-------|-----------|-------|
| 1 | Foundation: employee + policy | None (leaf modules) | ~14 |
| 2 | Balance module | employee, policy | ~7 |
| 3 | Notification module | employee | ~7 |
| 4 | Leave module (core orchestration) | balance, employee, policy, notification | ~7 |

Phase ordering respects the dependency DAG. Each phase fits within Aider's effective context window.

---

### Reconciliation Notes

1. **Naming conflicts resolved**: Domain's `leaveTypeId` → `leavePolicyId` (canonical). Data's `LeaveStatus` → `LeaveRequestStatus` (canonical). App's `Balance` → `LeaveBalance` (canonical).
2. **Missing fields added**: `leave_requests` table was missing rejection and cancellation fields from domain design — added. `leave_balances` was missing `pending_days` — added.
3. **Stack compliance**: All three designs use Fastify + PostgreSQL + TypeScript. No corrections needed.
4. **Phase reordering**: App design listed phases as 1,2,4,3 — reordered to 1,2,3,4 for correct dependency ordering.
5. **Stale modules removed**: Existing ARCHITECTURE.md referenced `LeaveStatus`, `BaseEntity`, `LeaveRequest`, `LeaveType`, `LeavePolicy`, `AuditLog`, `AuditRecord`, `AuditServiceInterface` as separate modules. These are superseded by the 5-module reconciled design above.
<!-- gestalt:architecture feature=a88212d7-6a1c-4612-8a09-8a5db627b262 END -->
