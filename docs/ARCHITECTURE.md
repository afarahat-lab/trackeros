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
src/shared/types/    — shared enums (LeaveTypeCode, LeaveRequestStatus)
src/shared/utils/    — shared utilities (business-days)
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

<!-- gestalt:architecture feature=8177937e-ec7c-4649-b943-9d9104b82731 START -->
## Leave Management Module Architecture

### Domain Entities
- **Employee**: Core employee record with status and manager hierarchy.
- **LeaveType**: Catalog of leave categories (annual, sick, emergency, etc.) with active/inactive lifecycle.
- **LeavePolicy**: Rules per leave type (entitlement, accrual, notice, approval flag).
- **LeaveBalance**: Per-employee, per-policy, per-fiscal-year tracking of entitlement, used, and remaining days. Lifecycle: ACTIVE → EXHAUSTED → CLOSED.
- **LeaveRequest**: Employee leave application with full lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED) → CANCELLED.
- **LeaveRequestStatus**: Enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **AuditLog**: Immutable record of all state-changing operations (GP-002).
- **Notification**: Messages dispatched on leave events (applied, decided, low balance).

### Business Rules
- **BR-DAY-COUNT**: Leave days consumed = (endDate - startDate + 1) — inclusive. Applied everywhere.
- **BR-BALANCE-SUFFICIENCY**: A request can only be submitted or approved if remainingDays >= requested days. Checked at submission and again at approval.

### Modules (src/modules/)
| Module | Path | Responsibilities |
|--------|------|------------------|
| shared-types | src/shared/types/ | LeaveTypeCode and LeaveRequestStatus enums |
| employee | src/modules/employee/ | Employee model and repository |
| leave-type | src/modules/leave-type/ | LeaveType catalog model and repository |
| leave-policy | src/modules/leave-policy/ | LeavePolicy model, repository, service |
| leave-balance | src/modules/leave-balance/ | LeaveBalance model, repository, service |
| leave-request | src/modules/leave-request/ | LeaveRequest model, repository, service (orchestrator) |
| audit-log | src/modules/audit-log/ | AuditLog model, repository, service |
| notification | src/modules/notification/ | Notification model, repository, service |

### Dependency Flow
All dependencies flow inward. leave-request orchestrates the full lifecycle, depending on leave-policy, leave-balance, audit-log, notification, employee, and shared-types. No circular dependencies.

### Conceptual Data Model (PostgreSQL)
- **employees**: id, employee_number (unique), email (unique), manager_id (FK self), department, employment_status, etc.
- **leave_types**: id, code (unique), name, is_active.
- **leave_policies**: id, leave_type_id (FK), entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active.
- **leave_requests**: id, employee_id (FK), leave_policy_id (FK), start_date, end_date, status, approved_by (FK), etc.
- **leave_balances**: id, employee_id (FK), leave_policy_id (FK), total_entitlement, used_days, remaining_days, fiscal_year, status; unique (employee_id, leave_policy_id, fiscal_year).
- **audit_logs**: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at.
- **notifications**: id, recipient_id (FK), type, message, is_read.

### Implementation Phases
1. **Foundation**: shared-types, audit-log, employee, leave-type (zero dependencies).
2. **leave-policy**: depends on Phase 1.
3. **leave-balance & notification**: parallel; balance depends on policy; notification depends on employee.
4. **leave-request**: orchestration, depends on all prior phases.

### Open Questions (require stakeholder decision)
1. **used_days computation**: derived vs stored counter vs hybrid.
2. **Day granularity**: whole days, half-day, or hourly.
3. **Balance deduction timing**: at application, at approval, or reservation model.

### Stack Compliance
- Language: TypeScript (Node 20)
- Framework: Fastify (HTTP routes, plugins)
- Database: PostgreSQL (via pg Pool)
- Testing: Jest
- Frontend: React Native (out of scope for this backend module)
- Architecture: Modular monolith — each module is a self-contained directory with model, repository, service; shared kernel in src/shared/.
<!-- gestalt:architecture feature=8177937e-ec7c-4649-b943-9d9104b82731 END -->
