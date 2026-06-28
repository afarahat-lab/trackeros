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
src/shared/db/connection.ts
src/shared/types/leave.types.ts
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

## Leave Management Module

### Domain Entities

**LeaveRequest**
- Represents a leave application submitted by an employee
- Attributes: id, employeeId, leaveType, startDate, endDate, status, reason, managerId, createdAt, updatedAt
- Status values: PENDING, APPROVED, REJECTED, CANCELLED

**LeaveBalance**
- Tracks remaining leave entitlement by employee and leave type
- Attributes: id, employeeId, leaveType, balance, fiscalYear

**LeavePolicy**
- Defines entitlement rules and leave-type configurations
- Attributes: id, leaveType, entitlementDays, carryOverLimit, requiresApproval
- Leave types: ANNUAL, SICK, EMERGENCY

**Employee**
- Employee identity and reporting hierarchy (owned by employee module)
- Attributes: id, name, email, managerId, department

**Notification**
- Leave workflow notifications (owned by notification module)
- Attributes: id, recipientId, type, title, body, metadata, status, createdAt

### Module Dependencies

- `leave` module depends on: `employee`, `policy`, `balance`, `notification`
- `balance` module depends on: `policy`
- `notification` module depends on: `employee`

### Lifecycle States

LeaveRequest status transitions:
1. PENDING → APPROVED (by manager)
2. PENDING → REJECTED (by manager)
3. PENDING → CANCELLED (by employee)

### Shared Types

#### `src/shared/types/leave.types.ts`
- **LeaveType** — string enum: `ANNUAL`, `SICK`, `EMERGENCY`
- **LeaveStatus** — string enum: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`

Additional types (`NotificationType`, `AuditAction`, `EntityType`) will be added in later phases as the notification and audit modules are built out.

### Transaction Semantics

- Leave request creation: Atomic transaction creating LeaveRequest and audit record
- Leave request approval: Atomic transaction updating LeaveRequest status and LeaveBalance
- Balance adjustments: Always executed within repository transactions
- Notifications: Sent after successful transaction commit

### Cross-Cutting Concerns
- All operations follow repository pattern (GP-001)
- All state changes generate audit records (GP-002)
- Input validation at API boundaries (GP-003)
- No sensitive data in logs (GP-004)
- RBAC enforced on all endpoints (GP-005)
- Proper error handling (GP-006)
