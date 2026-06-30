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
src/modules/audit/audit.{model,repository,service,controller,routes}.ts
src/shared/db/connection.ts
src/shared/types/leave.types.ts
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

<!-- gestalt:architecture feature=ef3e388c-4f35-40d1-8fba-2cc36a91c777 START -->
## Leave Management Module — Reconciled Architecture

### Reconciliation Summary

Three specialist designs (domain, data, application) were reconciled into a single coherent architecture. The following conflicts were resolved:

| Conflict | Resolution |
|---|---|
| Data design omitted `leave_types` table | Added `leave_types` table matching domain `LeaveType` entity |
| Data design `leave_policies` missing `leave_type_id`, `leave_type_code`, `effective_from`, `effective_to` | Added all four fields; FK `leave_type_id -> leave_types.id` |
| Data design `leave_requests` missing `leave_type_id`, `leave_policy_id`, `duration_days`, `revoked_by/at/reason` | Added all missing fields with FKs |
| Data design `leave_balances` missing `pending_days`, `carried_forward_days`, `accrued_days`, `last_accrual_date`, `status` | Added all five fields |
| Data design `notifications` missing `channel`, `sent_at` | Added both fields |
| Data design `audit_logs` missing `correlation_id` | Added `correlation_id` field |
| App design `ILeaveRequestService` missing `revoke` method | Added `revoke(requestId, adminId, reason)` to service contract |
| App design notes referenced Knex; data design uses pg Pool | Standardized on **pg Pool** (`src/shared/db/connection.ts`) — no ORM |
| ARCHITECTURE.md declared Vitest; jest.config.js exists | Standardized on **Jest** per stack declaration and existing config |
| App design `ILeavePolicyRepository` used `deactivate`; domain uses `isActive` toggle | Canonical: `deactivate(id)` method, sets `is_active = false` |
| App design `ILeaveRequestRepository.updateStatus` signature vs domain lifecycle | Canonical: `updateStatus(id, status, actorId, timestamp, reason?)` supporting all 7 lifecycle states |

### Stack Compliance

| Requirement | Status |
|---|---|
| TypeScript + Node 20 | ✅ All modules use TypeScript |
| Fastify | ✅ Routes wired as Fastify route handlers |
| React Native | ✅ Frontend consumes REST API (out of scope for backend modules) |
| PostgreSQL via pg Pool | ✅ All repositories backed by `src/shared/db/connection.ts` |
| Jest | ✅ Test framework per `jest.config.js` |
| Modular monolith | ✅ 9 modules with explicit dependency graph, no circular dependencies |

### Golden Principles Coverage

| Principle | How It's Satisfied |
|---|---|
| GP-001 (Repository pattern) | Every module has `I*Repository` interface + `Pg*Repository` implementation; services never touch DB directly |
| GP-002 (Audit records) | `AuditLog` module with `IAuditLogService.record()` called explicitly by `LeaveRequestService` on every state transition |
| GP-003 (Input validation) | Fastify route handlers validate inputs at API boundary before delegating to services |
| GP-004 (No sensitive data in logs) | AuditLog captures entity state diffs only; no PII in log output |
| GP-005 (RBAC enforcement) | `rbac` module middleware applied to all routes; `IRbacService` used for ownership checks in services |
| GP-006 (Error handling) | All async service methods wrapped; `shared` module provides `AppError`, `NotFoundError`, `ValidationError`, `UnauthorizedError` |

### Module Dependency Graph (DAG — no cycles)

```
shared
 ├── rbac
 ├── auditLog
 ├── employee ────── rbac
 ├── leaveType ───── rbac
 ├── leavePolicy ─── shared, rbac, leaveType, employee
 ├── notification ── shared, employee
 ├── leaveBalance ── shared, rbac, employee, leaveType, leavePolicy
 └── leaveRequest ── shared, rbac, employee, leaveType, leavePolicy, leaveBalance, auditLog, notification
```

### Conceptual Table Summary (no DDL)

| Table | Key Fields | Unique / Compound Key |
|---|---|---|
| `employees` | id, employee_number, email, manager_id, department, employment_status, deleted_at | employee_number UNIQUE, email UNIQUE |
| `leave_types` | id, code, name, is_paid, requires_documentation, is_active | code UNIQUE |
| `leave_policies` | id, leave_type_id, leave_type_code, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, effective_from, effective_to | leave_type_id UNIQUE |
| `leave_requests` | id, employee_id, leave_type_id, leave_policy_id, start_date, end_date, duration_days, status, approved_by, rejected_by, cancelled_by, revoked_by | — |
| `leave_balances` | id, employee_id, leave_policy_id, fiscal_year, total_entitlement, used_days, pending_days, remaining_days, carried_forward_days, accrued_days, status | (employee_id, leave_policy_id, fiscal_year) UNIQUE |
| `notifications` | id, recipient_id, type, channel, status, related_entity_type, related_entity_id, sent_at, read_at | — |
| `audit_logs` | id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, correlation_id | — |

### Business Rules (from domain design, preserved verbatim)

- **BR-001** — Employee Eligibility: Only ACTIVE employees may submit leave requests
- **BR-002** — LeavePolicy Must Be Active and within effective date window
- **BR-003** — Sufficient Balance Check before approval (pendingDays + usedDays + request.durationDays <= totalEntitlement)
- **BR-004** — Date Validity: startDate < endDate, no past startDate, business-day duration >= 0.5
- **BR-005** — Minimum Notice Period enforced unless ADMIN/HR override
- **BR-006** — No Overlapping Approved Leave for same employee
- **BR-007** — Manager Approval Routing (managerId → HR escalation if null; auto-approve if requiresManagerApproval = false)
- **BR-008** — Balance Deduction on Approval (pendingDays↓, usedDays↑, remainingDays recalculated; EXHAUSTED if zero)

### LeaveRequest Lifecycle (7 states)

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → REVOKED (terminal)
                    ↘ REJECTED (terminal)
DRAFT → (deleted by employee)
SUBMITTED → CANCELLED (terminal, employee action)
```

### Service Contracts (reconciled)

**ILeaveRequestService** (canonical — supersedes all specialist versions):
- `apply(employeeId, leaveTypeId, startDate, endDate, reason)` — creates DRAFT, validates, transitions to SUBMITTED
- `approve(requestId, approverId, comment?)` — validates balance, deducts, transitions to APPROVED
- `reject(requestId, approverId, reason)` — transitions to REJECTED
- `cancel(requestId, employeeId)` — employee cancels from SUBMITTED
- `revoke(requestId, adminId, reason)` — admin revokes APPROVED, restores balance
- `validateRequest(employeeId, leaveTypeId, startDate, endDate)` — dry-run validation
- `getById`, `listByEmployee`, `listByApprover`, `listByStatus`, `listByDateRange`

**ILeaveBalanceService** (canonical):
- `deductBalance(employeeId, leavePolicyId, days, fiscalYear)` — on approval
- `restoreBalance(employeeId, leavePolicyId, days, fiscalYear)` — on revocation
- `recalculateBalance(employeeId, leavePolicyId, fiscalYear)` — full recompute from policy + approved requests
- `accrueBalance(employeeId, leavePolicyId, days, fiscalYear)` — scheduled job
- `initializeBalance`, `getByEmployee`, `getByEmployeeAndType`, `getByEmployeeAndFiscalYear`, `getBalanceSummary`

### Build Phases (10 phases, ~50 files total)

1. **Shared foundation** — BaseEntity, BaseRepository, error types, pg Pool, AuditServiceInterface
2. **RBAC module** — Roles, permission guards, middleware
3. **AuditLog module** — GP-002 implementation
4. **Employee module** — Core identity, soft-delete support
5. **LeaveType module** — Leave category catalog
6. **LeavePolicy module** — Entitlement rules, accrual config, approval chains
7. **Notification module** — Template-driven, multi-channel
8. **LeaveBalance module** — Per-employee/per-policy tracking, deduction/restoration
9. **LeaveRequest module** — Full lifecycle orchestrator
10. **Routes & presentation** — Fastify route wiring with RBAC + validation
<!-- gestalt:architecture feature=ef3e388c-4f35-40d1-8fba-2cc36a91c777 END -->
