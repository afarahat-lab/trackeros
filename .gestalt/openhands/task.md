# Implement this phase: Phase 1: Shared types and base repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/3b9d4b24-2d52-49c2-a915-88d19149997b/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Build the leave management module for trackeros. Include: Employee entity, LeaveType and LeavePolicy configuration, LeaveRequest lifecycle (apply/approve/reject/cancel), LeaveBalance tracking with aut — Phase 1: Phase 1: Shared types and base repository]

Create src/shared/types/index.ts with EmploymentStatus enum (Active, Inactive, Terminated, OnLeave), LeaveStatus enum (Pending, Approved, Rejected, Cancelled), and BaseEntity interface (id: string, createdAt: Date, updatedAt: Date, deletedAt: Date | null). Create src/shared/base.repository.ts with an abstract BaseRepository<T> class providing common CRUD methods (findById, findAll, create, update, softDelete) using the pg Pool from src/shared/db/connection.ts. Include Jest unit tests in tests/unit/shared/.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: Employee module — model and repository: Create src/modules/employee/employee.model.ts with the Employee interface (id: string, employeeNumbe
- Phase 3 — Phase 3: LeaveType and LeavePolicy — models and repositories: Create src/modules/leaveType/leaveType.model.ts with LeaveType interface (code: string, label: strin
- Phase 4 — Phase 4: LeaveBalance — model and repository: Create src/modules/leaveBalance/leaveBalance.model.ts with LeaveBalance interface (id: string, emplo
- Phase 5 — Phase 5: LeaveRequest — model and repository: Create src/modules/leaveRequest/leaveRequest.model.ts with LeaveRequest interface (id: string, emplo
- Phase 6 — Phase 6: LeaveRequest service — business logic and validation: Create src/modules/leaveRequest/leaveRequest.service.interface.ts with ILeaveRequestService interfac
- Phase 7 — Phase 7: AuditLog module — model, repository, and service: Create src/modules/auditLog/auditLog.model.ts with AuditLog interface (id: string, entityType: strin
- Phase 8 — Phase 8: Notification module — model, repository, and service: Create src/modules/notification/notification.model.ts with Notification interface (id: string, recip
- Phase 9 — Phase 9: LeaveRequest routes and controller with RBAC: Create src/modules/leaveRequest/leaveRequest.controller.ts with LeaveRequestController class that de
- Phase 10 — Phase 10: LeaveBalance service — accrual and recalculation logic: Create src/modules/leaveBalance/leaveBalance.service.interface.ts with ILeaveBalanceService interfac

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.