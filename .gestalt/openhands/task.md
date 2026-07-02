# Implement this phase: Phase 1: Shared leave type enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/fbb3e9ec-0d7e-4b6f-9d54-b4ea857b1465/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Build the leave management module. Employees apply for annual, sick, and emergency leave. Managers approve or reject. System tracks leave balances. — Phase 1: Phase 1: Shared leave type enums]

Create src/shared/types/index.ts with three canonical enums:

- `LeaveType` enum with values: ANNUAL, SICK, EMERGENCY
- `LeaveRequestStatus` enum with values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, REVOKED
- `BalanceStatus` enum with values: ACTIVE, EXHAUSTED, FROZEN

These are the foundational types referenced by all downstream domain models (LeavePolicy, LeaveRequest, LeaveBalance). No other files exist yet — this is the first phase. Include a Jest unit test at tests/unit/shared/types.spec.ts that verifies enum value membership.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: LeavePolicy model and repository: Create src/modules/policy/policy.model.ts with the LeavePolicy interface containing all canonical at
- Phase 3 — Phase 3: LeaveRequest model and repository: Create src/modules/leave/leave.model.ts with the LeaveRequest interface containing all canonical att
- Phase 4 — Phase 4: LeaveBalance model and repository: Create src/modules/balance/balance.model.ts with the LeaveBalance interface containing all canonical
- Phase 5 — Phase 5: LeavePolicy service: Create src/modules/policy/policy.service.interface.ts with IPolicyService interface declaring: getPo
- Phase 6 — Phase 6: Leave application service: Create src/modules/leave/leave.service.interface.ts with ILeaveService interface declaring: submitLe
- Phase 7 — Phase 7: Policy routes: Create src/modules/policy/policy.routes.ts with Fastify route handlers for the policy CRUD surface. 
- Phase 8 — Phase 8: Leave routes: Create src/modules/leave/leave.routes.ts with Fastify route handlers for the leave request lifecycle
- Phase 9 — Phase 9: Balance service and routes: Create src/modules/balance/balance.service.interface.ts with IBalanceService interface declaring: ge
- Phase 10 — Phase 10: Database migrations for leave domain tables: Create Knex migration files for the three leave domain tables. Set up the Knex configuration if not

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.