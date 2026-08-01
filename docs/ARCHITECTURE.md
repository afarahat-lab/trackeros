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

<!-- gestalt:architecture feature=35df38af-c9d7-41ee-b412-79ee8d149189 START -->
# Leave Management Module Architecture

## Overview
The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. The architecture follows a modular monolith style with Fastify (backend) and React Native (frontend), using PostgreSQL for persistence.

## Domain Entities
- **LeaveType**: Enum of leave categories (annual, sick, emergency, unpaid, maternity, paternity).
- **Employee**: Represents an employee with employment status (ACTIVE, INACTIVE, TERMINATED) and reporting line (managerId).
- **LeaveRequest**: Core entity tracking a leave application through lifecycle states: DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED. CANCELLED reachable from DRAFT, SUBMITTED, or APPROVED. REJECTED is terminal.
- **LeavePolicy**: Defines rules per leave type: entitlement days, accrual rate, max accumulation, minimum notice days, requires manager approval, active/inactive.
- **LeaveBalance**: Per-employee, per-policy, per-fiscal-year balance with total entitlement, used days, remaining days. Lifecycle: ACTIVE → EXHAUSTED → CLOSED.
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
- LeaveBalance: ACTIVE, EXHAUSTED, CLOSED.
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
<!-- gestalt:architecture feature=35df38af-c9d7-41ee-b412-79ee8d149189 END -->
