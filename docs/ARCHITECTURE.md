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

<!-- gestalt:architecture feature=be068fd3-a1c9-4eb0-ae38-156852fec5c5 START -->
## Leave Management Module – Reconciled Architecture

### Domain Entities

| Entity | Lifecycle States | Key Attributes |
|--------|------------------|----------------|
| **LeaveRequest** | DRAFT → SUBMITTED → APPROVED / REJECTED / CANCELLED | employeeId, leavePolicyId, startDate, endDate, status, approvedBy, cancelledBy |
| **Employee** | ACTIVE, INACTIVE, TERMINATED | employeeNumber, managerId, employmentStatus |
| **LeavePolicy** | ACTIVE, INACTIVE | leaveType, entitlementDays, requiresManagerApproval |
| **LeaveBalance** | ACTIVE, CLOSED, FORECAST | employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear |
| **Notification** | PENDING → SENT → READ / ARCHIVED | recipientId, type, relatedEntityType/Id |
| **AuditLog** | (immutable) | entityType/Id, action, oldValues, newValues, performedBy |

### Module Boundaries

- **shared-types** (`src/shared/types/`) – `LeaveType`, `LeaveRequestStatus` enums.
- **employee** (`src/modules/employee/`) – Employee entity, repository, service, controller, routes.
- **leave-policy** (`src/modules/leave-policy/`) – LeavePolicy entity, repository, service, controller, routes.
- **leave-balance** (`src/modules/leave-balance/`) – LeaveBalance entity, repository, service.
- **leave-request** (`src/modules/leave-request/`) – LeaveRequest entity, repository, service, controller, routes.
- **audit** (`src/modules/audit/`) – AuditLog entity, repository, service.
- **notification** (`src/modules/notification/`) – Notification entity, repository, service.

### Dependency Map

- `leave-request` depends on `employee`, `leave-policy`, `leave-balance`, `audit`, `notification`.
- `leave-balance` depends on `leave-policy`, `employee`.
- `notification` and `audit` depend on `employee`.
- All modules depend on `shared-types`.

### Conceptual Data Model (PostgreSQL)

Six tables: `employees`, `leave_requests`, `leave_policies`, `leave_balances`, `audit_logs`, `notifications`. All foreign keys reference `employees.id` or `leave_policies.id`. Indexes support common query patterns (lookup by employee, status, date range, fiscal year).

### Recommended Implementation Phases

1. **Foundation** – Shared types, Employee & LeavePolicy modules.
2. **Leave Balance** – Balance tracking with policy integration.
3. **Leave Request Core** – Full lifecycle, balance deduction, audit, notifications.
4. **API & Integration** – Fastify endpoints, validation, end-to-end tests.

### Open Questions

1. **Day counting semantics** – inclusive, exclusive, or business days? (affects all balance calculations)
2. **Balance computation strategy** – derived live, materialized transactional, or hybrid? (affects consistency and transactional design)

These must be resolved before implementation begins.
<!-- gestalt:architecture feature=be068fd3-a1c9-4eb0-ae38-156852fec5c5 END -->
