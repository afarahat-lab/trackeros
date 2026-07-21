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
src/modules/BaseEntity/    — BaseEntity module
src/modules/LeaveRequest/    — LeaveRequest module
src/modules/LeavePolicy/    — LeavePolicy module
src/modules/AuditLog/    — AuditLog module
src/modules/AuditRecord/    — AuditRecord module
src/modules/AuditServiceInterface/    — AuditServiceInterface module
src/shared/db connection.ts
src/shared/base repository.ts
src/shared/error types.ts
src/shared/types/index.ts    — shared enums (LeaveStatus, LeaveType, EmploymentStatus)
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

<!-- gestalt:architecture feature=989933e7-8d91-4995-8c4e-365f6d0b898b START -->
## Leave Management Feature Architecture

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is implemented as a modular monolith using TypeScript, Fastify, React Native, and PostgreSQL, following the existing architectural principles defined in `docs/ARCHITECTURE.md` and `docs/GOLDEN_PRINCIPLES.md`.

### Domain Entities

- **LeaveRequest** — aggregate root; lifecycle: pending → approved/rejected/cancelled.
- **LeavePolicy** — defines rules per leave type; lifecycle: ACTIVE, INACTIVE.
- **Employee** — owns requests and balances; lifecycle: active, inactive, terminated.
- **LeaveBalance** — tracks entitlement per employee per policy per fiscal year; lifecycle: ACTIVE, EXHAUSTED, FROZEN, CLOSED.
- **LeaveType** — enum (src/shared/types/index.ts): 'annual', 'sick', 'emergency'.
- **LeaveStatus** — enum (src/shared/types/index.ts): 'pending', 'approved', 'rejected', 'cancelled'.
- **EmploymentStatus** — enum (src/shared/types/index.ts): 'active', 'inactive', 'terminated'.
- **AuditLog** — immutable record of all state changes (GP-002).

### Module Boundaries

| Module | Path | Responsibility |
|--------|------|----------------|
| `shared` | `src/shared/` | BaseEntity, BaseRepository, error types, DB connection, shared enums (LeaveStatus, LeaveType, EmploymentStatus) |
| `employee` | `src/modules/employee/` | Employee model, service, repository, controller, routes |
| `audit` | `src/modules/audit/` | AuditLog model, service, repository |
| `policy` | `src/modules/policy/` | LeavePolicy model, service, repository |
| `balance` | `src/modules/balance/` | LeaveBalance model, service, repository |
| `notification` | `src/modules/notification/` | Notification model, service |
| `leave` | `src/modules/leave/` | LeaveRequest aggregate, service, repository, controller, routes, validation |

### Conceptual Data Model

Six tables (no DDL — migrations generated from this spec):

- **employees** — core employee data with self-referencing manager hierarchy.
- **leave_types** — lookup table for leave type codes.
- **leave_policies** — per-type entitlement rules, linked to leave_types.
- **leave_requests** — the core leave application entity with status lifecycle.
- **leave_balances** — per-employee, per-type, per-fiscal-year tracking.
- **audit_logs** — immutable audit trail for all state-changing operations.

All tables use UUID primary keys and standard timestamp columns (`created_at`, `updated_at`). Foreign keys enforce referential integrity. Indexes are defined for common query patterns: employee lookups, status filtering, date-range overlap detection, and audit retrieval.

### Service Interfaces

- **ILeaveService** — submit, approve, reject, cancel, get requests.
- **IBalanceService** — get/deduct/credit/initialize balances.
- **IPolicyService** — get policies, validate requests.
- **IAuditService** — record and retrieve audit entries.
- **IEmployeeService** — get employee, manager, direct reports, authorization checks.
- **INotificationService** — notify employees and managers of status changes.

### Dependency Map

```
leave → shared, employee, policy, balance, audit, notification
balance → shared, employee
policy → shared
employee → shared
audit → shared
notification → shared, employee
```

### Implementation Phases

1. **Foundation** — shared enums (LeaveStatus, LeaveType, EmploymentStatus) in `src/shared/types/index.ts`.
2. **Supporting Services** — employee, audit, policy (can be built in parallel).
3. **Balance & Notification** — balance and notification (depend on employee from Phase 2).
4. **Leave Orchestration** — leave module as aggregate root, wiring all services together.

### Key Business Rules Enforced

- State transitions are strictly validated (BR-001).
- Balance sufficiency checked before approval (BR-002).
- Balance deducted on approval, restored on revocation (BR-003, BR-004).
- Only the designated manager can approve/reject (BR-005).
- Only active employees can submit requests (BR-006).
- Only active policies can be used (BR-007).
- No overlapping approved leave (BR-008).
- Date range validity and minimum notice period enforced (BR-009, BR-010).

### Compliance with Golden Principles

- **GP-002 (Audit)**: Every state change on leave_requests and leave_balances is recorded in audit_logs via IAuditService.
- **GP-003 (Input Validation)**: All inputs validated at the controller boundary using leave.validation.ts.
- **GP-005 (RBAC)**: Controller methods enforce that the authenticated user is the employee (for submit/cancel) or the manager (for approve/reject) via IEmployeeService.isManagerOf().

This architecture replaces the previous flat-file module sketches and consolidates the domain, data, and application designs into a single coherent specification.
<!-- gestalt:architecture feature=989933e7-8d91-4995-8c4e-365f6d0b898b END -->
