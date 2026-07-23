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

<!-- gestalt:architecture feature=90e4805a-61d0-468c-987a-e8a6d4d1c968 START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is built as a modular monolith using TypeScript, Fastify, and PostgreSQL, adhering to the project's golden principles (audit, RBAC, transaction semantics).

### Domain Model

**Core Aggregates**

- **LeaveRequest** — central aggregate representing an employee's leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED / REJECTED; any state → CANCELLED. Balance is deducted on APPROVED and restored on CANCELLED (if previously approved).
- **LeavePolicy** — defines rules and entitlements per leave type (annual, sick, emergency). Lifecycle: ACTIVE, INACTIVE, ARCHIVED. Only ACTIVE policies govern new requests.
- **LeaveBalance** — tracks entitlement, usage, and remaining days per employee per policy per fiscal year. Lifecycle: ACTIVE, EXHAUSTED, FROZEN. Deducted on approval, restored on cancellation.
- **LeaveNotification** — domain event for status changes and balance alerts. Lifecycle: PENDING, SENT, READ, ARCHIVED.

**Business Rules**

- BR-001: startDate < endDate; zero/negative duration rejected.
- BR-002: No overlapping APPROVED requests for the same employee.
- Emergency leave bypasses minimum-notice checks.
- Self-approval prohibited.
- Cross-fiscal-year requests consume balance from the starting fiscal year only.
- DRAFT requests auto-expire after 30 days.

### Data Model (Conceptual)

Seven tables support the module:

- `employee` — referenced by all leave tables; holds basic employee info and manager hierarchy.
- `leave_type` — lookup for leave categories (annual, sick, emergency).
- `leave_policy` — configurable rules per leave type (entitlement, accrual, notice, approval requirement).
- `leave_balance` — per-employee, per-policy, per-fiscal-year balance with status.
- `leave_request` — core application with status lifecycle, reviewer tracking, and date range.
- `leave_notification` — persisted notifications with delivery state.
- `audit_log` — immutable record of all state-changing operations (GP-002 compliance).

All tables use UUID primary keys and appropriate foreign keys. Indexes are designed for frequent access patterns: employee lookups, manager approval queues, date-range overlap detection, and audit trails.

### Module Structure

```
src/modules/
  leave-type/          # Enum and model
  leave-policy/        # Policy model, repository, service
  leave-balance/       # Balance model, repository, service
  leave-request/       # Request model, repository, service, controller, routes
  audit-log/           # Audit model, repository, service
  notification/        # Notification service, repository
```

Dependencies flow inward: `LeaveType` ← `LeavePolicy` ← `LeaveBalance` ← `LeaveRequest`, with `AuditLog` and `Notification` as cross-cutting leaves consumed by `LeaveRequest`.

### Application Services

- **ILeaveRequestService** — orchestrates apply, approve, reject, cancel. Validates against policy, checks balance, deducts/restores, audits, and notifies.
- **ILeavePolicyService** — provides policy lookup and request validation.
- **ILeaveBalanceService** — manages balance initialization, deduction, and restoration.
- **IAuditLogService** — records all state changes.
- **INotificationService** — sends and persists notifications.

### Stack Compliance

- **Language**: TypeScript (strict mode)
- **Framework**: Fastify (routes, validation, error handling)
- **Database**: PostgreSQL accessed via `pg` Pool (`src/shared/db/connection.ts`)
- **Architecture**: Modular monolith with clear layer boundaries (domain, application, infrastructure, presentation)
- **Golden Principles**: All state mutations are audited (GP-002); RBAC enforced at route level (GP-003); input validation at controller boundary (GP-005); async errors caught by Fastify error handler (GP-006)

### Build Phases

1. **Foundation**: LeaveType enum + AuditLog module (zero dependencies)
2. **Policy Layer**: LeavePolicy module (depends on LeaveType)
3. **Balance Tracking**: LeaveBalance module (depends on LeaveType, LeavePolicy)
4. **Notifications**: Notification module (zero dependencies, includes persistence)
5. **Orchestration**: LeaveRequest module (depends on all above; includes controller and routes)

Each phase produces a fully testable increment. The final phase delivers the complete leave management workflow.
<!-- gestalt:architecture feature=90e4805a-61d0-468c-987a-e8a6d4d1c968 END -->
