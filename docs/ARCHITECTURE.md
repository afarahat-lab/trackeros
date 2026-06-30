# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Vitest
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
src/shared/base.repository.ts
src/shared/error.types.ts
src/shared/types/leave.types.ts
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

<!-- gestalt:architecture feature=6d4545cd-a047-4fa8-937f-9443038eb8ea START -->
## Leave Management Module — Feature Architecture

### Overview

The leave management module is a modular-monolith feature within trackeros, built on Fastify + PostgreSQL. It enables employees to submit leave requests, managers to approve/reject them, and the system to track leave balances with automatic recalculation. Every state-changing operation is audited (GP-002), all endpoints enforce RBAC (GP-005), and all database access goes through repository interfaces (GP-001).

### Module Structure

```
src/
├── shared/
│   ├── db/
│   │   └── connection.ts              # PostgreSQL connection pool (pg)
│   ├── types/
│   │   └── leave.types.ts             # Shared enums: LeaveType, LeaveStatus, NotificationType, AuditAction, EntityType, EmployeeRole, EmploymentStatus
│   ├── base.repository.ts             # BaseRepository<T> abstract class
│   ├── error.types.ts                 # NotFoundError, ValidationError, ForbiddenError, ConflictError
│   ├── validation.ts                  # Input validation helpers (GP-003)
│   └── logger.ts                      # Structured logger (no PII — GP-004)
│
├── modules/
│   ├── employee/
│   │   ├── employee.model.ts          # Employee entity + EmploymentStatus enum + EmployeeRole enum
│   │   ├── employee.repository.interface.ts  # IEmployeeRepository
│   │   ├── employee.repository.ts     # PgEmployeeRepository
│   │   ├── employee.service.interface.ts     # IEmployeeService
│   │   ├── employee.service.ts        # EmployeeService
│   │   ├── employee.routes.ts         # Fastify route handlers
│   │   └── index.ts                   # Public entry point
│   │
│   ├── leaveType/
│   │   ├── leaveType.model.ts         # LeaveType entity
│   │   ├── leaveType.repository.interface.ts # ILeaveTypeRepository
│   │   ├── leaveType.repository.ts    # PgLeaveTypeRepository
│   │   ├── leaveType.service.interface.ts    # ILeaveTypeService
│   │   ├── leaveType.service.ts       # LeaveTypeService
│   │   ├── leaveType.routes.ts        # Fastify route handlers
│   │   └── index.ts
│   │
│   ├── leavePolicy/
│   │   ├── leavePolicy.model.ts       # LeavePolicy entity
│   │   ├── leavePolicy.repository.interface.ts # ILeavePolicyRepository
│   │   ├── leavePolicy.repository.ts  # PgLeavePolicyRepository
│   │   ├── leavePolicy.service.interface.ts    # ILeavePolicyService
│   │   ├── leavePolicy.service.ts     # LeavePolicyService
│   │   ├── leavePolicy.routes.ts      # Fastify route handlers
│   │   └── index.ts
│   │
│   ├── leaveBalance/
│   │   ├── leaveBalance.model.ts      # LeaveBalance entity + BalanceStatus enum
│   │   ├── leaveBalanceTransaction.model.ts  # LeaveBalanceTransaction entity + BalanceTransactionType enum
│   │   ├── leaveBalance.repository.interface.ts      # ILeaveBalanceRepository
│   │   ├── leaveBalance.repository.ts # PgLeaveBalanceRepository
│   │   ├── leaveBalanceTransaction.repository.interface.ts # ILeaveBalanceTransactionRepository
│   │   ├── leaveBalanceTransaction.repository.ts    # PgLeaveBalanceTransactionRepository
│   │   ├── leaveBalance.service.interface.ts        # ILeaveBalanceService
│   │   ├── leaveBalance.service.ts    # LeaveBalanceService
│   │   ├── leaveBalance.routes.ts     # Fastify route handlers
│   │   └── index.ts
│   │
│   ├── leaveRequest/
│   │   ├── leaveRequest.model.ts      # LeaveRequest entity + LeaveRequestStatus enum
│   │   ├── leaveRequest.repository.interface.ts     # ILeaveRequestRepository
│   │   ├── leaveRequest.repository.ts # PgLeaveRequestRepository
│   │   ├── leaveRequest.service.interface.ts        # ILeaveRequestService
│   │   ├── leaveRequest.service.ts    # LeaveRequestService (orchestrator)
│   │   ├── leaveRequest.routes.ts     # Fastify route handlers
│   │   └── index.ts
│   │
│   ├── notification/
│   │   ├── notification.model.ts      # Notification entity + NotificationType/Channel/Status enums
│   │   ├── notification.repository.interface.ts     # INotificationRepository
│   │   ├── notification.repository.ts # PgNotificationRepository
│   │   ├── notification.service.interface.ts        # INotificationService
│   │   ├── notification.service.ts    # NotificationService
│   │   ├── notification.routes.ts     # Fastify route handlers
│   │   └── index.ts
│   │
│   ├── auditLog/
│   │   ├── auditLog.model.ts          # AuditLog entity + AuditAction enum
│   │   ├── auditLog.repository.interface.ts         # IAuditLogRepository
│   │   ├── auditLog.repository.ts     # PgAuditLogRepository
│   │   ├── auditLog.service.interface.ts            # IAuditLogService
│   │   ├── auditLog.service.ts        # AuditLogService
│   │   ├── auditLog.routes.ts         # Fastify route handlers (read-only)
│   │   └── index.ts
│   │
│   └── rbac/
│       ├── rbac.model.ts              # Role + Permission models
│       ├── rbac.repository.interface.ts              # IRbacRepository
│       ├── rbac.repository.ts         # PgRbacRepository
│       ├── rbac.service.interface.ts                 # IRbacService
│       ├── rbac.service.ts            # RbacService
│       ├── rbac.middleware.ts          # Fastify preHandler hooks (requireRole, requirePermission)
│       └── index.ts
```

### Dependency Graph

```
leaveRequest ──→ leaveBalance ──→ leavePolicy ──→ leaveType ──→ shared
    │                │                │
    │                ├──→ employee ───┘
    │                │       ↑
    │                │   notification
    │                │   rbac
    │                │
    ├──→ notification ──→ employee
    ├──→ rbac ──────────→ employee
    ├──→ auditLog ──────→ shared
    ├──→ leaveType ─────→ shared
    ├──→ employee ──────→ shared
    └──→ shared
```

All modules import from each other ONLY through their declared public entry point (`index.ts`). No circular dependencies.

### Conceptual Table Specifications

| Table | Primary Key | Key Foreign Keys | Critical Indexes |
|-------|------------|------------------|------------------|
| `employee` | `employee_id` | `manager_id → employee.employee_id` | `email` (unique lookup), `manager_id` (hierarchy), `department` (scoping), `employment_status` (eligibility), `role` (RBAC) |
| `leave_type` | `leave_type_id` | — | `code` (unique lookup), `is_active` (filtering) |
| `leave_policy` | `leave_policy_id` | `leave_type_id → leave_type.leave_type_id` | `leave_type_id` (join), `department` (scoping, null=global), `designation` (scoping, null=global), `is_active` (validation) |
| `leave_request` | `leave_request_id` | `employee_id → employee`, `leave_type_id → leave_type`, `leave_policy_id → leave_policy`, `approved_by/rejected_by/cancelled_by/actioned_by → employee` | `employee_id` (history), `status` (approval queues), `start_date, end_date` (overlap detection), `applied_at` (reporting), `actioned_by` (manager view) |
| `leave_balance` | `leave_balance_id` | `employee_id → employee`, `leave_type_id → leave_type`, `leave_policy_id → leave_policy` | `employee_id, leave_type_id, fiscal_year` (unique constraint for lookup), `status` (filtering) |
| `leave_balance_transaction` | `balance_transaction_id` | `leave_balance_id → leave_balance`, `leave_request_id → leave_request` | `leave_balance_id` (ledger), `leave_request_id` (causality), `transaction_type` (filtering), `created_at` (chronology) |
| `notification` | `notification_id` | `recipient_id → employee` | `recipient_id` (inbox), `status` (unread), `channel` (delivery), `created_at` (ordering), `type` (filtering) |
| `audit_log` | `audit_log_id` | `actor_id → employee` | `entity_type, entity_id` (entity trail), `actor_id` (user trail), `action` (type filtering), `created_at` (chronology) |

### Business Rules

**BR-001 — Leave Request Submission (DRAFT → SUBMITTED):**
1. Employee `employmentStatus` must be ACTIVE
2. Referenced `LeavePolicy` must be ACTIVE
3. Referenced `LeaveType` must be ACTIVE
4. `startDate` < `endDate` and both must be in the future
5. `durationDays` ≤ `LeaveBalance.closingBalance - LeaveBalance.pendingDays` for that employee+policy+fiscalYear
6. If policy has `noticePeriodDays`, `startDate` must be ≥ now + `noticePeriodDays`
7. No overlapping APPROVED or SUBMITTED `LeaveRequest` exists for the same employee in the same date range
8. On success: `LeaveBalance.pendingDays += durationDays`, `closingBalance` recalculated, `LeaveBalanceTransaction` recorded (RESERVATION type), `AuditLog` written, `Notification` created

**BR-002 — Leave Request Approval (SUBMITTED → APPROVED):**
1. Approving actor must be the employee's manager (`managerId` match) OR have `HR_ADMIN` role
2. `LeaveRequest` must be in SUBMITTED status
3. Re-check `LeaveBalance` still has sufficient remaining (prevents race conditions)
4. On success: `LeaveBalance.pendingDays -= durationDays`, `LeaveBalance.consumed += durationDays`, `closingBalance` recalculated, `LeaveBalanceTransaction` recorded (CONSUMPTION type), `approvedBy`/`approvedAt` set, `AuditLog` written, `Notification` created
5. If policy `requiresApproval` is false, transition is automatic (system-approved) on submission — skip to APPROVED directly

**BR-003 — Leave Request Rejection (SUBMITTED → REJECTED):**
1. Rejecting actor must be the employee's manager OR have `HR_ADMIN` role
2. `LeaveBalance.pendingDays -= durationDays`, `closingBalance` recalculated (releases reservation)
3. `LeaveBalanceTransaction` recorded (REVERSAL type), `rejectedBy`/`rejectedAt`/`rejectionReason` set, `AuditLog` written, `Notification` created

**BR-004 — Leave Request Cancellation:**
- From DRAFT: Direct transition to CANCELLED (terminal). No balance impact.
- From SUBMITTED: Release pending reservation. `pendingDays -= durationDays`, `closingBalance` recalculated.
- From APPROVED: Reverse consumption. `consumed -= durationDays`, `closingBalance` recalculated.
- All paths: `cancelledBy`/`cancelledAt` set, `LeaveBalanceTransaction` recorded (REVERSAL type), `AuditLog` written, `Notification` created.

**BR-005 — Balance Exhaustion:** When `closingBalance - pendingDays` reaches 0, `LeaveBalance.status` transitions ACTIVE → EXHAUSTED. When it becomes positive again (via accrual or cancellation reversal), transitions EXHAUSTED → ACTIVE.

**BR-006 — Fiscal Year Splitting:** A single `LeaveRequest` spanning fiscal years is validated against each year's balance independently. The `LeaveRequestService.apply()` method splits the request into per-fiscal-year balance checks.

### Lifecycle State Transitions

**LeaveRequest (core workflow):**
```
DRAFT ──→ SUBMITTED ──→ APPROVED
  │           │              │
  │           ├──→ REJECTED  │
  │           │              │
  └──→ CANCELLED ←──────────┘
```
- DRAFT → SUBMITTED (employee submits)
- DRAFT → CANCELLED (employee discards; terminal)
- SUBMITTED → APPROVED (manager/system approves)
- SUBMITTED → REJECTED (manager rejects; terminal)
- SUBMITTED → CANCELLED (employee cancels; terminal)
- APPROVED → CANCELLED (employee or HR_ADMIN cancels; terminal)

**LeaveBalance:**
```
ACTIVE ⇄ EXHAUSTED
  │         │
  └──→ FROZEN ←──┘
```
- ACTIVE → EXHAUSTED (remaining reaches 0)
- EXHAUSTED → ACTIVE (remaining becomes positive)
- ACTIVE/EXHAUSTED → FROZEN (employee terminated or policy deactivated; terminal)

**Employee:** ACTIVE ⇄ INACTIVE → TERMINATED (terminal)
**LeaveType / LeavePolicy:** ACTIVE ⇄ INACTIVE (toggle indefinitely)
**Notification:** PENDING → SENT → READ → ARCHIVED (or SENT → ARCHIVED)
**AuditLog / LeaveBalanceTransaction:** RECORDED (immutable, single state)

### Service Interfaces (Key Methods)

**ILeaveRequestService** (orchestrator):
- `apply(employeeId, leaveTypeId, startDate, endDate, reason, attachmentUrl?)` — BR-001
- `approve(requestId, approverId)` — BR-002
- `reject(requestId, approverId, rejectionReason)` — BR-003
- `cancel(requestId, cancelledById)` — BR-004
- `getById(requestId)`, `listByEmployee(employeeId, filters)`, `listByApprover(approverId, filters)`, `listByStatus(status, filters)`, `listTeamRequests(managerId, filters)`, `validateRequest(employeeId, leaveTypeId, startDate, endDate)`

**ILeaveBalanceService:**
- `getBalance(employeeId, leaveTypeId, fiscalYear)`, `getAllBalances(employeeId, fiscalYear)`
- `initializeBalance(employeeId, policyId, fiscalYear)`
- `reserveDays(employeeId, leaveTypeId, days, fiscalYear, requestId)` — increments pendingDays
- `consumeDays(employeeId, leaveTypeId, days, fiscalYear, requestId)` — pendingDays→consumed
- `releaseReservation(employeeId, leaveTypeId, days, fiscalYear, requestId)` — decrements pendingDays
- `reverseConsumption(employeeId, leaveTypeId, days, fiscalYear, requestId)` — decrements consumed
- `recalculateBalance(employeeId, leaveTypeId, fiscalYear)` — full recalculation from transaction ledger
- `accrueEntitlement(employeeId, leaveTypeId, fiscalYear)`, `hasSufficientBalance(employeeId, leaveTypeId, days, fiscalYear)`

**IRbacService:**
- `hasPermission(userId, permission)`, `hasRole(userId, role)`
- `isManagerOf(managerId, employeeId)` — hierarchy check
- `canApproveLeave(approverId, requestId)` — composite: isManagerOf OR hasRole(HR_ADMIN)

### Stack Compliance Notes

- **Test framework**: Vitest (per AGENTS.md and the Phase 1 intent; HARNESS.json declares Jest but the more specific directives take precedence)
- **Backend**: Fastify (route handlers in `*.routes.ts`, preHandler hooks for RBAC middleware)
- **Database**: PostgreSQL via `pg` Pool (`src/shared/db/connection.ts`); Knex for migrations and repository layer
- **Language**: TypeScript, Node 20, npm
- **Architecture style**: Modular monolith — all modules in-process, no microservices
- **Frontend**: React Native (out of scope for this backend feature; contracts to be shared)

### Reconciliation Notes

1. **Naming conflicts resolved**: Domain architect used `entitlementDays`/`accrualRate`/`maxAccumulation`/`minimumNoticeDays`/`requiresManagerApproval` on LeavePolicy; data architect used `annual_quota`/`carry_forward_limit`/`notice_period_days`/`requires_approval`. Canonical names chosen: `annualQuota`, `carryForwardLimit`, `noticePeriodDays`, `requiresApproval` — these align with the data architect's more complete schema while preserving domain semantics.

2. **Employee attributes merged**: Domain architect had `employeeNumber`, `employmentStatus`, `hireDate`, `terminationDate`. Data architect added `designation`, `role`. Both are included in the reconciled entity.

3. **LeaveBalance model reconciled**: Domain architect used derived-field model (`totalEntitlement`, `usedDays`, `pendingDays`, `remainingDays`). Data architect used ledger model (`opening_balance`, `accrued`, `consumed`, `carried_forward`, `adjustments`, `closing_balance`). Reconciled to ledger model with `pendingDays` added — `closingBalance = openingBalance + accrued + carriedForward + adjustments - consumed - pendingDays`. The `leave_balance_transaction` table provides the immutable ledger for recalculation.

4. **LeaveBalanceTransaction entity added**: The data architect specified this as a table but the domain architect did not model it as a domain entity. It is now a first-class domain entity with a RECORDED lifecycle state, owned by the `leaveBalance` module.

5. **LeaveRequest attributes merged**: Domain architect had `leavePolicyId`, `approvedBy`/`approvedAt`, `rejectedBy`/`rejectedAt`, `rejectionReason`, `cancelledBy`/`cancelledAt`. Data architect added `attachmentUrl`, `appliedAt`, `actionedBy`/`actionedAt`/`actionRemarks`. All are included.

6. **LeaveType attributes merged**: Data architect added `isPaid`, `requiresAttachment`, `minDurationDays`, `maxDurationDays`. These are included alongside the domain architect's `code`, `name`, `description`, `isActive`.

7. **LeavePolicy attributes merged**: Data architect added `department`, `designation` (for scoping), `maxConsecutiveDays`, `minTenureMonths`, `effectiveFrom`, `effectiveUntil`. Domain architect had `accrualRate`, `maxAccumulation` — these are subsumed by the ledger-based balance model and the `carryForwardLimit`.

8. **Notification model reconciled**: Domain architect had `type`, `title`, `message`, `relatedEntityType`, `relatedEntityId`, `status`, `readAt`. Data architect added `channel`, `templateKey`, `sentAt`. All are included.

9. **AuditLog model reconciled**: Domain architect used `performedBy`/`performedAt`; data architect used `actor_id`/`created_at`. Canonical: `actorId`/`createdAt`. Domain architect used `oldValues`/`newValues` (Record); data architect used `old_state`/`new_state`. Canonical: `oldValues`/`newValues` (JSON).

10. **RBAC module**: The app architect included a dedicated `rbac` module with middleware. This is preserved. RBAC enforcement uses Fastify `preHandler` hooks that call `RbacService` before route handlers execute (GP-005).

11. **Notification and AuditLog are fire-and-forget**: `LeaveRequestService` calls them but does not await their result for the primary flow — failures are logged but do not block the leave operation. This prevents notification/audit failures from breaking the core workflow.

12. **All lifecycle states from domain architect are preserved** and reflected in the reconciled entities, including the terminal states (TERMINATED for Employee, CANCELLED/REJECTED for LeaveRequest, FROZEN for LeaveBalance, RECORDED for AuditLog and LeaveBalanceTransaction).

13. **Phase 1 file naming**: The Phase 1 intent uses dot-separated file names (`src/shared/types/leave.types.ts`, `src/shared/error.types.ts`, `src/shared/base.repository.ts`). These are authoritative for the shared layer. Module files follow the `moduleName.{model,repository,service,controller,routes}.ts` convention.

14. **LeaveStatus naming**: The Phase 1 intent defines `LeaveStatus.PENDING` as the state after an employee submits a leave request. The ARCHITECTURE.md lifecycle diagram uses `SUBMITTED` for the same state. `PENDING` is the canonical name per the Phase 1 intent; the lifecycle diagram's `SUBMITTED` label is an alias for `PENDING`.

15. **EmploymentStatus.ON_LEAVE**: The Phase 1 intent defines `EmploymentStatus.ON_LEAVE` as an additional status beyond the ARCHITECTURE.md Employee lifecycle (ACTIVE, INACTIVE, TERMINATED). This is an extension to the architecture — `ON_LEAVE` represents an employee who is currently on an approved leave and may have restricted system access.
<!-- gestalt:architecture feature=6d4545cd-a047-4fa8-937f-9443038eb8ea END -->
