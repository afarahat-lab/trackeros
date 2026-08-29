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

<!-- gestalt:architecture feature=dd1a6d9f-1b67-4054-9579-5cb7ccee58f3 START -->
# Leave Management Module — Reconciled Architecture

## Stack
TypeScript 20, Fastify, PostgreSQL, modular monolith, Jest. React Native consumes the API but is not part of this backend module.

## Domain Entities
- **Employee**: ACTIVE | INACTIVE | TERMINATED. Attributes: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus.
- **LeaveRequest**: DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED. Central aggregate. Attributes include employeeId, leaveTypeId, startDate, endDate, reason, status, approvedBy/At, rejectedBy/At/rejectionReason, cancelledBy/At, createdAt, updatedAt.
- **LeaveType**: ACTIVE | INACTIVE. code: annual | sick | emergency | unpaid | maternity | paternity; isPaid, requiresManagerApproval, isActive.
- **LeavePolicy**: ACTIVE | INACTIVE. policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive.
- **LeaveBalance**: ACTIVE | EXHAUSTED | CLOSED. employeeId, policyId, fiscalYear, totalEntitlement, usedDays, pendingDays, remainingDays, status.
- **Notification**: PENDING | SENT | READ | ARCHIVED.
- **AuditLog**: immutable, no lifecycle.

## Binding Rules
- Duration = endDate - startDate + 1 calendar days, inclusive, used uniformly for reservation/deduction/sufficiency.
- On SUBMITTED reserve durationDays in pendingDays; on APPROVED move pendingDays to usedDays; on REJECTED/CANCELLED release pendingDays.
- Sufficiency check: remainingDays >= durationDays; unpaid leave exempt.
- Manager-only approval (no self-approval); elevated hr_admin allowed.
- minimumNoticeDays applies except emergency leave.
- Cancellation allowed by employee in SUBMITTED or APPROVED; after APPROVED releases used days.
- Every state-changing operation writes AuditLog.
- Fiscal year identified by calendar year in which it ends; request fiscal year derived from startDate.

## Conceptual Tables
- employees (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at)
- leave_types (id, code, name, is_paid, requires_manager_approval, is_active, created_at, updated_at)
- leave_policies (id, policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
- leave_requests (id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, cancelled_by, cancelled_at, created_at, updated_at)
- leave_balances (id, employee_id, policy_id, fiscal_year, total_entitlement, used_days, pending_days, remaining_days, status, created_at, updated_at)
- audit_logs (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at)
- notifications (id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at)

## Modules
- shared-types: src/shared/types/
- leave: src/modules/leave/
- balance: src/modules/balance/
- employee: src/modules/employee/
- policy: src/modules/policy/
- leave-type: src/modules/leave-type/
- notification: src/modules/notification/
- audit: src/modules/audit/

## Dependency Map
leave -> balance, policy, employee, notification, audit, leave-type, shared-types
policy -> leave-type, shared-types
balance, employee, notification, audit, leave-type -> shared-types

## Cross-cutting Contracts
- **Auth**: request.user { id, role: UserRole }; UserRole = employee | manager | hr_admin; JWT bearer; requireRole guard.
- **Error**: { error, code }; 400 validation, 401 auth, 403 authorization, 404 not found, 422 insufficient balance/policy violation.
- **Transaction**: approval/rejection atomic across leave_requests, leave_balances, audit_logs; optional PoolClient param; service owns BEGIN/COMMIT/ROLLBACK.

## Phases
1. Shared types & value objects
2. Leaf modules: employee, leave-type, policy, balance, audit
3. Notification module
4. Leave module (orchestrator) + routes/controller

## Open Questions
See openQuestions field.
<!-- gestalt:architecture feature=dd1a6d9f-1b67-4054-9579-5cb7ccee58f3 END -->
