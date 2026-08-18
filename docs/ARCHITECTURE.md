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
src/modules/status/           — SystemStatus model + service (health-check)
src/modules/uptime/           — UptimeStatus model + routes + service
src/modules/employee/         — Employee model, repository, service
src/modules/leave-policy/     — LeavePolicy model, repository, service
src/modules/balance/          — LeaveBalance model, repository, service
src/modules/leave-request/    — LeaveRequest model, repository, service, controller, routes
src/shared/db/connection.ts   — pg Pool (DATABASE_URL)
src/shared/types/             — shared enums: LeaveStatus, LeaveType,
                                 LeaveAction, NotificationType,
                                 EmploymentStatus, AuditAction
src/shared/base-repository.ts — generic IBaseRepository<T> interface +
                                 abstract BaseRepository<T> class
src/shared/error-types.ts     — NotFoundError, ValidationError,
                                 ConflictError, UnauthorizedError
```

### Employee module (`src/modules/employee/`)

- **employee.model.ts** — `Employee` entity interface: id, employeeNumber, firstName, lastName, email, managerId (string | null), department (string | null), hireDate, terminationDate (Date | null), employmentStatus (EmploymentStatus), createdAt, updatedAt, deletedAt (Date | null).
- **employee.repository.ts** — `IEmployeeRepository` extends `IBaseRepository<Employee>` with `findByEmployeeNumber`, `findByEmail`, `findByManagerId`, `findActive`. `EmployeeRepository` extends `BaseRepository<Employee>`, table `employees`. All queries filter `deleted_at IS NULL`.
- **employee.service.ts** — `IEmployeeService` with `getById`, `getByEmployeeNumber`, `getByEmail` (all throw `NotFoundError` when not found), `getSubordinates`, `isActive` (throws `NotFoundError` for nonexistent employee; returns boolean for existing). `EmployeeService` delegates to `IEmployeeRepository`.
- **index.ts** — barrel re-export of model, repository interfaces/classes, service interfaces/classes.

### LeavePolicy module (`src/modules/leave-policy/`)

- **leave-policy.model.ts** — `LeavePolicy` entity interface: id, policyName, leaveType (LeaveType), entitlementDays, accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval, isActive, createdAt, updatedAt.
- **leave-policy.repository.ts** — `ILeavePolicyRepository` extends `IBaseRepository<LeavePolicy>` with `findByLeaveType`, `findActive`. `LeavePolicyRepository` extends `BaseRepository<LeavePolicy>`, table `leave_policies`.
- **leave-policy.service.ts** — `ILeavePolicyService` with `getById`, `getByLeaveType` (both throw `NotFoundError` when not found), `getActivePolicies`, `isLeaveTypeActive` (returns false for nonexistent policy — never throws). `LeavePolicyService` delegates to `ILeavePolicyRepository`.
- **index.ts** — barrel re-export of model, repository interfaces/classes, service interfaces/classes.

### Balance module (`src/modules/balance/`)

- **balance.model.ts** — `LeaveBalance` entity interface: id, employeeId, leavePolicyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status ('ACTIVE' | 'CLOSED'), createdAt, updatedAt. Also exports `CreateLeaveBalanceDto` (employeeId, leavePolicyId, totalEntitlement, fiscalYear) and `UpdateLeaveBalanceDto` (partial of usedDays, remainingDays, status).
- **balance.repository.ts** — `ILeaveBalanceRepository` extends `IBaseRepository<LeaveBalance>` with `findByEmployeeId`, `findByEmployeeAndPolicy`, `findByEmployeeAndFiscalYear`, `findActiveByEmployee`, `upsert`. `LeaveBalanceRepository` extends `BaseRepository<LeaveBalance>`, table `leave_balances`. The `upsert` method uses `ON CONFLICT (employee_id, leave_policy_id, fiscal_year)` for idempotent balance creation.
- **balance.service.ts** — `ILeaveBalanceService` with `getBalance`, `getOrCreateBalance`, `deductDays`, `restoreDays`, `getRemainingDays`, `closeBalance`. `LeaveBalanceService` delegates to `ILeaveBalanceRepository`. Key rules: `deductDays` computes `daysRequested = (endDate - startDate) + 1` (inclusive calendar days, integer), throws `ValidationError` on insufficient balance or closed balance. `restoreDays` floors `usedDays` at 0. `getBalance` throws `NotFoundError` when balance not found or fiscal year mismatch.
- **index.ts** — barrel re-export of model, repository interfaces/classes, service interfaces/classes.

### LeaveRequest module (`src/modules/leave-request/`)

- **leave-request.model.ts** — `LeaveRequest` entity interface: id, employeeId, leavePolicyId, startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus), approvedBy (string | null), approvedAt (Date | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt, updatedAt. Also exports `CreateLeaveRequestDto` (employeeId, leavePolicyId, startDate, endDate, reason?), `UpdateLeaveRequestDto` (partial of startDate, endDate, reason, status), and `LeaveRequestQueryParams` (employeeId?, status?, leavePolicyId?, startDate?, endDate?).
- **leave-request.repository.ts** — `ILeaveRequestRepository` extends `IBaseRepository<LeaveRequest>` with `findByEmployeeId`, `findByStatus`, `findOverlapping`, `findByDateRange`, `findPendingForManager`. `LeaveRequestRepository` extends `BaseRepository<LeaveRequest>`, table `leave_requests`. `findOverlapping` uses the inclusive-day overlap formula (`existing.startDate <= newEndDate AND existing.endDate >= newStartDate`), filtering out REJECTED and CANCELLED requests. `findPendingForManager` JOINs `employees` on `manager_id`. All methods accept optional `PoolClient` for transaction support.
- **leave-request.service.ts** — `ILeaveRequestService` with `create`, `submit`, `approve`, `reject`, `cancel`, `update`, `getById`, `query`, `getEmployeeRequests`. `LeaveRequestService` constructor injects `ILeaveRequestRepository`, `IEmployeeService`, `ILeavePolicyService`, `ILeaveBalanceService`. Key rules:
  - `create`: validates employee is ACTIVE, policy is active, `endDate >= startDate`; creates in DRAFT status.
  - `submit`: only from DRAFT; validates employee active, policy active, minimum notice (skipped for EMERGENCY leave type), no overlapping requests, sufficient balance via `getRemainingDays`. Transitions to SUBMITTED.
  - `approve`: only from SUBMITTED; deducts days from balance via `deductDays` (using inclusive formula); sets `approvedBy`/`approvedAt`. Transitions to APPROVED.
  - `reject`: only from SUBMITTED; no balance change; sets `approvedBy`/`approvedAt`. Transitions to REJECTED.
  - `cancel`: from SUBMITTED or APPROVED; if from APPROVED, restores days via `restoreDays`; sets `cancelledBy`/`cancelledAt`. Transitions to CANCELLED.
  - `update`: only DRAFT can be updated; validates `endDate >= startDate` if both provided.
  - Fiscal year = `startDate.getFullYear()` (calendar year of start date).
  - `computeDays` = `(endDate - startDate) + 1` (inclusive calendar days, integer).
  - Note: self-approval is not checked in the service layer (divergence from the planned cross-cutting contract — planned for a future phase).
- **leave-request.controller.ts** — `LeaveRequestController` with handler methods: `createLeaveRequest`, `submitLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`, `cancelLeaveRequest`, `updateLeaveRequest`, `getLeaveRequest`, `queryLeaveRequests`. Uses Zod schemas for request validation (body, params, query). Returns 201 for create, 200 for all other success responses, 400 with `{ error, details }` on validation failure. Service-thrown errors (NotFoundError, ValidationError, ConflictError) propagate as unhandled — no global error handler is wired yet.
- **leave-request.routes.ts** — Fastify plugin registering 8 routes:
  - `POST /leave-requests` → `createLeaveRequest`
  - `POST /leave-requests/:id/submit` → `submitLeaveRequest`
  - `POST /leave-requests/:id/approve` → `approveLeaveRequest`
  - `POST /leave-requests/:id/reject` → `rejectLeaveRequest`
  - `POST /leave-requests/:id/cancel` → `cancelLeaveRequest`
  - `PUT /leave-requests/:id` → `updateLeaveRequest`
  - `GET /leave-requests/:id` → `getLeaveRequest`
  - `GET /leave-requests` → `queryLeaveRequests`
  - Dependencies are manually wired (no DI container): instantiates all repositories and services inline.
  - Routes are NOT yet registered in `src/app.ts` (wiring deferred to Phase 5).
- **index.ts** — barrel re-export of model, repository interfaces/classes, service interfaces/classes, controller, and routes plugin.

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against
- Service methods follow a "throw on not found" pattern: `getById`, `getByEmployeeNumber`, `getByEmail`, `getByLeaveType` all throw `NotFoundError` rather than returning `null`. Existence-check methods (`isActive`, `isLeaveTypeActive`) diverge: `isActive` throws for nonexistent employees; `isLeaveTypeActive` returns `false` for nonexistent policies.
- Balance service `getBalance` throws `NotFoundError` on fiscal year mismatch — balances are strictly scoped to a single fiscal year.

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

## Test configuration

- Jest with `ts-jest` preset, `node` test environment
- Test files under `tests/` matching `*.test.(ts|js)` or `*.spec.(ts|js)`
- `moduleDirectories: ['node_modules', 'src']` enables non-relative imports (e.g. `import { Employee } from 'modules/employee'`)
- Unit tests mock the repository layer — no real database connection required

<!-- gestalt:architecture feature=d8fc2ea6-3dd4-4741-b0ac-513d3ac0f17f START -->
## Leave Management Module — Reconciled Architecture

### Overview

The leave management module enables employees to apply for annual, sick, emergency, and other leave types. Managers (or HR admins when no manager exists) approve or reject requests. The system tracks leave balances per employee, policy, and fiscal year, enforcing strict business rules around state transitions, balance sufficiency, overlap prevention, and auditability.

### Domain Entities

- **LeaveRequest** — Core aggregate representing a leave application. Lifecycle: DRAFT → SUBMITTED → {APPROVED | REJECTED}; any non-terminal state → CANCELLED. Balance is deducted on APPROVED and restored on CANCELLED from APPROVED.
- **LeavePolicy** — Defines entitlement, accrual, notice, and approval rules per leave type. Lifecycle: ACTIVE ↔ INACTIVE.
- **LeaveBalance** — Tracks entitlement, used, and remaining days per employee per policy per fiscal year. Lifecycle: ACTIVE → CLOSED (on fiscal year rollover).
- **Employee** — Owns leave requests and balances; managerId establishes approval hierarchy. Lifecycle: ACTIVE, INACTIVE, TERMINATED.
- **LeaveType** — Enum: annual, sick, emergency, unpaid, maternity, paternity.
- **AuditRecord** — Immutable log of all state-changing operations.
- **Notification** — User-facing notification for leave events.

### Conceptual Table Specifications

| Table | Key Fields | Index Rationale |
|-------|------------|-----------------|
| `leave_requests` | id, employee_id, leave_policy_id, start_date, end_date, status, approved_by, cancelled_by, … | employee_id, status, (employee_id, status), approved_by, date ranges |
| `employees` | id, employee_number, email, manager_id, employment_status, … | employee_number (unique), email (unique), manager_id, employment_status |
| `leave_policies` | id, leave_type, is_active, … | (leave_type, is_active) for active policy lookup |
| `leave_balances` | id, employee_id, leave_policy_id, fiscal_year, total_entitlement, used_days, remaining_days, status | (employee_id, leave_policy_id, fiscal_year) unique constraint |
| `audit_logs` | id, entity_type, entity_id, action, performed_by, performed_at, … | (entity_type, entity_id), performed_by, performed_at |
| `notifications` | id, recipient_id, type, status, created_at, … | recipient_id, status, created_at |

### Module Structure

- `shared/types` — Enums (LeaveStatus, LeaveType, EmploymentStatus, AuditAction, NotificationType, LeaveAction)
- `employee` — Employee entity, repository, service
- `leave-policy` — LeavePolicy entity, repository, service
- `balance` — LeaveBalance entity, repository, service (model + repository + service built; controller + routes planned for Phase 5)
- `leave-request` — LeaveRequest aggregate, repository, service, controller, routes (fully built; routes not yet registered in app.ts)
- `audit` — AuditRecord entity, repository, service (planned)
- `notification` — Notification entity, repository, service (planned)

### Dependency Map

```
shared/types ← employee, leave-policy, balance, leave-request, audit, notification
leave-request → employee, leave-policy, balance, audit, notification
```

### Cross-Cutting Contracts

**Auth Contract**  
JWT bearer token → `request.user: { id: string, role: UserRole }`. Roles: `employee`, `manager`, `hr_admin`. RBAC enforced via `requireRole(...)` middleware. Self-approval prevented in service layer.

**Transaction Contract**  
Repository methods for multi-step writes accept optional `PoolClient`. Service acquires client, runs `BEGIN`, passes client to repos, then `COMMIT`/`ROLLBACK`. Atomic boundary: status change + balance adjustment + audit log.

**Error Response Contract**  
`{ error: string, code: string, statusCode: number }`. 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict (overlap), 422 domain rule violation.

### Implementation Status (by Phase)

| Phase | Module | Status |
|-------|--------|--------|
| 1 | Shared types, base repository, error types | ✅ Built |
| 2 | Employee, LeavePolicy | ✅ Built |
| 3 | LeaveBalance (model, repository, service) | ✅ Built |
| 4 | LeaveRequest (model, repository, service, controller, routes) | ✅ Built (routes not yet registered in app.ts; no unit tests) |
| 5 | Audit, Notification, routes, integration tests | Planned |

### Open Questions

- Fiscal year definition (calendar vs custom)
- Cross-fiscal-year request handling (pro-rate, single-year, reject)
- Calendar vs business days for leave counting
- Accrual model (lump sum, monthly, per-pay-period, configurable)
- Emergency leave bypass of minimum notice
- Rounding rule for fractional days
<!-- gestalt:architecture feature=d8fc2ea6-3dd4-4741-b0ac-513d3ac0f17f END -->
