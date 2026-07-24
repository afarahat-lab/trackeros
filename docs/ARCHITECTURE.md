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

<!-- gestalt:architecture feature=357a7337-e072-4b6f-8300-3faec0e7f1e5 START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is built as a modular monolith using TypeScript, Fastify, React Native, and PostgreSQL, following the principles in GOLDEN_PRINCIPLES.md.

### Domain Entities

| Entity | Purpose | Lifecycle States |
|--------|---------|------------------|
| **LeaveRequest** | Employee leave application. Tracks full lifecycle from draft to cancellation. | DRAFT → SUBMITTED → (APPROVED \| REJECTED) → CANCELLED. CANCELLED reachable from DRAFT, SUBMITTED, or APPROVED. APPROVED → CANCELLED triggers balance restoration. |
| **LeavePolicy** | Rules and entitlements for a leave category. | ACTIVE → INACTIVE → ARCHIVED. Only ACTIVE policies accept new requests. |
| **LeaveBalance** | Employee entitlement, usage, and remaining days per policy per fiscal year. | ACTIVE → EXHAUSTED (auto when remainingDays=0) → ACTIVE (auto when remainingDays>0). ACTIVE → FROZEN (admin action only, manual revert). |
| **Employee** | Organisation employee who owns balances and submits requests. | ACTIVE → INACTIVE → TERMINATED. Only ACTIVE employees may submit leave requests. Termination auto-cancels SUBMITTED requests. |
| **LeaveType** | Enum: annual, sick, emergency, unpaid, maternity, paternity. | N/A |
| **LeaveRequestStatus** | Enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. | N/A |
| **BalanceStatus** | Enum: ACTIVE, EXHAUSTED, FROZEN. | N/A |
| **EmploymentStatus** | Enum: ACTIVE, INACTIVE, TERMINATED. | N/A |
| **AuditLog** | Immutable record of state-changing operations (GP-002). | N/A |
| **Notification** | Persisted notification for employees (submitted, approved, rejected, cancelled, balance low). | N/A |

### Business Rules

- **BR-001** Date validation: startDate ≤ endDate, both in future at submission, total days ≤ remainingDays.
- **BR-002** Manager approval: approvedBy must match employee's managerId; self-approval prohibited.
- **BR-003** Balance deduction on approval: atomic increment of usedDays, decrement of remainingDays.
- **BR-004** Balance restoration on cancellation of APPROVED request.
- **BR-005** Minimum notice period enforced at submission (unless emergency leave).
- **BR-006** Only ACTIVE policies may be used.
- **BR-007** Only ACTIVE employees may submit; termination auto-cancels SUBMITTED requests.
- **BR-008** Overlap prevention: no overlapping APPROVED/SUBMITTED requests for same employee and leave type.
- **BR-009** Fiscal year scoping: deduction applied to fiscal year of startDate; no negative remainingDays.
- **BR-010** Valid state transitions: DRAFT→SUBMITTED (employee), SUBMITTED→APPROVED/REJECTED (manager), SUBMITTED→CANCELLED (employee), APPROVED→CANCELLED (employee), DRAFT→CANCELLED (employee).
- **BR-011** Emergency leave bypasses minimum notice.
- **BR-012** Balance status auto-transition: EXHAUSTED when remainingDays=0, ACTIVE when >0; FROZEN only by admin.

### Module Boundaries

```
src/modules/
├── leave-type/          # LeaveType enum, constants
├── leave-status/        # LeaveRequestStatus enum, transition rules
├── leave-policy/        # LeavePolicy model, repository, service
├── leave-balance/       # LeaveBalance model, BalanceStatus enum, repository, service
├── leave-request/       # LeaveRequest model, repository, service, controller, routes, validation
├── employee/            # Employee model, EmploymentStatus enum, repository, service
├── audit/               # AuditLog model, repository, service
└── notification/        # Notification model, repository, service
```

### Dependency Direction

```
leave-request ──→ leave-balance ──→ leave-policy ──→ leave-type
    │                  │
    │                  └──→ employee ──→ audit
    │                  └──→ audit
    │
    ├──→ leave-status (leaf)
    ├──→ leave-type (leaf)
    ├──→ leave-policy ──→ leave-type
    ├──→ employee ──→ audit
    ├──→ audit (leaf)
    └──→ notification ──→ employee ──→ audit
```

All arrows point inward. No cycles.

### Conceptual Tables

| Table | Key Fields | Index Rationale |
|-------|------------|-----------------|
| **leave_request** | id, employee_id, leave_policy_id, start_date, end_date, status, approved_by | employee_id (my requests), status (approval queues), leave_policy_id (type filter), approved_by (manager queue), start_date/end_date (calendar, overlap) |
| **leave_balance** | id, employee_id, leave_policy_id, fiscal_year, remaining_days, status | employee_id (per-employee lookup), leave_policy_id (policy filter), fiscal_year (scoping), unique(employee_id, leave_policy_id, fiscal_year) |
| **leave_policy** | id, leave_type, is_active | leave_type (filter by type), is_active (active policies only) |
| **employee** | id, email, employee_number, manager_id, employment_status | email (unique login), employee_number (unique HR), manager_id (team queries), employment_status (eligibility) |
| **audit_log** | id, entity_type, entity_id, action, performed_by, performed_at | (entity_type, entity_id) (entity trail), performed_by (actor trail), performed_at (time range), action (action type) |
| **notification** | id, recipient_employee_id, is_read, created_at | recipient_employee_id (user inbox), is_read (unread filter), created_at (ordering) |

### Service Interfaces

- **ILeavePolicyService**: getPolicyById, getPolicyByLeaveType, getActivePolicies, getEntitlementDays, requiresManagerApproval, getMinimumNoticeDays
- **ILeaveBalanceService**: getBalance, getAllBalances, hasSufficientBalance, deductBalance, restoreBalance, initializeBalance, recalculateBalance
- **ILeaveRequestService**: submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, getLeaveRequestById, getLeaveRequestsByEmployee, getPendingLeaveRequests, getTeamLeaveRequests, validateLeaveRequest
- **IEmployeeService**: getEmployeeById, getManagerId, isActive, getTeamMembers
- **IAuditService**: recordCreate, recordUpdate, recordApprove, recordReject, recordCancel
- **INotificationService**: notifyLeaveSubmitted, notifyLeaveApproved, notifyLeaveRejected, notifyLeaveCancelled, notifyBalanceLow

### Implementation Phases

1. **Foundation**: leave-type, leave-status, audit, employee modules + tables (employee, audit_log).
2. **Policy & Balance**: leave-policy, leave-balance modules + tables (leave_policy, leave_balance).
3. **Notification**: notification module + table (notification).
4. **Leave Request Orchestration**: leave-request module + table (leave_request), controller, routes, validation.

### Stack Compliance

- Language: TypeScript (strict mode)
- Runtime: Node.js 20
- Framework: Fastify (REST API)
- Frontend: React Native (mobile client)
- Database: PostgreSQL (via pg Pool at src/shared/db/connection.ts)
- Architecture: modular-monolith with clear module boundaries and dependency inversion (interfaces)
- Testing: Jest
- Package manager: npm

All repositories implement interfaces (GP-001). All state-changing operations are audited (GP-002). Input validation is enforced at the controller layer (GP-003). RBAC is enforced at route level (GP-005). Transactions are used for atomic balance updates (GP-004).
<!-- gestalt:architecture feature=357a7337-e072-4b6f-8300-3faec0e7f1e5 END -->
