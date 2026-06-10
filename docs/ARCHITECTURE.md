# Architecture — leave-management

## Overview

A corporate leave management system. Employees apply for annual,
sick, and emergency leave. Managers approve or reject requests.
HR configures leave policies and views reports. The system enforces
leave balance limits and prevents overlapping requests.

## Stack

- Runtime: Node 22 LTS
- Language: TypeScript 5.x (strict mode)
- Package manager: npm
- Backend framework: Express 4
- Database: PostgreSQL (via `pg` driver, no ORM)
- Test framework: Jest + Supertest
- Auth: JWT (jsonwebtoken)

## Domain model

### Core entities
- **Employee** — id, name, email, role (employee | manager | hr), managerId
- **LeaveBalance** — employeeId, leaveType, totalDays, usedDays, year
- **LeaveRequest** — id, employeeId, type (annual|sick|emergency),
  startDate, endDate, status (pending|approved|rejected), managerId,
  managerComment, createdAt
- **LeavePolicy** — id, leaveType, defaultDaysPerYear, maxConsecutiveDays,
  requiresApproval, createdAt

### Business rules (enforced in service layer)
1. Leave balance must be sufficient before a request is approved
2. Overlapping leave requests for the same employee are rejected
3. Only the assigned manager can approve/reject a subordinate's request
4. HR can configure policies and view all requests
5. Emergency leave bypasses balance checks but still records usage

## Module structure
src/
modules/
leave/
leave.model.ts          ← TypeScript types/interfaces
leave.repository.ts     ← SQL queries, implements ILeaveRepository
leave.service.ts        ← business logic, balance enforcement
leave.routes.ts         ← Express router
leave.test.ts           ← Jest unit tests
employee/
employee.model.ts
employee.repository.ts
employee.service.ts
employee.routes.ts
policy/
policy.model.ts
policy.repository.ts
policy.service.ts
policy.routes.ts
balance/
balance.model.ts
balance.repository.ts
balance.service.ts
shared/
db/
connection.ts           ← pg Pool, single instance
base-repository.ts      ← shared query helpers
middleware/
auth.middleware.ts      ← JWT verification
role.middleware.ts      ← role-based access (employee|manager|hr)
error.middleware.ts     ← centralised error handler
types/
index.ts                ← shared types, enums, error classes
tests/
unit/                       ← service layer tests (mock repositories)
integration/                ← API tests using Supertest
LeaveRequest/             ← LeaveRequest module
CreateLeaveRequestDto/    — CreateLeaveRequestDto module
LeaveBalance/             — LeaveBalance module

## API surface (planned)
POST   /auth/login
GET    /employees/:id/balance
POST   /leave/requests             ← employee submits request
GET    /leave/requests             ← employee sees own; manager sees team
GET    /leave/requests/:id
PATCH  /leave/requests/:id/approve ← manager only
PATCH  /leave/requests/:id/reject  ← manager only
GET    /leave/calendar             ← team calendar view
GET    /reports/leave-summary      ← HR only
GET    /policies                   ← HR view
POST   /policies                   ← HR create
PATCH  /policies/:id               ← HR update

## Dependency rules

- Route handlers call services only — never repositories directly
- Services call repositories only — never `pg` directly
- No circular dependencies between modules
- All database access goes through the repository layer
- Error handling: services throw typed errors from `shared/types/index.ts`
  which the error middleware catches and maps to HTTP responses

## Version Endpoint

### Overview
A new endpoint to return the current application version from package.json.

### API Surface
GET /version  ← returns the current version of the application.

## Leave Management Module
This module allows employees to apply for various types of leave, while managers can approve or reject these requests. It enforces leave balance limits and prevents overlapping requests.

## Uptime Module

### Overview

A new module to provide an endpoint for system uptime.

### Endpoints

- GET /uptime: Returns the process uptime in seconds.

## Leave Management Module

### Overview
The leave management module allows employees to apply for various types of leave, while managers can approve or reject these requests. The system ensures that leave balances are tracked and that overlapping requests are prevented.

## Leave Management Module
This module allows employees to apply for various types of leave and enables managers to approve or reject these requests while tracking leave balances and policies.

## Leave Management Module
This module allows employees to apply for various types of leave, while enabling managers to approve or reject these requests. It ensures compliance with leave policies and maintains accurate leave balances.

## Leave Management Module
This module allows employees to apply for leave and managers to approve or reject requests, while tracking leave balances and enforcing policies.

## Leave Management Module
This module handles the leave request process, including submission, approval, and balance management for employees. It consists of the LeaveRequest, LeaveBalance, and LeavePolicy entities.

## Leave Management Module
This module handles leave requests, balances, and policies, ensuring compliance with business rules.

## Leave Management Module
This module handles leave requests, balances, and policies, allowing employees to apply for leave and managers to approve or reject requests.

## Leave Management Module
This module handles leave requests, balances, and policies for employees, managers, and HR.

## Leave Management Module
This module handles leave requests, balances, and policies for employees, managers, and HR.

## Leave Management Module
This module handles leave requests, balances, and policies for employees, managers, and HR.

## Leave Management Module
This module handles leave requests, balances, and policies for employees, managers, and HR.

## Leave Management Module
This module handles leave requests, balances, and policies for employees, managers, and HR.

## Leave Management Module
This module handles leave requests, balances, and policies for employees, managers, and HR.

## Leave Management Module
This module handles leave requests, balances, and policies for employees, managers, and HR.

## Feature: Leave Management Module

### Domain entities
- **Employee** — id, name, email, role, managerId. Represents leave applicants, managers, and HR users.
- **LeaveRequest** — id, employeeId, type, startDate, endDate, status, managerId, managerComment, createdAt. Represents the lifecycle of a leave application.
- **LeaveBalance** — employeeId, leaveType, totalDays, usedDays, year. Tracks entitlement and consumption by employee, leave type, and year.
- **LeavePolicy** — id, leaveType, defaultDaysPerYear, maxConsecutiveDays, requiresApproval, createdAt. Defines validation rules for leave types.

### Modules
- `src/modules/leave` owns leave request models, persistence, business workflow, HTTP routes, approval/rejection orchestration, and overlap validation.
- `src/modules/balance` owns leave balance models, persistence, balance availability checks, and usage recording.
- `src/modules/employee` owns employee lookup and manager-subordinate relationship validation.
- `src/modules/policy` owns leave policy lookup used during leave validation.
- `src/shared/db` owns the shared PostgreSQL connection foundation.
- `src/shared/middleware` owns authentication, authorization, and centralized error handling.
- `src/shared/types` owns shared enums, error classes, and cross-module primitive types.

### Dependency direction
- `src/modules/leave` may depend on `src/modules/balance`, `src/modules/employee`, `src/modules/policy`, `src/shared/middleware`, `src/shared/types`, and `src/shared/db`.
- `src/modules/balance`, `src/modules/employee`, and `src/modules/policy` may depend on `src/shared/types` and `src/shared/db`.
- Shared modules must not depend on feature modules.
- `src/modules/balance`, `src/modules/employee`, and `src/modules/policy` must not depend on `src/modules/leave`.

### Recommended phase sequence
1. Define leave and balance domain contracts.
2. Implement balance persistence and service foundation.
3. Implement leave request persistence.
4. Implement leave request service workflow.
5. Expose leave HTTP routes and middleware integration.
6. Add leave module tests.

## Leave Management Module Feature

### Domain entities
- **Employee** — id, name, email, role, managerId. Represents the requester or assigned manager.
- **LeaveRequest** — id, employeeId, type, startDate, endDate, status, managerId, managerComment, createdAt. Represents the leave application lifecycle.
- **LeaveBalance** — employeeId, leaveType, totalDays, usedDays, year. Tracks employee entitlement and usage.
- **LeavePolicy** — id, leaveType, defaultDaysPerYear, maxConsecutiveDays, requiresApproval, createdAt. Defines validation constraints for leave types.

### Module ownership
- `src/modules/leave` owns leave request models, persistence, service workflows, and HTTP routes.
- `src/modules/balance` owns balance models, persistence, availability checks, and usage updates.
- `src/modules/employee` owns employee lookup and manager-subordinate relationship validation.
- `src/modules/policy` owns leave policy lookup and configuration data.
- `src/shared/db` owns the PostgreSQL connection.
- `src/shared/base-repository.ts` owns shared repository query helpers.
- `src/shared/middleware` owns authentication, authorization, and error middleware.
- `src/shared/types` owns shared enums, request context types, and error classes.

### Dependency direction
- `src/modules/leave` may depend on `src/modules/balance`, `src/modules/employee`, `src/modules/policy`, `src/shared/middleware`, `src/shared/types`, and `src/shared/base-repository.ts`.
- `src/modules/balance`, `src/modules/employee`, and `src/modules/policy` may depend on `src/shared/base-repository.ts`.
- `src/shared/base-repository.ts` may depend on `src/shared/db`.
- `src/modules/balance`, `src/modules/employee`, and `src/modules/policy` must not depend on `src/modules/leave`.

### Recommended implementation sequence
1. Define shared domain contracts for leave requests.
2. Build leave request persistence.
3. Build balance integration for leave workflows.
4. Build leave service workflows.
5. Expose leave HTTP routes.
6. Add leave module tests.
