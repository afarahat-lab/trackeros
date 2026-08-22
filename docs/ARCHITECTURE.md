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
src/modules/employee/employee.{model,repository.interface,repository,service.interface,service}.ts + index.ts
src/modules/audit/audit.{model,service.interface,service}.ts + index.ts
src/modules/status/    — System status module (health-check)
src/modules/uptime/    — Uptime module
src/shared/db/connection.ts
src/shared/types/index.ts    — Shared enums (LeaveType, LeaveStatus, AuditAction)
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

<!-- gestalt:architecture feature=da3cebcf-aae0-446c-b943-05fc4169a665 START -->
## Leave Management Module — Reconciled Architecture

### Overview

The leave management module enables employees to apply for annual, sick, emergency, and other leave types. Managers approve or reject requests. The system tracks leave balances per employee, leave type, and fiscal year, enforcing business rules around entitlements, minimum notice, and manager authorization.

### Domain Entities

- **LeaveRequest** — lifecycle: `DRAFT → SUBMITTED → APPROVED | REJECTED`; `SUBMITTED → CANCELLED`; `APPROVED → CANCELLED`. `REJECTED` and `CANCELLED` are terminal.
- **LeaveBalance** — lifecycle: `ACTIVE`, `EXHAUSTED`, `CLOSED`. Tracks `totalEntitlement`, `usedDays`, `remainingDays` (invariant: `remainingDays = totalEntitlement - usedDays`).
- **LeavePolicy** — lifecycle: `ACTIVE`, `INACTIVE`. Defines entitlement days, accrual rules, minimum notice, and whether manager approval is required.
- **LeaveType** — enum: `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`.
- **LeaveStatus** — enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`.

### Key Business Rules

1. **State transitions** are strictly enforced; only the paths listed above are valid.
2. **Balance deduction**: On `APPROVED`, `usedDays` increases and `remainingDays` decreases by the leave day count. On `CANCELLED` (from `APPROVED`), the balance is restored. Both operations must be atomic.
3. **Sufficiency check**: Before approval, `remainingDays` must be ≥ requested days.
4. **Minimum notice**: Unless the leave type is emergency or sick, `startDate` must be at least `minimumNoticeDays` after submission.
5. **Manager authorization**: Only the employee's manager (`Employee.managerId`) may approve/reject. If `requiresManagerApproval` is false, the request auto-approves.
6. **Employee must be ACTIVE** to create a request.
7. **Policy must be ACTIVE** to be referenced.
8. **Date validity**: `startDate ≤ endDate`.
9. **Accrual**: If `accrualRate` is set, entitlement accrues over the fiscal year; `maxAccumulation` caps it.
10. **Audit trail**: Every state transition writes an audit record (`entityType='LeaveRequest'`, action matching the transition).

### Module Structure

| Module | Path | Responsibilities |
|--------|------|------------------|
| `shared-types` | `src/shared/types/` | `LeaveType`, `LeaveStatus`, `AuditAction` enums |
| `employee` | `src/modules/employee/` | Employee entity, repository, service (identity, manager lookup, active check) |
| `audit` | `src/modules/audit/` | Audit record entity, service (GP-002 compliance) |
| `leave-policy` | `src/modules/leave-policy/` | LeavePolicy entity, LeaveType reference data, repositories, service |
| `leave-balance` | `src/modules/leave-balance/` | LeaveBalance entity, repository, service (deduct, restore, initialize) |
| `leave-request` | `src/modules/leave-request/` | LeaveRequest entity, repository, service (submit, approve, reject, cancel) |

### Dependency Map

```
leave-request → leave-balance, leave-policy, employee, audit, shared-types
leave-balance → leave-policy, employee, audit, shared-types
leave-policy → shared-types
employee → shared-types
audit → shared-types
```

### Database Tables (Conceptual)

- **leave_types** (`id`, `name`, `description`, `is_active`, `created_at`, `updated_at`)
- **leave_policies** (`id`, `leave_type_id` → leave_types, `policy_name`, `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `is_active`, …)
- **leave_requests** (`id`, `employee_id` → employees, `leave_type_id` → leave_types, `start_date`, `end_date`, `reason`, `status`, `approved_by` → employees, `approved_at`, …)
- **leave_balances** (`id`, `employee_id` → employees, `leave_type_id` → leave_types, `policy_id` → leave_policies, `fiscal_year`, `total_entitlement`, `used_days`, `remaining_days`, `status`, …)

### Implementation Phases

1. **Phase 1** — Shared types, employee, audit (foundational, zero internal deps).
2. **Phase 2** — Leave policy (reference data and rules).
3. **Phase 3** — Leave balance (entitlement tracking, atomic deduction/restoration).
4. **Phase 4** — Leave request (full lifecycle, all business rules).

### Implementation Status

- **Shared types** (`src/shared/types/index.ts`): ✅ `LeaveType`, `LeaveStatus`, `AuditAction` enums.
- **Employee module** (`src/modules/employee/`): ✅ Model, repository interface, repository implementation (`EmployeeRepository` — `findById`, `findByEmail`, `findByDepartment` via shared `pool`), service interface, service implementation (`EmployeeService` — `getEmployeeById`, `getEmployeeByEmail`, constructor-injected `IEmployeeRepository`), barrel export.
- **Audit module** (`src/modules/audit/`): ✅ Model (`AuditRecord`), service interface (`IAuditService.record`), service implementation (`AuditService` — constructor takes `Pool` defaulting to shared pool, `record()` inserts directly into `audit_records` with `gen_random_uuid()` and `NOW()`, parameterized query), barrel export. No separate repository layer; the audit module is intentionally thin and the service owns its single-write operation directly.

### Open Questions (Require Human Decision)

1. **Day counting**: inclusive/exclusive, calendar vs. business days.
2. **Overlapping leave**: whether multiple APPROVED requests can overlap.
3. **Emergency leave pool**: separate entitlement or draws from annual.
4. **Sick leave documentation**: threshold and enforcement.

### Cross-Cutting Contracts

- **Auth**: JWT bearer → `request.user: { id: string; role: 'employee' | 'manager' | 'hr_admin' }`. RBAC via `requireRole(...)` guard. Manager approval rule enforced in service layer.
- **Error response**: `{ error: string; code: string }`. HTTP 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 422 (business rule violation).
- **Transaction**: Multi-step writes (approve, reject, cancel) are atomic. Repository methods accept optional `client: PoolClient`; service owns the unit of work (`BEGIN`/`COMMIT`/`ROLLBACK`). Read-only methods do not require the client parameter.
<!-- gestalt:architecture feature=da3cebcf-aae0-446c-b943-05fc4169a665 END -->
