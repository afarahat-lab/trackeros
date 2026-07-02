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
src/shared/db/base.repository.ts
src/shared/errors/index.ts
src/shared/types/index.ts
src/shared/utils/case-conversion.ts
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

## Shared utilities

### `src/shared/utils/case-conversion.ts`

A pure utility function `camelToSnakeCase(str: string): string` that converts camelCase strings to snake_case. Used by `BaseRepository.findAll()` to translate filter keys (e.g., `employeeId` → `employee_id`) before constructing SQL WHERE clauses. The function:

- Inserts underscores before uppercase letters and lowercases the result
- Passes through already-snake_case keys unchanged
- Handles single-word keys (`id` → `id`) and multi-segment keys (`leaveTypeId` → `leave_type_id`)
- Does not mutate its input — returns a new string

### `BaseRepository.findAll()` filter-key conversion

The `findAll` method in `BaseRepository` applies `camelToSnakeCase` to every filter key before building the WHERE clause. This allows domain code to use camelCase filter keys (matching TypeScript conventions) while the generated SQL uses snake_case column names (matching PostgreSQL conventions). Filter values continue to use parameterized placeholders (`$1`, `$2`, …).

<!-- gestalt:architecture feature=dad4001c-2c9a-4970-bffb-a47ff1ea15f5 START -->
## Leave Management Module — Reconciled Architecture

### Reconciliation Summary

Three specialist designs (domain, data, application) were reconciled into a single coherent architecture. The following conflicts were resolved:

| Conflict | Resolution |
|---|---|
| Domain entity `Balance` vs app module `leaveBalance` | Canonicalized to **LeaveBalance** everywhere |
| Domain entity `LeavePolicy.leaveType` vs data table `leave_policies.leave_type_id` | Canonicalized to **leaveTypeId** (camelCase in domain, `leave_type_id` in DB) |
| Data design omitted `notifications` table | Added `notifications` table matching domain `Notification` entity |
| Data design `leave_requests` missing `rejected_by`, `rejected_at`, `rejection_reason` | Added all three fields to match domain `LeaveRequest` entity |
| Data design `audit_logs` added `ip_address`, `user_agent` | Adopted — useful for GP-002 compliance; added to domain `AuditLog` entity |
| `LeaveType` existed as table + module but not as domain entity | Promoted to full domain entity with ACTIVE/INACTIVE lifecycle |
| App design `leaveType` module had no repository | Added repository interface + implementation for GP-001 compliance |

### Domain Entities

Seven domain entities form the leave management bounded context:

- **LeaveRequest** — Core aggregate root. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED; cancellable from DRAFT, SUBMITTED, or APPROVED. REJECTED and CANCELLED are terminal.
- **Employee** — Employment lifecycle: ACTIVE, INACTIVE, TERMINATED. Self-referencing `managerId` for approval hierarchy. Soft-deletable.
- **LeaveType** — Lightweight lookup entity: ACTIVE, INACTIVE. Codes: annual, sick, emergency.
- **LeavePolicy** — Rules per leave type: ACTIVE, INACTIVE, ARCHIVED. Governs entitlement, accrual, notice periods, and approval requirements.
- **LeaveBalance** — Per-employee, per-policy, per-fiscal-year. Lifecycle: OPEN, EXHAUSTED, FROZEN, CLOSED. Unique constraint on (employeeId, policyId, fiscalYear).
- **Notification** — Fire-and-forget notifications: PENDING, SENT, READ, ARCHIVED. Triggered by LeaveRequest state transitions.
- **AuditLog** — Immutable GP-002 record: single RECORDED state. Captures entity type, entity ID, action, before/after values, performer, IP, and user agent.

### Business Rules (BR-001 through BR-010)

All ten business rules from the domain design are adopted in full:

- **BR-001** — Submission gate: ACTIVE employee, ACTIVE policy, future start date (except emergency), endDate ≥ startDate, sufficient balance, minimum notice check.
- **BR-002** — Manager authorization: only designated manager (Employee.managerId) may approve/reject; manager must be ACTIVE; self-approval prohibited.
- **BR-003** — Balance deduction on APPROVED: atomic increment of usedDays, decrement of remainingDays; transition to EXHAUSTED if remainingDays reaches zero.
- **BR-004** — Balance restoration on APPROVED→CANCELLED: atomic decrement of usedDays, increment of remainingDays; return to OPEN if previously EXHAUSTED.
- **BR-005** — No retroactive leave except emergency (up to 3 calendar days in the past).
- **BR-006** — Overlap prevention: no two APPROVED or SUBMITTED requests with overlapping date ranges for the same employee.
- **BR-007** — Fiscal year boundary: days allocated proportionally across fiscal years; insufficient balance in either year rejects the request.
- **BR-008** — Emergency leave bypass: skips minimumNoticeDays and retroactive restriction (within 3-day window); still requires manager approval unless policy says otherwise.
- **BR-009** — Rejection requires non-empty rejectionReason.
- **BR-010** — Strict state transition matrix: DRAFT→SUBMITTED, DRAFT→CANCELLED, SUBMITTED→APPROVED, SUBMITTED→REJECTED, SUBMITTED→CANCELLED, APPROVED→CANCELLED. No skipped states.

### Conceptual Tables (7 tables)

| Table | Key Fields | Unique/Index Rationale |
|---|---|---|
| `employees` | id, employee_number, first_name, last_name, email, manager_id (self-FK), department, hire_date, termination_date, employment_status, deleted_at | employee_number (unique), email (unique), manager_id, department, employment_status |
| `leave_types` | id, code, label, description, is_active | code (unique), is_active |
| `leave_policies` | id, policy_name, leave_type_id (FK→leave_types), entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active | leave_type_id, is_active |
| `leave_requests` | id, employee_id (FK→employees), leave_type_id (FK→leave_types), start_date, end_date, reason, status, approved_by (FK→employees), approved_at, rejected_by (FK→employees), rejected_at, rejection_reason | employee_id, leave_type_id, status, start_date+end_date (range queries), approved_by, rejected_by |
| `leave_balances` | id, employee_id (FK→employees), policy_id (FK→leave_policies), total_entitlement, used_days, remaining_days, fiscal_year, status | employee_id, policy_id, fiscal_year, unique(employee_id, policy_id, fiscal_year) |
| `notifications` | id, recipient_id (FK→employees), type, title, message, related_entity_type, related_entity_id, status, created_at, read_at | recipient_id, status, created_at, (related_entity_type, related_entity_id) |
| `audit_logs` | id, entity_type, entity_id, action, old_values (JSON), new_values (JSON), performed_by (FK→employees), performed_at, ip_address, user_agent | (entity_type, entity_id), performed_by, performed_at, action |

### Module Boundaries

```
src/modules/
├── leaveType/          # Zero dependencies — pure enum foundation
│   ├── leaveType.model.ts
│   ├── leaveType.repository.interface.ts
│   ├── leaveType.repository.ts
│   └── index.ts
├── employee/           # Zero domain dependencies — core identity
│   ├── employee.model.ts
│   ├── employee.repository.interface.ts
│   ├── employee.repository.ts
│   ├── employee.service.interface.ts
│   ├── employee.service.ts
│   ├── employee.controller.ts
│   ├── employee.routes.ts
│   └── index.ts
├── audit/              # Zero domain dependencies — GP-002 infrastructure
│   ├── audit.model.ts
│   ├── audit.repository.interface.ts
│   ├── audit.repository.ts
│   ├── audit.service.interface.ts
│   ├── audit.service.ts
│   └── index.ts
├── notification/       # Depends on: employee
│   ├── notification.model.ts
│   ├── notification.repository.interface.ts
│   ├── notification.repository.ts
│   ├── notification.service.interface.ts
│   ├── notification.service.ts
│   └── index.ts
├── leavePolicy/        # Depends on: leaveType
│   ├── leavePolicy.model.ts
│   ├── leavePolicy.repository.interface.ts
│   ├── leavePolicy.repository.ts
│   ├── leavePolicy.service.interface.ts
│   ├── leavePolicy.service.ts
│   ├── leavePolicy.controller.ts
│   ├── leavePolicy.routes.ts
│   └── index.ts
├── leaveBalance/       # Depends on: leavePolicy, employee, audit
│   ├── leaveBalance.model.ts
│   ├── leaveBalance.repository.interface.ts
│   ├── leaveBalance.repository.ts
│   ├── leaveBalance.service.interface.ts
│   ├── leaveBalance.service.ts
│   ├── leaveBalance.controller.ts
│   ├── leaveBalance.routes.ts
│   └── index.ts
└── leaveRequest/       # Depends on: leaveType, leavePolicy, leaveBalance, employee, audit, notification
    ├── leaveRequest.model.ts
    ├── leaveRequest.repository.interface.ts
    ├── leaveRequest.repository.ts
    ├── leaveRequest.service.interface.ts
    ├── leaveRequest.service.ts
    ├── leaveRequest.controller.ts
    ├── leaveRequest.routes.ts
    └── index.ts
```

### Dependency Graph (inward-only, no cycles)

```
leaveType  ←  leavePolicy  ←  leaveBalance  ←  leaveRequest
                ↑                ↑                ↑
            employee  ←────  employee  ←────  employee
                ↑                ↑                ↑
              audit  ←────────  audit  ←──────  audit
                ↑                ↑                ↑
          notification  ←──  notification  ←── notification
```

### Repository Interfaces & Concrete Implementations

All repositories backed by PostgreSQL via `src/shared/db/connection.ts` (pg Pool). Interfaces defined alongside their domain modules; implementations in the same module directory.

| Interface | Concrete | Module |
|---|---|---|
| `ILeaveTypeRepository` | `PgLeaveTypeRepository` | leaveType |
| `IEmployeeRepository` | `PgEmployeeRepository` | employee |
| `IAuditLogRepository` | `PgAuditLogRepository` | audit |
| `INotificationRepository` | `PgNotificationRepository` | notification |
| `ILeavePolicyRepository` | `PgLeavePolicyRepository` | leavePolicy |
| `ILeaveBalanceRepository` | `PgLeaveBalanceRepository` | leaveBalance |
| `ILeaveRequestRepository` | `PgLeaveRequestRepository` | leaveRequest |

### Service Interfaces

| Interface | Module | Key Methods |
|---|---|---|
| `IEmployeeService` | employee | getEmployeeById, getManagerId, getDirectReports, isActive |
| `IAuditService` | audit | recordAction, getAuditTrail, getAuditTrailByActor |
| `INotificationService` | notification | sendNotification, notifyLeaveSubmitted, notifyLeaveApproved, notifyLeaveRejected, notifyLeaveCancelled |
| `ILeavePolicyService` | leavePolicy | getPolicyByLeaveType, getAllActivePolicies, getEntitlementDays, requiresManagerApproval |
| `ILeaveBalanceService` | leaveBalance | getBalance, deductBalance, restoreBalance, checkSufficientBalance, initializeBalance |
| `ILeaveRequestService` | leaveRequest | submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, validateLeaveRequest |

### Golden Principles Compliance

| Principle | How It's Met |
|---|---|
| **GP-001** (Repository pattern) | Every module with database access has a repository interface + PgPool-backed implementation. Services never touch the DB directly. |
| **GP-002** (Audit records) | `AuditService.recordAction()` is called on every state transition in LeaveRequest and every mutation in LeaveBalance. AuditLog is immutable. |
| **GP-003** (Input validation) | Controllers validate all inputs at the HTTP boundary before delegating to services. |
| **GP-004** (No sensitive data in logs) | AuditLog captures entity state changes, not PII. Logging in services excludes sensitive fields. |
| **GP-005** (RBAC enforcement) | Controllers enforce role checks: only managers can approve/reject; only the owning employee can submit/cancel their own requests. |
| **GP-006** (Error handling) | All async service methods use try/catch with structured error types from `src/shared/errors/index.ts`. |

### Stack Compliance

All three specialist designs verified against the declared stack:
- **Language**: TypeScript ✓
- **Node**: 20 ✓
- **Package manager**: npm ✓
- **Test framework**: Jest ✓
- **Framework**: Fastify ✓ (controllers + routes pattern)
- **Frontend**: React Native ✓ (not in scope for this backend module)
- **Database**: PostgreSQL ✓ (via pg Pool)
- **Architecture style**: modular-monolith ✓

### Recommended Build Phases

1. **LeaveType enum foundation** (4 files) — Zero dependencies; establishes the pattern.
2. **Employee domain module** (8 files) — Core identity; required by leaveBalance, leaveRequest, notification.
3. **Audit infrastructure module** (6 files) — GP-002 compliance; zero domain dependencies.
4. **LeavePolicy domain module** (8 files) — Depends only on leaveType.
5. **Notification infrastructure module** (6 files) — Depends on employee.
6. **LeaveBalance domain module** (8 files) — Depends on leavePolicy, employee, audit.
7. **LeaveRequest orchestration module** (8 files) — Depends on all prior modules; wires the full workflow.
8. **Integration and app wiring** (3 files) — Fastify route registration, barrel exports, end-to-end validation.

Total: ~51 files across 8 phases, each phase ≤8 files to stay within effective context windows.
<!-- gestalt:architecture feature=dad4001c-2c9a-4970-bffb-a47ff1ea15f5 END -->
