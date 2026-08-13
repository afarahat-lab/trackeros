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

## Module structure (current)

```
src/modules/status/          — SystemStatus model + service
src/modules/uptime/          — UptimeStatus model + service + routes
src/modules/leave-policy/    — LeaveType model + repository + barrel
                                LeavePolicy model + repository
src/modules/leave-balance/   — LeaveBalance model + repository + barrel
src/modules/leave-request/   — LeaveRequest model + repository + barrel
src/shared/db/connection.ts  — PostgreSQL connection pool
src/shared/types/            — Shared type definitions
  ├── leave-status.enum.ts   — LeaveStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED)
  ├── leave-type-code.enum.ts — LeaveTypeCode enum (annual, sick, emergency, unpaid, maternity, paternity)
  └── index.ts               — Barrel re-exporting LeaveStatus and LeaveTypeCode
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

<!-- gestalt:architecture feature=32ad270f-dfe8-4e32-be27-804897fcc970 START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities

- **LeaveRequest** — Central aggregate. Lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED); any non-terminal state → CANCELLED. REJECTED is terminal (no resubmission — create new request).
- **LeaveRequestStatus** — Enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **LeaveType** — Catalog of leave categories (annual, sick, emergency, unpaid, maternity, paternity). Lifecycle: ACTIVE, INACTIVE.
- **LeavePolicy** — Rules per leave type: entitlement, accrual, notice, approval flag. Lifecycle: ACTIVE, INACTIVE.
- **LeaveBalance** — Per-employee, per-policy, per-fiscal-year balance. Tracks totalEntitlement, usedDays, pendingDays, remainingDays. Lifecycle: ACTIVE, CLOSED.
- **Employee** — Organisation member with manager hierarchy and employment status (ACTIVE, INACTIVE, TERMINATED).
- **Notification** — Domain event for leave lifecycle transitions. Lifecycle: PENDING, SENT, READ, ARCHIVED.

### Key Business Rules (Binding)

1. **Inclusive day counting**: `requestedDays = (endDate - startDate) + 1` (calendar days).
2. **State transitions**: Only DRAFT→SUBMITTED, DRAFT→CANCELLED, SUBMITTED→APPROVED, SUBMITTED→REJECTED, SUBMITTED→CANCELLED, APPROVED→CANCELLED. REJECTED is terminal.
3. **Balance impact**: SUBMITTED increments pendingDays; APPROVED decrements pendingDays and increments usedDays; REJECTED decrements pendingDays; CANCELLED (from APPROVED) decrements usedDays (restores balance). DRAFT has no impact.
4. **Sufficiency check**: Before DRAFT→SUBMITTED, `remainingDays - pendingDays >= requestedDays`.
5. **Manager routing**: Request routed to employee.managerId; if null, auto-escalated to ADMIN. If LeavePolicy.requiresManagerApproval is false, auto-approve on submission.
6. **Minimum notice**: If LeavePolicy.minimumNoticeDays > 0, `startDate - submissionDate >= minimumNoticeDays`.
7. **Employee eligibility**: Only ACTIVE employees may create/submit requests.
8. **Active leave type/policy**: Only active LeaveType and LeavePolicy may be used.
9. **Overlap prevention**: No two SUBMITTED or APPROVED requests for same employee may have overlapping date ranges.
10. **Rejection reason**: Required when transitioning to REJECTED.
11. **Date validity**: `endDate >= startDate`.

### Module Boundaries

| Module | Path | Responsibilities |
|--------|------|------------------|
| shared-types | src/shared/types/ | LeaveStatus and LeaveTypeCode enums |
| audit | src/modules/audit/ | AuditRecord model, repository, service |
| leave-policy | src/modules/leave-policy/ | LeaveType and LeavePolicy models, repositories, service, routes |
| leave-balance | src/modules/leave-balance/ | LeaveBalance model, repository, service, routes |
| notification | src/modules/notification/ | Notification model, repository, service |
| leave-request | src/modules/leave-request/ | LeaveRequest model, repository, service, routes |

### Dependency Map

- leave-policy → shared-types, audit
- leave-balance → shared-types, leave-policy, audit
- notification → shared-types
- leave-request → shared-types, leave-policy, leave-balance, audit, notification

### Conceptual Data Model (Tables)

- **leave_types**: id, code, label, description, is_active, created_at, updated_at
- **leave_policies**: id, policy_name, leave_type_id (FK), entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at
- **employees**: id, employee_number, first_name, last_name, email, manager_id (FK self), department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at
- **leave_requests**: id, employee_id (FK), leave_type_id (FK), start_date, end_date, reason, status, approved_by (FK), approved_at, rejected_by (FK), rejected_at, rejection_reason, created_at, updated_at
- **leave_balances**: id, employee_id (FK), policy_id (FK), total_entitlement, used_days, pending_days, remaining_days, fiscal_year, status, created_at, updated_at
- **audit_logs**: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at
- **notifications**: id, recipient_id (FK), type, title, message, related_entity_type, related_entity_id, status, created_at, read_at

### Cross-Cutting Contracts

**Auth Contract**
- `request.user: { id: string; role: UserRole }`
- `UserRole = 'employee' | 'manager' | 'hr_admin'`
- JWT bearer verified by auth middleware; RBAC enforced by `requireRole(...)` route guard.

**Transaction Contract**
- Repository methods accept optional `PoolClient` parameter (defaults to shared pool).
- Service owns unit of work: acquires client, `BEGIN`, passes client to all participating repositories, `COMMIT` or `ROLLBACK`.
- Required for leave-approval flow: updating leave_requests.status, leave_balances.used_days/pending_days/remaining_days, and inserting audit_logs row must be atomic.

**Error Response Contract**
- Standard shape: `{ error: string; code: string }`
- Validation failure → 400 (VALIDATION_ERROR)
- Authentication failure → 401 (UNAUTHORIZED)
- Authorization failure → 403 (FORBIDDEN)
- Not found → 404 (NOT_FOUND)
- Insufficient balance → 400 (INSUFFICIENT_BALANCE)
- Policy violation → 400 (POLICY_VIOLATION)
- Invalid state transition → 409 (INVALID_STATE)

### Build Progress

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Shared enums: LeaveStatus, LeaveTypeCode under `src/shared/types/` |
| 2 | ✅ Complete | LeaveType model + repository (leave-policy module) |
| 3 | ✅ Complete | LeavePolicy model + repository (leave-policy module) |
| 4 | ✅ Complete | LeaveBalance model + repository (leave-balance module) |
| 5 | ✅ Complete | LeaveRequest model + repository (leave-request module) |
| 6 | Pending | AuditRecord model + repository (audit module) |
| 7 | Pending | Notification model + repository (notification module) |
| 8 | Pending | LeavePolicyService (leave-policy module) |
| 9 | Pending | LeaveBalanceService (leave-balance module) |
| 10 | Pending | LeaveRequestService + routes (leave-request module) |

### Implementation Notes

- **LeaveBalance.remainingDays** is a computed field: `totalEntitlement - usedDays - pendingDays`. The `rowToLeaveBalance` mapper computes it at read time regardless of the stored `remaining_days` column value, ensuring the invariant is always satisfied.
- **LeaveBalanceRepository** constructor accepts an optional `Queryable` client (defaults to the shared pool), enabling transaction participation per the Transaction Contract.
- **createBatch** uses a single multi-row INSERT for efficiency when initializing balances for multiple policies at once.
- **LeaveRequestRepository** follows the same `Queryable` pattern: constructor accepts an optional client defaulting to the shared pool. The `updateStatus` method dynamically builds SET clauses and clears opposing metadata based on target status (APPROVED clears rejection fields, REJECTED clears approval fields, DRAFT/SUBMITTED/CANCELLED clears both). The `findOverlapping` method uses `start_date <= $3 AND end_date >= $2` for overlap detection and supports an `excludeStatuses` parameter to filter out CANCELLED/REJECTED/DRAFT requests.

### Open Questions

- Fiscal year boundary (calendar, anniversary, configurable)
- Accrual mechanics (lump-sum, monthly, per-pay-period, tenure-based)
- Emergency leave special rules (bypass notice/approval, separate pool)
- Balance deduction timing (immediate on approval vs. start of leave period)
<!-- gestalt:architecture feature=32ad270f-dfe8-4e32-be27-804897fcc970 END -->
