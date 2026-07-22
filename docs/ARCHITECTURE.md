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
src/shared/types/index.ts
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

<!-- gestalt:architecture feature=81628c0a-ef34-4e4d-a695-ae6c61db7b5f START -->
## Leave Management Module

### Overview
The Leave Management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is built as a set of modules within the modular monolith, following the established layered architecture (presentation → application → domain → infrastructure).

### Domain Entities
- **LeaveRequest** — Core aggregate representing a leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED. Carries full audit trail (who acted, when).
- **LeavePolicy** — Defines rules per leave type (entitlement, accrual, notice, approval requirement). Lifecycle: ACTIVE ↔ INACTIVE.
- **Employee** — The actor who applies for leave. Employment status (ACTIVE/INACTIVE/TERMINATED/ON_LEAVE) gates eligibility.
- **LeaveBalance** — Tracks entitlement, used, and remaining days per employee per policy per fiscal year. Lifecycle: ACTIVE → EXHAUSTED/FROZEN and back.
- **AuditLog** — Immutable record of every state change (GP-002).
- **Notification** — Stores messages sent to employees (e.g., status changes).
- **Enums**: LeaveType (ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), EmploymentStatus (ACTIVE, INACTIVE, TERMINATED, ON_LEAVE), BalanceStatus.

### Business Rules
- **BR-001** — Only ACTIVE employees may create/submit leave requests.
- **BR-002** — Before submission, remaining balance must cover the requested days (endDate - startDate + 1).
- **BR-003** — On approval, balance is deducted; if remaining reaches 0, balance becomes EXHAUSTED. On cancellation of an approved request, balance is restored.

### Database Tables (Conceptual)
All tables use snake_case naming. Primary keys are UUIDs. Foreign keys reference the appropriate parent tables.
- **employees** — Core employee data; indexes on employee_number, email, manager_id, employment_status.
- **leave_policies** — Policy definitions; indexes on leave_type, is_active.
- **leave_requests** — Leave applications with full lifecycle fields (approved_by, rejected_by, cancelled_by, etc.); indexes on employee_id, status, leave_policy_id, start_date, end_date, approved_by.
- **leave_balances** — Per-employee per-policy per-year balances; unique constraint on (employee_id, leave_policy_id, fiscal_year).
- **audit_logs** — Immutable audit trail; indexes on (entity_type, entity_id), performed_by, performed_at, action.
- **notifications** — User notifications; indexes on recipient_id, status, (related_entity_type, related_entity_id), created_at.

### Module Structure
```
src/
├── modules/
│   ├── audit/          # AuditLog model, IAuditRepository, AuditService
│   ├── employee/       # Employee model, IEmployeeRepository, EmployeeService
│   ├── policy/         # LeavePolicy model, IPolicyRepository, PolicyService
│   ├── balance/        # Balance model, IBalanceRepository, BalanceService
│   ├── notification/   # Notification model, INotificationRepository, NotificationService
│   └── leave/          # LeaveRequest model, ILeaveRepository, LeaveService, LeaveController, routes
└── shared/
    ├── types/          # Canonical enums: LeaveType, LeaveRequestStatus, EmploymentStatus
    └── validation/     # validateLeaveRequest, validateDateRange
```

### Dependencies
- **leave** depends on employee, policy, balance, audit, notification, shared/validation, shared/types.
- **balance** depends on employee, policy, audit, shared/types.
- **employee**, **policy**, **notification** each depend on audit, shared/types.
- No circular dependencies; all flows inward.

### Golden Principles Compliance
- **GP-002 (Audit)**: Every state-changing operation in LeaveService calls `IAuditService.log`. The audit module is a leaf dependency built first.
- **GP-003 (Validation)**: All API inputs are validated at the boundary using shared/validation helpers before reaching services.
- **GP-005 (RBAC)**: Manager-only endpoints (approve, reject, getLeaveRequestsForManager) enforce role checks at the route level before delegating to the service.
- **Transaction semantics**: Balance deduction and restoration are performed atomically within the same database transaction as the leave status update.

### Implementation Phases
1. **Foundation** — Shared types + Audit + Shared Validation (no module dependencies).
2. **Employee + Policy** — Leaf modules depending only on Audit and shared/types.
3. **Balance** — Depends on Employee, Policy, Audit, shared/types.
4. **Notification** — Depends on Audit; can run parallel to Phase 3.
5. **Leave (core)** — Orchestrator; all dependencies ready.

### Integration with Existing System
This module extends the modular monolith without altering existing boundaries. It reuses the shared database connection (`src/shared/db/connection.ts`), follows the same repository pattern (interface + Pg* implementation), and exposes REST endpoints via Fastify routes. The frontend (React Native) consumes these endpoints through the API layer.
<!-- gestalt:architecture feature=81628c0a-ef34-4e4d-a695-ae6c61db7b5f END -->
