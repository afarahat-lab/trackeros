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
src/shared/db.connection.ts
src/shared/base.repository.ts
src/shared/error.types.ts
```

### Shared layer

- **`src/shared/error.types.ts`** — domain error classes (`NotFoundError`, `ValidationError`, `ConflictError`) extending the native `Error` with correct prototype-chain setup so `instanceof` checks work reliably.
- **`src/shared/base.repository.ts`** — generic `IBaseRepository<T>` interface declaring `findById`, `findAll`, `create`, `update`, `delete`, and an abstract `BaseKnexRepository<T>` class that accepts a Knex instance and provides partial implementations for subclasses.
- **`src/shared/db.connection.ts`** — Knex instance factory reading `DATABASE_URL` (Phase 7).

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

<!-- gestalt:architecture feature=be7ddf67-d8cd-4b4b-9a8e-9a007adf8c79 START -->
## Leave Management Module — Reconciled Architecture

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave. Managers approve or reject requests. The system tracks leave balances atomically. The module follows the modular-monolith style with Fastify, PostgreSQL, and React Native.

### Stack compliance

All three specialist designs comply with the declared stack (TypeScript, Node 20, npm, Jest, Fastify, React Native, PostgreSQL, modular-monolith). No corrections needed.

### Naming conflicts resolved

| Conflict | Domain design | Data design | App design | **Canonical choice** |
|---|---|---|---|---|
| Leave type FK | `leaveTypeId` | `leave_type` | `leaveType` | **`leaveTypeId`** → column `leave_type_id` |
| Status enum values | `DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED` | `PENDING, APPROVED, REJECTED` | (inherited from domain) | **Domain design** — `DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED` |
| Policy FK in balance | `policyId` | `policy_id` | `policyId` | **`policyId`** → column `policy_id` |
| Leave type table | (implied in LeaveType entity) | (missing — `leave_type` column only) | (implied) | **`leave_types`** table added |
| Rejection fields | `rejectedBy, rejectedAt, rejectionReason` | (missing) | (inherited) | **Domain design** — all three fields included |
| Cancellation fields | `cancelledBy, cancelledAt, cancellationReason` | (missing) | (inherited) | **Domain design** — all three fields included |
| `leave_requests.leave_type` | `leaveTypeId` (FK to leave_types) | bare string `leave_type` | — | **FK `leave_type_id` → `leave_types.id`** |
| `leave_policies.leave_type` | `leaveTypeId` (FK) | bare string `leave_type` | — | **FK `leave_type_id` → `leave_types.id`** |
| `leave_balances` missing `leave_type_id` | `leaveTypeId` present | missing | — | **Added `leave_type_id` FK** |

### Domain entities

Seven entities define the domain:

- **LeaveRequest** — central entity; full lifecycle DRAFT → SUBMITTED → APPROVED/REJECTED → CANCELLED; tracks all actor/timestamp fields for approval, rejection, and cancellation.
- **LeaveRequestStatus** — enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED` with seven allowed transitions.
- **LeaveType** — categorises leave (annual, sick, emergency); flags `isPaid`, `requiresDocumentation`; lifecycle ACTIVE/INACTIVE.
- **LeavePolicy** — rules per leave type: entitlement, accrual, notice, max consecutive days, negative balance flag; lifecycle ACTIVE/INACTIVE.
- **Balance** — per-employee, per-leave-type, per-fiscal-year; tracks `totalEntitlement`, `usedDays`, `remainingDays`; lifecycle ACTIVE → EXHAUSTED → CLOSED.
- **BalanceStatus** — enum: `ACTIVE`, `EXHAUSTED`, `CLOSED`.
- **Employee** — actor entity; `employmentStatus` gates leave submission; lifecycle ACTIVE/INACTIVE/TERMINATED.

### Business rules (reconciled)

| Rule | Description |
|---|---|
| BR-001 | Submission requires ACTIVE employee, startDate ≥ today, endDate ≥ startDate, ACTIVE LeaveType + ACTIVE LeavePolicy |
| BR-002 | No date-range overlap with existing APPROVED or SUBMITTED requests for same employee |
| BR-003 | On approval: atomic deduction of `usedDays`/`remainingDays`; transition to EXHAUSTED if zero |
| BR-004 | On cancellation of APPROVED: atomic restoration of balance; EXHAUSTED → ACTIVE |
| BR-005 | Sufficient balance check before approval; `allowNegativeBalance` gate |
| BR-007 | `maximumConsecutiveDays` enforcement per policy |
| BR-008 | Only designated manager or HR_ADMIN may approve/reject; self-approval prohibited |
| BR-009 | Rejection requires mandatory `rejectionReason` |

### Conceptual SQL schemas (no DDL)

Six tables:

- **leave_requests** — `id` PK; FKs to `employees.id` (employee_id, approved_by, rejected_by, cancelled_by) and `leave_types.id` (leave_type_id); indexes on employee_id, status, leave_type_id, start_date/end_date, (employee_id, status).
- **employees** — `id` PK; FK manager_id → employees.id; indexes on email (unique), employee_number (unique), manager_id, employment_status, department.
- **leave_types** — `id` PK; indexes on code (unique), is_active.
- **leave_policies** — `id` PK; FK leave_type_id → leave_types.id; indexes on leave_type_id, is_active, (leave_type_id, is_active).
- **leave_balances** — `id` PK; FKs to employees.id, leave_types.id, leave_policies.id; indexes on employee_id, (employee_id, fiscal_year), policy_id, (employee_id, leave_type_id, fiscal_year) unique constraint.
- **audit_logs** — `id` PK; FK performed_by → employees.id; indexes on (entity_type, entity_id), performed_by, performed_at, action.

### Repository interfaces (with concrete implementations)

All repositories use `src/shared/db.connection.ts` (Knex). Interfaces defined in each module's `*.repository.ts`. Concrete implementations extend `BaseKnexRepository<T>` from `src/shared/base.repository.ts`:

| Interface | Concrete | Module |
|---|---|---|
| `ILeaveRequestRepository` | `KnexLeaveRepository` | leave |
| `ILeaveBalanceRepository` | `KnexLeaveBalanceRepository` | balance |
| `ILeavePolicyRepository` | `KnexLeavePolicyRepository` | policy |
| `IEmployeeRepository` | `KnexEmployeeRepository` | employee |
| `IAuditLogRepository` | `KnexAuditLogRepository` | audit |

Key repository methods:
- `ILeaveRequestRepository.findOverlapping(employeeId, startDate, endDate, excludeId?)` — supports BR-002 overlap detection
- `ILeaveBalanceRepository.upsert(employeeId, policyId, fiscalYear, data)` — atomic balance adjustment
- `ILeaveBalanceRepository.findByEmployeeAndPolicy(employeeId, policyId, fiscalYear)` — unique balance lookup

### Module boundaries

Six modules, flat-file structure under `src/modules/`:

| Module | Path | Owns |
|---|---|---|
| audit | `src/modules/audit/` | model, repository, service interface, service, index |
| employee | `src/modules/employee/` | model, repository, service interface, service, controller, routes, index |
| notification | `src/modules/notification/` | model, repository, service interface, service, index |
| policy | `src/modules/policy/` | model, repository, service interface, service, controller, routes, index |
| balance | `src/modules/balance/` | model, repository, service interface, service, controller, routes, index |
| leave | `src/modules/leave/` | model, repository, service interface, service, controller, routes, index |

### Service interfaces

| Interface | Module | Key methods |
|---|---|---|
| `IAuditService` | audit | `recordEvent(actorId, action, targetType, targetId, oldState, newState, metadata)`, `queryLogs(filters, pagination)` |
| `IEmployeeService` | employee | `getEmployee(id)`, `getManager(id)`, `getTeamMembers(managerId)`, `hasRole(id, role)` |
| `IPolicyService` | policy | `getPolicy(leaveType, fiscalYear)`, `validateRequest(employeeId, leaveType, days, startDate, endDate)`, `getEntitlement(employeeId, leaveType, fiscalYear)` |
| `IBalanceService` | balance | `getBalance(employeeId, leaveType, fiscalYear)`, `deductBalance(...)`, `restoreBalance(...)`, `initializeBalance(...)` |
| `INotificationService` | notification | `notifyLeaveSubmitted`, `notifyLeaveApproved`, `notifyLeaveRejected`, `notifyBalanceLow` |
| `ILeaveService` | leave | `submitRequest`, `approveRequest`, `rejectRequest`, `cancelRequest`, `getRequest`, `getEmployeeRequests`, `getPendingApprovals`, `getTeamCalendar` |

### Dependency map

```
leave ──→ employee
leave ──→ policy
leave ──→ balance
leave ──→ audit
leave ──→ notification
balance ──→ policy
balance ──→ audit
policy ──→ audit
employee ──→ audit
notification ──→ (none)
```

No circular edges. Dependencies flow inward. All modules import only through `index.ts` barrel exports.

### Golden Principles compliance

- **GP-001 (Repository pattern)**: All database access through repository interfaces; concrete implementations extend `BaseKnexRepository<T>` from `src/shared/base.repository.ts`.
- **GP-002 (Audit records)**: `IAuditService.recordEvent` called on every state-changing operation (submit, approve, reject, cancel, balance deduct/restore).
- **GP-003 (Input validation)**: Controllers validate inputs before delegating to services; Fastify schema validation on routes.
- **GP-004 (No sensitive data in logs)**: Audit logs capture entity state changes, not PII.
- **GP-005 (RBAC enforcement)**: `IEmployeeService.hasRole` checked at controller layer; manager-only endpoints gated by `managerId` match or `HR_ADMIN` role.
- **GP-006 (Error handling)**: All async service methods wrapped; repository errors surfaced as domain errors (`NotFoundError`, `ValidationError`, `ConflictError` from `src/shared/error.types.ts`).

### Recommended build phases

| Phase | Modules | Rationale | Est. files |
|---|---|---|---|
| 1 — Audit foundation | audit | Zero dependencies; every other module depends on it (GP-002) | 5 |
| 2 — Employee + Notification | employee, notification | Leaf-level; can build in parallel; employee provides identity/RBAC | 12 |
| 3 — Policy | policy | Depends only on audit; balance and leave both need it | 7 |
| 4 — Balance | balance | Depends on policy + audit; leave needs deduct/restore | 7 |
| 5 — Leave (orchestration) | leave | Depends on all four; orchestrates submit/approve/reject/cancel | 7 |

### Migration notes

The existing PascalCase directories under `src/modules/` (`LeaveStatus`, `LeaveRequest`, `LeaveType`, `LeavePolicy`, `AuditLog`, `AuditRecord`, `AuditServiceInterface`, `BaseEntity`) are superseded by the flat-file module structure defined here. They should be removed or migrated during Phase 1–5 implementation. The existing `status` and `uptime` modules are unrelated and preserved as-is.
<!-- gestalt:architecture feature=be7ddf67-d8cd-4b4b-9a8e-9a007adf8c79 END -->
