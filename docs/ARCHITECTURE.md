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

<!-- gestalt:architecture feature=95c30233-04a8-47cf-8fde-3de913f2858a START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is implemented as a set of modules within the modular-monolith architecture, following the established patterns (model → repository → service → controller → routes) and using Fastify, TypeScript, and PostgreSQL.

### Domain Entities

| Entity | Purpose | Lifecycle States |
|--------|---------|------------------|
| **LeaveRequest** | Employee leave application; tracks full lifecycle from draft to cancellation. | DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED |
| **LeavePolicy** | Rules and entitlements for a leave type (annual, sick, emergency, etc.). | ACTIVE, INACTIVE |
| **LeaveType** | Enumeration of leave categories: annual, sick, emergency, unpaid, maternity, paternity. | (enum values) |
| **Employee** | Organization employee with reporting hierarchy (managerId). | ACTIVE, INACTIVE, TERMINATED |
| **LeaveBalance** | Per-employee, per-policy, per-fiscal-year entitlement and consumption. | ACTIVE, CLOSED |
| **LeaveStatus** | Enumeration of LeaveRequest states. | DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED |
| **EmploymentStatus** | Enumeration of employee employment states. | ACTIVE, INACTIVE, TERMINATED |
| **BalanceStatus** | Enumeration of balance lifecycle states. | ACTIVE, CLOSED |
| **AuditLog** | Immutable record of every state-changing operation (GP-002). | (none) |
| **Notification** | Persistent record of a notification sent/attempted for a leave event. | PENDING, SENT, FAILED |
| **NotificationStatus** | Enumeration of notification delivery states. | PENDING, SENT, FAILED |
| **NotificationType** | Enumeration of notification event types. | LEAVE_APPLIED, LEAVE_APPROVED, LEAVE_REJECTED, BALANCE_LOW |

### Business Rules Summary

- **BR-001**: Only ACTIVE employees can participate in leave workflows.
- **BR-002**: Strict state transitions for LeaveRequest (DRAFT→SUBMITTED, DRAFT→CANCELLED, SUBMITTED→APPROVED/REJECTED/CANCELLED, APPROVED→CANCELLED). REJECTED and CANCELLED are terminal.
- **BR-003**: Balance sufficiency check on approval; reject if remainingDays < durationDays.
- **BR-004**: Atomic balance deduction on approval.
- **BR-005**: Balance restoration on cancellation of an APPROVED request.
- **BR-006**: Manager authorization required for approval/rejection; self-approval prohibited.
- **BR-007**: Only ACTIVE policies can be referenced.
- **BR-008**: Minimum notice period enforced on submission (bypassed for emergency leave).
- **BR-009**: endDate >= startDate; durationDays = endDate - startDate + 1.
- **BR-010**: Overlapping leave detection on submission (excludes CANCELLED/REJECTED).
- **BR-011**: Fiscal year alignment; reject if no ACTIVE balance exists for the fiscal year.
- **BR-012**: Audit trail for every state change (GP-002).

### Conceptual Tables

| Table | Key Fields | Notes |
|-------|------------|-------|
| `employees` | id, employee_number, manager_id, employment_status | Supports hierarchy and eligibility checks. |
| `leave_policies` | id, leave_type, is_active, entitlement_days, minimum_notice_days | Defines rules per leave type. |
| `leave_requests` | id, employee_id, leave_policy_id, status, start_date, end_date | Core transactional table; references policy, not leave type directly. |
| `leave_balances` | id, employee_id, leave_policy_id, fiscal_year, used_days, remaining_days | Unique composite index on (employee_id, leave_policy_id, fiscal_year). |
| `audit_logs` | id, entity_type, entity_id, action, performed_by | Immutable audit trail (GP-002). |
| `notifications` | id, recipient_employee_id, leave_request_id, type, status | Persists notification attempts for auditability. |

All tables use snake_case naming. Foreign keys: `employees.manager_id → employees.id`, `leave_requests.employee_id → employees.id`, `leave_requests.leave_policy_id → leave_policies.id`, `leave_requests.approved_by → employees.id`, `leave_balances.employee_id → employees.id`, `leave_balances.leave_policy_id → leave_policies.id`, `audit_logs.performed_by → employees.id`, `notifications.recipient_employee_id → employees.id`, `notifications.leave_request_id → leave_requests.id`.

### Module Boundaries

| Module | Path | Owns |
|--------|------|------|
| **employee** | `src/modules/employee/` | Employee model, repository, service, controller, routes |
| **policy** | `src/modules/policy/` | LeavePolicy model, repository, service, controller, routes |
| **leave** | `src/modules/leave/` | LeaveRequest model, repository, service, controller, routes |
| **balance** | `src/modules/balance/` | LeaveBalance model, repository, service, controller, routes |
| **notification** | `src/modules/notification/` | Notification model, repository, service |
| **audit** | `src/modules/audit/` | AuditLog model, repository, service |

### Dependency Map

```
leave ──► balance
leave ──► policy
leave ──► employee
leave ──► audit
leave ──► notification
balance ──► policy
balance ──► audit
policy ──► employee
notification ──► employee
```

No circular dependencies. `leave` is the orchestrator; `employee` and `audit` are leaf modules.

### Service Interfaces

- **IEmployeeService**: `getById`, `getManager`, `isActive`
- **IPolicyService**: `getPolicyForType`, `getMaxDays`, `validateLeaveRequest`
- **IBalanceService**: `getBalance`, `deductBalance`, `creditBalance`, `initializeBalance`
- **ILeaveService**: `apply`, `approve`, `reject`, `cancel`, `getById`, `getByEmployee`, `getPendingForManager`
- **IAuditService**: `record`
- **INotificationService**: `notifyLeaveApplied`, `notifyLeaveApproved`, `notifyLeaveRejected`, `notifyBalanceLow`

All services are defined via interfaces before implementation, following the existing pattern.

### Phase Recommendations

1. **Phase 1 — Foundation: employee + audit** (10 files)  
   Leaf modules with zero internal dependencies. Employee provides identity/manager lookup; audit provides the write-only audit trail required by GP-002.

2. **Phase 2 — Policy engine** (5 files)  
   Depends only on employee. Encodes leave-type rules, max-days, and request validation.

3. **Phase 3 — Balance tracking** (5 files)  
   Depends on policy and audit. Manages per-employee/per-type/per-year balances.

4. **Phase 4 — Notification** (5 files)  
   Depends only on employee. Can be built in parallel with Phases 2–3.

5. **Phase 5 — Leave orchestration** (5 files)  
   Depends on all prior phases. Orchestrates apply/approve/reject/cancel with policy validation, balance deduction, audit recording, and notification dispatch.

### Stack Compliance

- **Language**: TypeScript (strict mode)
- **Framework**: Fastify (routes/controllers)
- **Database**: PostgreSQL accessed via `pg` Pool (`src/shared/db/connection.ts`)
- **Architecture**: Modular-monolith; each module follows model → repository → service → controller → routes
- **Testing**: Jest (unit and integration)
- **Frontend**: React Native (consumes REST endpoints exposed by Fastify)

### Reconciliation Notes

- **Naming conflict resolved**: Domain's `LeaveRequest.leaveTypeId` renamed to `policyId` to match the data design's `leave_policy_id` foreign key. The relationship is to `LeavePolicy`, not directly to `LeaveType`.
- **Missing entity added**: `AuditLog` and `Notification` entities were absent from the domain design but present in the data/app designs; they are now included with full attribute definitions.
- **Missing table added**: `notifications` table added to support the notification module's persistence requirement.
- **Enum entities**: `LeaveStatus`, `EmploymentStatus`, `BalanceStatus`, `NotificationStatus`, `NotificationType` are defined as domain entities to document lifecycle states, even though they are implemented as TypeScript enums or string literals, not separate tables.
- **GP-002 (Audit)**: Satisfied by the `audit` module and `audit_logs` table; every state change on `LeaveRequest` and `LeaveBalance` writes an immutable record.
- **GP-005 (RBAC)**: Not designed here; enforcement will be added at the controller/route layer (e.g., Fastify hooks) to ensure only managers can approve/reject and employees can only act on their own requests.
- **GP-001 (Transaction semantics)**: Balance deduction/restoration and status updates must be atomic; the `leave` service will use database transactions provided by the shared `pg` Pool.
<!-- gestalt:architecture feature=95c30233-04a8-47cf-8fde-3de913f2858a END -->
