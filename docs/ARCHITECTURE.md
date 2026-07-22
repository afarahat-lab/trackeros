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

<!-- gestalt:architecture feature=29db188e-aa3b-40f9-a0ff-8dc33e2c5647 START -->
## Leave Balance Feature — Reconciled Architecture

### Design Fork Resolution

The existing DOMAIN.md already defines `Balance`/`LeaveBalance` with `totalEntitlement`, `usedDays`, and `remainingDays` — the **incrementing usedDays counter** model. This design follows that established pattern: `remainingDays` is always derived as `totalEntitlement - usedDays`. The alternative decrementing-remainingDays model is rejected as incompatible with the existing architecture.

### Domain Entities

- **LeaveBalance** — Tracks an employee's leave balance for a specific leave policy within a fiscal year. Lifecycle: ACTIVE → EXHAUSTED (auto when remainingDays=0), FROZEN (manual), CLOSED (year-end), CANCELLED (void).
- **BalanceAdjustment** — Records every debit/credit against a LeaveBalance. Lifecycle: PENDING → APPLIED (success), REVERSED (undo), FAILED (insufficient balance/frozen).

### Business Rules (Key)

- BR-001: Uniqueness on (employeeId, policyId, fiscalYear) for active balances.
- BR-002: remainingDays = totalEntitlement - usedDays; never stored independently.
- BR-003: Debit only if ACTIVE and amountDays ≤ remainingDays.
- BR-004: Leave approval creates a DEBIT BalanceAdjustment; if debit fails, approval is rolled back.
- BR-005: Leave cancellation/rejection creates a CREDIT reversal.
- BR-006: Auto-transition to EXHAUSTED when remainingDays=0; back to ACTIVE on credit.
- BR-007: Frozen balances reject all adjustments.
- BR-008: CLOSED/CANCELLED balances are immutable.
- BR-009: APPLIED/REVERSED/FAILED adjustments are immutable.
- BR-010: Every state change on LeaveBalance and every BalanceAdjustment application produces an AuditRecord (GP-002).
- BR-011: Fiscal year scoping; cross-year carryover governed by LeavePolicy.
- BR-012: amountDays must be positive.

### Conceptual Tables

- **leave_balance** — Core balance entity. Composite uniqueness on (employee_id, policy_id, fiscal_year). Indexed for employee+fiscalYear lookup, leave-approval deduction path, policy-level reporting, and bulk accrual/rollover jobs.
- **balance_adjustment** — Immutable audit trail of every balance mutation. Linked to leave_balance and optionally to leave_request. Indexed for balance-scoped queries, leave request linkage, status filtering, and time-range reporting.
- **audit_log** — Required by GP-002 for all state-changing operations. Indexed for entity-trail lookups, performer accountability, time-range reports, and action-type filtering.

### Module Boundaries

- **balance** (`src/modules/balance/`) — Owns LeaveBalance and BalanceAdjustment models, repositories, IBalanceService, and controller. Exposes methods: getBalance, getBalances, initializeBalance, deductBalance, restoreBalance, recalculateBalance, getBalanceReport. All methods use `policyId` (not leaveTypeId).
- **leave** (`src/modules/leave/`) — Owns LeaveRequest, ILeaveService, and controller. `approveLeaveRequest` calls `IBalanceService.deductBalance` within a transaction; `cancelLeaveRequest`/`rejectLeaveRequest` call `restoreBalance` when previously approved.
- **policy** (`src/modules/policy/`) — Owns LeavePolicy, provides entitlement and accrual rules.
- **employee** (`src/modules/employee/`) — Owns Employee, provides employee existence and department info.
- **audit** (`src/modules/audit/`) — Cross-cutting audit logging per GP-002.

### Dependency Flow

```
leave → balance → {policy, employee, audit}
```
No module depends on leave. Balance depends only on leaf modules. Leaf modules have zero inter-module dependencies.

### Implementation Phases

1. **Phase 1 — Foundation**: employee, policy, audit (leaf modules, no dependencies).
2. **Phase 2 — Balance module**: depends on policy, employee, audit; implements the usedDays/remainingDays model.
3. **Phase 3 — Leave module**: depends on all others; integrates balance deduction on approval.

### Stack Compliance

- Language: TypeScript
- Framework: Fastify (controllers as route handlers)
- Database: PostgreSQL (accessed via pg Pool behind repository interfaces)
- Architecture: modular-monolith with clear layer boundaries (presentation, application, domain, infrastructure)
- RBAC: Enforced at controller level per GP-005 (managers/HR approve/reject; employees create/submit/cancel own requests; HR views reports).
- Audit: Every state transition on LeaveBalance and every BalanceAdjustment application produces an AuditRecord per GP-002.
<!-- gestalt:architecture feature=29db188e-aa3b-40f9-a0ff-8dc33e2c5647 END -->
