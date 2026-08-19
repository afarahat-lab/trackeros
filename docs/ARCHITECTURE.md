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
src/shared/types/index.ts   — Shared enums: LeaveRequestStatus, LeaveType, AuditAction
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

<!-- gestalt:architecture feature=63ff1071-5533-4487-9cf5-cd66e5b8b64e START -->
## Leave Management Module – Reconciled Architecture

### Overview
Modular monolith built with TypeScript, Fastify, PostgreSQL, and React Native (frontend). The leave management module enables employees to apply for annual, sick, and emergency leave; managers to approve or reject; and the system to track leave balances atomically.

### Domain Entities
- **LeaveRequest** – Full lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED; cancellable from DRAFT, SUBMITTED, or APPROVED. Tracks employee, policy, dates, status, and actor timestamps.
- **LeavePolicy** – Defines entitlement, accrual, notice, and approval rules per leave type. Lifecycle: ACTIVE ↔ INACTIVE.
- **LeaveBalance** – Per-employee, per-policy, per-fiscal-year balance. Lifecycle: ACTIVE → EXHAUSTED → CLOSED. `remainingDays` is derived (`totalEntitlement - usedDays`) but stored denormalized.
- **Enums** – `LeaveRequestStatus`, `LeaveType`, `AuditAction`.

### Database Tables (Conceptual)
- **leave_requests** – Core request table with full lifecycle fields (approved_by, rejected_by, cancelled_by, etc.). Indexed for employee, status, policy, and date-range queries.
- **leave_policies** – Policy definitions. Indexed by leave_type and is_active.
- **leave_balances** – Balance tracking. Unique compound index on (employee_id, leave_policy_id, fiscal_year).

### Modules & Dependency Graph
```
shared/types/  ← zero dependencies
employee/      ← shared/types/
audit/         ← shared/types/
policy/        ← shared/types/
balance/       ← shared/types/, employee/, policy/, audit/
leave/         ← shared/types/, employee/, balance/, policy/, notification/, audit/
notification/  ← shared/types/, employee/
```

### Build Phases
1. **Shared types** – Enums (LeaveRequestStatus, LeaveType, AuditAction). ✅ IMPLEMENTED
2. **Employee module** – Employee model, repository, service.
3. **Audit module** – Audit record model, repository, service.
4. **Policy module** – LeavePolicy model, repository, service.
5. **Balance module** – Balance model, repository, service (deduct/restore).
6. **Leave module** – LeaveRequest model, repository, service, controller, routes.
7. **Notification module** – Notification model, repository, service.

### Cross-Cutting Contracts
- **Auth** – JWT bearer tokens. Auth middleware populates `request.user` with `{ id, role }`. Roles: `employee`, `manager`, `hr_admin`. RBAC enforced via `requireRole(...)` guard.
- **Transaction** – Repository methods accept optional `client: PoolClient`. Service owns unit of work (BEGIN/COMMIT/ROLLBACK). Required for approve, reject, and cancel operations to keep status and balance atomic.
- **Error Response** – `{ error: string; code: string }`. HTTP 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 422 (business rule violation).

### Open Questions (Require Stakeholder Decision)
1. **Day counting semantics** – Calendar vs business days, inclusive vs exclusive.
2. **Post-startDate cancellation** – Allowed? Prorated restoration?
3. **Fiscal year definition** – Calendar, configurable company year, or per-employee anniversary?

These decisions directly impact balance arithmetic, validation, and rollover logic. They must be resolved before implementation of the balance and leave services.
<!-- gestalt:architecture feature=63ff1071-5533-4487-9cf5-cd66e5b8b64e END -->
