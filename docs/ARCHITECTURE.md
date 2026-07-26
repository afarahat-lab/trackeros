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

<!-- gestalt:architecture feature=6f64b552-c5b8-42bc-86fa-01fa08ab4abe START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is implemented as a modular monolith using TypeScript, Fastify, PostgreSQL, and React Native (frontend).

### Domain Entities

- **LeaveRequest** — central aggregate representing an employee's leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED. Tracks approver, rejector, canceller, and timestamps.
- **LeaveType** — enum of leave categories (`annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`). Feature scope covers annual, sick, emergency; others reserved for future.
- **LeaveRequestStatus** — enum of lifecycle states (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`).
- **LeavePolicy** — defines entitlement rules (days, accrual, notice period, approval requirement) per leave type. Lifecycle: ACTIVE, INACTIVE.
- **LeaveBalance** — tracks an employee's entitlement, used, and remaining days per leave type per fiscal year. Lifecycle: ACTIVE, EXHAUSTED, FROZEN.
- **Employee** — organizational actor with manager relationship and employment status (ACTIVE, INACTIVE, TERMINATED).

### Module Boundaries

| Module | Path | Responsibilities |
|--------|------|------------------|
| `leave-type` | `src/modules/leave-type/` | LeaveType enum, model, repository |
| `leave-policy` | `src/modules/leave-policy/` | LeavePolicy CRUD, service, controller, routes |
| `employee` | `src/modules/employee/` | Employee model, repository, service (identity, manager lookup) |
| `audit` | `src/modules/audit/` | AuditRecord model, repository, service (cross-cutting GP-002) |
| `leave-balance` | `src/modules/leave-balance/` | LeaveBalance tracking, service, controller, routes |
| `leave-validation` | `src/modules/leave-validation/` | Validation rules (balance, policy, overlap) — reusable service |
| `leave-request` | `src/modules/leave-request/` | LeaveRequest aggregate, workflow orchestration, REST API |
| `notification` | `src/modules/notification/` | Notification model, repository, service (fire-and-forget) |

### Dependency Map

- `leave-request` depends on `leave-validation`, `leave-balance`, `leave-policy`, `employee`, `audit`, `notification`, `leave-type`
- `leave-validation` depends on `leave-balance`, `leave-policy`, `leave-type`
- `leave-balance` depends on `leave-policy`, `employee`, `leave-type`, `audit`
- `leave-policy` depends on `leave-type`, `audit`
- `employee` depends on `audit`
- `notification` depends on `employee`

### Conceptual Data Model

All tables are conceptual; the code agent generates migrations.

- **leave_types** (id, name, description, is_active, created_at, updated_at) — PK id; unique index on name; index on is_active.
- **leave_policies** (id, policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at) — PK id; FK leave_type_id → leave_types.id; indexes on leave_type_id, is_active.
- **leave_requests** (id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, cancelled_by, cancelled_at, created_at, updated_at) — PK id; FKs employee_id → employees.id, leave_type_id → leave_types.id, approved_by → employees.id, rejected_by → employees.id, cancelled_by → employees.id; indexes on employee_id, status, leave_type_id, (start_date, end_date), approved_by.
- **leave_balances** (id, employee_id, leave_type_id, policy_id, fiscal_year, total_entitlement, used_days, remaining_days, status, created_at, updated_at) — PK id; FKs employee_id → employees.id, leave_type_id → leave_types.id, policy_id → leave_policies.id; indexes on employee_id, (employee_id, fiscal_year), leave_type_id, policy_id.
- **employees** (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at) — PK id; FK manager_id → employees.id; unique indexes on employee_number, email; indexes on manager_id, employment_status, department.
- **audit_logs** (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at) — PK id; FK performed_by → employees.id; indexes on (entity_type, entity_id), performed_by, action, performed_at.
- **notifications** (id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at) — PK id; FK recipient_id → employees.id; indexes on recipient_id, status, (related_entity_type, related_entity_id).

### REST API Surface

**Leave Requests** (exposed by `leave-request` controller)
- `POST /api/leave-requests` — submit (employee)
- `GET /api/leave-requests/:id` — get by ID (employee/manager)
- `GET /api/leave-requests/employee/:employeeId` — list by employee (employee/manager)
- `GET /api/leave-requests/manager/:managerId` — list for manager (manager)
- `PATCH /api/leave-requests/:id/approve` — approve (manager)
- `PATCH /api/leave-requests/:id/reject` — reject (manager)
- `PATCH /api/leave-requests/:id/cancel` — cancel (employee)

**Leave Balances** (exposed by `leave-balance` controller)
- `GET /api/leave-balances/:employeeId` — list balances (employee/manager)
- `GET /api/leave-balances/:employeeId/:leaveTypeId/:fiscalYear` — single balance (employee/manager)

**Leave Policies** (exposed by `leave-policy` controller)
- `GET /api/leave-policies` — list active policies (authenticated)
- `GET /api/leave-policies/:id` — get policy (authenticated)
- `POST /api/leave-policies` — create (HR admin)
- `PUT /api/leave-policies/:id` — update (HR admin)

### Key Business Rules

- Only ACTIVE employees can submit leave requests.
- State transitions enforce strict guards (e.g., only manager can approve/reject).
- Approval decrements leave balance; cancellation of an approved request restores it.
- Balance status becomes EXHAUSTED when remaining days reach zero.
- Every state-changing operation writes an audit log (GP-002).
- Notifications are sent on submission, approval, rejection, and cancellation (fire-and-forget).

### Implementation Phases

1. **Foundation** — `leave-type`, `audit`, `employee` (zero-dependency leaf modules).
2. **Policy Layer** — `leave-policy` (depends on Phase 1).
3. **Balance Engine** — `leave-balance` (depends on Phases 1–2).
4. **Validation & Notification** — `leave-validation`, `notification` (depends on Phases 1–3; can be parallel).
5. **Orchestration** — `leave-request` (depends on all prior phases; exposes public API).

### Stack Compliance

- Language: TypeScript (Node 20)
- Framework: Fastify (REST API)
- Frontend: React Native (mobile client)
- Database: PostgreSQL (via `pg` Pool at `src/shared/db/connection.ts`)
- Architecture: modular-monolith with clear layer separation (domain, application, infrastructure, presentation)
- Cross-cutting: audit (GP-002), RBAC (GP-005), input validation (GP-003)
<!-- gestalt:architecture feature=6f64b552-c5b8-42bc-86fa-01fa08ab4abe END -->
