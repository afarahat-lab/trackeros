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
