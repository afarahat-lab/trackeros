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
src/modules/leave/
  leave-policy.model.ts          — LeavePolicy interface
  leave-policy.repository.ts     — ILeavePolicyRepository + LeavePolicyRepository
  leave-balance.model.ts         — LeaveBalance interface
  leave-balance.repository.ts    — ILeaveBalanceRepository + LeaveBalanceRepository
src/modules/status/
  index.ts
  status.model.ts
  status.service.interface.ts
  status.service.ts
src/modules/uptime/
  index.ts
  uptime.model.ts
  uptime.routes.ts
  uptime.service.interface.ts
  uptime.service.ts
src/shared/
  db/connection.ts               — pg Pool singleton
  types/index.ts                 — LeaveType, LeaveRequestStatus, BalanceStatus enums
  base-repository.ts             — abstract BaseRepository<T>
  error-types.ts                 — NotFoundError, ValidationError, ConflictError
src/app.ts                       — Fastify app bootstrap
src/index.ts                     — entry point
tests/unit/
  shared/types.test.ts
  shared/error-types.test.ts
  shared/base-repository.test.ts
  modules/leave/leave-policy.repository.test.ts
  modules/leave/leave-balance.repository.test.ts
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

<!-- gestalt:architecture feature=e7c49d71-30a2-45f6-9ac3-179c69d7de0f START -->
## Leave Management Module — Reconciled Architecture

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. The architecture follows a modular-monolith style with Fastify (TypeScript), PostgreSQL, and React Native frontend.

### Domain Entities

- **LeaveRequest** — central aggregate; lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED. References `leavePolicyId` (not `leaveTypeId`) to link to the governing policy.
- **LeavePolicy** — defines rules per leave type (entitlement, accrual, notice, approval requirements). Lifecycle: ACTIVE ↔ INACTIVE → ARCHIVED.
- **LeaveBalance** — per-employee, per-policy, per-fiscal-year balance with `pendingDays` to prevent over-application. Lifecycle: ACTIVE → EXHAUSTED/FROZEN/ROLLED_OVER.
- **Employee** — actor and subject; employment status gates eligibility. Lifecycle: ACTIVE ↔ INACTIVE → TERMINATED.
- **LeaveType** enum — ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY.
- **LeaveRequestStatus** enum — DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **BalanceStatus** enum — ACTIVE, EXHAUSTED, FROZEN, ROLLED_OVER.

### Database Tables (Conceptual)

| Table | Key Fields | Notes |
|-------|------------|-------|
| `leave_request` | id, employee_id, leave_policy_id, start_date, end_date, status, approved_by, cancelled_by, cancellation_reason | FK to employee, leave_policy. Indexes on employee_id, status, date range, leave_policy_id. |
| `leave_balance` | id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, pending_days, fiscal_year, status | Unique constraint on (employee_id, leave_policy_id, fiscal_year). |
| `leave_policy` | id, policy_name, leave_type, entitlement_days, requires_manager_approval, is_active, allows_negative_balance, max_consecutive_days | Indexes on leave_type, is_active. |
| `audit_log` | id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at | FK to employee. Indexes for entity lookups and time-range queries. |
| `employee` | id, employee_number, email, manager_id, employment_status | FK self-reference for manager. Unique indexes on employee_number, email. |
| `notification` | id, recipient_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at | FK to employee. Indexes for recipient and read status. |

### Module Boundaries

- **leave-request** (`src/modules/leave/`) — orchestrates the full lifecycle; depends on all other modules.
- **leave-balance** (`src/modules/leave/`) — balance arithmetic and state transitions.
- **leave-policy** (`src/modules/leave/`) — policy definitions and validation (model + repository implemented).
- **employee** (`src/modules/employee/`) — employee identity, manager chain, status checks.
- **audit** (`src/modules/audit/`) — cross-cutting audit trail (GP-002).
- **notification** (`src/modules/notification/`) — fire-and-forget status notifications.

### Dependency Map

```
leave-request ──► leave-balance ──► leave-policy
     │                │
     │                ├──► employee
     │                │
     ├──► leave-policy │
     ├──► employee     │
     ├──► audit ◄──────┘
     └──► notification

audit ──► employee
notification ──► employee
```

No cycles. All dependencies point inward.

### Recommended Build Phases

1. **Foundation** — Employee, LeavePolicy, Audit (zero leave-module dependencies).
2. **LeaveBalance** — depends on Phase 1.
3. **Notification** — standalone, can parallel Phase 2.
4. **LeaveRequest** — integrates all prior phases.

### Key Reconciliation Decisions

- **leaveTypeId → leavePolicyId**: The domain entity `LeaveRequest` originally had `leaveTypeId`, but the data design correctly uses `leave_policy_id` to reference the policy that governs the leave type. The reconciled entity uses `leavePolicyId`. The application service `submitLeaveRequest` accepts a `leaveType` enum and internally resolves the active policy.
- **Missing fields added**: `cancellation_reason`, `cancelled_by`, `cancelled_at` added to `leave_request`; `pending_days` added to `leave_balance`; `allows_negative_balance` and `max_consecutive_days` added to `leave_policy`.
- **Notification table supplied**: The data architect omitted a notification table; a minimal `notification` table is included to support the notification module.
- **Employee table included**: Although owned by the employee module, the employee table is specified here because it is referenced by foreign keys in all leave tables.
- **Stack compliance**: All designs use TypeScript, Fastify, PostgreSQL, and the modular-monolith style. No corrections needed.
- **Audit and RBAC**: Every state-changing operation writes an audit record (GP-002). RBAC is enforced at the route layer (GP-005).

### Business Rules Summary

All business rules (BR-001 through BR-015) from the domain design are preserved. Key rules include balance sufficiency with pending days, overlap prevention, self-approval prohibition, auto-approval for non-manager-approved leave types, fiscal-year splitting, and cancellation windows.
<!-- gestalt:architecture feature=e7c49d71-30a2-45f6-9ac3-179c69d7de0f END -->
