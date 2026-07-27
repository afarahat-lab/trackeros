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

<!-- gestalt:architecture feature=f06aa3d0-1181-4b12-bb08-810a726baf0a START -->
## Leave Management Module

### Domain Entities

- **LeaveRequest** — Represents an employee's leave application. Lifecycle: `DRAFT` → `SUBMITTED` → (`APPROVED` | `REJECTED`); `APPROVED` may transition to `CANCELLED`.
- **LeavePolicy** — Rules and entitlements per leave type. Lifecycle: `ACTIVE`, `INACTIVE`.
- **Employee** — Employee record with reporting hierarchy. Lifecycle: `ACTIVE`, `INACTIVE`, `TERMINATED`.
- **LeaveBalance** — Tracks entitlement, consumption, and remaining days per employee-policy-fiscal year. Lifecycle: `ACTIVE`, `EXHAUSTED`, `FROZEN`.
- **LeaveType** — Enum: `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`.

### Business Rules

- **BR-001** — Balance sufficiency: before approval, `remainingDays` must cover the leave duration; otherwise reject.
- **BR-002** — Manager approval gate: if `requiresManagerApproval` is true, only the employee's manager can approve/reject. No manager → auto-approve.
- **BR-003** — Minimum notice: if `minimumNoticeDays` is set, submission date to `startDate` must meet it; blocks `DRAFT` → `SUBMITTED`.
- **BR-004** — No retroactive leave: `startDate` ≥ submission date.
- **BR-005** — Date range validity: `endDate` ≥ `startDate`.
- **BR-006** — Balance deduction on approval: atomically increment `usedDays` and decrement `remainingDays`.
- **BR-007** — Balance restoration on cancellation: atomically decrement `usedDays` and increment `remainingDays`.

### Module Boundaries

```
leave (orchestrator)
 ├── leave-request
 │    ├── leave-type
 │    ├── leave-request-status
 │    └── employee
 ├── leave-balance
 │    ├── leave-type
 │    ├── employee
 │    └── leave-policy
 ├── leave-policy → leave-type
 ├── audit-log (no leave deps)
 ├── notification → employee
 └── employee
```

- **leave-type** — `LeaveType` enum.
- **leave-request-status** — `LeaveRequestStatus` enum (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`).
- **employee** — `Employee` model, `EmploymentStatus` enum, `IEmployeeRepository`.
- **leave-policy** — `LeavePolicy` model, `ILeavePolicyRepository`.
- **leave-balance** — `LeaveBalance` model, `BalanceStatus` enum, `ILeaveBalanceRepository`, `ILeaveBalanceService`, `LeaveBalanceService`.
- **leave-request** — `LeaveRequest` model, `ILeaveRequestRepository`.
- **audit-log** — `AuditLog` model, `IAuditLogRepository`, `IAuditLogService`, `AuditLogService`.
- **notification** — `INotificationService`, `NotificationService`.
- **leave** — `ILeaveService`, `LeaveService`, `LeaveController`, routes, validation schemas.

### Data Model (Conceptual)

| Table | Key Fields | Notes |
|-------|------------|-------|
| `employees` | id, employee_number, email, manager_id, employment_status | Unique on employee_number, email. Indexes on manager_id, department, status. |
| `leave_types` | id, code | Unique on code. |
| `leave_policies` | id, leave_type_id, is_active | FK to leave_types. Indexes on leave_type_id, is_active. |
| `leave_requests` | id, employee_id, leave_type_id, status, start_date, end_date, approved_by | FKs to employees (employee, approver) and leave_types. Indexes on employee_id, status, leave_type_id, date range, approved_by. |
| `leave_balances` | id, employee_id, policy_id, fiscal_year, status | FKs to employees, leave_policies. Unique on (employee_id, policy_id, fiscal_year). Indexes on employee_id, policy_id, fiscal_year. |
| `audit_logs` | id, entity_type, entity_id, action, performed_by, performed_at | FK to employees. Composite index on (entity_type, entity_id). Indexes on performed_by, performed_at, action. |

### Implementation Notes

- **Stack**: TypeScript, Fastify, PostgreSQL, React Native (frontend), modular-monolith.
- **Golden Principles**:
  - GP-001: All data access through repository interfaces (`ILeaveRequestRepository`, etc.).
  - GP-002: Every state change writes an audit record via `IAuditLogService`.
  - GP-003: Input validation at Fastify route boundary using `leaveValidationSchemas`.
  - GP-005: RBAC enforced in routes — employees manage own requests; managers approve/reject team requests.
  - GP-006: Async error handling with try/catch in services and controllers.
- **Phases**: Build in 7 phases — domain primitives first, then employee, policy, request, balance, cross-cutting services, and finally the leave orchestrator.
- **Transactions**: Balance deduction (BR-006) and restoration (BR-007) must run within a database transaction to ensure atomicity.
<!-- gestalt:architecture feature=f06aa3d0-1181-4b12-bb08-810a726baf0a END -->
