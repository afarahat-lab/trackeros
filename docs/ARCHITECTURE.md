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
src/modules/employee/          — Employee module (Phase 2 ✅)
  employee.model.ts            — Employee interface
  employee.repository.ts       — IEmployeeRepository interface
  employee.service.interface.ts — IEmployeeService + DTOs
  employee.service.ts          — EmployeeService implementation
  index.ts                     — Barrel export
src/modules/audit/             — Audit module (Phase 3 ✅)
  audit.model.ts               — AuditRecord interface
  audit.repository.ts          — IAuditRepository interface
  audit.service.interface.ts   — IAuditService + CreateAuditRecordDto
  audit.service.ts             — AuditService with ValidationError
  index.ts                     — Barrel export
src/modules/policy/            — Policy module (Phase 4 ✅)
  policy.model.ts              — LeavePolicy interface
  policy.repository.ts         — ILeavePolicyRepository interface
  policy.service.interface.ts  — ILeavePolicyService + DTOs
  policy.service.ts            — LeavePolicyService with ValidationError
  index.ts                     — Barrel export
src/modules/balance/           — Balance module (Phase 5 ✅)
  balance.model.ts             — LeaveBalance interface + BalanceStatus enum
  balance.repository.ts        — IBalanceRepository interface
  balance.service.interface.ts — IBalanceService + CreateBalanceDto
  balance.service.ts           — BalanceService with ValidationError
  index.ts                     — Barrel export
src/modules/leave/             — Leave module (Phase 6 ✅)
  leave.model.ts               — LeaveRequest interface + CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams
  leave.repository.ts          — ILeaveRequestRepository interface
  leave.service.interface.ts   — ILeaveService interface
  leave.service.ts             — LeaveService with ValidationError, computeDaysRequested helper
  leave.routes.ts              — Fastify routes (POST /leave, POST /leave/:id/submit, /approve, /reject, /cancel; GET /leave/:id, GET /leave)
src/modules/status/            — System status module (seed)
  status.model.ts, status.service.interface.ts, status.service.ts, index.ts
src/modules/uptime/            — Uptime health-check (seed)
  uptime.model.ts, uptime.routes.ts, uptime.service.interface.ts, uptime.service.ts, index.ts
src/shared/types/index.ts      — Shared enums: LeaveRequestStatus (5 members), LeaveType (6 members), AuditAction (7 members incl. SUBMITTED) (Phase 1 ✅)
src/shared/db/connection.ts    — Database connection utility
```

### Planned (not yet built)

```
src/modules/notification/      — Notification module (Phase 7)
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
- **LeaveRequest** – Full lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED; cancellable from SUBMITTED or APPROVED. Tracks employee, policy, dates, status, and actor timestamps.
- **LeavePolicy** – Defines entitlement, accrual, notice, and approval rules per leave type. Lifecycle: ACTIVE ↔ INACTIVE.
- **LeaveBalance** – Per-employee, per-policy, per-fiscal-year balance. Lifecycle: ACTIVE → EXHAUSTED → CLOSED. `remainingDays` is derived (`totalEntitlement - usedDays`) but stored denormalized.
- **Employee** – Employee record with id, fullName, email, department, managerId, isActive. Used by leave module for identity and manager hierarchy lookups.
- **AuditRecord** – Immutable audit trail entry. Tracks entity type/id, action (AuditAction), performer, optional changes payload, and timestamp. Created via AuditService.log() with input validation.
- **Enums** – `LeaveRequestStatus` (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), `LeaveType` (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY), `AuditAction` (CREATED, UPDATED, SUBMITTED, APPROVED, REJECTED, CANCELLED, DELETED).

### Database Tables (Conceptual)
- **leave_requests** – Core request table with full lifecycle fields (approved_by, rejected_by, cancelled_by, etc.). Indexed for employee, status, policy, and date-range queries.
- **leave_policies** – Policy definitions. Indexed by leave_type and is_active.
- **leave_balances** – Balance tracking. Unique compound index on (employee_id, leave_policy_id, fiscal_year).
- **audit_records** – Immutable audit log. Indexed by entity_type+entity_id, performed_by, and timestamp.

### Modules & Dependency Graph
```
shared/types/  ← zero dependencies
employee/      ← shared/types/
audit/         ← shared/types/
policy/        ← shared/types/
balance/       ← shared/types/, employee/, policy/, audit/
leave/         ← shared/types/, employee/, balance/, policy/, audit/
notification/  ← shared/types/, employee/
```

### Build Phases
1. **Shared types** – Enums (LeaveRequestStatus, LeaveType, AuditAction). ✅ IMPLEMENTED
2. **Employee module** – Employee model, repository, service. ✅ IMPLEMENTED
3. **Audit module** – AuditRecord model, repository, service. ✅ IMPLEMENTED
4. **Policy module** – LeavePolicy model, repository, service interface, service implementation, barrel export, unit tests. ✅ IMPLEMENTED
5. **Balance module** – LeaveBalance model (with BalanceStatus enum), repository interface, service interface (with CreateBalanceDto), service implementation (deduct/restore with status transitions, hasSufficientBalance), barrel export, unit tests. ✅ IMPLEMENTED
6. **Leave module** – LeaveRequest model, repository, service, routes. ✅ IMPLEMENTED
7. **Notification module** – Notification model, repository, service.

### Leave Module Implementation Notes (Phase 6)
- **Day counting**: `computeDaysRequested(startDate, endDate)` = `Math.floor((endDate - startDate) / msPerDay) + 1` — inclusive calendar days, integer via floor.
- **create**: Validates required fields (employeeId, leavePolicyId, startDate, endDate), checks startDate ≤ endDate, computes daysRequested ≥ 1, creates with DRAFT status, logs audit (CREATED).
- **submit**: Validates DRAFT → SUBMITTED transition. Checks employee exists, policy exists and isActive, sufficient balance via `hasSufficientBalance`, minimumNoticeDays (if set). Logs audit (SUBMITTED).
- **approve**: Validates SUBMITTED → APPROVED transition. Looks up balance, calls `balanceService.deductDays`, sets approvedBy/approvedAt. Logs audit (APPROVED).
- **reject**: Validates SUBMITTED → REJECTED transition. Requires non-empty rejection reason. Sets rejectedBy/rejectedAt/rejectionReason. Logs audit (REJECTED).
- **cancel**: Validates SUBMITTED or APPROVED → CANCELLED transition. Requires non-empty cancellation reason. If was APPROVED, calls `balanceService.restoreDays`. Sets cancelledBy/cancelledAt/cancellationReason. Logs audit (CANCELLED) with `balanceRestored` flag.
- **ValidationError**: Defined locally in `leave.service.ts` (consistent with audit, policy, and balance modules).
- **Routes**: `leave.routes.ts` registers on a Fastify instance. Uses in-memory stub implementations for all cross-module dependencies (employee, policy, balance, audit) — these stubs return hardcoded valid data, enabling the routes to function without a database. Real implementations will replace stubs when repository layers are wired to PostgreSQL.
- **No barrel export**: `src/modules/leave/index.ts` is not yet created. Cross-module imports go through sibling barrel exports (`../employee/index`, `../policy/index`, `../balance/index`, `../audit/index`).
- **No unit tests**: Leave module unit tests are deferred.

### AuditAction Enum Update (Phase 6)
- `AuditAction` in `src/shared/types/index.ts` now has 7 members: CREATED, UPDATED, SUBMITTED, APPROVED, REJECTED, CANCELLED, DELETED. `SUBMITTED` was added in Phase 6 to support the leave submission audit trail. The shared types test (`tests/unit/shared/types/index.test.ts`) was updated accordingly.

### Balance Module Implementation Notes
- `BalanceStatus` enum is defined locally in `balance.model.ts` (ACTIVE, EXHAUSTED, CLOSED) — no dependency on `shared/types/`.
- `remainingDays = Math.floor(totalEntitlement - usedDays)` — integer arithmetic, floor for safety.
- `deductDays`: validates balance is ACTIVE, checks sufficiency, increments `usedDays`, recalculates `remainingDays`, transitions to EXHAUSTED when `remainingDays` reaches 0.
- `restoreDays`: validates balance is not CLOSED, checks `usedDays >= days`, decrements `usedDays`, recalculates `remainingDays`, transitions back to ACTIVE when `remainingDays > 0`.
- `hasSufficientBalance`: returns `false` (never throws) when no balance exists or balance is not ACTIVE; floors fractional `requestedDays`.
- `ValidationError` is defined locally in the service file (consistent with audit and policy modules).
- The module is self-contained — it does not import from `policy/` or `shared/types/` at this stage. Cross-module wiring (e.g., validating that `leavePolicyId` references a real policy) is deferred to the leave module (Phase 6).

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
