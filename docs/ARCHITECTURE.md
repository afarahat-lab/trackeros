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
src/shared/base-repository.ts
src/shared/error-types.ts
src/shared/types/index.ts
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

<!-- gestalt:architecture feature=c651e808-955e-4f50-b871-b7b78fa00b37 START -->
## Leave Management Module — Feature Architecture

### Reconciliation Summary

Three specialist designs (domain, data, application) were reconciled into a single coherent architecture. The following conflicts were resolved:

| Conflict | Domain Design | Data Design | App Design | **Resolved** |
|----------|--------------|-------------|------------|---------------|
| Request status enum | `LeaveRequestStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED | `status` column (no enum specified) | `LeaveStatus`: pending, approved, rejected, cancelled | **`LeaveRequestStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED** — domain design is richer and captures the full lifecycle |
| LeaveType representation | Entity with `code` field (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY) | Table `leave_types` with `code` column | Enum (annual, sick, emergency) | **Entity-backed enum**: `leave_types` table with `code` column; the six domain values are canonical |
| LeaveBalance fields | `leaveTypeId`, `policyId`, `totalEntitlement`, `usedDays`, `remainingDays`, `pendingDays` | `policy_id`, `total_entitlement`, `used_days`, `remaining_days` | `leaveType`, `totalDays`, `accruedDays`, `lastAccrualDate` | **Domain design**: `leaveTypeId` + `policyId` + `totalEntitlement` + `usedDays` + `remainingDays` + `pendingDays` |
| LeaveRequest approver fields | `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `cancelledBy`, `cancelledAt`, `cancellationReason` | `approved_by`, `approved_at` only | `managerId`, `reviewedAt`, `reviewedBy` | **Domain design**: full audit trail with separate fields per transition |
| LeavePolicy fields | `leaveType` (enum), `entitlementDays`, `accrualRate`, `maxAccumulation`, `minimumNoticeDays`, `requiresManagerApproval`, `allowNegativeBalance`, `maxConsecutiveDays` | `leave_type_id` (FK), `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval` | `leaveType`, `maxDaysPerYear`, `maxConsecutiveDays`, `requiresApproval`, `minNoticeHours`, `allowNegativeBalance`, `fiscalYearStart`, `fiscalYearEnd` | **Domain + Data**: `leaveTypeId` FK, `entitlementDays`, `accrualRate`, `maxAccumulation`, `minimumNoticeDays`, `requiresManagerApproval`, `allowNegativeBalance`, `maxConsecutiveDays` |

### Module Boundaries

```
src/modules/
├── leave-type/           # Zero-dependency leaf — shared LeaveType entity
│   ├── leave-type.model.ts
│   ├── leave-type.repository.ts   (ILeaveTypeRepository + PgLeaveTypeRepository)
│   └── index.ts
├── audit-log/            # Zero-dependency leaf — cross-cutting audit (GP-002)
│   ├── audit-log.model.ts
│   ├── audit-log.repository.ts    (IAuditLogRepository + PgAuditLogRepository)
│   ├── audit-log.service.ts       (IAuditService)
│   └── index.ts
├── leave-policy/         # Depends on leave-type
│   ├── leave-policy.model.ts
│   ├── leave-policy.repository.ts (ILeavePolicyRepository + PgLeavePolicyRepository)
│   ├── leave-policy.service.ts    (ILeavePolicyService)
│   └── index.ts
├── leave-balance/        # Depends on leave-type, audit-log
│   ├── leave-balance.model.ts
│   ├── leave-balance.repository.ts (ILeaveBalanceRepository + PgLeaveBalanceRepository)
│   ├── leave-balance.service.ts    (ILeaveBalanceService)
│   └── index.ts
└── leave-request/        # Orchestrator — depends on all four above
    ├── leave-request.model.ts
    ├── leave-request.repository.ts (ILeaveRequestRepository + PgLeaveRequestRepository)
    ├── leave-request.service.ts    (ILeaveRequestService)
    └── index.ts
```

### Dependency Graph (all inward)

```
leave-type ◄── leave-policy ◄── leave-request
    ▲                               ▲
    └────── leave-balance ──────────┘
                ▲
           audit-log
```

- `leave-type` and `audit-log` are zero-dependency leaves
- `leave-policy` depends only on `leave-type`
- `leave-balance` depends on `leave-type` + `audit-log`
- `leave-request` is the orchestrator, depending on all four

### Conceptual Tables (no DDL)

| Table | Primary Key | Key Foreign Keys | Purpose |
|-------|------------|------------------|---------|
| `employees` | `id` | `manager_id → employees.id` | Employee directory with self-referencing manager hierarchy |
| `leave_types` | `id` | — | Lookup: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY |
| `leave_policies` | `id` | `leave_type_id → leave_types.id` | Rules per leave type: entitlements, notice periods, approval flags |
| `leave_requests` | `id` | `employee_id → employees.id`, `leave_type_id → leave_types.id`, `approved_by → employees.id` | Core aggregate: full lifecycle from DRAFT to CANCELLED |
| `leave_balances` | `id` | `employee_id → employees.id`, `policy_id → leave_policies.id` | Per-employee, per-policy, per-fiscal-year balance ledger |
| `audit_logs` | `id` | `performed_by → employees.id` | GP-002 compliance: all state-changing operations |

### Repository Interfaces → Concrete Implementations

All backed by PostgreSQL via `src/shared/db/connection.ts` (pg Pool):

| Interface | Concrete | Module |
|-----------|----------|--------|
| `ILeaveTypeRepository` | `PgLeaveTypeRepository` | `leave-type` |
| `ILeavePolicyRepository` | `PgLeavePolicyRepository` | `leave-policy` |
| `ILeaveBalanceRepository` | `PgLeaveBalanceRepository` | `leave-balance` |
| `ILeaveRequestRepository` | `PgLeaveRequestRepository` | `leave-request` |
| `IAuditLogRepository` | `PgAuditLogRepository` | `audit-log` |
| `IEmployeeRepository` | `PgEmployeeRepository` | shared (pre-existing) |

### Service Interfaces

| Interface | Module | Key Methods |
|-----------|--------|-------------|
| `ILeaveRequestService` | `leave-request` | `applyLeave`, `approveLeave`, `rejectLeave`, `cancelLeave`, `getRequestById`, `getRequestsByEmployee`, `getPendingRequestsForManager`, `getTeamCalendar` |
| `ILeaveBalanceService` | `leave-balance` | `getBalance`, `getAllBalances`, `deductBalance`, `restoreBalance`, `accrueBalance`, `initializeBalancesForEmployee` |
| `ILeavePolicyService` | `leave-policy` | `getPolicy`, `getAllPolicies`, `validateRequest`, `getMaxDays`, `getMinNoticeDays`, `requiresManagerApproval` |
| `IAuditService` | `audit-log` | `log` (generic: entityType, entityId, action, oldValues, newValues, performedBy) |

### Lifecycle States (all reflected in architecture)

- **LeaveRequest**: DRAFT → SUBMITTED → APPROVED / REJECTED; CANCELLED reachable from DRAFT, SUBMITTED, or APPROVED
- **LeaveBalance**: ACTIVE → EXHAUSTED / FROZEN → CLOSED
- **LeavePolicy**: ACTIVE → INACTIVE → ARCHIVED
- **Employee (employmentStatus)**: ACTIVE → INACTIVE → TERMINATED

### Business Rules (canonical set)

- **BR-001**: Only ACTIVE employees may submit leave; INACTIVE requires HR; TERMINATED blocked
- **BR-002**: Manager approval chain via `Employee.managerId`; null manager escalates to department head/HR; self-approval prohibited
- **BR-003**: Balance sufficiency check at DRAFT→SUBMITTED: `remainingDays - pendingDays >= durationDays`; waived if `allowNegativeBalance=true`
- **BR-004**: Atomic balance deduction on APPROVED: `usedDays += durationDays`, `remainingDays -= durationDays`, `pendingDays -= durationDays`
- **BR-005**: Balance restoration on CANCELLATION of APPROVED leave: only unelapsed portion restored
- **BR-006**: Minimum notice enforced for ANNUAL type; SICK and EMERGENCY bypass
- **BR-007**: Date validity: startDate ≤ endDate, no backdating, no overlapping APPROVED/SUBMITTED requests
- **BR-008**: `maxConsecutiveDays` enforced at submission
- **BR-010**: Fiscal year scoping with `maxAccumulation` carry-forward

### Golden Principles Coverage

| Principle | Implementation |
|-----------|---------------|
| GP-001 (Repository) | Every module has its own repository interface + Pg* concrete; services call repositories only |
| GP-002 (Audit) | `IAuditService` injected into `leave-request` and `leave-balance` services; every state transition writes audit |
| GP-003 (Validation) | Controllers validate at API boundary (Phase 5); policy service validates business rules |
| GP-005 (RBAC) | Route-level: employee (own requests), manager (team approvals), HR admin (policy config) |
| GP-006 (Errors) | All async service methods use try/catch; Fastify error handler for unhandled rejections |

### Phase Build Order

1. **Foundation**: `leave-type` + `audit-log` (zero deps, 5 files)
2. **Policy engine**: `leave-policy` (depends on leave-type, 4 files)
3. **Balance tracker**: `leave-balance` (depends on leave-type + audit-log, 4 files)
4. **Request workflow**: `leave-request` (orchestrator, depends on all, 4 files)
5. **API surface**: controllers + routes for all modules with Fastify plugin registration, RBAC, and input validation (5 files)

### Stack Compliance

- **Language**: TypeScript ✓
- **Node**: 20 ✓
- **Package manager**: npm ✓
- **Test framework**: Jest ✓
- **Framework**: Fastify ✓ (controllers/routes in Phase 5)
- **Frontend**: React Native ✓ (consumes REST API)
- **Database**: PostgreSQL ✓ (via pg Pool at `src/shared/db/connection.ts`)
- **Architecture style**: modular-monolith ✓ (5 modules under `src/modules/`)
<!-- gestalt:architecture feature=c651e808-955e-4f50-b871-b7b78fa00b37 END -->
