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
src/shared/db/connection.ts
src/shared/base.repository.ts
src/shared/error types.ts
```

## Key patterns

- **BaseRepository** (`src/shared/base.repository.ts`) — abstract generic class
  wrapping the `pg` Pool. Subclasses declare `tableName` and inherit
  `findById`, `findAll`, `insert`, `update`, and `delete`. All domain
  repositories extend this base (GP-001 compliance).
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

<!-- gestalt:architecture feature=ae6ff3fe-3b3c-4653-9431-c7cb221c59a9 START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, emergency, and other leave types. Managers approve or reject requests. The system tracks leave balances per employee per leave type per fiscal year, enforcing policies and maintaining a full audit trail.

### Domain Entities

- **LeaveRequest** — core aggregate representing an employee's leave application. Lifecycle: `DRAFT → SUBMITTED → (APPROVED | REJECTED) → CANCELLED` (terminal).
- **LeaveRequestStatus** — value object enumerating the five lifecycle states.
- **LeaveType** — catalog of leave categories (`annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`). Each type can be active or inactive.
- **LeavePolicy** — rules for a leave type: entitlement days, accrual rate, max accumulation, minimum notice, and whether manager approval is required.
- **LeaveBalance** — per-employee, per-type, per-year tracking of total entitlement, used days, pending days, and remaining days. Status: `ACTIVE`, `EXHAUSTED`, or `FROZEN`.
- **AuditLog** — immutable record of every state change on a LeaveRequest (GP-002 compliance).

### Module Boundaries

| Module | Path | Responsibility |
|--------|------|----------------|
| `leave-type` | `src/modules/leave-type/` | LeaveType enum and model |
| `leave-status` | `src/modules/leave-status/` | LeaveRequestStatus enum and model |
| `leave-policy` | `src/modules/leave-policy/` | LeavePolicy model, repository, service |
| `balance` | `src/modules/balance/` | LeaveBalance model, repository, service |
| `leave-request` | `src/modules/leave-request/` | LeaveRequest aggregate, repository, service, controller, Fastify routes |
| `audit-log` | `src/modules/audit-log/` | AuditLog model, repository, service |
| `notification` | `src/modules/notification/` | Notification service (alerts for applied/decided/low-balance) |

### Dependency Graph

```
leave-type  ←  leave-policy  ←  leave-request
leave-type  ←  balance       ←  leave-request
leave-status ←                ←  leave-request
                                leave-request → audit-log
                                leave-request → notification
```

All dependencies flow inward; no cycles. Only `leave-request` exposes HTTP endpoints.

### Database Tables (Conceptual)

- **leave_types** — `id`, `code`, `label`, `description`, `is_active`, `created_at`, `updated_at`
- **leave_policies** — `id`, `policy_name`, `leave_type_id` (FK), `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `is_active`, `created_at`, `updated_at`
- **leave_balances** — `id`, `employee_id` (FK), `leave_type_id` (FK), `policy_id` (FK), `fiscal_year`, `total_entitlement`, `used_days`, `pending_days`, `remaining_days`, `status`, `created_at`, `updated_at`
- **leave_requests** — `id`, `employee_id` (FK), `leave_type_id` (FK), `start_date`, `end_date`, `reason`, `status`, `approved_by` (FK), `approved_at`, `rejection_reason`, `created_at`, `updated_at`
- **audit_log** — `id`, `employee_id` (FK), `leave_request_id` (FK), `action`, `previous_state`, `new_state`, `performed_by`, `created_at`

### Key Business Rules

- **State transitions** are strictly enforced: DRAFT → SUBMITTED or CANCELLED; SUBMITTED → APPROVED, REJECTED, or CANCELLED; APPROVED → CANCELLED; REJECTED → DRAFT or CANCELLED; CANCELLED is terminal.
- **Manager approval**: only the employee's designated manager (via `Employee.managerId`) may approve/reject; self-approval is prohibited.
- **Balance updates**: on approval, `used_days` increases and `pending_days` decreases; on cancellation of an approved request, `used_days` decreases; on submission, `pending_days` increases.
- **Audit**: every state change writes an `audit_log` entry with previous and new states, actor, and timestamp.
- **RBAC**: routes are guarded — `apply` requires employee role, `approve`/`reject` require manager role.

### Implementation Phases

1. **Domain Primitives** — `leave-type` and `leave-status` modules (zero dependencies).
2. **Infrastructure** — `audit-log` and `notification` modules (cross-cutting, no domain deps).
3. **Domain Services** — `leave-policy` and `balance` modules (depend only on `leave-type`).
4. **Orchestration & API** — `leave-request` module (depends on all above, exposes Fastify routes).

### Stack Compliance

- Language: TypeScript (strict)
- Framework: Fastify (routes in `leave-request`)
- Database: PostgreSQL (accessed via `pg` Pool from `src/shared/db/connection.ts`)
- Architecture: modular monolith — each module is a directory under `src/modules/` with its own barrel export
- Testing: Jest (unit tests for services, integration tests for repositories)
- Golden Principles: GP-001 (repository pattern), GP-002 (audit), GP-003 (input validation at controller), GP-005 (RBAC), GP-006 (error handling) are all satisfied.
<!-- gestalt:architecture feature=ae6ff3fe-3b3c-4653-9431-c7cb221c59a9 END -->
