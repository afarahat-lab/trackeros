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
src/shared/types/index.ts        — canonical enums, cross-module DTOs, requestedDays helper
src/shared/errors/index.ts       — AppError base + Validation/NotFound/Unauthorized/Forbidden/Conflict subclasses
src/shared/db/connection.ts      — the single pg Pool (DATABASE_URL, SSL in production)
src/shared/db/unit-of-work.ts    — IUnitOfWork + PgUnitOfWork (BEGIN/COMMIT/ROLLBACK)
src/shared/db/index.ts           — public entry point (pool, IUnitOfWork, PgUnitOfWork)
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

<!-- gestalt:architecture feature=babd3932-368b-46a5-a4dc-6dccaafd84ba START -->
## Leave Management Module — Reconciled Architecture

### Stack
TypeScript 20, Fastify, PostgreSQL, modular monolith, Jest. Frontend React Native is out of scope for this backend module.

### Canonical naming decisions
- EmployeeRole: EMPLOYEE | MANAGER | ADMIN (replaces hr_admin).
- LeaveTypeCode: annual | sick | emergency | unpaid | maternity | paternity (lowercase persisted values — supersedes the earlier ANNUAL|SICK|EMERGENCY-only position).
- EmploymentStatus: ACTIVE | TERMINATED | ON_LEAVE (drops INACTIVE).
- AuditRecord is canonicalized as AuditLog.
- LeaveType is a first-class entity with its own table and module.

### Domain entities and lifecycle states
- Employee: ACTIVE, TERMINATED, ON_LEAVE.
- LeaveType: ACTIVE, ARCHIVED.
- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- LeaveBalance: OPEN, CLOSED.
- LeavePolicy: DRAFT, ACTIVE, SUPERSEDED.
- AuditLog: RECORDED.
- Notification: PENDING, SENT, READ, ARCHIVED.

### Key business rules
- requestedDays = endDate - startDate + 1 (inclusive calendar days) is the single canonical day-count derivation.
- Sufficiency check: entitledDays - usedDays - pendingDays >= requestedDays.
- Reservation lifecycle: submit increments pendingDays; approve decrements pendingDays and increments usedDays; reject/cancel decrements pendingDays only.
- Approval authorization: MANAGER or ADMIN only, no self-approval, approver must be requester's manager or ADMIN.
- Notice: startDate >= today + minNoticeDays (calendar), EMERGENCY exempt.
- Max duration: requestedDays <= maxConsecutiveDays and <= maxRequestDays.
- Every state-changing operation writes an AuditLog.

### Conceptual tables
employees, leave_types, leave_policies, leave_requests, leave_balances, notifications, audit_logs. No SQL DDL; code agent generates migrations.

### Modules
shared-types, shared-db, shared-errors, employee, leave-type, policy, audit, notification, balance, validation, leave.

### Dependency direction
leave is the sole orchestrator and depends on balance, validation, policy, employee, audit, notification, leave-type, and shared foundations. No module depends back on leave.

### Phases
1 Shared foundations; 2 employee/leave-type/policy; 3 audit/notification; 4 balance; 5 validation; 6 leave.

### Cross-cutting contracts
- Auth: JWT bearer; request.user { id, role: EMPLOYEE|MANAGER|ADMIN }; requireRole guard; no self-approval.
- Error: { error, code }; 400/401/403/404/409.
- Transaction: service-owned IUnitOfWork.withTransaction; repositories accept optional PoolClient; BEGIN/COMMIT/ROLLBACK only in PgUnitOfWork.

### Phase 1 delivered (shared foundations)
- `src/shared/types/index.ts` — six canonical enums (LeaveStatus, LeaveTypeCode, AuditAction, NotificationStatus, EmploymentStatus, EmployeeRole) plus CreateLeaveRequestDto / UpdateLeaveRequestDto / LeaveRequestQueryParams. The canonical `requestedDays(startDate, endDate)` inclusive day-count helper is implemented HERE (not in the validation module as PLAN.md Phase 5 prescribed) so every later consumer imports it from the shared entry point.
- `src/shared/errors/index.ts` — AppError (message, statusCode, code) with subclasses ValidationError(400), UnauthorizedError(401), ForbiddenError(403), NotFoundError(404), ConflictError(409), each with a stable code string and correct `instanceof AppError`.
- `src/shared/db/unit-of-work.ts` — IUnitOfWork.withTransaction<T>(work: (tx: PoolClient) => Promise<T>) and PgUnitOfWork (acquires from the shared pool, BEGIN/COMMIT/ROLLBACK, always releases). `src/shared/db/index.ts` is the public entry point re-exporting `pool`, `IUnitOfWork`, `PgUnitOfWork`.
- Jest tests under `tests/unit/shared/` cover the error classes, enum member sets, the requestedDays helper, and PgUnitOfWork transaction semantics.

### Open questions
Day-count calendar vs business days; accrual model; carry-forward cap; migration mechanism; controller layer; BullMQ for notifications.
<!-- gestalt:architecture feature=babd3932-368b-46a5-a4dc-6dccaafd84ba END -->
