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
src/shared/
  db/connection.ts              — PostgreSQL connection pool (pg)
  types/index.ts                — Shared enums (LeaveRequestStatus, LeaveType,
                                  BalanceStatus, EmploymentStatus) + BaseEntity

src/modules/audit/              — Audit module (Phase 1 ✓)
  audit.model.ts                — AuditRecord entity
  audit.repository.interface.ts — IAuditRepository
  audit.service.interface.ts    — IAuditService
  audit.service.ts              — AuditService (DI: IAuditRepository)
  index.ts                      — Barrel export

src/modules/employee/           — Employee module (Phase 2 ✓ — implementation complete; tests pending)
  employee.model.ts             — Employee entity
  employee.repository.interface.ts — IEmployeeRepository
  employee.service.interface.ts — IEmployeeService + CreateEmployeeDto
  employee.service.ts           — EmployeeService (DI: IEmployeeRepository)
  employee.controller.ts        — Fastify controller factory (makeEmployeeController)
  employee.routes.ts            — Fastify route registration (prefix /employees)
  index.ts                      — Barrel export

src/modules/status/             — System status (pre-existing)
  status.model.ts               — SystemStatus
  status.service.interface.ts   — IStatusService
  status.service.ts             — StatusService
  index.ts

src/modules/uptime/             — Uptime (pre-existing)
  uptime.model.ts               — UptimeStatus
  uptime.service.interface.ts   — IUptimeService
  uptime.service.ts             — UptimeService
  uptime.routes.ts              — Fastify routes
  index.ts

src/app.ts                      — Fastify app bootstrap
src/index.ts                    — Entry point (port 3000)

tests/unit/modules/audit/       — AuditService unit tests
```

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

<!-- gestalt:architecture feature=5718a840-0b03-4112-91da-8c645c2fae86 START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities

- **Employee** — Represents an employee. Tracks employment status (ACTIVE, INACTIVE, TERMINATED) and reporting hierarchy (managerId). Required for leave eligibility, approval routing, and balance ownership.
- **LeaveRequest** — An employee's leave application. Lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED) → CANCELLED. References the governing LeavePolicy via `leavePolicyId`.
- **LeavePolicy** — Rules for a leave type (annual, sick, emergency, etc.): entitlement days, accrual, minimum notice, manager approval flag. Lifecycle: ACTIVE / INACTIVE.
- **LeaveBalance** — Employee's entitlement, used, and remaining days for a policy in a fiscal year. Lifecycle: ACTIVE → EXHAUSTED (when remainingDays=0) → CLOSED (fiscal year end).

### Business Rules (Binding)

1. Only ACTIVE employees can submit leave.
2. Day count = `(endDate - startDate) + 1` (inclusive calendar days).
3. `startDate` ≥ today; `endDate` ≥ `startDate`.
4. On submission, check `remainingDays` ≥ requested days.
5. Only the employee's direct manager (employee.managerId) may approve/reject.
6. On APPROVED: atomically increment `usedDays`, decrement `remainingDays`.
7. On CANCELLED (from APPROVED): restore balance (reverse deduction).
8. If `requiresManagerApproval` is false, request auto-approves on submission.
9. If `minimumNoticeDays` is set, `startDate - submissionDate` ≥ `minimumNoticeDays` (emergency leave bypasses this).
10. No overlapping APPROVED or SUBMITTED requests for the same employee.
11. When `remainingDays` reaches 0, balance becomes EXHAUSTED.
12. Valid state transitions: DRAFT→SUBMITTED, DRAFT→CANCELLED, SUBMITTED→APPROVED, SUBMITTED→REJECTED, SUBMITTED→CANCELLED, APPROVED→CANCELLED. REJECTED and CANCELLED are terminal.
13. Emergency leave bypasses `minimumNoticeDays` check.
14. If `accrualRate` is set, entitlement grows over the fiscal year, capped at `maxAccumulation`.
15. Employee can cancel own DRAFT/SUBMITTED requests; only manager/HR can cancel APPROVED.

### Module Structure

- **shared-types** (`src/shared/types/`) — Enums (LeaveRequestStatus, LeaveType, BalanceStatus, EmploymentStatus) and BaseEntity.
- **employee** (`src/modules/employee/`) — Employee entity, repository, service, controller, routes.
- **leave-policy** (`src/modules/leave-policy/`) — LeavePolicy entity, repository, service.
- **leave-balance** (`src/modules/leave-balance/`) — LeaveBalance entity, repository, service (methods use `policyId`).
- **leave-request** (`src/modules/leave-request/`) — LeaveRequest entity (with `leavePolicyId`), repository, service, controller, routes. Orchestrates the workflow.
- **audit** (`src/modules/audit/`) — AuditRecord entity, repository, service.

### Dependency Map

- leave-request → shared-types, employee, leave-policy, leave-balance, audit
- leave-balance → shared-types, employee
- leave-policy → shared-types
- employee → shared-types

### Phases

1. **Shared types & Audit** — ✅ Complete. Foundation enums and audit capability.
2. **Employee** — ✅ Implementation complete (model, repository interface, service interface, service, controller, routes, barrel export). Unit tests still pending.
3. **Leave Policy** — Planned.
4. **Leave Balance** — Planned.
5. **Leave Request** — Planned.

### Employee Module Implementation Details

- **Service** (`EmployeeService`): Constructor-injected `IEmployeeRepository`. `create()` generates UUID, sets `employmentStatus=ACTIVE`, `terminationDate=null`, `deletedAt=null`. `update()` applies field-level allowlisting — only `firstName`, `lastName`, `email`, `managerId`, `department`, `hireDate` are writable. `terminate()` fetches the employee first (returns null if not found), then sets `employmentStatus=TERMINATED` and `terminationDate=now`.
- **Controller** (`makeEmployeeController`): Factory returning an object of Fastify handler functions. Each handler extracts params/body from the request, delegates to the service, and returns appropriate status codes (200, 201, 404).
- **Routes** (`employeeRoutes`): Accepts `FastifyInstance` + `IEmployeeRepository`, constructs service and controller inline, registers six endpoints under `/employees`:
  - `GET /employees/:id` — get by ID
  - `GET /employees/number/:employeeNumber` — get by employee number
  - `GET /employees/:managerId/subordinates` — list direct reports
  - `POST /employees` — create
  - `PUT /employees/:id` — update (field-allowlisted)
  - `POST /employees/:id/terminate` — terminate

### Cross-cutting Contracts

- **Auth**: `request.user: { id: string; role: UserRole }` (UserRole = 'employee' | 'manager' | 'hr_admin'). JWT via auth middleware; RBAC via `requireRole(...)` guard.
- **Transaction**: Repository methods accept optional `client: PoolClient`; service owns the unit of work (BEGIN/COMMIT/ROLLBACK).
- **Error Response**: `{ error: string; code: string }`. HTTP 400 for validation/balance/policy errors, 401/403 for auth, 404 for not found.

### Open Questions

1. Calendar days vs working days for leave counting.
2. Fiscal year boundary definition.
3. Emergency leave auto-approval behaviour.
<!-- gestalt:architecture feature=5718a840-0b03-4112-91da-8c645c2fae86 END -->
