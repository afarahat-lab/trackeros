# Implement this phase: Phase 1: Foundational domain types — enums and BaseEntity

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/aed53b05-0674-4319-9381-721f5b565cbe/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Build the leave management module. Employees apply for annual, sick, and emergency leave. Managers approve or reject. System tracks leave balances. — Phase 1: Phase 1: Foundational domain types — enums and BaseEntity]

Create the foundational domain types that all other modules depend on. No prior phase dependencies.

Create these files:

1. `src/modules/BaseEntity/BaseEntity.model.ts` — Define and export the `BaseEntity` interface with fields: `id: string`, `createdAt: Date`, `updatedAt: Date`. This is the base interface that LeaveRequest, Employee, and LeavePolicy will extend.

2. `src/modules/BaseEntity/index.ts` — Barrel export re-exporting `BaseEntity` from `./BaseEntity.model`.

3. `src/modules/LeaveStatus/LeaveStatus.model.ts` — Define and export the `LeaveRequestStatus` enum with members: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

4. `src/modules/LeaveStatus/index.ts` — Barrel export re-exporting `LeaveRequestStatus` from `./LeaveStatus.model`.

5. `src/modules/LeaveType/LeaveType.model.ts` — Define and export the `LeaveType` enum with members: `ANNUAL`, `SICK`, `EMERGENCY`.

Include Jest unit tests in `tests/unit/modules/BaseEntity/`, `tests/unit/modules/LeaveStatus/`, and `tests/unit/modules/LeaveType/` verifying the enum values and interface shape.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: Employee domain model and repository: Create the Employee domain model and repository. This phase depends on `src/modules/BaseEntity/BaseE
- Phase 3 — Phase 3: LeavePolicy domain model and repository: Create the LeavePolicy domain model and repository. This phase depends on `src/modules/BaseEntity/Ba
- Phase 4 — Phase 4: LeaveRequest domain model and repository: Create the LeaveRequest domain model and repository — the central aggregate root for the leave manag
- Phase 5 — Phase 5: Leave service — apply, approve, reject, cancel: Create the leave service with core business logic for applying, approving, rejecting, and cancelling
- Phase 6 — Phase 6: Leave controller and Fastify routes: Create the leave controller and Fastify route registration for the leave management HTTP API. This p
- Phase 7 — Phase 7: Database migrations for all leave management tables: Create Knex database migration files for all tables needed by the leave management module. This phas
- Phase 8 — Phase 8: LeaveBalance domain model and repository: Create the LeaveBalance domain model and repository for tracking employee leave balances per leave t
- Phase 9 — Phase 9: Balance service — entitlement calculation and deduction on approval: Create the balance service that calculates leave entitlements and deducts used days when leave is ap
- Phase 10 — Phase 10: Balance routes and leave-balance integration endpoints: Create the balance controller and Fastify routes, and add balance-related endpoints. Also add a leav

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.