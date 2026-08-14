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
                                LeavePolicyService
src/modules/leave-balance/   — LeaveBalance model + repository + barrel
                                LeaveBalanceService
src/modules/leave-request/   — LeaveRequest model + repository + barrel
                                LeaveRequestService + routes
src/modules/audit/           — AuditRecord model + repository + barrel
src/modules/notification/    — Notification model + repository + barrel
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

1. **Business day counting**: Days are counted as business days (Mon–Fri excluding US public holidays). Weekends and hardcoded public holidays (2025–2026) are excluded. A request with zero business days is rejected at submission.
2. **State transitions**: Only DRAFT→SUBMITTED, DRAFT→CANCELLED, SUBMITTED→APPROVED, SUBMITTED→REJECTED, SUBMITTED→CANCELLED, APPROVED→CANCELLED. REJECTED is terminal.
3. **Balance impact**: SUBMITTED increments pendingDays; APPROVED decrements pendingDays and increments usedDays; REJECTED decrements pendingDays; CANCELLED (from SUBMITTED) decrements pendingDays; CANCELLED (from APPROVED) decrements usedDays directly via balanceRepo (restores balance). DRAFT has no impact.
4. **Sufficiency check**: Before DRAFT→SUBMITTED, `remainingDays - pendingDays >= businessDays`. On failure the reservation is released (best-effort rollback).
5. **Manager routing**: Approve/reject restricted to `manager` and `hr_admin` roles. Self-approval and self-rejection are blocked (approver cannot be the request's employee). **No direct-manager hierarchy check is implemented** — any manager or hr_admin can approve/reject any SUBMITTED request. No auto-escalation for null managerId. No auto-approve when `requiresManagerApproval` is false.
6. **Minimum notice**: If LeavePolicy.minimumNoticeDays > 0, `startDate - now >= minimumNoticeDays` (calendar days). Emergency leave (`code='emergency'`) skips this check.
7. **Employee eligibility**: **Not enforced** — employment status is not checked at submission time.
8. **Active leave type/policy**: Only active LeaveType and LeavePolicy may be used. Validated at draft creation and submission.
9. **Overlap prevention**: No two SUBMITTED or APPROVED requests for same employee may have overlapping date ranges (excludes CANCELLED, REJECTED, DRAFT).
10. **Rejection reason**: Required when transitioning to REJECTED.
11. **Date validity**: `endDate >= startDate`. Validated at draft creation.

### Module Boundaries

| Module | Path | Responsibilities |
|--------|------|------------------|
| shared-types | src/shared/types/ | LeaveStatus and LeaveTypeCode enums |
| audit | src/modules/audit/ | AuditRecord model, repository |
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
- **Note**: Phase 10 does not yet implement transaction wrapping — operations are executed on the shared pool without explicit BEGIN/COMMIT boundaries.

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
| 6 | ✅ Complete | AuditRecord model + repository (audit module) |
| 7 | ✅ Complete | Notification model + repository (notification module) |
| 8 | ✅ Complete | LeavePolicyService (leave-policy module) |
| 9 | ✅ Complete | LeaveBalanceService (leave-balance module) |
| 10 | ✅ Complete | LeaveRequestService + routes (leave-request module) |

### Implementation Notes

- **LeaveBalance.remainingDays** is a computed field: `totalEntitlement - usedDays - pendingDays`. The `rowToLeaveBalance` mapper computes it at read time regardless of the stored `remaining_days` column value, ensuring the invariant is always satisfied.
- **LeaveBalanceRepository** constructor accepts an optional `Queryable` client (defaults to the shared pool), enabling transaction participation per the Transaction Contract.
- **createBatch** uses a single multi-row INSERT for efficiency when initializing balances for multiple policies at once.
- **LeaveRequestRepository** follows the same `Queryable` pattern: constructor accepts an optional client defaulting to the shared pool. The `updateStatus` method dynamically builds SET clauses and clears opposing metadata based on target status (APPROVED clears rejection fields, REJECTED clears approval fields, DRAFT/SUBMITTED/CANCELLED clears both). The `findOverlapping` method uses `start_date <= $3 AND end_date >= $2` for overlap detection and supports an `excludeStatuses` parameter to filter out CANCELLED/REJECTED/DRAFT requests.
- **AuditRepository** follows the same `Queryable` pattern: constructor accepts an optional client defaulting to the shared pool, enabling transaction participation. The `changes` field is serialized via `JSON.stringify` on write and returned as a parsed `Record<string, unknown>` on read. `findByPerformer` supports an optional `limit` parameter for pagination. Results are ordered by `created_at DESC`.
- **NotificationRepository** follows the same `Queryable` pattern: constructor accepts an optional client defaulting to the shared pool, enabling transaction participation. The `create` method always sets `status` to `'PENDING'` and `read_at` to `NULL` regardless of caller input. `markAsSent` and `markAsRead` are idempotent — re-marking an already-SENT or already-READ notification succeeds (re-stamps `read_at` on re-read). `createBatch` uses a single multi-row INSERT for efficiency when fanning out notifications (e.g., to employee + manager on submission). `findByRecipient` returns results ordered by `created_at DESC`.
- **LeavePolicyService** injects `ILeavePolicyRepository` and `ILeaveTypeRepository`. `getPolicyForLeaveType` resolves a leave type by code, validates it is active, then fetches active policies for that type — throwing `POLICY_VIOLATION` if zero or multiple active policies exist. `getActivePolicies` fetches all policies and filters to `isActive === true` in application code. `calculateEntitlement` implements fiscal-year pro-ration: fiscal year starts Jan 1; if `hireDate <= fiscalYearStart` → full `entitlementDays`; otherwise pro-rated by whole months remaining (`11 - hireMonth`), floored, with an optional `maxAccumulation` cap applied after pro-ration. `validatePolicy` performs structural validation of all required and optional fields (positive integer entitlement, non-negative accrual/max/minimumNotice, boolean flags). The service also exports an `AppError` class (extends `Error`, carries a `code` string) used for domain-level error responses.
- **LeaveBalanceService** injects `ILeaveBalanceRepository` and `ILeavePolicyService`. `getBalancesForEmployee` delegates to `findByEmployeeId` (all fiscal years) or `findByEmployeeIdAndFiscalYear` when a fiscal year filter is provided. `initializeBalancesForEmployee` fetches all active policies via `ILeavePolicyService.getActivePolicies`, calls `calculateEntitlement` for each using `hireDate.getFullYear()` as the fiscal year, then creates balances in a single `createBatch` call — returns an empty array when no active policies exist. `getAvailableBalance` returns `remainingDays - pendingDays` (throws `NOT_FOUND` if no balance record exists). `reserveDays` checks `remainingDays - pendingDays >= days` before incrementing `pendingDays`; throws `INSUFFICIENT_BALANCE` on failure and does not mutate the balance. `finalizeDeduction` atomically decrements `pendingDays` and increments `usedDays` in a single `update` call. `releaseReservation` decrements `pendingDays` with a `Math.max(0, pendingDays - days)` floor to prevent negative values. All methods that require a balance lookup throw `AppError` with code `NOT_FOUND` when the balance does not exist. The service reuses the `AppError` class exported from the `leave-policy` module.
- **LeaveRequestService** injects `ILeaveRequestRepository`, `ILeaveBalanceService`, `ILeaveBalanceRepository`, `IAuditRepository`, `INotificationRepository`, `ILeavePolicyService`, and `ILeaveTypeRepository`. Key behaviors:
  - `createDraft`: validates `endDate >= startDate`, resolves leave type by code (validates exists + active), resolves policy, creates with DRAFT status.
  - `submit`: validates ownership (employeeId match), DRAFT→SUBMITTED transition only, leave type still active, minimum notice (skipped for emergency), overlap detection (excludes CANCELLED/REJECTED/DRAFT), counts business days (Mon–Fri excluding hardcoded US holidays 2025–2026), reserves days via `balanceService.reserveDays`, then updates status + writes audit + creates notification. On any failure after reservation, releases reservation as best-effort rollback.
  - `approve`: validates SUBMITTED status, blocks self-approval, finalizes deduction via `balanceService.finalizeDeduction`, updates status to APPROVED with `approvedBy`/`approvedAt` metadata, writes audit + notification.
  - `reject`: validates SUBMITTED status, blocks self-rejection, requires non-empty reason, releases reservation via `balanceService.releaseReservation`, updates status to REJECTED with `rejectedBy`/`rejectedAt`/`rejectionReason` metadata, writes audit + notification.
  - `cancel`: validates ownership, allows DRAFT/SUBMITTED/APPROVED states. SUBMITTED→releases reservation. APPROVED→directly decrements `usedDays` on the balance via `balanceRepo.update` (bypasses the balance service). DRAFT→no balance impact. Writes audit + notification.
  - `getById`: returns request or throws NOT_FOUND.
  - `getByEmployee`: delegates to `findByEmployeeId`.
- **LeaveRequest routes** (`leave-request.routes.ts`) — Fastify plugin registering seven endpoints:
  - `POST /api/leave-requests` — create draft (roles: employee, manager, hr_admin). Validates body fields (leaveTypeId, startDate, endDate, optional reason).
  - `GET /api/leave-requests` — list own requests (roles: employee, manager, hr_admin).
  - `GET /api/leave-requests/:id` — get by ID. RBAC: employees can only view their own; managers/hr_admin can view all.
  - `PATCH /api/leave-requests/:id/submit` — submit (roles: employee, manager, hr_admin).
  - `PATCH /api/leave-requests/:id/approve` — approve (roles: manager, hr_admin only).
  - `PATCH /api/leave-requests/:id/reject` — reject (roles: manager, hr_admin only). Body requires `reason` string.
  - `PATCH /api/leave-requests/:id/cancel` — cancel (roles: employee, manager, hr_admin).
  - All routes extract user identity from `request.user` (JWT auth assumed), map `AppError` codes to HTTP status codes, and return `{ error, code }` on failure.
  - Dependencies are wired manually in the route plugin (no DI container): repositories and services are instantiated directly.

### Known Gaps (vs. Planned Architecture)

The following items from the architectural plan are not yet implemented in Phase 10:

1. **No `IEmployeeRepository`** — Employee data (managerId, employmentStatus, hireDate) is not looked up from the database. The service has no dependency on an employee repository.
2. **No direct-manager authority check** — Any user with `manager` or `hr_admin` role can approve/reject any SUBMITTED request. The only restriction is that a user cannot approve/reject their own request.
3. **No HR escalation for null managerId** — When an employee has no manager, there is no automatic escalation to HR.
4. **No `requiresManagerApproval` auto-approve** — The policy flag is not checked; all requests require explicit approval regardless of the policy setting.
5. **No employee eligibility check** — Employment status (ACTIVE/INACTIVE/TERMINATED) is not verified before allowing submission.
6. **No transaction wrapping** — State mutations across multiple tables (leave_requests, leave_balances, audit_logs, notifications) are not wrapped in a database transaction. The submit method uses a best-effort compensation (release reservation on failure) rather than ROLLBACK.
7. **Business days instead of calendar days** — The architecture originally specified inclusive calendar day counting `(endDate - startDate) + 1`. The implementation counts business days (Mon–Fri, excluding hardcoded US public holidays for 2025–2026).

### Open Questions

- Fiscal year boundary (calendar, anniversary, configurable)
- Accrual mechanics (lump-sum, monthly, per-pay-period, tenure-based)
- Emergency leave special rules (bypass notice/approval, separate pool)
- Balance deduction timing (immediate on approval vs. start of leave period)
- Calendar days vs. business days — current implementation uses business days; may need to be configurable per policy
- Manager hierarchy enforcement — currently any manager can approve; direct-report restriction planned but not implemented
<!-- gestalt:architecture feature=32ad270f-dfe8-4e32-be27-804897fcc970 END -->
