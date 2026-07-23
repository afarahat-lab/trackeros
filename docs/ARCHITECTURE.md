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
src/shared/db/connection.ts
src/shared/base/repository.ts
src/shared/error/types.ts
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

<!-- gestalt:architecture feature=d6603324-1a59-4abc-b8a0-7afc0afd0c77 START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is implemented as a modular monolith with Fastify (TypeScript), PostgreSQL, and React Native frontend. The module follows the layered architecture: domain models, repository interfaces, application services, and presentation controllers/routes.

### Domain Entities

- **LeaveRequest** — lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED; DRAFT/SUBMITTED/APPROVED → CANCELLED. Terminal states: REJECTED, CANCELLED.
- **LeaveBalance** — lifecycle: ACTIVE, CLOSED. Tracks entitlement, used, pending, remaining, carried forward.
- **LeaveType** — lifecycle: ACTIVE, INACTIVE. Catalog of leave categories (code, label).
- **LeavePolicy** — lifecycle: ACTIVE, INACTIVE. Rules per leave type (entitlement, accrual, notice, approval).
- **AuditLog** — immutable record of every state change (GP-002).

### Conceptual Table Specifications

| Table | Key Fields | PK | FKs | Index Rationale |
|-------|------------|----|-----|-----------------|
| `leave_type` | id, code, label, description, is_active, created_at, updated_at | id | — | code: unique lookup |
| `leave_policy` | id, leave_type_id, policy_name, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, max_consecutive_days, requires_manager_approval, allow_negative_balance, is_active, created_at, updated_at | id | leave_type_id → leave_type.id | leave_type_id: policy lookups; is_active: active policy filter |
| `leave_balance` | id, employee_id, leave_type_id, fiscal_year, total_entitlement, used_days, pending_days, remaining_days, carried_forward, created_at, updated_at | id | employee_id → employee.id, leave_type_id → leave_type.id | (employee_id, leave_type_id, fiscal_year): unique balance per employee/type/year; employee_id: summary queries |
| `leave_request` | id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, cancelled_by, cancelled_at, created_at, updated_at | id | employee_id → employee.id, leave_type_id → leave_type.id, approved_by → employee.id, rejected_by → employee.id, cancelled_by → employee.id | employee_id: my requests; status: filter; start_date, end_date: calendar/overlap; leave_type_id: filter; approved_by: manager queue |
| `audit_log` | id, entity_type, entity_id, action, actor_id, changes, created_at | id | actor_id → employee.id | (entity_type, entity_id): entity audit trail; actor_id: actor trail; created_at: time range |

### Repository Interfaces and Implementations

Each entity has a repository interface defined alongside its model, with a PostgreSQL implementation using Knex query builder (configured from `DATABASE_URL`).

- **ILeaveTypeRepository** / **KnexLeaveTypeRepository** — `findAll`, `findById`, `findByCode`, `create`, `update`, `delete`
- **ILeavePolicyRepository** / **KnexLeavePolicyRepository** — `findAll`, `findById`, `findByLeaveTypeId`, `findActive`, `create`, `update`, `deactivate`
- **ILeaveBalanceRepository** / **KnexLeaveBalanceRepository** — `findByEmployeeAndTypeAndYear`, `findAllByEmployee`, `create`, `update`, `upsert`
- **ILeaveRequestRepository** / **KnexLeaveRequestRepository** — `findById`, `findByEmployeeId`, `findByApproverId`, `findByStatus`, `create`, `update`
- **IAuditLogRepository** / **KnexAuditLogRepository** — `create`, `findByEntity`, `findByActor`, `list`

### Module Boundaries

- **audit** (`src/modules/audit/`) — audit.model.ts, audit.repository.ts, audit.service.interface.ts, audit.service.ts, index.ts
- **employee** (`src/modules/employee/`) — employee.model.ts, employee.repository.ts, employee.service.interface.ts, employee.service.ts, employee.controller.ts, employee.routes.ts, index.ts
- **policy** (`src/modules/policy/`) — policy.model.ts, policy.repository.ts, policy.service.interface.ts, policy.service.ts, policy.controller.ts, policy.routes.ts, index.ts
- **notification** (`src/modules/notification/`) — notification.model.ts, notification.repository.ts, notification.service.interface.ts, notification.service.ts, index.ts
- **balance** (`src/modules/balance/`) — balance.model.ts, balance.repository.ts, balance.service.interface.ts, balance.service.ts, balance.controller.ts, balance.routes.ts, index.ts
- **leave** (`src/modules/leave/`) — leave.model.ts, leave.repository.ts, leave.service.interface.ts, leave.service.ts, leave.controller.ts, leave.routes.ts, index.ts

### Service Interfaces

- **ILeaveService** — `createLeaveRequest`, `submitLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`, `cancelLeaveRequest`, `getLeaveRequestById`, `listLeaveRequests`, `listLeaveRequestsByEmployee`, `listLeaveRequestsByApprover`, `validateLeaveRequest`
- **IBalanceService** — `getBalance`, `getAllBalances`, `deductBalance`, `restoreBalance`, `initializeBalance`, `recalculateBalance`, `checkSufficientBalance`
- **IPolicyService** — `getPolicyById`, `getPolicyByLeaveType`, `listActivePolicies`, `createPolicy`, `updatePolicy`, `deactivatePolicy`, `getEntitlementDays`, `requiresManagerApproval`, `validatePolicyActive`
- **IEmployeeService** — `getEmployeeById`, `getManagerForEmployee`, `isEmployeeActive`, `listEmployeesByManager`, `listActiveEmployees`
- **INotificationService** — `notifyLeaveSubmitted`, `notifyLeaveApproved`, `notifyLeaveRejected`, `notifyLeaveCancelled`, `notifyBalanceLow`, `getNotificationsForRecipient`, `markNotificationRead`
- **IAuditService** — `recordCreate`, `recordUpdate`, `recordDelete`, `recordApprove`, `recordReject`, `listAuditRecords`

### Dependency Map

```
leave ──→ balance ──→ policy ──→ audit
leave ──→ employee ─────────────→ audit
leave ──→ notification (leaf)
leave ──→ audit
```

All edges point inward. No module depends on `leave`. `audit` and `notification` are leaf modules with zero domain dependencies.

### Business Rules

- **BR-001** — LeaveRequest state transitions: DRAFT → SUBMITTED (employee submits); SUBMITTED → APPROVED (manager approves); SUBMITTED → REJECTED (manager rejects); DRAFT → CANCELLED (employee discards); SUBMITTED → CANCELLED (employee withdraws); APPROVED → CANCELLED (employee cancels confirmed leave). REJECTED and CANCELLED are terminal.
- **BR-002** — Balance deduction: On APPROVED, `usedDays` += working days, `pendingDays` -= same. Balance must not go negative unless `allowNegativeBalance` is true.
- **BR-003** — Balance restoration: On CANCELLED from APPROVED, `usedDays` -= working days originally deducted.
- **BR-004** — Pending balance reservation: On SUBMITTED, `pendingDays` += working days. On REJECTED or CANCELLED from SUBMITTED, `pendingDays` -= same.
- **BR-005** — Sufficient balance check: Before DRAFT → SUBMITTED, `remainingDays` >= requested working days, unless policy allows negative balance.

### Recommended Implementation Phases

1. **Phase 1 — Foundation** (Audit + Employee + Policy modules, ~15 files) — leaf modules with minimal dependencies.
2. **Phase 2 — Balance module** (~7 files) — depends on Phase 1; owns balance tracking.
3. **Phase 3 — Notification module** (~5 files) — leaf module; can be built in parallel with Phase 2.
4. **Phase 4 — Leave module** (~7 files) — top-level orchestrator; depends on all previous phases.

### Stack Compliance

- Language: TypeScript (Node 20)
- Framework: Fastify (controllers/routes)
- Database: PostgreSQL (via Knex query builder, repository pattern)
- Frontend: React Native (consumes REST API)
- Architecture: modular-monolith with strict layer separation (domain → application → infrastructure → presentation)
- Cross-cutting: Audit (GP-002) on every state change; RBAC (GP-005) enforced in controllers; input validation (GP-003) at API boundary and service level; transaction semantics for balance mutations.

### Reconciliation Notes

- **Naming conflicts resolved**: Domain entity `LeaveType` uses `code` and `label`; data design's `name` field replaced by `code` and `label`. `LeavePolicy` attributes aligned to domain architect's specification (dropped `min_tenure_months`, `requires_document`, `effective_from/until`; added `entitlement_days`, `minimum_notice_days`, `max_consecutive_days`, `requires_manager_approval`, `allow_negative_balance`). `LeaveBalance` uses domain's `total_entitlement`, `used_days`, `pending_days`, `remaining_days`, `carried_forward`, `fiscal_year` instead of data design's `balance_days`, `accrued_days`, `year`. `LeaveRequest` uses domain's `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `cancelled_by`, `cancelled_at` instead of `manager_id`, `reviewed_at`, `total_days`.
- **Missing slice filled**: `AuditLog` entity and `audit_log` table added to satisfy GP-002; repository interfaces for all entities defined.
- **Stack compliance**: All designs already compliant with TypeScript, Fastify, PostgreSQL, modular-monolith. No corrections needed.
<!-- gestalt:architecture feature=d6603324-1a59-4abc-b8a0-7afc0afd0c77 END -->
