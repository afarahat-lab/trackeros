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
src/modules/status/         — System status module (health-check, version)
src/modules/uptime/         — Uptime monitoring module
src/modules/employee/       — Employee module (model, repository, barrel export)
src/shared/types/           — Shared enums and DTOs (LeaveStatus, LeaveType, AuditAction,
                              NotificationStatus, EmploymentStatus, CreateLeaveRequestDto,
                              UpdateLeaveRequestDto, LeaveRequestQueryParams, ValidationResult)
src/shared/db/              — Database connection utilities
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

<!-- gestalt:architecture feature=76d847b2-5905-40af-b702-36710232b1e4 START -->
## Leave Management Module — Reconciled Architecture

### Domain Entities

- **LeaveRequest** — Core entity representing an employee's leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED. Key attributes: employeeId, leavePolicyId, startDate, endDate, status, approvedBy, cancelledAt.
- **LeavePolicy** — Defines rules for a leave type (annual, sick, emergency, etc.). Lifecycle: ACTIVE, INACTIVE. Attributes: leaveType, entitlementDays, minimumNoticeDays, requiresManagerApproval.
- **LeaveBalance** — Tracks an employee's entitlement, used, and remaining days per policy per fiscal year. Lifecycle: ACTIVE, EXHAUSTED, CLOSED.
- **LeaveNotification** — Domain event notifications for leave lifecycle transitions. Lifecycle: PENDING → SENT → READ → ARCHIVED.
- **Employee** — Represents an employee; used for ownership, manager hierarchy, and employment status checks. Lifecycle: ACTIVE, INACTIVE, TERMINATED.
- **AuditLog** — Immutable record of all state-changing operations.
- **LeaveType** — Enum: annual, sick, emergency, unpaid, maternity, paternity.

### Conceptual Tables

- **employees** — id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at. PK: id. FK: manager_id → employees.id. Indexes: employee_number (unique), email (unique), manager_id, employment_status.
- **leave_policies** — id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at. PK: id. Indexes: leave_type, is_active.
- **leave_requests** — id, employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at, cancelled_at, created_at, updated_at. PK: id. FKs: employee_id → employees.id, leave_policy_id → leave_policies.id, approved_by → employees.id. Indexes: employee_id, status, approved_by, start_date/end_date, leave_policy_id.
- **leave_balances** — id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at. PK: id. FKs: employee_id → employees.id, leave_policy_id → leave_policies.id. Unique composite index on (employee_id, leave_policy_id, fiscal_year).
- **leave_notifications** — id, recipient_id, type, title, message, leave_request_id, status, created_at, read_at. PK: id. FKs: recipient_id → employees.id, leave_request_id → leave_requests.id. Indexes: recipient_id, leave_request_id, status, created_at.
- **audit_logs** — id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at. PK: id. FK: performed_by → employees.id. Indexes: (entity_type, entity_id), performed_by, action, performed_at.

### Module Boundaries

- **shared-types** (`src/shared/types/`) — Enums and DTOs used across all modules. **Implemented Phase 1.**
- **employee** (`src/modules/employee/`) — Employee entity, repository, and service.
- **leave-policy** (`src/modules/leave-policy/`) — LeavePolicy entity, repository, and service.
- **leave-balance** (`src/modules/leave-balance/`) — LeaveBalance entity, repository, and BalanceService.
- **notification** (`src/modules/notification/`) — LeaveNotification entity, repository, and NotificationService.
- **audit** (`src/modules/audit/`) — AuditLog entity, repository, and AuditService.
- **leave-request** (`src/modules/leave-request/`) — LeaveRequest entity, repository, and LeaveRequestService. Orchestrates the leave lifecycle, depending on all other modules.

### Dependency Map

- leave-request → shared-types, leave-balance, leave-policy, employee, notification, audit
- leave-balance → shared-types, leave-policy
- leave-policy → shared-types
- employee → shared-types
- notification → shared-types
- audit → shared-types

### Recommended Implementation Phases

1. **Shared types foundation** — Enums and DTOs. ✅ **COMPLETE**
2. **Employee module** — Foundational entity. ✅ **COMPLETE**
3. **Leave policy module** — Policy rules.
4. **Leave balance module** — Balance tracking.
5. **Notification module** — Event notifications.
6. **Audit module** — Audit logging.
7. **Leave request module** — Core orchestration and API endpoints.

### Cross-Cutting Contracts

- **Auth**: JWT bearer token → `request.user: { id: string; role: UserRole }`. Roles: `employee`, `manager`, `hr_admin`. RBAC enforced via `requireRole(...)` guard. Employee-only actions: submit, withdraw, cancelApproved. Manager/HR admin actions: approve, reject.
- **Transaction**: Repository methods that participate in multi-step writes accept an optional `PoolClient`. The service owns the unit of work: acquires client, BEGIN, passes client to repositories, COMMIT/ROLLBACK. Applies to submission, approval/rejection, and cancellation flows.
- **Error Response**: Standard shape `{ error: string; code: string }`. HTTP 400 for validation, 401 for unauthenticated, 403 for unauthorized, 404 for not found, 409 for business rule conflicts (overlap, insufficient balance), 500 for internal errors.

### Open Questions

1. Fiscal year boundary definition (calendar vs configurable).
2. Leave day counting granularity (calendar days vs business days vs business days minus holidays).
3. Minimum leave granularity (full days, half days, or hours).

These decisions affect balance calculations, overlap detection, and policy configuration. They must be resolved before implementation of the balance and leave-request modules.
<!-- gestalt:architecture feature=76d847b2-5905-40af-b702-36710232b1e4 END -->
