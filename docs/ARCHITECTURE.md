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

## Module structure (as built)

```
src/modules/status/          — Status module (model, service interface, service)
src/modules/uptime/          — Uptime module (model, routes, service interface, service)
src/shared/db/connection.ts  — PostgreSQL connection pool (pg Pool)
src/shared/types/index.ts    — Shared domain types (Phase 1)
```

### Planned modules (not yet built)

```
src/modules/employee/        — Employee entity, repository, service
src/modules/leave-policy/    — LeavePolicy entity, repository, service
src/modules/leave-balance/   — LeaveBalance entity, repository, service
src/modules/leave-request/   — LeaveRequest entity, repository, service
src/modules/audit-log/       — AuditRecord entity, repository, service
src/modules/leave-controller/— Fastify route handlers, plugin registration
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

<!-- gestalt:architecture feature=0a9e79d5-ceb7-41f8-a164-f84cb7818c71 START -->
# Leave Management Module — Reconciled Architecture

## Domain Entities

### LeaveType (enum)
- **Values:** `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`
- **Attributes:** `code`, `label`, `requiresDocumentation`, `isPaid`
- **Lifecycle:** `ACTIVE`, `INACTIVE`

### Employee
- **Attributes:** `id`, `employeeNumber`, `firstName`, `lastName`, `email`, `role` (UserRole), `managerId`, `department`, `hireDate`, `terminationDate`, `employmentStatus` (ACTIVE|INACTIVE|TERMINATED), `createdAt`, `updatedAt`, `deletedAt`
- **Lifecycle:** `ACTIVE` → `INACTIVE` → `TERMINATED`

### LeavePolicy
- **Attributes:** `id`, `policyName`, `leaveType` (LeaveType), `entitlementDays`, `accrualRate`, `maxAccumulation`, `minimumNoticeDays`, `requiresManagerApproval`, `requiresDocumentation`, `maxConsecutiveDays`, `allowNegativeBalance`, `accrualRule`, `isActive`, `createdAt`, `updatedAt`
- **Lifecycle:** `ACTIVE`, `INACTIVE`

### LeaveRequest
- **Attributes:** `id`, `employeeId`, `leavePolicyId`, `startDate`, `endDate`, `reason`, `status` (LeaveRequestStatus), `approvedBy`, `approvedAt`, `managerNote`, `totalDays` (computed), `createdAt`, `updatedAt`
- **Lifecycle:** `DRAFT` → `SUBMITTED` → (`APPROVED` | `REJECTED`) → `CANCELLED` (from DRAFT, SUBMITTED, or APPROVED)

### LeaveBalance
- **Attributes:** `id`, `employeeId`, `leavePolicyId`, `fiscalYear`, `totalEntitlement`, `usedDays`, `pendingDays`, `remainingDays`, `status` (ACTIVE|EXHAUSTED|CLOSED), `createdAt`, `updatedAt`
- **Lifecycle:** `ACTIVE` → `EXHAUSTED` → `CLOSED`

### AuditRecord
- **Attributes:** `id`, `entityType`, `entityId`, `action`, `oldValues`, `newValues`, `performedBy`, `performedAt`, `ipAddress`, `userAgent`, `createdAt`
- **Lifecycle:** `CREATED` (immutable)

## Business Rules
- **BR-001 (Day Counting):** Leave duration is calculated as `(endDate - startDate) + 1`, inclusive of both start and end dates. This count is used for balance deduction, sufficiency checks, and policy enforcement everywhere.
- **BR-002 (Active Employee):** A LeaveRequest can only be submitted (`DRAFT → SUBMITTED`) if the employee's `employmentStatus` is `ACTIVE`.
- **BR-003 (Balance Deduction):** On approval, `usedDays` is incremented by the request's `totalDays` and `remainingDays` recalculated. On cancellation of an approved request, the balance is restored.
- **BR-004 (Pending Reservation):** On submission, `pendingDays` is incremented to reserve the days, preventing over-requesting. On rejection or cancellation, `pendingDays` is released.

## Module Structure

| Module | Path | Responsibilities |
|--------|------|------------------|
| `shared/types` | `src/shared/types/` | Enums (`LeaveType`, `LeaveStatus`, `UserRole`), value types (`DateRange`, `PaginationParams`, `PaginationResult`) |
| `audit-log` | `src/modules/audit-log/` | `AuditRecord` entity, repository, service |
| `employee` | `src/modules/employee/` | `Employee` entity, repository, service |
| `leave-policy` | `src/modules/leave-policy/` | `LeavePolicy` entity, repository, service |
| `leave-balance` | `src/modules/leave-balance/` | `LeaveBalance` entity, repository, service |
| `leave-request` | `src/modules/leave-request/` | `LeaveRequest` entity, repository, service |
| `leave-controller` | `src/modules/leave-controller/` | Fastify route handlers, plugin registration |

## Dependency Map
- `leave-controller` → `leave-request`, `leave-balance`, `leave-policy`, `employee`, `audit-log`
- `leave-request` → `leave-balance`, `leave-policy`, `employee`, `audit-log`
- `leave-balance` → `leave-policy`, `employee`

## Data Model (Conceptual Tables)

### employees
- **Fields:** `id`, `employee_number`, `first_name`, `last_name`, `email`, `role`, `manager_id`, `department`, `hire_date`, `termination_date`, `employment_status`, `created_at`, `updated_at`, `deleted_at`
- **PK:** `id`
- **FK:** `manager_id` → `employees.id`
- **Indexes:** `employee_number` (unique), `email` (unique), `manager_id`, `employment_status`

### leave_policies
- **Fields:** `id`, `policy_name`, `leave_type`, `entitlement_days`, `accrual_rate`, `max_accumulation`, `minimum_notice_days`, `requires_manager_approval`, `requires_documentation`, `max_consecutive_days`, `allow_negative_balance`, `accrual_rule`, `is_active`, `created_at`, `updated_at`
- **PK:** `id`
- **Indexes:** `leave_type`, `is_active`

### leave_requests
- **Fields:** `id`, `employee_id`, `leave_policy_id`, `start_date`, `end_date`, `reason`, `status`, `approved_by`, `approved_at`, `manager_note`, `total_days`, `created_at`, `updated_at`
- **PK:** `id`
- **FK:** `employee_id` → `employees.id`, `leave_policy_id` → `leave_policies.id`, `approved_by` → `employees.id`
- **Indexes:** `employee_id`, `status`, `leave_policy_id`, `start_date`, `end_date`, `approved_by`

### leave_balances
- **Fields:** `id`, `employee_id`, `leave_policy_id`, `fiscal_year`, `total_entitlement`, `used_days`, `pending_days`, `remaining_days`, `status`, `created_at`, `updated_at`
- **PK:** `id`
- **FK:** `employee_id` → `employees.id`, `leave_policy_id` → `leave_policies.id`
- **Indexes:** `employee_id`, `leave_policy_id`, `(employee_id, fiscal_year)`, unique constraint candidate on `(employee_id, leave_policy_id, fiscal_year)`

### audit_logs
- **Fields:** `id`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, `performed_by`, `performed_at`, `ip_address`, `user_agent`, `created_at`
- **PK:** `id`
- **FK:** `performed_by` → `employees.id`
- **Indexes:** `(entity_type, entity_id)`, `performed_by`, `performed_at`, `action`

## Cross-Cutting Contracts

### Auth Contract
- Authentication via JWT bearer tokens. A Fastify `preHandler` middleware verifies the token and populates `request.user` with `{ id: string; role: UserRole }`.
- `UserRole` enum: `employee`, `manager`, `hr_admin`.
- Authorization enforced by a `requireRole(...)` route guard. All leave endpoints require authentication; approval/rejection/manager views require `manager` or `hr_admin` role.

### Transaction Contract
- Repository methods that participate in multi-step writes (`create`, `updateStatus`, `updateUsedDays`, `upsert`, `create` audit entry) accept an optional `PoolClient` parameter.
- When omitted, the method acquires a connection from the shared pool for that single operation.
- When provided, the method uses the caller's client.
- The calling service owns the unit of work: it acquires a client from the pool, executes `BEGIN`, passes the client to each participating repository method, then executes `COMMIT` on success or `ROLLBACK` on failure.
- Primary transactional scenario: leave approval — update `leave_requests.status` to `APPROVED`, update `leave_balances.used_days`/`remaining_days`, and insert an `audit_logs` row, all within a single transaction.

### Error Response Contract
- All API errors return `{ error: string; code: string; details?: any }`.
- HTTP status codes:
  - `400` – validation error (e.g., invalid date range)
  - `401` – missing or invalid token
  - `403` – insufficient role
  - `404` – resource not found
  - `409` – conflicting leave request (overlap)
  - `422` – business rule violation (e.g., insufficient balance, employee not active)

## Recommended Implementation Phases
1. **Foundation:** Shared types, DB migrations, repositories for employee, leave-policy, leave-balance, audit-log.
2. **Core Services:** EmployeeService, LeavePolicyService, LeaveBalanceService, AuditLogService.
3. **Leave Request Workflow:** LeaveRequestService with full lifecycle, balance deduction/reservation, audit logging.
4. **API & Integration:** Fastify controllers, auth middleware, error handling, integration tests, React Native frontend integration.

## Open Question
- **Day counting rule:** The domain rule BR-001 specifies inclusive calendar days `(endDate - startDate + 1)`. This resolves the data architect's question; no further ambiguity remains.
<!-- gestalt:architecture feature=0a9e79d5-ceb7-41f8-a164-f84cb7818c71 END -->
