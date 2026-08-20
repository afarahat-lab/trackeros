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
src/modules/employee/employee.model.ts          — Employee entity + IEmployeeRepository interface
src/modules/employee/employee.repository.ts     — PgEmployeeRepository (pg Pool, parameterized queries, snake_case↔camelCase mapping)
src/modules/leave-policy/leave-policy.model.ts  — LeavePolicy entity + ILeavePolicyRepository + ILeavePolicyService interfaces
src/modules/leave-policy/leave-policy.repository.ts — PgLeavePolicyRepository (pg Pool, parameterized queries, snake_case↔camelCase mapping)
src/modules/leave-policy/leave-policy.service.ts — LeavePolicyService (stateless, delegates to ILeavePolicyRepository)
src/modules/status/                             — System status module (model, service interface, service)
src/modules/uptime/                             — Uptime health-check module (model, service interface, service, routes)
src/shared/types/index.ts                       — Shared enums: LeaveType, LeaveStatus, EmploymentStatus, BalanceStatus, NotificationType, NotificationStatus
src/shared/db/connection.ts                     — PostgreSQL pool (pg)
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against
- Repository implementations use a `mapRowTo*` function to convert
  snake_case database rows to camelCase entity objects, and a
  `COLUMN_MAP` lookup for dynamic UPDATE SET clause construction.
  All queries use parameterized placeholders (`$1`, `$2`, …).

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=3350baf6-9bd5-4cac-b688-f263972317f9 START -->
# Leave Management Module Architecture

## Overview
Modular monolith built with TypeScript, Fastify, PostgreSQL. The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve/reject, and the system to track leave balances.

## Domain Entities
- **LeaveRequest** – core leave application with lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED.
- **LeavePolicy** – rules per leave type (entitlement, accrual, notice, approval requirement).
- **Employee** – employee record with employment status and reporting line.
- **Balance** – per-employee, per-leave-type, per-fiscal-year entitlement tracking.
- **Notification** – event-driven notifications for leave lifecycle events.

## Modules
| Module | Path | Responsibility |
|--------|------|----------------|
| shared-types | src/shared/types/ | Enums: LeaveType, LeaveStatus, EmploymentStatus, BalanceStatus, NotificationType, NotificationStatus |
| employee | src/modules/employee/ | Employee entity, repository |
| leave-policy | src/modules/leave-policy/ | LeavePolicy entity, repository, service |
| balance | src/modules/balance/ | Balance entity, repository, service, controller, routes |
| leave-request | src/modules/leave-request/ | LeaveRequest entity, repository, service, controller, routes, validation |
| notification | src/modules/notification/ | Notification entity, repository, service |
| audit-log | src/modules/audit-log/ | AuditLog entity, repository |

## Dependency Map
- leave-request → shared-types, balance, leave-policy, employee, notification, audit-log
- balance → shared-types, leave-policy, employee
- leave-policy → shared-types
- employee → shared-types
- notification → shared-types, employee
- audit-log → shared-types, employee

## Database Tables (Conceptual)
- **leave_requests** (id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, rejection_reason, created_at, updated_at)
- **leave_balances** (id, employee_id, leave_type, fiscal_year, total_entitlement, used_days, remaining_days, status, created_at, updated_at)
- **leave_policies** (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
- **employees** (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at)
- **audit_logs** (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at)
- **notifications** (id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at)

## Cross-Cutting Contracts
- **Auth**: JWT bearer token → `request.user: { id: string; role: UserRole }` where `UserRole = 'employee' | 'manager' | 'hr_admin'`. RBAC enforced via `requireRole(...)` middleware.
- **Error Response**: `{ error: string; code: string }`. HTTP 400 (VALIDATION_ERROR), 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (NOT_FOUND), 422 (INSUFFICIENT_BALANCE), 409 (OVERLAPPING_REQUEST).
- **Transaction**: Multi-step writes (approve/cancel) use a caller-owned transaction. Repository methods accept an optional `pg.PoolClient`; the service acquires a client, runs `BEGIN`, passes it to repositories, then `COMMIT`/`ROLLBACK`.

## Phased Implementation
1. **Foundation**: shared-types, employee, leave-policy (models + repositories + service done; tests deferred)
2. **Balance & Audit**: balance module, audit-log module
3. **Core Workflow**: leave-request module, notification module

## Open Question
- Day-counting semantics (inclusive calendar days vs business days) – see open questions list.
<!-- gestalt:architecture feature=3350baf6-9bd5-4cac-b688-f263972317f9 END -->
