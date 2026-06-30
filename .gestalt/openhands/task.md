# Implement this phase: Phase 1: Shared enums and base domain types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/retry/8eda7d81-42f2-4025-b042-e343fea5de2a/1/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Build the leave management module for trackeros. Include: Employee entity, LeaveType and LeavePolicy configuration, LeaveRequest lifecycle (apply/approve/reject/cancel), LeaveBalance tracking with aut — Phase 1: Phase 1: Shared enums and base domain types]

Create the foundational shared types that all leave-management modules depend on.

Create `src/shared/types/leave.types.ts` with:
- Enum `LeaveStatus`: PENDING, APPROVED, REJECTED, CANCELLED, IN_PROGRESS, COMPLETED
- Enum `EmploymentStatus`: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE
- Enum `AuditAction`: CREATED, UPDATED, DELETED, APPROVED, REJECTED, CANCELLED, SUBMITTED
- Enum `NotificationType`: LEAVE_REQUEST_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED, BALANCE_UPDATED
- Enum `EntityType`: EMPLOYEE, LEAVE_TYPE, LEAVE_POLICY, LEAVE_REQUEST, LEAVE_BALANCE, AUDIT_LOG, NOTIFICATION

Create `src/shared/error.types.ts` with domain error classes:
- `NotFoundError` (extends Error, takes entityName: string, id: string)
- `ValidationError` (extends Error, takes message: string, details?: unknown[])
- `ConflictError` (extends Error, takes message: string)
- `UnauthorizedError` (extends Error, takes message: string)
- `ForbiddenError` (extends Error, takes message: string)

Include Jest unit tests in `tests/unit/shared/error.types.test.ts` covering each error class instantiation and property access.

Approximately 3 files.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: Employee domain model and repository: Create the Employee domain model and its repository together so Aider sees both the field definition
- Phase 3 — Phase 3: LeaveType and LeavePolicy domain models and repositories: Create the LeaveType and LeavePolicy domain models and their repositories together. Create `src/modu
- Phase 4 — Phase 4: LeaveBalance domain model and repository: Create the LeaveBalance domain model and repository together. Create `src/modules/balance/balance.mo
- Phase 5 — Phase 5: LeaveRequest domain model and repository: Create the LeaveRequest domain model and repository together. Create `src/modules/leave/leave.model.
- Phase 6 — Phase 6: AuditLog and Notification domain models and repositories: Create the AuditLog and Notification domain models and their repositories together. These are simple
- Phase 7 — Phase 7: Employee service, controller, and routes: Create the Employee service layer, controller, and Fastify routes. This phase makes the Employee mod
- Phase 8 — Phase 8: LeaveType and LeavePolicy services, controllers, and routes: Create the LeaveType and LeavePolicy service layers, controllers, and Fastify routes. These are conf
- Phase 9 — Phase 7: Employee service, controller, and routes: Create the Employee service layer, controller, and Fastify routes. This phase makes the Employee mod
- Phase 10 — Phase 9: Balance, Audit, and Notification services and routes: Create the service layers and Fastify routes for Balance, Audit, and Notification modules. These are

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.