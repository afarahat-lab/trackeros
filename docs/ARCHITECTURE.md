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
src/modules/BaseEntity/    — BaseEntity module
src/modules/CreateLeaveRequestDto/    — CreateLeaveRequestDto module
src/modules/UpdateLeaveRequestDto/    — UpdateLeaveRequestDto module
src/modules/LeaveRequestQuery/    — LeaveRequestQuery module
src/modules/LeaveBalance/    — LeaveBalance module
src/modules/LeaveType/    — LeaveType module
src/modules/LeavePolicy/    — LeavePolicy module
src/modules/NotificationType/    — NotificationType module
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

## Leave Management Module
This module handles leave requests, approvals, and leave balance tracking for employees.

## Leave Management Module
This module handles leave requests, approvals, and leave balance tracking for employees.

## Leave Management Feature\n\n### Domain entities\n- LeaveRequest: leave applications submitted by employees and processed by managers.\n- LeaveBalance: remaining entitlement by employee and leave type.\n- Employee: employee identity and reporting hierarchy.\n- LeavePolicy: entitlement and leave-type rules.\n- Notification: leave workflow notifications.\n\n### Module ownership\n- src/modules/leave owns leave request workflows and approval state transitions.\n- src/modules/balance owns leave balance storage and adjustments.\n- src/modules/employee owns employee and manager relationship data.\n- src/modules/policy owns leave entitlement rules.\n- src/modules/notification owns leave-related notifications.\n\n### Dependency direction\n- leave -> employee\n- leave -> policy\n- leave -> balance\n- leave -> notification\n\nNo reverse dependencies are introduced, preserving an acyclic module graph.

## Leave Management Feature

### Domain entities
- LeaveRequest: leave applications submitted by employees and processed by managers.
- LeaveBalance: remaining entitlement by employee and leave type.
- Employee: employee identity and reporting hierarchy.
- LeavePolicy: entitlement and leave-type rules.
- Notification: leave workflow notifications.

### Module ownership
- src/modules/leave owns leave request workflows and approval state transitions.
- src/modules/balance owns leave balance storage and adjustments.
- src/modules/employee owns employee and manager relationship data.
- src/modules/policy owns leave entitlement rules.
- src/modules/notification owns leave-related notifications.

### Dependency direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification

No reverse dependencies are introduced, preserving an acyclic module graph.

## Leave Management Module

### Domain Entities
- LeaveRequest: id, employeeId, leaveType, startDate, endDate, status, approverEmployeeId, createdAt, updatedAt.
- LeaveBalance: employeeId, leaveType, remainingDays.
- Employee: id, managerId, name.
- LeavePolicy: id, leaveType, annualEntitlement.
- Notification: id, recipientEmployeeId, type, status, relatedLeaveRequestId, createdAt.

### Module Ownership
- src/modules/leave owns LeaveRequest lifecycle, submission, approval, rejection, and workflow orchestration.
- src/modules/balance owns LeaveBalance records and balance adjustments.
- src/modules/employee owns employee records and reporting hierarchy.
- src/modules/policy owns leave entitlement rules.
- src/modules/notification owns notification creation and delivery tracking.

### Dependency Direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification

No reverse dependencies are permitted. The architecture must remain a modular monolith with the leave module orchestrating workflows while dependent modules retain ownership of their data and business rules.

### Supported Leave Types
- ANNUAL
- SICK
- EMERGENCY

### Leave Request Statuses
- PENDING
- APPROVED
- REJECTED

## Leave Management Module

### Domain Entities
- LeaveRequest: id, employeeId, leaveType, startDate, endDate, status, approverEmployeeId, createdAt.
- LeaveBalance: employeeId, leaveType, availableDays.
- Employee: id, managerId, name.
- LeavePolicy: id, leaveType, annualEntitlement.
- Notification: id, recipientEmployeeId, type, status.

### Module Ownership
- src/modules/leave owns leave request creation, approval, rejection, and status transitions.
- src/modules/balance owns leave balance storage and adjustments.
- src/modules/employee owns employee records and manager relationships.
- src/modules/policy owns leave entitlement policies.
- src/modules/notification owns notification records and delivery tracking.

### Dependency Direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification

No reverse dependencies into the leave module are permitted. This preserves modular-monolith boundaries and avoids circular dependencies.

### Implementation Sequence
1. Define Leave Domain Models and Repository Layer.
2. Implement Leave Application Workflow.
3. Implement Approval and Rejection Workflow.
4. Expose Fastify API Endpoints.

## Leave Management Module

### Domain Entities
- LeaveRequest: id, employeeId, leaveType, startDate, endDate, status.
- LeaveBalance: employeeId, leaveType, availableDays.
- Employee: id, managerId, status.
- LeavePolicy: id, leaveType, annualEntitlement.
- Notification: id, recipientEmployeeId, type, status.

### Module Ownership
- src/modules/leave owns LeaveRequest data and leave workflow state transitions.
- src/modules/balance owns LeaveBalance data and balance calculations.
- src/modules/employee owns Employee data and reporting relationships.
- src/modules/policy owns LeavePolicy data and validation rules.
- src/modules/notification owns Notification records and delivery tracking.

### Dependency Direction
- src/modules/leave -> src/modules/employee
- src/modules/leave -> src/modules/policy
- src/modules/leave -> src/modules/balance
- src/modules/leave -> src/modules/notification

No reverse dependencies are permitted. The modular-monolith structure must remain acyclic with the leave module orchestrating cross-module workflow operations.

## Leave Management Module

### Domain Entities
- LeaveRequest: id, employeeId, leaveType, startDate, endDate, status.
- LeaveBalance: employeeId, leaveType, availableDays.
- Employee: id, managerId, status.
- LeavePolicy: id, leaveType, annualEntitlement.
- Notification: id, recipientEmployeeId, type, status.

### Modules
- src/modules/employee owns Employee and manager relationships.
- src/modules/policy owns LeavePolicy and entitlement rules.
- src/modules/balance owns LeaveBalance, balance initialization, balance updates, and balance queries.
- src/modules/leave owns LeaveRequest submission and approval lifecycle.
- src/modules/notification owns Notification creation and delivery status tracking.

### Dependency Direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification

No reverse dependencies are permitted to avoid circular module relationships.

### Lifecycle Coverage
- LeaveRequest state transitions: submitLeaveRequest() creates PENDING requests; approveLeaveRequest() transitions to APPROVED; rejectLeaveRequest() transitions to REJECTED.
- LeaveBalance mutations: initialize balance records and update balances during leave approval processing.
- Notification lifecycle: createNotification() creates notifications; markNotificationDelivered() updates notification status.

Architecture Style: modular-monolith using TypeScript, Node.js 20, Fastify, PostgreSQL, React Native, npm, and Vitest. Modules: src/modules/employee owns Employee data and manager relationships; src/modules/policy owns LeavePolicy rules; src/modules/balance owns LeaveBalance storage and adjustments; src/modules/leave owns LeaveRequest lifecycle including submitLeaveRequest, approveLeaveRequest, and rejectLeaveRequest; src/modules/notification owns Notification records generated by workflow events. Dependency direction is leave -> employee, leave -> policy, leave -> balance, and leave -> notification. No reverse dependencies are permitted. LeaveRequest lifecycle states are Pending, Approved, and Rejected. Balance deductions occur only during approveLeaveRequest. Notifications are created on submission, approval, and rejection events.

## Leave Management Module

### Domain Entities
- LeaveRequest(id, employeeId, leaveType, startDate, endDate, status)
- LeaveBalance(employeeId, leaveType, availableDays)
- Employee(id, managerId, role)
- LeavePolicy(id, leaveType, annualEntitlement)
- Notification(id, recipientEmployeeId, type, status)
- AuditRecord(id, entityType, entityId, action, createdAt)

### Modules
- src/modules/leave owns leave request workflow and state transitions.
- src/modules/balance owns leave balance data and adjustments.
- src/modules/employee owns employee and manager relationship data.
- src/modules/policy owns leave entitlement rules.
- src/modules/notification owns workflow notifications.
- src/modules/audit owns audit record persistence.

### Dependency Direction
- src/modules/leave -> src/modules/employee
- src/modules/leave -> src/modules/policy
- src/modules/leave -> src/modules/balance
- src/modules/leave -> src/modules/notification
- src/modules/leave -> src/modules/audit

### Architectural Constraints
- Modular-monolith architecture.
- TypeScript on Node.js 20.
- Fastify for API endpoints.
- PostgreSQL persistence accessed only through repository interfaces and PostgreSQL-backed implementations.
- All state-changing operations create AuditRecord entries.
- All API inputs are validated before processing.
- RBAC is enforced on every API endpoint.
- All asynchronous operations handle errors explicitly.
- React Native frontend consumes Fastify APIs.

## Leave Management Module

### Domain Entities
- LeaveRequest: id, employeeId, leaveType, startDate, endDate, status.
- LeaveBalance: employeeId, leaveType, remainingDays.
- Employee: id, managerId, role.
- LeavePolicy: id, leaveType, annualEntitlement.
- Notification: id, recipientEmployeeId, type, status.
- AuditRecord: id, entityType, entityId, action, createdAt.

### Modules
- src/modules/leave owns leave request lifecycle and status transitions.
- src/modules/balance owns leave entitlement tracking and adjustments.
- src/modules/employee owns employee hierarchy and role data.
- src/modules/policy owns leave eligibility and entitlement rules.
- src/modules/notification owns workflow notifications.
- src/modules/audit owns audit record persistence.

### Dependency Direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification
- leave -> audit
- balance -> audit
- notification -> audit

### Required State Transitions
- LeaveRequest: create -> approved, create -> rejected, create -> cancelled.
- Approval consumes leave balance.
- Rejection and cancellation restore reserved or consumed balance as applicable.
- Every state-changing operation writes an AuditRecord.

### Architectural Constraints
- Use repository interfaces with PostgreSQL-backed implementations for all database access.
- Enforce RBAC on all API endpoints.
- Validate all API inputs before processing.
- Catch and handle all async errors.
- Do not log sensitive data.

## Leave Management Module

### Domain Entities
- LeaveRequest: employee leave application.
- LeaveBalance: remaining leave entitlement by employee and leave type.
- Employee: employee identity, manager relationship, and role information.
- LeavePolicy: leave entitlement rules.
- Notification: workflow notifications.
- AuditRecord: audit trail for all state-changing operations.

### Leave Types
- ANNUAL
- SICK
- EMERGENCY

### Leave Request Statuses
- PENDING
- APPROVED
- REJECTED

### Relationships
- LeaveRequest.employeeId references Employee.id.
- Employee.managerId references Employee.id.
- LeaveBalance is maintained per Employee and leave type.
- LeavePolicy defines entitlement rules for a leave type.
- Notification is generated from LeaveRequest workflow events.
- AuditRecord is written for every LeaveRequest and LeaveBalance state-changing operation.

### Modules
- src/modules/leave owns LeaveRequest lifecycle and approval workflow.
- src/modules/balance owns LeaveBalance management.
- src/modules/employee owns employee and manager relationships.
- src/modules/policy owns leave entitlement rules.
- src/modules/notification owns workflow notifications.
- src/modules/audit owns audit record persistence.

### Dependency Direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification
- leave -> audit

## Leave Management Module

### Domain Entities
- LeaveRequest(id, employeeId, leaveType, startDate, endDate, status)
- LeaveBalance(employeeId, leaveType, remainingDays)
- Employee(id, managerId, role)
- LeavePolicy(id, leaveType, annualEntitlement)
- Notification(id, recipientEmployeeId, type, status)
- AuditRecord(id, entityType, entityId, action, actorEmployeeId, createdAt)

### Leave Types
- ANNUAL
- SICK
- EMERGENCY

### LeaveRequest Lifecycle
- PENDING: created by submitLeaveRequest
- APPROVED: reached through approveLeaveRequest
- REJECTED: reached through rejectLeaveRequest

### Module Ownership
- src/modules/leave owns leave request lifecycle and workflow coordination.
- src/modules/balance owns leave balance records and adjustments.
- src/modules/employee owns reporting relationships and role data.
- src/modules/policy owns leave entitlement rules.
- src/modules/notification owns workflow notifications.
- src/modules/audit owns audit record persistence.

### Dependency Direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification
- leave -> audit

### Cross-Cutting Rules
- All database access uses repository interfaces with PostgreSQL-backed implementations.
- Every state-changing operation creates an AuditRecord.
- API boundaries validate inputs.
- RBAC is enforced on all leave APIs.
- Sensitive data is excluded from logs.
- Async errors are handled explicitly.

## Leave Management Module

### Domain Entities
- LeaveRequest: leave application submitted by an employee.
- LeaveBalance: remaining leave entitlement per employee and leave type.
- LeavePolicy: entitlement and validation rules for leave types.
- LeaveAuditRecord: immutable audit history for leave workflow actions.
- Notification: workflow notification delivered to employees or managers.

### LeaveRequest Status Values
- PENDING: initial state after submission.
- APPROVED: manager approved the request.
- REJECTED: manager rejected the request.
- CHANGES_REQUESTED: manager requested modifications before approval.

### LeaveAuditRecord Action Values
- SUBMITTED
- APPROVED
- REJECTED
- CHANGES_REQUESTED

### Module Ownership
- src/modules/leave owns LeaveRequest, LeaveAuditRecord, workflow state transitions, and approval actions.
- src/modules/balance owns LeaveBalance and balance adjustments.
- src/modules/employee owns employee identity, manager relationships, and roles.
- src/modules/policy owns leave entitlement rules.
- src/modules/notification owns workflow notifications.

### Dependency Direction
- leave -> employee
- leave -> policy
- leave -> balance
- leave -> notification

### Workflow Rules
- Employees submit leave requests.
- Managers approve, reject, or request changes.
- Approval decrements LeaveBalance.
- Every LeaveRequest state change creates a LeaveAuditRecord.
- All database access follows the repository pattern.
- API endpoints require validation, RBAC enforcement, and safe error handling.

Add leave management domain.

Entities:
- LeaveRequest(id, employeeId, leaveType, status)
- LeaveBalance(employeeId, leaveType, remainingDays)
- Employee(id, managerId, role)
- LeavePolicy(id, leaveType, annualEntitlement)
- Notification(id, recipientEmployeeId, type, status)
- AuditRecord(id, entityType, entityId, action)

LeaveRequest statuses:
- PENDING
- APPROVED
- REJECTED

Supported leave types:
- ANNUAL
- SICK
- EMERGENCY

Relationships:
- Employee submits many LeaveRequest records.
- Employee may reference a manager through managerId.
- LeaveBalance belongs to an Employee and leave type.
- LeavePolicy defines entitlement for a leave type.
- Notification targets an Employee.
- AuditRecord tracks mutations across leave management entities.

Repository pattern requirement:
- All PostgreSQL access must occur through repository interfaces with concrete PostgreSQL repository implementations.

SQL Schema:

CREATE TABLE employees (
  id UUID PRIMARY KEY,
  manager_id UUID NULL,
  role VARCHAR(50) NOT NULL,
  CONSTRAINT fk_employee_manager FOREIGN KEY (manager_id) REFERENCES employees(id)
);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);

CREATE TABLE leave_policies (
  id UUID PRIMARY KEY,
  leave_type VARCHAR(20) NOT NULL UNIQUE,
  annual_entitlement INTEGER NOT NULL CHECK (annual_entitlement >= 0)
);

CREATE TABLE leave_balances (
  employee_id UUID NOT NULL,
  leave_type VARCHAR(20) NOT NULL,
  remaining_days INTEGER NOT NULL CHECK (remaining_days >= 0),
  PRIMARY KEY (employee_id, leave_type),
  CONSTRAINT fk_leave_balances_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);
CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  leave_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  recipient_employee_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  CONSTRAINT fk_notifications_employee FOREIGN KEY (recipient_employee_id) REFERENCES employees(id)
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_employee_id);

CREATE TABLE audit_records (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL
);
CREATE INDEX idx_audit_records_entity ON audit_records(entity_type, entity_id);

## Leave Management — Extended Domain Concepts

### LeaveRequest state machine
- **PENDING** → **APPROVED** (via manager approval)
- **PENDING** → **REJECTED** (via manager rejection)

### Enumerations introduced
- **LeaveType**: `ANNUAL`, `SICK`, `EMERGENCY`
- **LeaveStatus**: `PENDING`, `APPROVED`, `REJECTED`

### Cross-module relationships
- `LeaveRequest` references `Employee` (submitter) and `Employee` (reviewer).
- `LeaveRequest` references `LeavePolicy` to validate entitlement.
- An approved `LeaveRequest` causes `LeaveBalance` to be decremented by the `leave` module via the `balance` module's public interface.
- `LeaveRequest` state changes publish `Notification` events through the `notification` module.
- All mutating operations on `LeaveRequest` produce an audit record per GP-002.

## Leave Management Module

### Domain Entities

**LeaveRequest**
- Represents a leave application submitted by an employee
- Tracks lifecycle from submission through approval/rejection
- Attributes: id, employeeId, leaveType, startDate, endDate, status, reason, managerId, createdAt, updatedAt
- Status values: PENDING, APPROVED, REJECTED, CANCELLED

**LeaveBalance**
- Tracks remaining leave entitlement for an employee by leave type and fiscal year
- Attributes: id, employeeId, leaveType, balance, fiscalYear

**Employee**
- Represents an employee identity and reporting hierarchy
- Attributes: id, name, email, managerId, department

**LeavePolicy**
- Defines rules and entitlements for each type of leave
- Attributes: id, leaveType, entitlementDays, carryOverLimit, requiresApproval
- Leave types: ANNUAL, SICK, EMERGENCY

**Notification**
- Represents notifications sent to users about leave workflow events
- Attributes: id, userId, type, title, message, read, createdAt

### Module Dependencies

- `leave` module depends on: `employee`, `policy`, `balance`, `notification`
- `balance` module depends on: `employee`, `policy`
- `notification` module depends on: `employee`

### Database Schema

sql
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

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    balance DECIMAL(5,1) NOT NULL DEFAULT 0,
    fiscal_year INTEGER NOT NULL,
    UNIQUE(employee_id, leave_type, fiscal_year)
);

CREATE INDEX idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_fiscal_year ON leave_balances(fiscal_year);

CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_type VARCHAR(20) UNIQUE NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    entitlement_days DECIMAL(5,1) NOT NULL,
    carry_over_limit DECIMAL(5,1) NOT NULL DEFAULT 0,
    requires_approval BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);


### Transaction Semantics

All state-changing operations in the leave management module execute atomically within a single database transaction. This includes:
- Leave request creation with audit record
- Leave approval/rejection with balance adjustment, notification creation, and audit records
- Balance adjustments with audit records
- Notification creation as part of workflow events

### Lifecycle States

LeaveRequest status progression:
1. PENDING - Initial state when request is submitted
2. APPROVED - Manager approves the request
3. REJECTED - Manager rejects the request
4. CANCELLED - Employee cancels a pending request

State transitions are managed through dedicated service methods with proper validation and audit logging.

## Leave Management Module

This module handles leave requests, approvals, and leave balance tracking for employees.

### Domain Entities
- **LeaveRequest**: Represents leave applications with attributes: id, employeeId, leaveType, startDate, endDate, status, reason, managerId, createdAt, updatedAt
- **LeaveBalance**: Tracks remaining entitlement with attributes: id, employeeId, leaveType, balance, fiscalYear
- **Employee**: Employee identity and reporting hierarchy (owned by employee module)
- **LeavePolicy**: Defines entitlement rules (owned by policy module)
- **Notification**: Leave workflow notifications (owned by notification module)

### Module Dependencies
- `leave` → `employee` (for employee data and manager relationships)
- `leave` → `policy` (for leave type validation and entitlement rules)
- `leave` → `balance` (for balance checks and updates)
- `leave` → `notification` (for workflow notifications)
- `balance` → `employee` (for employee references)
- `balance` → `policy` (for policy references)

### Key Workflows
1. Employee submits leave request with validation against policy and available balance
2. Request routes to appropriate manager based on employee's reporting hierarchy
3. Manager approves/rejects request, triggering balance updates and notifications
4. All state changes generate audit records
5. RBAC ensures only authorized users can perform actions

### Database Tables
See per-phase designs for exact SQL schemas.

### State Transitions
LeaveRequest.status follows: `PENDING` → `APPROVED`/`REJECTED` → `CANCELLED` (optional)

### Cross-Cutting Concerns
- All operations follow repository pattern (GP-001)
- All state changes generate audit records (GP-002)
- Input validation at API boundaries (GP-003)
- No sensitive data in logs (GP-004)
- RBAC enforced on all endpoints (GP-005)
- Proper error handling (GP-006)

## Leave Management Module

### Domain Entities

**LeaveRequest**
- Represents a leave application submitted by an employee
- Attributes: id, employeeId, leaveType, startDate, endDate, status, reason, managerId, createdAt, updatedAt
- Status values: PENDING, APPROVED, REJECTED, CANCELLED

**LeaveBalance**
- Tracks remaining leave entitlement by employee and leave type
- Attributes: id, employeeId, leaveType, balance, fiscalYear

**LeavePolicy**
- Defines entitlement rules and leave-type configurations
- Attributes: id, leaveType, entitlementDays, carryOverLimit, requiresApproval
- Leave types: ANNUAL, SICK, EMERGENCY

### Module Dependencies

- `leave` module depends on: `employee`, `policy`, `balance`, `notification`
- `balance` module depends on: `policy`
- `notification` module depends on: `employee`

### Lifecycle States

LeaveRequest status transitions:
1. PENDING → APPROVED (by manager)
2. PENDING → REJECTED (by manager)
3. PENDING → CANCELLED (by employee)
4. APPROVED → CANCELLED (by employee with manager approval)

### Transaction Semantics

- Leave request creation: Atomic transaction creating LeaveRequest and audit record
- Leave request approval: Atomic transaction updating LeaveRequest status and LeaveBalance
- Balance adjustments: Always executed within repository transactions
- Notifications: Sent after successful transaction commit

### SQL Schema

sql
-- LeaveRequest table
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

-- LeaveBalance table
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

-- LeavePolicy table
CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_type VARCHAR(20) UNIQUE NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    entitlement_days DECIMAL(5,2) NOT NULL,
    carry_over_limit DECIMAL(5,2) NOT NULL DEFAULT 0,
    requires_approval BOOLEAN NOT NULL DEFAULT true
);

-- Notification table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

## Leave Management Module

### Domain Entities

**LeaveRequest** - Represents a leave application submitted by an employee and processed by a manager.
- **Lifecycle States**: PENDING, APPROVED, REJECTED, CANCELLED
- **Attributes**: id, employeeId, leaveType, startDate, endDate, status, reason, managerId, createdAt, updatedAt

**LeaveBalance** - Tracks remaining leave entitlement by employee and leave type.
- **Attributes**: id, employeeId, leaveType, balance, fiscalYear

**Employee** - Employee identity and reporting hierarchy for leave approval workflow.
- **Attributes**: id, name, email, managerId, department, employmentDate

**LeavePolicy** - Defines entitlement rules and leave-type configurations.
- **Leave Types**: ANNUAL, SICK, EMERGENCY
- **Attributes**: id, leaveType, entitlementDays, carryOverLimit, requiresApproval

**Notification** - Leave workflow notifications for employees and managers.
- **Types**: LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, BALANCE_LOW
- **Statuses**: PENDING, SENT, FAILED
- **Attributes**: id, recipientId, type, title, body, metadata, status, createdAt

### Module Dependencies

- `leave` module depends on: `employee`, `policy`, `balance`, `notification`
- All other modules are independent

### Transaction Semantics

1. **Leave Request Creation**: Atomic transaction covering leave request creation, balance deduction, and audit logging.
2. **Leave Approval/Rejection**: Atomic transaction covering status update, balance restoration (if rejected), and audit logging.
3. **Balance Adjustments**: Separate transactions with compensating actions for rollback.
4. **Notifications**: Separate transaction after primary operation commits to ensure eventual delivery.

### Database Schema

sql
-- Leave Requests
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

-- Leave Balances
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    balance DECIMAL(5,1) NOT NULL DEFAULT 0,
    fiscal_year INTEGER NOT NULL,
    UNIQUE(employee_id, leave_type, fiscal_year)
);

CREATE INDEX idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_fiscal_year ON leave_balances(fiscal_year);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    manager_id UUID REFERENCES employees(id),
    department VARCHAR(100),
    employment_date DATE NOT NULL
);

CREATE INDEX idx_employees_manager_id ON employees(manager_id);

-- Leave Policies
CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_type VARCHAR(20) UNIQUE NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'EMERGENCY')),
    entitlement_days INTEGER NOT NULL CHECK (entitlement_days >= 0),
    carry_over_limit DECIMAL(5,1) NOT NULL DEFAULT 0,
    requires_approval BOOLEAN NOT NULL DEFAULT true
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES employees(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);

## Leave Management Module

### Domain Entities

**LeaveRequest**
- Represents a leave application submitted by an employee
- Status values: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
- Links to employee, manager, and leave type

**LeaveBalance**
- Tracks remaining leave entitlement per employee per fiscal year
- Updated when leave is approved or cancelled

**Employee**
- Employee identity and reporting hierarchy
- Used for routing leave requests to managers

**LeavePolicy**
- Defines rules for each leave type
- Includes entitlement days, carry-over limits, and approval requirements

**Notification**
- Leave workflow notifications for employees and managers
- Types: `LEAVE_SUBMITTED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, `BALANCE_UPDATED`

### Module Dependencies

- `leave` module depends on: `employee`, `policy`, `balance`, `notification`
- No circular dependencies between modules

### Lifecycle States

**LeaveRequest Status Transitions**
1. `PENDING` → `APPROVED` (via manager approval)
2. `PENDING` → `REJECTED` (via manager rejection)
3. `PENDING` → `CANCELLED` (via employee cancellation)
4. `APPROVED` → `CANCELLED` (via employee cancellation)

**Notification States**
- `read`: boolean flag indicating if notification has been viewed

### Database Schema

sql
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reason TEXT,
    manager_id UUID NOT NULL REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL,
    balance DECIMAL(5,2) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    UNIQUE(employee_id, leave_type, fiscal_year)
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    manager_id UUID REFERENCES employees(id),
    department VARCHAR(100)
);

CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_type VARCHAR(50) UNIQUE
