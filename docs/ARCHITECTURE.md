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
