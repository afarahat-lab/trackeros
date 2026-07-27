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
src/shared/types/    — shared type definitions and enums (LeaveStatus, LeaveType)
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

<!-- gestalt:architecture feature=51d3ecb7-2461-40e9-b3d1-5270f6b7a5f2 START -->
## Leave Management Module

### Overview
The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It follows a modular-monolith architecture with Fastify, TypeScript, and PostgreSQL.

### Domain Entities
- **LeaveRequest**: Represents an employee's leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED. Key attributes: employeeId, leaveTypeId, startDate, endDate, status, approvedBy, rejectedReason.
- **LeavePolicy**: Defines rules for a leave type (entitlement, approval requirement, notice period). Lifecycle: ACTIVE ↔ INACTIVE.
- **LeaveBalance**: Tracks an employee's entitlement, used, and remaining days per policy per fiscal year. Lifecycle: ACTIVE → CLOSED.
- **Employee**: Holds employment status and reporting line (managerId) for eligibility and approval routing. Lifecycle: ACTIVE → INACTIVE | TERMINATED.

### Business Rules (enforced in LeaveService)
- BR-001: Balance check on submission (remainingDays >= requested working days).
- BR-002: Atomic balance deduction on approval.
- BR-003: Atomic balance restoration on cancellation of an approved request.
- BR-004: Manager approval routing (escalation if no manager).
- BR-005: Only ACTIVE employees can submit.
- BR-006: Only ACTIVE policies can be referenced.

### Module Boundaries
- **Domain**: `leave-type`, `leave-status`, `leave-request`, `leave-balance`, `leave-policy`, `employee` — pure models and enums.
- **Data Access**: `leave-type-repository`, `leave-policy-repository`, `employee-repository`, `leave-request-repository`, `leave-balance-repository` — PostgreSQL-backed repositories implementing interfaces.
- **Infrastructure**: `audit-service` (GP-002), `notification-service`.
- **Application**: `leave-service` (orchestrates leave lifecycle), `balance-service` (manages balance operations).
- **Presentation**: `leave-routes` — Fastify routes with RBAC guards and input validation.

### Database Tables (Conceptual)
- `leave_types`: reference data for leave types.
- `leave_policies`: policy definitions per leave type.
- `employees`: employee master data with manager hierarchy.
- `leave_requests`: leave applications with status tracking.
- `leave_balances`: per-employee, per-policy, per-year balances.
- `audit_logs`: immutable audit trail for all state changes.

### Key Design Decisions
- LeaveType is an enum backed by a reference table for extensibility.
- LeaveRequest statuses: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED (no PENDING).
- LeaveBalance is scoped to (employee, policy, fiscalYear) with a unique constraint.
- Working-day calculation (excluding weekends/holidays) is a domain service.
- Auto-approval when `requiresManagerApproval` is false: DRAFT→SUBMITTED implicitly triggers APPROVED.
- All state-changing operations are audited via IAuditService.
- Routes enforce RBAC (GP-005) and validate inputs (GP-003).

### Dependencies
Dependencies flow inward: routes → services → repositories → models. No circular dependencies. Cross-cutting audit and notification are injected into services.
<!-- gestalt:architecture feature=51d3ecb7-2461-40e9-b3d1-5270f6b7a5f2 END -->
