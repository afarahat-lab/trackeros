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
- **employee.service.ts** — `IEmployeeService` with `getById`, `getByEmployeeNumber`, `getByEmail` (all return `Employee | null`), `getSubordinates` (returns only ACTIVE employees), `isActive` (returns `false` for nonexistent employee; returns boolean for existing). `EmployeeService` delegates to `IEmployeeRepository`.
- **index.ts** — barrel re-export of model, repository interfaces/classes, service interfaces/classes.

### LeavePolicy module (`src/modules/leave-policy/`)

- **leave-policy.model.ts** — `LeavePolicy` entity interface: id, policyName, leaveType (LeaveType), entitlementDays, accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval, isActive, createdAt, updatedAt.
- **leave-policy.repository.ts** — `ILeavePolicyRepository` extends `IBaseRepository<LeavePolicy>` with `findByLeaveType`, `findActive`. `LeavePolicyRepository` extends `BaseRepository<LeavePolicy>`, table `leave_policies`.
- **leave-policy.service.ts** — `ILeavePolicyService` with `getById`, `getByLeaveType` (both return `LeavePolicy | null`), `getActivePolicies`, `isLeaveTypeActive` (returns false for nonexistent policy — never throws). `LeavePolicyService` delegates to `ILeavePolicyRepository`.
- **index.ts** — barrel re-export of model, repository interfaces/classes, service interfaces/classes.

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against
- Service methods follow a "return null on not found" pattern: `getById`, `getByEmployeeNumber`, `getByEmail`, `getByLeaveType` all return `null` rather than throwing. Existence-check methods (`isActive`, `isLeaveTypeActive`) both return `false` for nonexistent entities — never throw.

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
- `leave-request` — LeaveRequest aggregate, repository, service, controller, routes
- `balance` — LeaveBalance entity, repository, service, controller, routes
- `audit` — AuditRecord entity, repository, service
- `notification` — Notification entity, repository, service

### Dependency Map

```
shared/types ← employee, leave-policy, leave-request, balance, audit, notification
leave-request → employee, leave-policy, balance, audit, notification
```

### Cross-Cutting Contracts

**Auth Contract**  
JWT bearer token → `request.user: { id: string, role: UserRole }`. Roles: `employee`, `manager`, `hr_admin`. RBAC enforced via `requireRole(...)` middleware. Self-approval prevented in service layer.

**Transaction Contract**  
Repository methods for multi-step writes accept optional `PoolClient`. Service acquires client, runs `BEGIN`, passes client to repos, then `COMMIT`/`ROLLBACK`. Atomic boundary: status change + balance adjustment + audit log.

**Error Response Contract**  
`{ error: string, code: string, statusCode: number }`. 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict (overlap), 422 domain rule violation.

### Recommended Implementation Phases

1. Foundation & Shared Types — DB connection, migrations, enums.
2. Employee & LeavePolicy Modules — Reference data with basic CRUD.
3. LeaveBalance Module — Balance initialization and queries.
4. LeaveRequest Core Workflow — Full lifecycle with business rules, balance integration, audit, notifications.
5. Integration, Testing & Polish — E2E tests, performance, docs.

### Open Questions

- Fiscal year definition (calendar vs custom)
- Cross-fiscal-year request handling (pro-rate, single-year, reject)
- Calendar vs business days for leave counting
- Accrual model (lump sum, monthly, per-pay-period, configurable)
- Emergency leave bypass of minimum notice
- Rounding rule for fractional days
<!-- gestalt:architecture feature=d8fc2ea6-3dd4-4741-b0ac-513d3ac0f17f END -->
