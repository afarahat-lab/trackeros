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
src/
  app.ts                              — Fastify app assembly
  index.ts                            — server entry point
  shared/
    db/connection.ts                  — PostgreSQL pool (pg)
    types/index.ts                    — shared enums & types
  modules/
    employee/
      employee.model.ts               — Employee interface + CreateEmployeeDto
      employee.repository.ts          — IEmployeeRepository + Pg impl
      index.ts                        — barrel export
    leave/
      leave-type.model.ts             — LeaveType interface + CreateLeaveTypeDto
      leave-type.repository.ts        — ILeaveTypeRepository + Pg impl
      leave-policy.model.ts           — LeavePolicy interface + CreateLeavePolicyDto
      leave-policy.repository.ts      — ILeavePolicyRepository + Pg impl
      leave-balance.model.ts          — LeaveBalance interface + CreateLeaveBalanceDto
      leave-balance.repository.ts     — ILeaveBalanceRepository + Pg impl
      index.ts                        — barrel export
    status/
      status.model.ts                 — SystemStatus interface
      status.service.interface.ts     — IStatusService
      status.service.ts               — StatusService impl
      index.ts                        — barrel export
    uptime/
      uptime.model.ts                 — UptimeStatus interface
      uptime.service.interface.ts     — IUptimeService
      uptime.service.ts               — UptimeService impl
      uptime.routes.ts                — Fastify plugin (GET /uptime)
      index.ts                        — barrel export
tests/
  unit/
    shared/types/index.test.ts        — enum/value tests
    modules/employee/
      employee.repository.test.ts     — repository tests (mocked pool)
    modules/leave/
      leave-type.repository.test.ts   — repository tests (mocked pool)
      leave-policy.repository.test.ts — repository tests (mocked pool)
      leave-balance.repository.test.ts — repository tests (mocked pool)
```

### Shared types (`src/shared/types/index.ts`)

- `LeaveTypeCode` enum: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'
- `LeaveStatus` enum: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
- `EmploymentStatus` type: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'

### Employee module (`src/modules/employee/`)

- **Employee** interface: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt
- **IEmployeeRepository**: findById, findAll, findByManagerId, create, update, softDelete
- **EmployeeRepository**: concrete PostgreSQL implementation using the shared pool

### Leave module (`src/modules/leave/`)

- **LeaveType** interface: id, code (LeaveTypeCode), name, description, isActive, createdAt, updatedAt
- **CreateLeaveTypeDto**: code, name, description, isActive?
- **ILeaveTypeRepository**: findByCode, findById, findAll, create, update, softDelete
- **LeaveTypeRepository**: concrete PostgreSQL implementation using the shared pool
- **LeavePolicy** interface: id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt
- **CreateLeavePolicyDto**: policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval?, isActive?
- **ILeavePolicyRepository**: findByLeaveTypeId, findById, findAll, create, update, softDelete
- **LeavePolicyRepository**: concrete PostgreSQL implementation using the shared pool
- **LeaveBalance** interface: id, employeeId, leaveTypeId, policyId, entitlementDays, usedDays, pendingDays, accruedDays, carriedForwardDays, expiresAt, year, createdAt, updatedAt
- **CreateLeaveBalanceDto**: employeeId, leaveTypeId, policyId, entitlementDays, usedDays?, pendingDays?, accruedDays?, carriedForwardDays?, expiresAt?, year
- **ILeaveBalanceRepository**: findByEmployeeId, findByEmployeeIdAndLeaveTypeId, findByEmployeeIdAndYear, create, update, upsert
- **LeaveBalanceRepository**: concrete PostgreSQL implementation using the shared pool

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

## Implementation progress

The leave management system is being built incrementally per `PLAN.md`:

- **Phase 1** ✅ — Shared enums and base types (`src/shared/types/index.ts`)
- **Phase 2** ✅ — Employee model and repository (`src/modules/employee/`)
- **Phase 3** ✅ — LeaveType model and repository (`src/modules/leave/`)
- **Phase 4** ✅ — LeavePolicy model and repository (`src/modules/leave/`)
- **Phase 5** ✅ — LeaveBalance model and repository (`src/modules/leave/`)
- **Phases 6–9** — Planned (leave request, audit, service, controller/routes)

<!-- gestalt:architecture feature=bfdb6110-c37d-4c1b-a01f-6fca50944d25 START -->
## Leave Management Module (design)

### Overview

The Leave Management module enables employees to apply for annual, sick, emergency, and other leave types. Managers approve or reject requests, and the system tracks leave balances per policy and fiscal year. The module is built as a modular monolith using TypeScript, Fastify, PostgreSQL, and React Native (frontend). It adheres to the golden principles: every state change is audited (GP-002), RBAC is enforced at the route level (GP-005), input validation occurs at controller boundaries (GP-003), and all persistence goes through repository interfaces (GP-001).

### Domain Entities

- **Employee** — organizational actor with employment status (ACTIVE, INACTIVE, TERMINATED). The `managerId` field establishes the approval hierarchy.
- **LeaveType** — catalog of leave categories (annual, sick, emergency, unpaid, maternity, paternity). Each type has a code and active flag.
- **LeavePolicy** — rules and entitlements for a leave type: entitlement days, accrual rate, max accumulation, minimum notice, and whether manager approval is required.
- **LeaveRequest** — an employee's leave application. Lifecycle: PENDING → APPROVED / REJECTED; can be CANCELLED. References the employee, the leave type, and the approving manager.
- **LeaveBalance** — tracks used, pending, accrued, and carried-forward days for an employee-leaveType-policy-year combination.
- **AuditLog** — immutable record of all state-changing operations (who, what, when, before/after).

### Business Rules

- **BR-001** — Only ACTIVE employees may submit leave requests.
- **BR-002** — `startDate` ≥ today; `endDate` ≥ `startDate`; requested days > 0.
- **BR-003** — Before approval, the employee's LeaveBalance for the leave type and year must have sufficient available days (entitlementDays − usedDays − pendingDays ≥ requested days, excluding weekends/holidays per policy).
- **BR-004** — Submitted requests are routed to the employee's manager (`employee.managerId`). Only that manager (or a role subsuming manager authority) may approve/reject. Self-approval is forbidden.
- **BR-005** — Rejection requires a non-empty `rejectionReason`.
- **BR-006** — On approval, `LeaveBalance.usedDays` is incremented and `pendingDays` decremented atomically within the same transaction.

### Planned Module Structure

```
src/modules/
├── employee/             # ✅ Employee model + repository (Phase 2)
├── leave/                # ✅ LeaveType + LeavePolicy + LeaveBalance models + repositories (Phases 3-5)
│   ├── leave-type.model.ts
│   ├── leave-type.repository.ts
│   ├── leave-policy.model.ts
│   ├── leave-policy.repository.ts
│   ├── leave-balance.model.ts       # ✅ Phase 5
│   ├── leave-balance.repository.ts  # ✅ Phase 5
│   ├── leave-request.model.ts       # Phase 6
│   ├── leave-request.repository.ts  # Phase 6
│   ├── leave.service.interface.ts   # Phase 8
│   ├── leave.service.ts             # Phase 8
│   ├── leave.controller.ts          # Phase 9
│   ├── leave.routes.ts              # Phase 9
│   └── index.ts
├── audit/                # Phase 7
│   ├── audit-log.model.ts
│   ├── audit-log.repository.ts
│   └── index.ts
├── status/               # ✅ SystemStatus (read-only health check)
└── uptime/               # ✅ UptimeStatus (read-only uptime endpoint)
```

Shared enums (`LeaveTypeCode`, `LeaveStatus`, `EmploymentStatus`) live in `src/shared/types/index.ts`.

### Persistence (Conceptual Tables)

- **employees** — `id`, `employee_number`, `first_name`, `last_name`, `email`, `manager_id` (FK→employees), `department`, `hire_date`, `termination_date`, `employment_status`, `created_at`, `updated_at`, `deleted_at`
- **leave_types** — `id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`
- **leave_policies** — `id`, `policy_name`, `leave_type_id` (FK→leave_types), `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `is_active`, `created_at`, `updated_at`
- **leave_requests** — `id`, `employee_id` (FK→employees), `leave_type_id` (FK→leave_types), `start_date`, `end_date`, `total_days`, `reason`, `status`, `manager_id` (FK→employees), `approved_by` (FK→employees), `approved_at`, `rejection_reason`, `cancelled_at`, `created_at`, `updated_at`
- **leave_balances** — `id`, `employee_id` (FK→employees), `leave_type_id` (FK→leave_types), `policy_id` (FK→leave_policies), `entitlement_days`, `used_days`, `pending_days`, `accrued_days`, `carried_forward_days`, `expires_at`, `year`, `created_at`, `updated_at`
- **audit_logs** — `id`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, `performed_by`, `performed_at`, `ip_address`, `user_agent`, `created_at`

All tables use UUID primary keys. Indexes are defined for frequent query patterns: employee lookups, status filtering, date-range queries, and unique compound keys for balances (employee_id + leave_type_id + year).

### Repository Interfaces (with Concrete Implementations)

| Interface | Concrete Implementation |
|-----------|-------------------------|
| `IEmployeeRepository` | `PgEmployeeRepository` |
| `ILeaveTypeRepository` | `PgLeaveTypeRepository` |
| `ILeavePolicyRepository` | `PgLeavePolicyRepository` |
| `ILeaveRequestRepository` | `PgLeaveRequestRepository` |
| `ILeaveBalanceRepository` | `PgLeaveBalanceRepository` |
| `IAuditLogRepository` | `PgAuditLogRepository` |

All implementations use the shared PostgreSQL connection pool (`src/shared/db/connection.ts`).

### Services

- **ILeaveService** — employee-facing operations: apply, view, cancel leave requests.
- **IApprovalService** — manager operations: approve, reject, list pending approvals.
- **IBalanceService** — balance queries, deduction, accrual, fiscal-year management.
- **INotificationService** — sends notifications on leave events (applied, approved, rejected, balance updated).
- **IAuditService** — records all state changes; used by every service.

### Dependency Flow

Dependencies flow strictly inward:

```
Leave (app) → Approval / Balance / Notification (domain services) → domain entities → value objects
```

- `Leave` depends on `LeaveRequest`, `Employee`, `Balance`, `Approval`, `Notification`.
- `Approval` depends on `LeaveRequest`, `Employee`, `Balance`, `Notification`, `AuditLog`.
- `Balance` depends on `LeaveBalance`, `LeavePolicy`, `AuditLog`.
- `Notification` depends on `AuditLog`.
- Domain entities depend on `BaseEntity` and, where appropriate, on each other (e.g., `LeaveRequest` → `Employee`, `LeavePolicy`).

No circular dependencies exist.

### Implementation Phases

Per `PLAN.md` (9 phases total):

1. **Shared enums and base types** ✅ — `src/shared/types/index.ts`
2. **Employee model and repository** ✅ — `src/modules/employee/`
3. **LeaveType model and repository** ✅ — `src/modules/leave/`
4. **LeavePolicy model and repository** ✅ — `src/modules/leave/`
5. **LeaveBalance model and repository** ✅ — `src/modules/leave/`
6. **LeaveRequest model and repository** — planned
7. **AuditLog model and repository** — planned
8. **Leave service with validation and audit** — planned
9. **Leave controller and Fastify routes** — planned

### Stack Compliance

- Language: TypeScript (strict mode)
- Runtime: Node.js 20
- Framework: Fastify (routes, validation, serialization)
- Frontend: React Native (consumes REST API)
- Database: PostgreSQL (via `pg` Pool)
- Architecture: modular monolith with clear layer boundaries
- Testing: Jest (unit + integration)

### Golden Principles Adherence

- **GP-001 (Repository Pattern)**: All data access goes through repository interfaces; concrete implementations are injected.
- **GP-002 (Audit Trail)**: Every state-changing operation is recorded in `audit_logs` via `IAuditService`.
- **GP-003 (Input Validation)**: Fastify schema validation at route level; additional business rule validation in services.
- **GP-005 (RBAC)**: Role-based access control enforced in `leave.routes.ts`; only managers (or admin role) can access approval endpoints.
- **GP-006 (Transaction Semantics)**: Balance deduction on approval runs in a database transaction to ensure atomicity.
<!-- gestalt:architecture feature=bfdb6110-c37d-4c1b-a01f-6fca50944d25 END -->
