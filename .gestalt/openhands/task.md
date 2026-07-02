# Implement this phase: Phase 1: Shared leave type enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/a1401398-d02a-4c8c-8cf4-6dc7726785e7/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Build the leave management module. Employees apply for annual, sick, and emergency leave. Managers approve or reject. System tracks leave balances. — Phase 1: Phase 1: Shared leave type enums]

Create src/shared/types/leave.types.ts with the canonical enums: LeaveType (ANNUAL, SICK, EMERGENCY), LeaveStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), LeaveRequestStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), BalanceStatus (ACTIVE, EXHAUSTED, FROZEN), NotificationType, AuditAction, EntityType. Create src/shared/types/index.ts as a barrel re-export of leave.types.ts. These enums are the foundational shared types referenced by all downstream modules. No dependencies on other phases.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: Leave domain model and repository: Create src/modules/leave/leave.model.ts with TypeScript interfaces: LeaveRequest (id, employeeId, le
- Phase 3 — Phase 3: LeavePolicy domain model and repository: Create src/modules/policy/policy.model.ts with TypeScript interfaces: LeavePolicy (id, policyName, l
- Phase 4 — Phase 4: LeaveBalance domain model and repository: Create src/modules/balance/balance.model.ts with TypeScript interfaces: LeaveBalance (id, employeeId
- Phase 5 — Phase 5: Employee domain model and repository: Create src/modules/employee/employee.model.ts with TypeScript interfaces: Employee (id, firstName, l
- Phase 6 — Phase 6: LeavePolicy service: Create src/modules/policy/policy.service.interface.ts with IPolicyService interface declaring: getPo
- Phase 7 — Phase 7: LeaveBalance service: Create src/modules/balance/balance.service.interface.ts with IBalanceService interface declaring: ge
- Phase 8 — Phase 8: Leave application service: Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring: submitLe
- Phase 9 — Phase 9: Leave validation schemas: Create src/modules/leave/leave.validation.ts with Zod schemas: createLeaveRequestSchema (validates e
- Phase 10 — Phase 10: Leave controller and routes: Create src/modules/leave/leave.controller.ts with LeaveController class. Constructor injects ILeaveS

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.