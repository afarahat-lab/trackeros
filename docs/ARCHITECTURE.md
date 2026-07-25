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
src/modules/
  status/           — Status module (health-check)
  uptime/           — Uptime module (system info)
  leaveType/        — LeaveType model, repository (Phase 2)
  leavePolicy/      — LeavePolicy model, repository (Phase 3)
  leaveBalance/     — LeaveBalance model, repository (Phase 4)
  leaveRequest/     — LeaveRequest model, repository, service, controller, routes (Phases 5-7)
  audit/            — AuditLog model, repository, service
  notification/     — Notification model, repository, service
  employee/         — Employee model, repository, service
src/shared/
  db/connection.ts
  db/base repository.ts
  types/error types.ts
  types/leave.enums.ts
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=022f5981-2f89-498b-906d-0f2e5bf44abd START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave. Managers approve or reject requests. The system tracks leave balances and enforces business rules around balance sufficiency, overlapping leaves, and minimum notice periods.

### Domain Entities

- **LeaveType** — reference data for leave categories (ANNUAL, SICK, EMERGENCY). Each type defines documentation requirements and maximum consecutive days. Lifecycle: ACTIVE, DEPRECATED.
- **LeavePolicy** — versioned rules per leave type: entitlement, carry-forward limits, notice periods, approval requirements. Lifecycle: ACTIVE, SUPERSEDED, REVOKED.
- **LeaveBalance** — per-employee, per-policy, per-fiscal-year tracking of entitled, used, pending, and carried-forward days. Lifecycle: ACTIVE, EXHAUSTED, FROZEN.
- **LeaveRequest** — the core application entity. Tracks the full lifecycle from DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED/CANCELLED.
- **LeaveStatus** — value object enumerating the states of a LeaveRequest.

### Business Rules

- **BR-001** — Balance Sufficiency: A request may only be submitted if `entitledDays - usedDays - pendingDays >= totalDays`.
- **BR-002** — No Overlapping Leaves: An employee cannot have two requests in SUBMITTED, UNDER_REVIEW, or APPROVED status with overlapping date ranges.
- **BR-003** — Minimum Notice: A request must be submitted at least `minNoticeDays` before the start date (emergency leave exempt).

### Conceptual Tables

| Table | Key Fields | Notes |
|-------|------------|-------|
| `leave_types` | id, code, label, status | Reference data; indexed on code (unique) and status. |
| `leave_policies` | id, leave_type_id, policy_name, entitlement_days_per_year, min_notice_days, status | Versioned rules; composite index on (leave_type_id, status) for active policy lookup. |
| `leave_requests` | id, employee_id, leave_type_id, start_date, end_date, total_days, status, reviewer_id | Core workflow entity; indexed on (employee_id, status) for self-service dashboard, and on dates for overlap detection. |
| `leave_balances` | id, employee_id, policy_id, fiscal_year, entitled_days, used_days, pending_days, remaining_days, status | Unique constraint on (employee_id, policy_id, fiscal_year). |
| `employees` | id, employee_number, email, manager_id, employment_status | Shared across modules; indexed for manager hierarchy and active status. |
| `audit_logs` | id, entity_type, entity_id, action, performed_by | GP-002 compliance; indexed on (entity_type, entity_id). |
| `notifications` | id, recipient_id, type, status | For notifying employees/managers; indexed on (recipient_id, status). |

### Module Boundaries

```
src/modules/
  leave-type/       — LeaveType model, repository, service, routes
  leave-policy/     — LeavePolicy model, repository, service, routes
  leave-balance/    — LeaveBalance model, repository, service
  leave-request/    — LeaveRequest model, LeaveStatus enum, repository, service, controller, routes
  audit/            — AuditLog model, repository, service
  notification/     — Notification model, repository, service
  employee/         — Employee model, repository, service
```

### Dependency Graph (acyclic)

```
leave-type  ◄── leave-policy  ◄── leave-balance  ◄── leave-request
employee    ◄── leave-balance
employee    ◄── leave-request
leave-type  ◄── leave-request
leave-policy ◄── leave-request
audit       ◄── leave-request
notification ◄── leave-request
```

`leave-request` is the sole outward-facing module; all others are internal dependencies.

### Layer Boundaries

- **Presentation**: Fastify routes + controllers in `leave-request` (the only module exposing HTTP endpoints).
- **Application**: Service interfaces + implementations in each module. `LeaveRequestService` orchestrates `LeavePolicyService`, `LeaveBalanceService`, `AuditService`, `NotificationService`, and `EmployeeService`.
- **Domain**: Models and enums owned by their respective modules.
- **Infrastructure**: PostgreSQL repositories (pg Pool from `src/shared/db/connection.ts`).

### Golden Principles Compliance

- **GP-001 (Repository pattern)**: Every module has its own repository interface; services call repositories, never raw SQL.
- **GP-002 (Audit records)**: `LeaveRequestService` calls `IAuditService.recordAudit()` on every state change (submit, approve, reject, cancel).
- **GP-003 (Input validation)**: `validateLeaveRequest()` runs before submit; controllers validate DTOs at the boundary.
- **GP-004 (No sensitive data in logs)**: Audit records exclude PII; notification messages carry no sensitive payloads.
- **GP-005 (RBAC enforcement)**: Routes in `leave-request` enforce role checks (employee vs manager vs admin) before delegating to the service.
- **GP-006 (Error handling)**: All async service methods are wrapped; repository errors propagate as typed domain errors.

### Recommended Build Phases

1. **Phase 1 — Foundation**: `leave-type` + `employee` (zero dependencies, referenced by all).
2. **Phase 2 — Policy & Cross-cutting**: `leave-policy` + `audit` + `notification` (parallelizable).
3. **Phase 3 — Balance engine**: `leave-balance` (depends on policy and employee).
4. **Phase 4 — Orchestration**: `leave-request` (depends on all prior phases; exposes the public API).

### Stack

- Language: TypeScript (Node 20)
- Framework: Fastify
- Database: PostgreSQL (via pg Pool)
- Architecture: modular-monolith
- Testing: Jest
<!-- gestalt:architecture feature=022f5981-2f89-498b-906d-0f2e5bf44abd END -->
