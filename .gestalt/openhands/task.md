# Implement this phase: Phase 1: Shared enums and base types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/ef3e388c-4f35-40d1-8fba-2cc36a91c777/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Build the leave management module for trackeros. Include: Employee entity, LeaveType and LeavePolicy configuration, LeaveRequest lifecycle (apply/approve/reject/cancel), LeaveBalance tracking with aut — Phase 1: Phase 1: Shared enums and base types]

Create src/shared/types/leave.types.ts with the following TypeScript enums: LeaveType (ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, OTHER), LeaveStatus (PENDING, APPROVED, REJECTED, CANCELLED), NotificationType (LEAVE_REQUEST_CREATED, LEAVE_REQUEST_APPROVED, LEAVE_REQUEST_REJECTED, LEAVE_REQUEST_CANCELLED, LEAVE_BALANCE_LOW, LEAVE_BALANCE_EXPIRING), AuditAction (CREATE, UPDATE, DELETE), EntityType (LEAVE_REQUEST, LEAVE_BALANCE, LEAVE_POLICY, EMPLOYEE, NOTIFICATION). No dependencies on any other project files.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: Employee model and repository: Create src/modules/employee/employee.model.ts with TypeScript interfaces: Employee (id: string, empl
- Phase 3 — Phase 3: LeaveType and LeavePolicy models and repository: Create src/modules/policy/policy.model.ts with TypeScript interfaces: LeaveType (id: string, code: L
- Phase 4 — Phase 4: LeaveRequest model and repository: Create src/modules/leave/leave.model.ts with TypeScript interfaces: LeaveRequest (id: string, employ
- Phase 5 — Phase 5: LeaveBalance model and repository: Create src/modules/balance/balance.model.ts with TypeScript interfaces: LeaveBalance (id: string, em
- Phase 6 — Phase 6: Employee service: Create src/modules/employee/employee.service.ts with IEmployeeService interface and EmployeeService 
- Phase 7 — Phase 7: Policy service: Create src/modules/policy/policy.service.ts with IPolicyService interface and PolicyService class. T
- Phase 8 — Phase 8: Balance service: Create src/modules/balance/balance.service.ts with IBalanceService interface and BalanceService clas
- Phase 9 — Phase 9: Notification and AuditLog internal services: Create src/modules/notification/notification.service.ts with INotificationService interface and Noti
- Phase 10 — Phase 10: Leave orchestration service, validation, controller, and routes: Create the leave module's orchestration layer in approximately 5 files. First, create src/modules/le

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.