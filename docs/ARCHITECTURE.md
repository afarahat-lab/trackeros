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
src/modules/employee/       — Employee module (model, repository, service interface, barrel export)
src/modules/leave-policy/   — LeavePolicy module (model, repository, service interface, barrel export)
src/modules/leave-balance/  — LeaveBalance module (model, repository, service, service interface,
                              barrel export)
src/modules/leave-request/  — LeaveRequest module (model, repository, service, service interface,
                              controller, routes, barrel export)
src/modules/notification/   — Notification module (model, repository, service, service interface,
                              barrel export)
src/modules/audit/          — Audit module (model, repository, service interface, barrel export)
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
- **employee** (`src/modules/employee/`) — Employee entity, repository, and service interface.
- **leave-policy** (`src/modules/leave-policy/`) — LeavePolicy entity, repository, and service interface.
- **leave-balance** (`src/modules/leave-balance/`) — LeaveBalance entity, repository, and BalanceService.
- **notification** (`src/modules/notification/`) — LeaveNotification entity, repository, and NotificationService.
- **audit** (`src/modules/audit/`) — AuditLog entity, repository, and service interface.
- **leave-request** (`src/modules/leave-request/`) — LeaveRequest entity, repository, and LeaveRequestService. Orchestrates the leave lifecycle, depending on all other modules.

### Dependency Map

- leave-request → shared-types, leave-balance, leave-policy, employee, notification, audit
- leave-balance → shared-types, leave-policy
- notification → shared-types, employee
- leave-policy → shared-types
- employee → shared-types
- audit → shared-types

### Recommended Implementation Phases

1. **Shared types foundation** — Enums and DTOs. ✅ **COMPLETE**
2. **Employee module** — Foundational entity. ✅ **COMPLETE**
3. **Leave policy module** — Policy rules. ✅ **COMPLETE**
4. **Leave balance module** — Balance tracking. ✅ **COMPLETE**
5. **Leave request model and repository** — Model interface and stub repository. ✅ **COMPLETE**
6. **Notification module** — Event notifications. ✅ **COMPLETE**
7. **Audit module** — Audit logging. ✅ **COMPLETE**
8. **Leave request service** — Core orchestration. ✅ **COMPLETE**
9. **Leave request routes and controller** — API endpoints. ✅ **COMPLETE**
10. **Supporting services** — Balance, Notification, Audit, Policy, Employee services. ✅ **COMPLETE**

### API Endpoints (Phase 9)

All routes registered under the Fastify app in `src/app.ts` via `app.register(leaveRequestRoutes)`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/leave-requests` | Create a draft leave request (body: CreateLeaveRequestDto) |
| POST | `/leave-requests/:id/submit` | Submit a draft for approval |
| POST | `/leave-requests/:id/approve` | Approve a submitted request (body: `{ approverId }`) |
| POST | `/leave-requests/:id/reject` | Reject a submitted request (body: `{ approverId }`) |
| POST | `/leave-requests/:id/cancel` | Cancel a submitted or approved request |
| GET | `/leave-requests/:id` | Get a single leave request by ID |
| GET | `/leave-requests` | Query leave requests (query params: employeeId, status, leavePolicyId, startDateFrom, startDateTo) |
| GET | `/leave-requests/employee/:employeeId` | Get all leave requests for an employee |

**Error response shape**: `{ error: string; code: string }`. Error codes map to HTTP statuses:
- **400**: INVALID_DATE_RANGE, MINIMUM_NOTICE_VIOLATION
- **403**: NOT_MANAGER
- **404**: EMPLOYEE_NOT_FOUND, POLICY_NOT_FOUND, REQUEST_NOT_FOUND, BALANCE_NOT_FOUND
- **409**: INVALID_STATE_TRANSITION, INSUFFICIENT_BALANCE, BALANCE_CLOSED, POLICY_INACTIVE
- **500**: unrecognized errors (generic `{ error: 'Internal Server Error' }`, no code field)

**Date serialization**: All Date fields are serialized as ISO 8601 strings. Nullable date fields (`approvedAt`, `cancelledAt`) serialize as `null` when absent.

**Note**: RBAC middleware (GP-005) is not yet wired at the HTTP layer — the routes currently accept all requests without auth guards. The service layer enforces manager checks for approve/reject operations.

### Cross-Cutting Contracts

- **Auth**: JWT bearer token → `request.user: { id: string; role: UserRole }`. Roles: `employee`, `manager`, `hr_admin`. RBAC enforced via `requireRole(...)` guard. **Not yet implemented** — routes accept all requests without auth. Manager checks are enforced at the service layer for approve/reject.
- **Transaction**: Repository methods that participate in multi-step writes accept an optional `PoolClient`. The service owns the unit of work: acquires client, BEGIN, passes client to repositories, COMMIT/ROLLBACK. **Not yet implemented** — deferred to the DB-backed repository implementation phase.
- **Audit**: All state-changing operations should produce an audit record (GP-002). **Not yet integrated** — the LeaveRequestService does not call audit or notification modules; these cross-cutting concerns are deferred to a future integration phase.
- **Error Response**: Standard shape `{ error: string; code: string }`. HTTP 400 for validation, 403 for authorization, 404 for not found, 409 for business rule conflicts (state transitions, insufficient balance, closed balance, inactive policy), 500 for internal errors.

### Open Questions

1. Fiscal year boundary definition (calendar vs configurable).
2. Leave day counting granularity (calendar days vs business days vs business days minus holidays).
3. Minimum leave granularity (full days, half days, or hours).

These decisions affect balance calculations, overlap detection, and policy configuration. They must be resolved before implementation of the balance and leave-request modules.
<!-- gestalt:architecture feature=76d847b2-5905-40af-b702-36710232b1e4 END -->
