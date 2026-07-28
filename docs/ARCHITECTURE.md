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

<!-- gestalt:architecture feature=64ef9aee-d0bf-4d18-8535-7711e92e0c61 START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave. Managers approve or reject requests, and the system tracks leave balances per employee per leave type within a fiscal year. The module is built as a modular monolith using TypeScript, Fastify, PostgreSQL, and follows the project's golden principles (audit, RBAC, transaction semantics).

### Domain Entities

- **LeaveRequest** — Core aggregate representing a leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED; can be CANCELLED from DRAFT, SUBMITTED, or APPROVED. Carries full audit trail (who approved/rejected/cancelled and when).
- **LeaveBalance** — Tracks entitlement, used, remaining, and pending days for an employee per leave type per fiscal year. Lifecycle: ACTIVE, EXHAUSTED, FROZEN, CLOSED.
- **LeavePolicy** — Defines rules for a leave type (entitlement, accrual, notice period, max consecutive days, negative balance allowance). Lifecycle: ACTIVE, INACTIVE.
- **Employee** — Represents an employee with manager hierarchy (self-referencing managerId) and employment status (ACTIVE, INACTIVE, TERMINATED).
- **LeaveType** — Enum: ANNUAL, SICK, EMERGENCY.
- **LeaveRequestStatus** — Enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **BalanceStatus** — Enum: ACTIVE, EXHAUSTED, FROZEN, CLOSED.
- **EmploymentStatus** — Enum: ACTIVE, INACTIVE, TERMINATED.
- **AuditLog** — Immutable record of every state-changing operation (GP-002).

### Module Boundaries

| Module | Path | Responsibilities |
|--------|------|------------------|
| `leave-type` | `src/modules/leave-type/` | LeaveType enum and model |
| `leave-request-status` | `src/modules/leave-request-status/` | LeaveRequestStatus enum and model |
| `leave-policy` | `src/modules/leave-policy/` | LeavePolicy model, repository, service (CRUD for policies) |
| `leave-balance` | `src/modules/leave-balance/` | LeaveBalance model, BalanceStatus enum, repository, service (balance queries, deduction, credit, reservation) |
| `leave-request` | `src/modules/leave-request/` | LeaveRequest model, repository, service (submit, approve, reject, cancel), controller, routes |
| `audit-log` | `src/modules/audit-log/` | AuditLog model, repository, service (record and query audit trail) |
| `employee` | `src/modules/employee/` | Employee model, EmploymentStatus enum, repository (read-only for leave eligibility and manager lookup) |

### Dependency Map

- `leave-policy` → `leave-type`
- `leave-balance` → `leave-type`, `leave-policy`
- `leave-request` → `leave-type`, `leave-request-status`, `leave-policy`, `leave-balance`, `audit-log`, `employee`
- All other modules have zero dependencies.

Dependencies flow strictly inward; no circular dependencies.

### Business Rules (Enforced in Services)

- **BR-001** — Only ACTIVE employees may submit leave requests.
- **BR-002** — Manager approval: the employee's manager (Employee.managerId) must approve/reject; self-approval is prohibited.
- **BR-003** — On submission, balance sufficiency is checked (remainingDays >= requested days, unless policy allows negative balance). pendingDays is incremented.
- **BR-004** — On approval, pendingDays decremented, usedDays incremented, remainingDays recalculated. Balance may become EXHAUSTED.
- **BR-005** — On rejection, pendingDays decremented; usedDays/remainingDays unchanged.
- **BR-006** — On cancellation: if from APPROVED, restore usedDays and remainingDays; if from SUBMITTED, decrement pendingDays; if from DRAFT, no balance impact.
- **BR-007** — Date validation: startDate ≤ endDate, startDate not in past at submission, no overlapping APPROVED/SUBMITTED requests for same employee.

### Persistence (Conceptual Tables)

- **leave_types** — id, name, description, is_active, created_at, updated_at. Indexes: unique name, is_active.
- **leave_policies** — id, policy_name, leave_type_id (FK), entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, max_consecutive_days, allow_negative_balance, is_active, created_at, updated_at. Indexes: leave_type_id, is_active.
- **leave_requests** — id, employee_id (FK), leave_type_id (FK), start_date, end_date, reason, status, approved_by (FK), approved_at, rejected_by (FK), rejected_at, rejection_reason, cancelled_by (FK), cancelled_at, cancellation_reason, created_at, updated_at. Indexes: employee_id, status, leave_type_id, start_date/end_date, approved_by.
- **leave_balances** — id, employee_id (FK), leave_type_id (FK), policy_id (FK), fiscal_year_start, fiscal_year_end, total_entitlement, used_days, remaining_days, pending_days, status, created_at, updated_at. Unique composite index on (employee_id, leave_type_id, fiscal_year_start).
- **employees** — id, employee_number, first_name, last_name, email, manager_id (self FK), department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at. Indexes: unique email, manager_id, employment_status, deleted_at.
- **audit_logs** — id, entity_type, entity_id, action, old_values, new_values, performed_by (FK), ip_address, user_agent, performed_at, created_at. Indexes: (entity_type, entity_id), performed_by, performed_at, action.

All database access is through repository interfaces (GP-001). The code agent will generate migrations from these specifications.

### Service Interfaces (Key Methods)

- **ILeavePolicyService**: `getPolicyForType(leaveType, fiscalYear)`, `getAllPolicies(fiscalYear)`, `upsertPolicy(...)`.
- **ILeaveBalanceService**: `getBalance(employeeId, leaveType, fiscalYear)`, `getAllBalances(employeeId, fiscalYear)`, `deductBalance(...)`, `creditBalance(...)`, `reserveDays(employeeId, leaveType, days, fiscalYear)` (increments pendingDays), `releaseReservedDays(...)` (decrements pendingDays), `initializeBalance(...)`, `hasSufficientBalance(...)`.
- **ILeaveRequestService**: `submitLeaveRequest(employeeId, leaveType, startDate, endDate, reason)`, `approveLeaveRequest(requestId, approverId, comment)`, `rejectLeaveRequest(requestId, approverId, comment)`, `cancelLeaveRequest(requestId, employeeId)`, `getLeaveRequest(requestId)`, `getEmployeeLeaveRequests(employeeId, filters)`, `getPendingRequestsForManager(managerId, filters)`, `getLeaveHistory(employeeId, fiscalYear)`.
- **IAuditService**: `record(actorId, action, entityType, entityId, oldState, newState)`, `getAuditTrail(entityType, entityId)`, `getAuditTrailByActor(actorId, dateRange)`.
- **IEmployeeRepository**: `findById(id)`, `findByManagerId(managerId)`, `findActive()`, `findByEmail(email)`.

### Implementation Phases

1. **Foundation** — Build `leave-type`, `leave-request-status`, `audit-log`, and `employee` modules. These have no leave-domain dependencies and establish the enums, audit infrastructure, and employee data access.
2. **Policy & Balance** — Build `leave-policy` and `leave-balance`. They depend only on `leave-type` and form the rules engine.
3. **Core** — Build `leave-request` service, controller, and routes. This module orchestrates all other modules, enforces business rules, and exposes the HTTP API.

### Stack Compliance

- Language: TypeScript (strict)
- Framework: Fastify (routes/controllers)
- Database: PostgreSQL via `pg` Pool (`src/shared/db/connection.ts`)
- Architecture: modular-monolith with clear module boundaries and dependency direction
- Golden Principles: GP-001 (repository pattern), GP-002 (audit via AuditLog), GP-003 (input validation at controller), GP-005 (RBAC at route level using manager hierarchy)
<!-- gestalt:architecture feature=64ef9aee-d0bf-4d18-8535-7711e92e0c61 END -->
