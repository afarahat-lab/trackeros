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

<!-- gestalt:architecture feature=4fbbfee4-4feb-4a2b-8127-85025f82af24 START -->
## Leave Management Module — Reconciled Architecture

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. The architecture follows a modular-monolith style with Fastify (backend), React Native (frontend), PostgreSQL, and TypeScript. All business rules are enforced in the domain layer; persistence is abstracted behind repository interfaces with concrete PostgreSQL implementations.

### Domain Entities

| Entity | Purpose | Lifecycle States |
|--------|---------|------------------|
| **LeaveRequest** | Employee leave application. Tracks from draft to terminal states. | DRAFT → SUBMITTED → APPROVED / REJECTED; APPROVED → CANCELLED; SUBMITTED → CANCELLED |
| **LeavePolicy** | Rules and entitlements for a leave type. | ACTIVE, INACTIVE |
| **LeaveBalance** | Employee's entitlement, usage, and remaining days per policy per fiscal year. | ACTIVE → EXHAUSTED (when remainingDays=0); ACTIVE/EXHAUSTED → CLOSED (fiscal year end) |
| **Employee** | Organisation member with reporting line and employment status. | ACTIVE, INACTIVE, TERMINATED |

**Key Business Rules (binding across all layers):**
- Day count = `endDate - startDate + 1` (inclusive calendar days).
- Only ACTIVE employees can submit leave.
- Manager approval is verified via `Employee.managerId`.
- Balance sufficiency checked before approval; atomic deduction on approval, restoration on cancellation.
- Overlap detection: no two APPROVED/SUBMITTED requests with overlapping date ranges.
- Policy `minimumNoticeDays` enforced on submission; `requiresManagerApproval=false` enables auto-approval.

### Database Tables (Conceptual)

| Table | Key Fields | Primary Key | Foreign Keys |
|-------|------------|-------------|--------------|
| `leave_requests` | id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at | id | employee_id → employees.id, leave_type_id → leave_policies.id, approved_by → employees.id |
| `leave_balances` | id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at | id | employee_id → employees.id, policy_id → leave_policies.id |
| `employees` | id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at | id | manager_id → employees.id |
| `leave_policies` | id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at | id | — |
| `audit_logs` | id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at | id | performed_by → employees.id |
| `notifications` | id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at | id | recipient_id → employees.id |

Indexes are defined for frequent access patterns: employee lookups, status filtering, date-range scans, compound unique constraints, and audit trails.

### Module Boundaries

```
src/
├── shared/
│   ├── types/          # Enums (LeaveType, LeaveStatus, EmploymentStatus, AuditAction), BaseEntity
│   └── db/             # PostgreSQL connection pool (pg Pool)
├── modules/
│   ├── employee/       # Employee CRUD, status checks
│   ├── policy/         # LeavePolicy CRUD, active policy lookups
│   ├── balance/        # LeaveBalance management, deduction/restoration
│   ├── notification/   # Notification creation and retrieval
│   ├── audit/          # Audit trail recording and querying
│   └── leave/          # Orchestrator: submit, approve, reject, cancel
```

**Dependency direction (acyclic):**
- `employee` and `policy` are foundation modules (only depend on shared).
- `balance` depends on `employee` and `policy`.
- `notification` and `audit` are independent mid-layer modules.
- `leave` orchestrates all five downstream modules via constructor injection.

### Recommended Build Phases

1. **Shared types + Employee module** — foundation enums and employee vertical slice.
2. **Policy module** — policy vertical slice.
3. **Balance module** — balance vertical slice (depends on employee & policy).
4. **Notification + Audit modules** — independent mid-layer slices.
5. **Leave module** — orchestrator (depends on all above).
6. **Validation schemas** — Zod schemas for all modules.
7. **Controllers** — HTTP translation layer.
8. **Routes + app registration** — Fastify route plugins, RBAC stubs, app.ts wiring.

### Open Questions (Require Stakeholder Decision)

1. **Fiscal year definition** — calendar, configurable, or fixed? Affects balance lifecycle and cross-year leave handling.
2. **Mid-year hire entitlement** — pro-rata, full, or accrual-based?
3. **Cancellation authorization** — employee only, employee/manager, or employee/manager/HR?
4. **Emergency leave special-casing** — standard policy, bypass notice, or auto-approve?
5. **Partial-day rounding** — nearest half-day, ceiling, floor, or exact decimal?

These decisions materially impact balance arithmetic, authorization, and policy enforcement. They must be resolved before implementation reaches the balance and leave modules.
<!-- gestalt:architecture feature=4fbbfee4-4feb-4a2b-8127-85025f82af24 END -->
