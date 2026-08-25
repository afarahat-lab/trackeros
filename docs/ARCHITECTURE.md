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

<!-- gestalt:architecture feature=2a5d3d87-ce68-4c51-a1e4-6c85bde3c2fd START -->
# Leave Management Module — Reconciled Architecture

## Overview
Modular monolith built with TypeScript, Fastify, React Native, PostgreSQL. The leave management module enables employees to apply for annual, sick, and emergency leave; managers to approve or reject; and the system to track leave balances.

## Domain Entities

### LeaveRequest
Represents an employee's leave application. Lifecycle: DRAFT → SUBMITTED → {APPROVED | REJECTED}; SUBMITTED → DRAFT (withdraw); APPROVED → CANCELLED; DRAFT → CANCELLED. Terminal states: REJECTED, CANCELLED.

### LeaveRequestTransitions
Valid transitions: DRAFT→SUBMITTED (submit), SUBMITTED→APPROVED (approve), SUBMITTED→REJECTED (reject), SUBMITTED→DRAFT (withdraw), APPROVED→CANCELLED (cancel), DRAFT→CANCELLED (cancelDraft).

### LeaveBalance
Tracks entitlement per policy per fiscal year. Lifecycle: ACTIVE → EXHAUSTED (remainingDays=0); EXHAUSTED → ACTIVE (restored); ACTIVE/EXHAUSTED → CLOSED (fiscal year end).

### LeavePolicy
Defines rules for a leave type. Lifecycle: ACTIVE → INACTIVE → ARCHIVED; INACTIVE → ACTIVE.

### Employee
Organisation member. Lifecycle: ACTIVE → INACTIVE → TERMINATED; INACTIVE → ACTIVE.

## Business Rules (binding)
- Day count: calendar days inclusive, `(endDate - startDate) + 1`.
- Only ACTIVE employees may submit; only ACTIVE policies may be used.
- startDate ≥ today; endDate ≥ startDate.
- Minimum notice: `(startDate - today) >= policy.minimumNoticeDays` (if defined).
- Approval: balance sufficiency check (`remainingDays >= daysRequested`), fiscal year derived from startDate (default January).
- On approval: `usedDays += daysRequested`, `remainingDays -= daysRequested`; if remainingDays=0 → EXHAUSTED.
- On cancel from APPROVED: reverse deduction; if EXHAUSTED → ACTIVE.
- Manager authorisation: only employee's manager (or HR admin if no manager).
- Auto-approval when `policy.requiresManagerApproval === false`.
- One balance record per employee per policy per fiscal year; cross-fiscal-year requests rejected.
- Employee termination cascades: cancel all SUBMITTED and future APPROVED requests, restore balances.

## Conceptual Data Model

### employees
Fields: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at. PK: id. FK: manager_id → employees.id. Indexes: employee_number (unique), manager_id, employment_status.

### leave_policies
Fields: id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at. PK: id. Indexes: leave_type, is_active.

### leave_balances
Fields: id, employee_id, policy_id, fiscal_year, total_entitlement, used_days, remaining_days, status, created_at, updated_at. PK: id. FK: employee_id → employees.id, policy_id → leave_policies.id. Unique: (employee_id, policy_id, fiscal_year). Indexes: employee_id, policy_id.

### leave_requests
Fields: id, employee_id, policy_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at. PK: id. FK: employee_id → employees.id, policy_id → leave_policies.id, approved_by → employees.id. Indexes: employee_id, status, policy_id, start_date/end_date, (employee_id, status).

### audit_logs
Fields: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at. PK: id. FK: performed_by → employees.id. Indexes: performed_by, action, created_at, (entity_type, entity_id).

## Modules & Dependencies
- **shared-types** (`src/shared/types/`): enums, base interface, UserRole.
- **employee** (`src/modules/employee/`): Employee entity, repository, service.
- **policy** (`src/modules/policy/`): LeavePolicy entity, repository, service.
- **balance** (`src/modules/balance/`): LeaveBalance entity, repository, service.
- **audit** (`src/modules/audit/`): AuditRecord entity, repository, service.
- **leave** (`src/modules/leave/`): LeaveRequest entity, repository, service, controller, routes.

Dependencies flow inward: leave → {employee, policy, balance, audit} → shared-types. No circular dependencies.

## Phased Build Order
1. Shared types + Employee module
2. Policy module
3. Balance module
4. Audit module
5. Leave module (core)

## Cross-Cutting Contracts

### Auth
- Identity: `request.user: { id: string; role: UserRole }` (JWT bearer token).
- Roles: `employee`, `manager`, `hr_admin`.
- RBAC enforced via `requireRole(...)` Fastify route guard.
- Endpoint access: submit/cancel → employee; approve/reject/listTeam → manager; policy CRUD → hr_admin; listOwn → employee.

### Error Response
- Shape: `{ error: string; code: string; details?: unknown }`.
- 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND, 409 CONFLICT.

### Transaction
- Repository methods that participate in multi-step writes accept optional `client?: PoolClient`.
- Service owns unit of work: acquires client, BEGIN, passes client to repositories, COMMIT/ROLLBACK.

## Open Questions
1. Fiscal year start month (January vs configurable).
2. Overlapping leave request policy (reject vs allow).
3. Half-day leave support (full-day only vs flags vs DateTime).
4. RemainingDays computation (derived vs stored).
5. Fiscal-year carry-over and accrual rules.
<!-- gestalt:architecture feature=2a5d3d87-ce68-4c51-a1e4-6c85bde3c2fd END -->
