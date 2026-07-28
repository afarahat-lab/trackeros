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
src/modules/status/status.{model,service.interface,service}.ts
src/modules/uptime/uptime.{model,routes,service.interface,service}.ts
src/shared/db/connection.ts
src/shared/types/index.ts
src/app.ts
src/index.ts
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

<!-- gestalt:architecture feature=d18657f9-0bac-42e0-9562-9d8a3fa79412 START -->
## Leave Management Module

### Domain Entities

#### LeaveRequest
- **Attributes**: id, employeeId, leavePolicyId, startDate, endDate, reason, status, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, createdAt, updatedAt
- **Lifecycle states**: DRAFT → SUBMITTED → (APPROVED | REJECTED); any state → CANCELLED (with balance restoration if previously APPROVED)
- **Transitions**:
  - DRAFT → SUBMITTED (submit): employee finalizes; requires valid dates, active policy, ACTIVE employee
  - SUBMITTED → APPROVED (approve): manager approves; balance check passes, balance deducted, audit logged
  - SUBMITTED → REJECTED (reject): manager rejects; rejection reason required, audit logged
  - DRAFT → CANCELLED (cancel): employee cancels own draft; no balance impact
  - SUBMITTED → CANCELLED (cancel): employee cancels submitted request; no balance impact
  - APPROVED → CANCELLED (cancel): employee cancels approved request; balance restored, audit logged

#### LeavePolicy
- **Attributes**: id, policyName, leaveType, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt
- **Lifecycle states**: ACTIVE, INACTIVE

#### Employee
- **Attributes**: id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt
- **Lifecycle states**: ACTIVE, INACTIVE, TERMINATED (employmentStatus)

#### LeaveBalance
- **Attributes**: id, employeeId, leavePolicyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status, createdAt, updatedAt
- **Lifecycle states**: OPEN, CLOSED

#### LeaveType (enum)
- ANNUAL, SICK, EMERGENCY

#### AuditRecord
- **Attributes**: id, entityType, entityId, action, actorId, changes, createdAt
- Immutable log for all state-changing operations (GP-002)

### Business Rules
- BR-001: Only employees with employmentStatus = ACTIVE may submit a leave request.
- BR-002: Leave balance is deducted on APPROVED; restored on CANCELLED (from APPROVED).
- BR-003: All state-changing operations must write an audit record (GP-002).
- BR-004: Manager approval requires the approver to be the employee's manager (or have appropriate RBAC role).
- BR-005: Leave request dates must not overlap with existing approved leave for the same employee.

### Module Boundaries
- **LeaveType** (`src/modules/LeaveType/`): LeaveType enum
- **LeaveStatus** (`src/modules/LeaveStatus/`): LeaveStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED)
- **BaseEntity** (`src/modules/BaseEntity/`): BaseEntity interface (id, createdAt, updatedAt)
- **LeaveRequest** (`src/modules/LeaveRequest/`): LeaveRequest model, ILeaveRequestRepository interface
- **LeavePolicy** (`src/modules/LeavePolicy/`): LeavePolicy model, ILeavePolicyRepository interface
- **AuditRecord** (`src/modules/AuditRecord/`): AuditRecord model
- **AuditLog** (`src/modules/AuditLog/`): IAuditLogRepository interface
- **AuditServiceInterface** (`src/modules/AuditServiceInterface/`): IAuditService interface
- **leave** (`src/modules/leave/`): ILeaveService, LeaveService, controller, routes — orchestrates apply/approve/reject/cancel
- **balance** (`src/modules/balance/`): LeaveBalance model, ILeaveBalanceRepository, IBalanceService, BalanceService, controller, routes
- **policy** (`src/modules/policy/`): IPolicyService, PolicyService, controller, routes
- **notification** (`src/modules/notification/`): INotificationService, NotificationService
- **employee** (`src/modules/employee/`): Employee model, IEmployeeRepository, IEmployeeService, EmployeeService, controller, routes

### Dependency Map
- LeaveRequest → BaseEntity, LeaveType, LeaveStatus
- LeavePolicy → BaseEntity, LeaveType
- AuditRecord → BaseEntity
- AuditLog → AuditRecord
- AuditServiceInterface → AuditRecord, AuditLog
- employee → BaseEntity
- balance → BaseEntity, LeaveType
- policy → LeavePolicy
- leave → LeaveRequest, balance, policy, notification, employee, AuditServiceInterface

### Conceptual Table Specifications

#### employees
- Fields: id, employee_number, first_name, last_name, email, role, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at
- PK: id
- FK: manager_id → employees.id
- Indexes: email (unique), role, manager_id, department, employment_status

#### leave_requests
- Fields: id, employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, cancelled_by, cancelled_at, created_at, updated_at
- PK: id
- FK: employee_id → employees.id, leave_policy_id → leave_policies.id, approved_by → employees.id, rejected_by → employees.id, cancelled_by → employees.id
- Indexes: employee_id, status, leave_policy_id, approved_by, rejected_by, created_at

#### leave_balances
- Fields: id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at
- PK: id
- FK: employee_id → employees.id, leave_policy_id → leave_policies.id
- Indexes: (employee_id, leave_policy_id, fiscal_year) unique, employee_id

#### leave_policies
- Fields: id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at
- PK: id
- Indexes: leave_type (unique), is_active

#### audit_logs
- Fields: id, entity_type, entity_id, action, actor_id, changes, created_at
- PK: id
- FK: actor_id → employees.id
- Indexes: (entity_type, entity_id), actor_id, created_at, action

### Recommended Implementation Phases
1. **Core Enums & Base Entity** — LeaveType, LeaveStatus, BaseEntity (6 files)
2. **Domain Models & Repository Interfaces** — LeaveRequest, LeavePolicy, AuditRecord, ILeaveRequestRepository, ILeavePolicyRepository, IAuditLogRepository, AuditLog, AuditServiceInterface (12 files)
3. **Employee Module** — Employee model, repository, service, controller, routes (6 files)
4. **Balance Module** — LeaveBalance model, repository, service, controller, routes (6 files)
5. **Policy Module** — PolicyService, controller, routes (4 files)
6. **Notification Module** — INotificationService, NotificationService (2 files)
7. **Leave Module (Orchestrator)** — ILeaveService, LeaveService, controller, routes (4 files)

All phases follow inward dependency flow: Presentation (routes/controllers) → Application (services) → Domain (models, repository interfaces) → Infrastructure (repository implementations, DB). The leave module is the sole orchestrator; no other module depends on it. Every state-changing operation logs an audit record via IAuditService (GP-002). All routes enforce RBAC (GP-005).
<!-- gestalt:architecture feature=d18657f9-0bac-42e0-9562-9d8a3fa79412 END -->
