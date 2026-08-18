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

<!-- gestalt:architecture feature=5718a840-0b03-4112-91da-8c645c2fae86 START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities

- **Employee** — Represents an employee. Tracks employment status (ACTIVE, INACTIVE, TERMINATED) and reporting hierarchy (managerId). Required for leave eligibility, approval routing, and balance ownership.
- **LeaveRequest** — An employee's leave application. Lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED) → CANCELLED. References the governing LeavePolicy via `leavePolicyId`.
- **LeavePolicy** — Rules for a leave type (annual, sick, emergency, etc.): entitlement days, accrual, minimum notice, manager approval flag. Lifecycle: ACTIVE / INACTIVE.
- **LeaveBalance** — Employee's entitlement, used, and remaining days for a policy in a fiscal year. Lifecycle: ACTIVE → EXHAUSTED (when remainingDays=0) → CLOSED (fiscal year end).

### Business Rules (Binding)

1. Only ACTIVE employees can submit leave.
2. Day count = `(endDate - startDate) + 1` (inclusive calendar days).
3. `startDate` ≥ today; `endDate` ≥ `startDate`.
4. On submission, check `remainingDays` ≥ requested days.
5. Only the employee's direct manager (employee.managerId) may approve/reject.
6. On APPROVED: atomically increment `usedDays`, decrement `remainingDays`.
7. On CANCELLED (from APPROVED): restore balance (reverse deduction).
8. If `requiresManagerApproval` is false, request auto-approves on submission.
9. If `minimumNoticeDays` is set, `startDate - submissionDate` ≥ `minimumNoticeDays` (emergency leave bypasses this).
10. No overlapping APPROVED or SUBMITTED requests for the same employee.
11. When `remainingDays` reaches 0, balance becomes EXHAUSTED.
12. Valid state transitions: DRAFT→SUBMITTED, DRAFT→CANCELLED, SUBMITTED→APPROVED, SUBMITTED→REJECTED, SUBMITTED→CANCELLED, APPROVED→CANCELLED. REJECTED and CANCELLED are terminal.
13. Emergency leave bypasses `minimumNoticeDays` check.
14. If `accrualRate` is set, entitlement grows over the fiscal year, capped at `maxAccumulation`.
15. Employee can cancel own DRAFT/SUBMITTED requests; only manager/HR can cancel APPROVED.

### Module Structure

- **shared-types** (`src/shared/types/`) — Enums (LeaveRequestStatus, LeaveType, BalanceStatus, EmploymentStatus) and BaseEntity.
- **employee** (`src/modules/employee/`) — Employee entity, repository, service, controller, routes.
- **leave-policy** (`src/modules/leave-policy/`) — LeavePolicy entity, repository, service.
- **leave-balance** (`src/modules/leave-balance/`) — LeaveBalance entity, repository, service (methods use `policyId`).
- **leave-request** (`src/modules/leave-request/`) — LeaveRequest entity (with `leavePolicyId`), repository, service, controller, routes. Orchestrates the workflow.
- **audit** (`src/modules/audit/`) — AuditRecord entity, repository, service.

### Dependency Map

- leave-request → shared-types, employee, leave-policy, leave-balance, audit
- leave-balance → shared-types, employee
- leave-policy → shared-types
- employee → shared-types

### Phases

1. **Shared types & Audit** — Foundation enums and audit capability.
2. **Employee** — Employee lookup and status checks.
3. **Leave Policy** — Policy definitions.
4. **Leave Balance** — Balance lifecycle (init, deduct, restore).
5. **Leave Request** — Core workflow: submit, approve, reject, cancel.

### Cross-cutting Contracts

- **Auth**: `request.user: { id: string; role: UserRole }` (UserRole = 'employee' | 'manager' | 'hr_admin'). JWT via auth middleware; RBAC via `requireRole(...)` guard.
- **Transaction**: Repository methods accept optional `client: PoolClient`; service owns the unit of work (BEGIN/COMMIT/ROLLBACK).
- **Error Response**: `{ error: string; code: string }`. HTTP 400 for validation/balance/policy errors, 401/403 for auth, 404 for not found.

### Open Questions

1. Calendar days vs working days for leave counting.
2. Fiscal year boundary definition.
3. Emergency leave auto-approval behaviour.
<!-- gestalt:architecture feature=5718a840-0b03-4112-91da-8c645c2fae86 END -->
