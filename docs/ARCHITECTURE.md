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
src/shared/base repository.ts
src/shared/error types.ts
src/shared/types/index.ts   — canonical enums & DTOs (Phase 1 ✓)
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

<!-- gestalt:architecture feature=825d20d1-d747-449a-b683-c4c1e534f9eb START -->
# Leave Management Module Architecture

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Shared types & enums | ✅ Complete |
| 2 | LeavePolicy module | 🔄 Partial — model, repository interface, barrel export, and PG implementation committed; unit tests not yet built |
| 3 | LeaveBalance module | ⬜ Pending |
| 4 | LeaveRequest module | ⬜ Pending |
| 5 | Audit module | ⬜ Pending |
| 6 | Notification module | ⬜ Pending |
| 7 | LeaveService & API surface | ⬜ Pending |

## Canonical Types (Phase 1 — committed)

All canonical enums and DTOs live in `src/shared/types/index.ts`.

### Enums

- **LeaveType**: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
- **LeaveStatus**: `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
- **EmploymentStatus**: `'ACTIVE' | 'INACTIVE' | 'TERMINATED'`
- **AuditAction**: `'CREATED' | 'UPDATED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'BALANCE_DEDUCTED' | 'BALANCE_RESTORED'`
- **NotificationStatus**: `'PENDING' | 'SENT' | 'FAILED'`

### DTOs

- **CreateLeaveRequestDto**: `{ employeeId: string; leaveType: LeaveType; startDate: string; endDate: string; reason: string | undefined }`
- **UpdateLeaveRequestDto**: `{ status: LeaveStatus; approverId: string | null }`
- **LeaveRequestQueryParams**: `{ employeeId?: string; leaveType?: LeaveType; status?: LeaveStatus; startDate?: string; endDate?: string }`
- **ValidationResult**: `{ valid: boolean; errors: string[] }`

## Domain Entities

### LeaveRequest
- **Attributes**: id, employeeId, leaveType (LeaveType), startDate, endDate, reason, status (LeaveStatus), approverId, approvedAt, createdAt, updatedAt
- **Lifecycle**: DRAFT → SUBMITTED → (APPROVED | REJECTED); DRAFT/SUBMITTED/APPROVED → CANCELLED
- **Purpose**: Represents an employee's leave application. Tracks full lifecycle.

### LeaveType
- **Enum**: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
- **Purpose**: Categorizes leave; each type governed by a LeavePolicy.

### LeaveBalance
- **Attributes**: id, employeeId, leaveType, fiscalYear, totalEntitlement, usedDays, remainingDays, status, createdAt, updatedAt
- **Lifecycle**: ACTIVE ↔ EXHAUSTED (remainingDays=0); ACTIVE ↔ FROZEN (policy deactivated or employee terminated)
- **Purpose**: Tracks entitlement, consumption, and remaining balance per employee, leave type, and fiscal year.

### LeavePolicy
- **Attributes**: id, policyName, leaveType (LeaveType), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt
- **Lifecycle**: ACTIVE ↔ INACTIVE
- **Purpose**: Configurable rules for a leave type (entitlement, notice, approval).

### Employee
- **Attributes**: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt
- **Lifecycle**: ACTIVE, INACTIVE, TERMINATED
- **Purpose**: Employee record; employment status gates leave eligibility.

## Business Rules (Binding)

1. **LeaveRequest transitions**: DRAFT→SUBMITTED (employee), SUBMITTED→APPROVED/REJECTED (manager/HR), DRAFT/SUBMITTED→CANCELLED (employee), APPROVED→CANCELLED (employee, triggers balance restoration). Terminal states (APPROVED, REJECTED, CANCELLED) are immutable except APPROVED→CANCELLED.
2. **LeaveBalance transitions**: ACTIVE→EXHAUSTED when remainingDays=0; EXHAUSTED→ACTIVE on accrual/restoration; ACTIVE→FROZEN on policy deactivation or employee termination; FROZEN→ACTIVE on reactivation.
3. **LeavePolicy transitions**: ACTIVE→INACTIVE freezes all associated balances; INACTIVE→ACTIVE unfreezes them.
4. **Date validity**: startDate ≤ endDate.
5. **No overlapping leave**: An employee cannot have two non-terminal LeaveRequests with overlapping date ranges.
6. **Balance deduction on APPROVED**: Atomic deduction of requested days from LeaveBalance; rejected if insufficient balance.
7. **Minimum notice**: Enforced on SUBMITTED unless policy's minimumNoticeDays is null or leaveType is 'emergency'.
8. **Auto-approval**: When requiresManagerApproval=false, SUBMITTED→APPROVED directly.
9. **Balance restoration on APPROVED→CANCELLED**: Atomic restoration of previously deducted days.
10. **RBAC**: Employee owns DRAFT→SUBMITTED, DRAFT/SUBMITTED/APPROVED→CANCELLED; manager/HR owns SUBMITTED→APPROVED/REJECTED.
11. **Terminated employees**: Cannot create/submit new leave; existing APPROVED requests remain valid.
12. **Balance invariant**: remainingDays = totalEntitlement - usedDays, enforced on every mutation.
13. **Policy deactivation cascade**: All balances for that policy become FROZEN; reactivation unfreezes.
14. **Emergency leave bypass**: minimumNoticeDays not enforced for leaveType='emergency'.

## Module Structure

| Module | Path | Responsibilities |
|--------|------|------------------|
| shared/types | src/shared/types/ | Enums, DTOs, shared types ✅ |
| leave-request | src/modules/leave-request/ | LeaveRequest entity, repository interface & impl |
| leave-balance | src/modules/leave-balance/ | LeaveBalance entity, repository interface & impl |
| leave-policy | src/modules/leave-policy/ | LeavePolicy entity, repository interface & PG impl (unit tests pending) |
| leave | src/modules/leave/ | LeaveService (orchestrator), controller, routes |
| audit | src/modules/audit/ | AuditService, AuditLog entity, repository |
| notification | src/modules/notification/ | NotificationService, Notification entity, repository |

## Dependency Map

- `leave` depends on `leave-request`, `leave-balance`, `leave-policy`, `audit`, `notification`, `shared/types`
- All inner modules depend only on `shared/types`
- No inner module calls another inner module; `LeaveService` is the sole orchestrator.

## Recommended Implementation Phases

1. **Phase 1 — Shared types & enums** (1 file) ✅  
   Zero-dependency foundation.
2. **Phase 2 — LeavePolicy module** (4 files) 🔄  
   Model, repository interface, barrel export, and PG implementation committed. Unit tests still needed.
3. **Phase 3 — LeaveBalance module** (4 files)  
   Balance checks needed before approvals.
4. **Phase 4 — LeaveRequest module** (4 files)  
   Core entity and persistence.
5. **Phase 5 — Audit module** (4 files)  
   GP-002: every state change writes an audit record.
6. **Phase 6 — Notification module** (4 files)  
   Notifications on state transitions.
7. **Phase 7 — LeaveService & API surface** (5 files)  
   Orchestrator, controller, routes, RBAC guards.

## Cross-Cutting Contracts

### Auth Contract
- Authenticated request shape: `request.user = { id: string; role: UserRole }`
- `UserRole` enum: `'employee' | 'manager' | 'hr_admin'`
- Identity via JWT bearer token verified by auth middleware; RBAC enforced by `requireRole(...)` route guard.
- Endpoint access:
  - `submitLeaveRequest` → employee
  - `approveLeaveRequest` / `rejectLeaveRequest` → manager
  - `getPendingLeaveRequestsForManager` → manager
  - `getLeaveBalance` / `getAllLeaveBalances` → employee (own) or manager/hr_admin (any)
  - `cancelLeaveRequest` → employee (own) or hr_admin

### Transaction Contract
- Repository methods that participate in multi-step writes (`create`, `updateStatus`, `upsertBalance`, `incrementUsedDays`) accept an optional `client: PoolClient` parameter.
- When omitted, the method acquires its own connection from the shared pool.
- The calling service owns the unit of work: acquires a client, executes `BEGIN`, passes the client to each repository call, then `COMMIT` or `ROLLBACK`.
- Essential for approve/reject flow (atomic update of `leave_requests.status` and `leave_balances.used_days`).

### Error Response Contract
- Standard error shape: `{ error: string; code: string; details?: unknown }`
- Validation failure → HTTP 400 (`VALIDATION_ERROR`)
- Authentication failure → HTTP 401 (`AUTH_REQUIRED`)
- Authorization failure → HTTP 403 (`INSUFFICIENT_ROLE`)
- Not found → HTTP 404 (`NOT_FOUND`)
- Business rule violation (e.g., insufficient balance, inactive policy) → HTTP 409 (`BUSINESS_RULE_VIOLATION`)

## Open Questions

1. **Day-counting semantics**: Calendar days vs business days vs configurable per policy.
2. **Fiscal year boundary**: Calendar year, custom global start month, or per-policy.
3. **Half-day leave support**: Not supported, boolean flag, or time-of-day.
4. **Balance seeding**: Pre-seed via job, compute on-the-fly, or hybrid.
5. **Balance deduction semantics**: Atomic dual-update (usedDays + remainingDays) vs single-field (remainingDays only, derive usedDays).
<!-- gestalt:architecture feature=825d20d1-d747-449a-b683-c4c1e534f9eb END -->
