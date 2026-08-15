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
src/modules/employee/
  employee.model.ts          — Employee interface + EmploymentStatus enum import
  employee.repository.ts     — IEmployeeRepository + EmployeeRepository (Knex/raw SQL)
  index.ts                   — barrel export

src/modules/leave-policy/
  leave-policy.model.ts      — LeavePolicy interface + LeaveType enum import
  leave-policy.repository.ts — ILeavePolicyRepository + LeavePolicyRepository (Knex/raw SQL)
  index.ts                   — barrel export

src/modules/status/
  status.model.ts            — SystemStatus interface
  status.service.ts          — StatusService
  status.service.interface.ts
  index.ts

src/modules/uptime/
  uptime.model.ts            — UptimeStatus interface
  uptime.service.ts          — UptimeService
  uptime.service.interface.ts
  uptime.routes.ts           — Fastify route plugin
  index.ts

src/shared/
  types/index.ts             — canonical enums (LeaveType, LeaveRequestStatus,
                                BalanceStatus, AuditAction, EmploymentStatus)
  db/connection.ts           — pg Pool (DATABASE_URL)
  index.ts                   — barrel export
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

<!-- gestalt:architecture feature=e3db0103-c684-4a1d-bb0c-c812564d6aa7 START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities
- **LeaveRequest** — employee leave application; lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED; day count = (endDate - startDate + 1) inclusive.
- **LeaveBalance** — tracks entitlement, used, remaining per policy per fiscal year; lifecycle: ACTIVE, EXHAUSTED, FROZEN, CLOSED.
- **LeavePolicy** — rules for a leave type (entitlement, accrual, notice, approval requirement); lifecycle: ACTIVE, INACTIVE, ARCHIVED.
- **Employee** — employment status gates eligibility; managerId defines approval chain.
- **AuditLog** — immutable record of state changes (GP-002).
- **Notification** — user notifications (submitted, approved, rejected); lifecycle: UNREAD, READ.
- **Enums**: LeaveType, LeaveRequestStatus, BalanceStatus, AuditAction, EmploymentStatus (all in `src/shared/types/`).

### Conceptual Tables (no DDL)
- `leave_requests` (id, employee_id, policy_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at) — PK id; FKs employee_id→employees, policy_id→leave_policies, approved_by→employees.
- `leave_balances` (id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at) — PK id; FKs employee_id→employees, policy_id→leave_policies.
- `employees` (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at) — PK id; FK manager_id→employees.
- `leave_policies` (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at) — PK id.
- `audit_logs` (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at) — PK id.
- `notifications` (id, recipient_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at) — PK id; FK recipient_id→employees.

### Module Boundaries
- **shared-types** (`src/shared/types/`) — enums used by all modules.
- **employee** (`src/modules/employee/`) — Employee model, repository, service.
- **leave-policy** (`src/modules/leave-policy/`) — LeavePolicy model, repository, service.
- **leave-balance** (`src/modules/leave-balance/`) — LeaveBalance model, repository, service; depends on leave-policy.
- **audit** (`src/modules/audit/`) — AuditLog model, repository, service.
- **notification** (`src/modules/notification/`) — Notification model, repository, service.
- **leave-request** (`src/modules/leave-request/`) — orchestrator; depends on all other modules; contains controller, routes, DTOs.

### Dependency Map (DAG)
- leave-request → shared-types, leave-balance, leave-policy, employee, audit, notification
- leave-balance → shared-types, leave-policy
- leave-policy → shared-types
- employee → shared-types
- audit → shared-types
- notification → shared-types

### Recommended Phases
1. Shared types & foundation (enums, base patterns)
2. Employee & LeavePolicy modules (leaf modules)
3. Audit & Notification modules (cross-cutting infrastructure)
4. LeaveBalance module (depends on leave-policy)
5. LeaveRequest module (orchestrator, API surface)

### Cross-Cutting Contracts
- **Auth**: JWT bearer token → `request.user = { id: string; role: UserRole }`; UserRole = 'employee' | 'manager' | 'hr_admin'; RBAC via `requireRole` guard. Endpoints: POST /leave-requests (employee), PATCH /leave-requests/:id/submit (employee, own), PATCH /leave-requests/:id/approve (manager, team), PATCH /leave-requests/:id/reject (manager, team), GET /leave-requests (employee sees own; manager sees team; hr_admin sees all).
- **Error Response**: `{ error: string; code: string; details?: unknown }`. 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict.
- **Transaction**: Repository methods that participate in multi-step writes accept an optional `PoolClient`. The service owns the unit of work: acquires client, BEGIN, passes client to all participating repositories, COMMIT/ROLLBACK, releases client. Applies to submit, approve/reject, cancel operations.

### Open Questions
See the open questions list for unresolved decisions on fiscal year definition, cross-year split, sick leave notice, day counting (calendar vs business), fractional balance rounding, deduction timing, and overlap prevention.
<!-- gestalt:architecture feature=e3db0103-c684-4a1d-bb0c-c812564d6aa7 END -->
