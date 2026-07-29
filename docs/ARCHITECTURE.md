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

<!-- gestalt:architecture feature=659f59c0-5c74-4c65-966e-e5be5ed9ec73 START -->
## Leave Management Module

### Overview
The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is built as a modular monolith using TypeScript, Fastify, React Native, and PostgreSQL, following the existing architecture and golden principles.

### Domain Model
- **LeaveRequest** — Core aggregate representing a leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED; can be CANCELLED from any non-terminal state. Tracks approver, rejector, and canceller separately for full audit.
- **LeaveType** — Enumeration of leave categories (annual, sick, emergency, plus extensible types).
- **LeavePolicy** — Configuration per leave type: entitlement days, accrual rules, minimum notice, manager approval requirement. Lifecycle: ACTIVE/INACTIVE.
- **LeaveBalance** — Per-employee, per-leave-type, per-fiscal-year balance. Lifecycle: ACTIVE → EXHAUSTED (when remaining=0) → CLOSED (fiscal year end).

Business rules enforced:
- Date validity (start < end)
- No overlapping approved leaves
- Sufficient balance at approval time
- Balance deduction on approval, restoration on cancellation
- Manager approval required (self-approval prohibited)
- Minimum notice period check at submission

### Data Model (Conceptual Tables)
All tables are PostgreSQL, managed via pg Pool (`src/shared/db/connection.ts`). Migrations are generated from these specifications.

- **employees** — Existing shared table; referenced by all leave entities.
- **leave_types** — Lookup table for leave type names (annual, sick, emergency, etc.).
- **leave_requests** — Stores leave applications with full lifecycle fields (approved_by, rejected_by, cancelled_by, etc.).
- **leave_balances** — Tracks entitlement, used, and remaining days per employee/type/year.
- **leave_policies** — Defines rules per leave type (entitlement, notice, approval flag).
- **audit_logs** — Immutable audit trail for all state-changing operations (GP-002).

### Module Structure
```
src/
├── shared/
│   └── types/          # LeaveType, LeaveStatus enums
├── modules/
│   ├── audit/          # AuditRecord, IAuditService, AuditService, IAuditLogRepository, PgAuditLogRepository, routes
│   ├── leave-policy/   # LeavePolicy, ILeavePolicyRepository, PgLeavePolicyRepository, ILeaveTypeRepository, PgLeaveTypeRepository, ILeavePolicyService, LeavePolicyService, routes
│   ├── leave-balance/  # LeaveBalance, ILeaveBalanceRepository, PgLeaveBalanceRepository, ILeaveBalanceService, LeaveBalanceService, routes
│   └── leave-request/  # LeaveRequest, ILeaveRequestRepository, PgLeaveRequestRepository, ILeaveRequestService, LeaveRequestService, routes
```

Dependencies flow inward: routes → services → repositories → db. No circular dependencies. The leave-request module orchestrates the workflow and depends on leave-balance, leave-policy, audit, shared-types, and an external employee module (for IEmployeeRepository).

### Implementation Phases
1. **Shared types + Audit** — Foundation enums and audit infrastructure.
2. **Leave Policy** — Policy configuration and leave type lookup.
3. **Leave Balance** — Balance management with deduction/credit.
4. **Leave Request** — Full leave workflow orchestration.

### Compliance with Golden Principles
- **GP-001 (Repository Pattern)**: All data access through repository interfaces with PostgreSQL implementations.
- **GP-002 (Audit)**: Every state change writes an immutable audit record via IAuditService.
- **GP-003 (Input Validation)**: Validation at route boundaries before service invocation.
- **GP-005 (RBAC)**: Manager-only endpoints (approve, reject, view pending) enforced at route layer; employee endpoints for own requests.
- **GP-006 (Transaction Semantics)**: Balance deduction/credit and status updates occur within database transactions to maintain consistency.
<!-- gestalt:architecture feature=659f59c0-5c74-4c65-966e-e5be5ed9ec73 END -->
