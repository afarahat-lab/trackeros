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
src/modules/LeaveRequest/    — LeaveRequest module
src/modules/LeaveType/    — LeaveType module
src/modules/LeavePolicy/    — LeavePolicy module
src/modules/AuditLog/    — AuditLog module
src/modules/AuditRecord/    — AuditRecord module
src/modules/AuditServiceInterface/    — AuditServiceInterface module
src/shared/db connection.ts
src/shared/base repository.ts
src/shared/error types.ts
src/shared/types/    — Shared enums and base types (LeaveStatus, EmploymentStatus, BaseEntity)
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

<!-- gestalt:architecture feature=48504356-4524-4933-adc8-806c9b7434ef START -->
## Leave Management Module

### Overview
The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is built as a modular monolith using TypeScript, Fastify, PostgreSQL, and React Native (frontend).

### Domain Entities

#### Employee
- **Attributes**: id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt
- **Lifecycle**: ACTIVE → INACTIVE → TERMINATED
- **Purpose**: Core identity for leave request ownership and manager hierarchy.

#### LeaveType
- **Attributes**: id, code, name, description, createdAt, updatedAt
- **Lifecycle**: None (reference data)
- **Purpose**: Enumeration of leave categories (annual, sick, emergency, unpaid, maternity, paternity).

#### LeavePolicy
- **Attributes**: id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt
- **Lifecycle**: ACTIVE ↔ INACTIVE
- **Purpose**: Defines rules and entitlements per leave type.

#### LeaveRequest
- **Attributes**: id, employeeId, leaveTypeId, startDate, endDate, reason, status (LeaveStatus), approvedBy, approvedAt, createdAt, updatedAt
- **Lifecycle**: PENDING → (APPROVED | REJECTED) → CANCELLED (terminal). CANCELLED can also be reached from PENDING or APPROVED.
- **Purpose**: Core transactional entity for leave applications.

#### LeaveBalance
- **Attributes**: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status (BalanceStatus), createdAt, updatedAt
- **Lifecycle**: ACTIVE → EXHAUSTED → CLOSED (terminal). EXHAUSTED can return to ACTIVE on new fiscal year.
- **Purpose**: Tracks entitlement, consumption, and remaining days per employee per policy per fiscal year.

#### AuditLog
- **Attributes**: id, entityType, entityId, action, oldValues, newValues, performedBy, performedAt, ipAddress, userAgent, createdAt
- **Lifecycle**: Immutable
- **Purpose**: Compliance audit trail for all state-changing operations (GP-002).

### Business Rules
- **BR-001** No overlapping leave: An employee cannot have two LeaveRequests with overlapping date ranges where both statuses are in {PENDING, APPROVED}.
- **BR-002** Sufficient balance check: Before approval, remainingDays must be >= requested calendar days.
- **BR-003** Balance deduction on approval: Atomically increment usedDays and decrement remainingDays.
- **BR-004** Balance restoration on cancellation from approved: Atomically reverse the deduction.
- **BR-005** Manager approval enforcement: Only the employee's designated manager may approve/reject if policy requires it.
- **BR-006** Minimum notice period: If policy.minimumNoticeDays is set, startDate must be at least that many days in the future from submission.
- **BR-007** Active policy required: LeaveRequest can only reference an active LeavePolicy.

### Module Boundaries

| Module | Path | Owns |
|--------|------|------|
| LeaveType | src/modules/leave-type/ | LeaveType enum + model |
| LeaveStatus | src/shared/types/ | LeaveStatus enum (PENDING, APPROVED, REJECTED, CANCELLED) |
| Employee | src/modules/employee/ | Employee model, IEmployeeRepository, IEmployeeService |
| AuditLog | src/modules/audit-log/ | AuditLog model, IAuditLogRepository, IAuditLogService |
| LeavePolicy | src/modules/leave-policy/ | LeavePolicy model, ILeavePolicyRepository, ILeavePolicyService |
| Balance | src/modules/balance/ | LeaveBalance model, ILeaveBalanceRepository, IBalanceService |
| Notification | src/modules/notification/ | Notification model, INotificationService (no persistence) |
| LeaveRequest | src/modules/leave-request/ | LeaveRequest model, ILeaveRequestRepository, ILeaveRequestService, controller, routes |

### Dependency Map
- LeaveRequest → LeaveType, LeaveStatus, Employee, LeavePolicy, Balance, AuditLog, Notification
- Balance → LeaveType, AuditLog
- LeavePolicy → LeaveType
- Employee → AuditLog

### Conceptual Data Model (Tables)

#### employees
- **Fields**: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at
- **PK**: id
- **FK**: manager_id → employees.id
- **Indexes**: employee_number (unique), email (unique), manager_id, department, employment_status

#### leave_types
- **Fields**: id, code, name, description, created_at, updated_at
- **PK**: id
- **Indexes**: code (unique)

#### leave_policies
- **Fields**: id, policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at
- **PK**: id
- **FK**: leave_type_id → leave_types.id
- **Indexes**: leave_type_id, is_active

#### leave_requests
- **Fields**: id, employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at
- **PK**: id
- **FK**: employee_id → employees.id, leave_type_id → leave_types.id, approved_by → employees.id
- **Indexes**: employee_id, status, leave_type_id, (start_date, end_date), approved_by

#### leave_balances
- **Fields**: id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at
- **PK**: id
- **FK**: employee_id → employees.id, policy_id → leave_policies.id
- **Indexes**: employee_id, policy_id, fiscal_year, (employee_id, fiscal_year)

#### audit_logs
- **Fields**: id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at
- **PK**: id
- **FK**: performed_by → employees.id
- **Indexes**: (entity_type, entity_id), performed_by, performed_at, action

### Service Interfaces
- **IEmployeeService**: getById, getManagerId, isManagerOf, getTeamMembers
- **IAuditLogService**: record(actorId, action, targetType, targetId, details)
- **ILeavePolicyService**: getPolicyForType, getMaxDays, requiresApproval, isLeaveTypeEnabled
- **IBalanceService**: getBalance, getAllBalances, deductBalance, restoreBalance, hasSufficientBalance
- **INotificationService**: notifyLeaveApplied, notifyLeaveApproved, notifyLeaveRejected, notifyLeaveCancelled
- **ILeaveRequestService**: apply, approve, reject, cancel, getById, listByEmployee, listByManager, listAll

### Implementation Phases
1. **Leaf domain types** (LeaveType, LeaveStatus) — zero dependencies. ✅ Phase 1 complete: `src/shared/types/index.ts` with LeaveStatus (PENDING, APPROVED, REJECTED, CANCELLED), EmploymentStatus (ACTIVE, INACTIVE, TERMINATED, ON_LEAVE), BaseEntity.
2. **AuditLog infrastructure** — cross-cutting, depends only on shared/db.
3. **Employee module** — depends on AuditLog.
4. **LeavePolicy module** — depends on LeaveType.
5. **Balance module** — depends on LeaveType, AuditLog.
6. **Notification module** — depends on shared infrastructure (BullMQ).
7. **LeaveRequest model + repository + service interface** — depends on all prior interfaces.
8. **LeaveRequest service implementation** — orchestrates business rules.
9. **LeaveRequest controller + routes + wiring** — Fastify endpoints with RBAC and validation.

### Stack Compliance
- Language: TypeScript (strict)
- Framework: Fastify (HTTP), React Native (frontend)
- Database: PostgreSQL via pg Pool (src/shared/db/connection.ts)
- Architecture: modular-monolith with clear module boundaries and inward dependency flow
- Testing: Jest
- Cross-cutting: Audit (GP-002), RBAC (GP-005), input validation (GP-003), transactions for balance operations
<!-- gestalt:architecture feature=48504356-4524-4933-adc8-806c9b7434ef END -->
