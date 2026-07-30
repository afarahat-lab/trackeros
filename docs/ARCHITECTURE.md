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
src/modules/balance/balance.model.ts
src/modules/balance/balance.repository.interface.ts
src/modules/balance/balance.repository.ts
src/modules/employee/employee.model.ts
src/modules/employee/employee.repository.interface.ts
src/modules/employee/employee.repository.ts
src/modules/employee/employee.service.interface.ts
src/modules/employee/employee.service.ts
src/modules/policy/policy.model.ts
src/modules/policy/policy.repository.interface.ts
src/modules/policy/policy.repository.ts
src/modules/policy/policy.service.ts
src/modules/policy/policy.routes.ts
src/modules/status/status.model.ts
src/modules/status/status.service.interface.ts
src/modules/status/status.service.ts
src/modules/status/index.ts
src/modules/uptime/uptime.model.ts
src/modules/uptime/uptime.service.interface.ts
src/modules/uptime/uptime.service.ts
src/modules/uptime/uptime.routes.ts
src/modules/uptime/index.ts
src/shared/db/connection.ts
src/shared/types/index.ts   — shared enums & DTOs (LeaveType, LeaveRequestStatus, BalanceStatus, LeavePolicyStatus, EmploymentStatus, CreateLeaveRequestDto, UpdateLeaveRequestDto)
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

## Registered routes

`src/app.ts` registers the following Fastify route plugins:

- `uptimeRoutes` — health-check endpoint (`/uptime`)
- `policyRoutes` — leave policy CRUD endpoints (`/policies`, `/policies/:id`, `/policies/type/:leaveType`)

<!-- gestalt:architecture feature=a0c317ce-afc7-4193-9ad3-7e886e228148 START -->
## Leave Management Module

### Overview
The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is implemented as a modular monolith within the existing Fastify/TypeScript/PostgreSQL stack, adhering to all GOLDEN_PRINCIPLES (audit, RBAC, transaction semantics).

### Domain Entities
- **LeaveRequest** — core entity representing an employee's leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED; can be CANCELLED from DRAFT, SUBMITTED, or APPROVED.
- **LeaveBalance** — per-employee, per-policy, per-fiscal-year tracking of entitlement, used, and remaining days. Lifecycle: ACTIVE, EXHAUSTED, FROZEN, CLOSED.
- **LeavePolicy** — defines rules for a leave type (annual, sick, emergency, etc.): entitlement, accrual, notice period, manager approval requirement. Lifecycle: ACTIVE, INACTIVE.
- **LeaveType** — enumeration: annual, sick, emergency, unpaid, maternity, paternity.
- **Employee** — existing employee entity (from HR context) used for requester and manager relationships.
- **AuditLog** — immutable record of all state-changing operations (GP-002).

### Business Rules
- **BR-001 (Balance Sufficiency):** Before a LeaveRequest transitions from DRAFT to SUBMITTED, the system verifies that the employee's LeaveBalance for the corresponding LeavePolicy has `remainingDays >= requested days`. If insufficient, submission is rejected.
- **BR-002 (Manager Approval):** If the LeavePolicy has `requiresManagerApproval = true`, only the employee's designated manager (Employee.managerId) with the manager role may approve or reject. If `false`, the request auto-approves on submission.

### Module Structure
```
src/
  shared/types/          # LeaveType, LeaveRequestStatus, BalanceStatus, DTOs
  modules/
    employee/            # Employee model, repository interface, repository, service
    policy/              # LeavePolicy model, repository interface, repository, service, routes
    balance/             # LeaveBalance model, repository interface, repository
    leave/               # LeaveRequest model, repository, service, controller, routes
    audit/               # AuditLog model, repository, service
    notification/        # Notification service (email/in-app)
```

### Dependencies
- `leave` depends on all other modules (employee, policy, balance, audit, notification) and `shared-types`.
- `balance` depends on `policy` and `shared-types`.
- `policy`, `employee`, `audit`, `notification` depend only on `shared-types`.
- No circular dependencies; dependencies flow inward.

### Data Model (Conceptual)
- **employees** — existing table; used for employee and manager references.
- **leave_policies** — defines leave types and rules. Indexed by `leave_type` and `is_active`.
- **leave_requests** — core transactional table. FK to employees (employee_id, approved_by) and leave_policies. Indexed for employee self-service, manager queues, overlap detection, and audit.
- **leave_balances** — tracks entitlement per employee/policy/fiscal year. Compound index on `(employee_id, fiscal_year)` for the most frequent query.
- **audit_logs** — cross-cutting audit trail. Compound index on `(entity_type, entity_id)` for entity history.

### API Endpoints (Fastify Routes)
All endpoints enforce RBAC (GP-005) and validate inputs (GP-003).

**Policy endpoints** (implemented — `src/modules/policy/policy.routes.ts`):
- `GET /policies` — list all active policies.
- `GET /policies/:id` — get a single policy by ID.
- `GET /policies/type/:leaveType` — get the policy for a specific leave type.
- `POST /policies` — create a new leave policy.
- `PUT /policies/:id` — update an existing leave policy.

**Leave request endpoints** (planned):
- `POST /leave/requests` — submit a new leave request (employee).
- `GET /leave/requests` — list own requests (employee) or pending for manager (manager).
- `GET /leave/requests/:id` — get request details.
- `PATCH /leave/requests/:id/approve` — approve (manager).
- `PATCH /leave/requests/:id/reject` — reject (manager).
- `PATCH /leave/requests/:id/cancel` — cancel (employee).
- `GET /leave/balances` — get own balances (employee).

### Integration Points
- **Audit (GP-002):** Every state change in LeaveService calls `IAuditService.record()`.
- **Notification:** LeaveService calls `INotificationService` on submission, approval/rejection, and cancellation.
- **Employee Service:** Used to resolve manager relationships and validate employment status.
- **Balance Service:** Deducts on approval, restores on cancellation of an approved request.

### Phase Recommendations
1. Shared types and employee/audit foundation.
2. Policy and balance domain modules.
3. Leave application module (orchestration).
4. Notification module and final integration wiring.

This design extends the existing architecture without contradiction, following the modular-monolith style with clear boundaries and inward dependency flow.
<!-- gestalt:architecture feature=a0c317ce-afc7-4193-9ad3-7e886e228148 END -->
