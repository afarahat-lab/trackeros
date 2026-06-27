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
src/modules/audit/audit.{model,repository,service,controller,routes}.ts
src/shared/types/leave.types.ts    — Shared leave enums (LeaveType, LeaveRequestStatus, LeaveBalanceStatus, EmploymentStatus)
src/shared/types/index.ts           — Barrel export for shared types
src/shared/db/connection.ts         — PostgreSQL connection pool
src/shared/base.repository.ts       — Base repository class
src/shared/error.types.ts           — Shared error types
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

## Shared Types

### Location
- `src/shared/types/leave.types.ts` — Canonical enum definitions for the leave management domain
- `src/shared/types/index.ts` — Barrel export re-exporting everything from `./leave.types`

### Enums

#### LeaveType
Supported leave types across the platform:
- `ANNUAL` — Annual/vacation leave
- `SICK` — Sick leave
- `EMERGENCY` — Emergency leave

#### LeaveRequestStatus
Lifecycle states for leave requests:
- `PENDING` — Initial state after submission
- `APPROVED` — Manager approved the request
- `REJECTED` — Manager rejected the request
- `CANCELLED` — Employee cancelled the request

#### LeaveBalanceStatus
States for leave balance records:
- `ACTIVE` — Balance is available for use
- `EXHAUSTED` — Balance has been fully consumed
- `FROZEN` — Balance is frozen and cannot be used

#### EmploymentStatus
Employee employment states:
- `ACTIVE` — Employee is actively working
- `ON_LEAVE` — Employee is currently on leave
- `TERMINATED` — Employee has been terminated

## Leave Management Module

### Domain Entities

**LeaveRequest** — Leave application submitted by an employee and processed by a manager.
- Attributes: id, employeeId, leaveType, startDate, endDate, status, reason, managerId, createdAt, updatedAt
- Status values: PENDING, APPROVED, REJECTED, CANCELLED (via `LeaveRequestStatus` enum)

**LeaveBalance** — Remaining leave entitlement per employee and leave type.
- Attributes: id, employeeId, leaveType, balance, fiscalYear, status
- Status values: ACTIVE, EXHAUSTED, FROZEN (via `LeaveBalanceStatus` enum)

**Employee** — Employee identity, manager relationship, and role information.
- Attributes: id, name, email, managerId, department, employmentStatus
- Employment status values: ACTIVE, ON_LEAVE, TERMINATED (via `EmploymentStatus` enum)

**LeavePolicy** — Leave entitlement rules per leave type.
- Attributes: id, leaveType, entitlementDays, carryOverLimit, requiresApproval
- Leave types: ANNUAL, SICK, EMERGENCY (via `LeaveType` enum)

**Notification** — Workflow notifications for employees and managers.
- Attributes: id, recipientId, type, title, message, status, createdAt

**AuditRecord** — Immutable audit trail for all state-changing operations.
- Attributes: id, entityType, entityId, action, actorEmployeeId, createdAt

### Module Ownership
- `src/modules/leave` owns LeaveRequest lifecycle and workflow coordination.
- `src/modules/balance` owns LeaveBalance management and adjustments.
- `src/modules/employee` owns Employee data and reporting relationships.
- `src/modules/policy` owns LeavePolicy entitlement rules.
- `src/modules/notification` owns workflow notifications.
- `src/modules/audit` owns audit record persistence.

### Dependency Direction
- leave → employee
- leave → policy
- leave → balance
- leave → notification
- leave → audit
- balance → employee
- balance → audit
- notification → audit

No reverse dependencies are permitted. The architecture must remain a modular monolith with an acyclic module graph.

### State Transitions
LeaveRequest status progression:
1. PENDING → APPROVED (by manager) — decrements LeaveBalance
2. PENDING → REJECTED (by manager) — no balance change
3. PENDING → CANCELLED (by employee) — no balance change
4. APPROVED → CANCELLED (by employee with manager approval) — restores balance

Every state-changing operation writes an AuditRecord.

### Transaction Semantics
All state-changing operations execute atomically within a single database transaction:
- Leave request creation with audit record
- Leave approval/rejection with balance adjustment, notification creation, and audit records
- Balance adjustments with audit records

### Database Schema

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    manager_id UUID REFERENCES employees(id),
    department VARCHAR(100),
    employment_date DATE NOT NULL
);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);

CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_type VARCHAR(20) UNIQUE NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    entitlement_days INTEGER NOT NULL CHECK (entitlement_days >= 0),
    carry_over_limit DECIMAL(5,1) NOT NULL DEFAULT 0,
    requires_approval BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    balance DECIMAL(5,2) NOT NULL DEFAULT 0,
    fiscal_year INTEGER NOT NULL,
    UNIQUE(employee_id, leave_type, fiscal_year)
);
CREATE INDEX idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_fiscal_year ON leave_balances(fiscal_year);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reason TEXT,
    manager_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_manager_id ON leave_requests(manager_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES employees(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);

CREATE TABLE audit_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor_employee_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_audit_records_entity ON audit_records(entity_type, entity_id);
```

### Cross-Cutting Rules
- All database access uses repository interfaces with PostgreSQL-backed implementations (GP-001).
- Every state-changing operation creates an AuditRecord (GP-002).
- API boundaries validate inputs (GP-003).
- Sensitive data is excluded from logs (GP-004).
- RBAC is enforced on all leave APIs (GP-005).
- Async errors are handled explicitly (GP-006).
