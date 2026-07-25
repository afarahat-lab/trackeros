# Implement this phase: Phase 3: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/022f5981-2f89-498b-906d-0f2e5bf44abd/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/leavePolicy/leavePolicy.model.ts with the LeavePolicy interface (id: string, leaveTypeId: string, name: string, entitlementDaysPerYear: number, maxCarryForwardDays: number, minNoticeDays: number, maxConsecutiveDays: number | null, requiresApproval: boolean, effectiveFrom: Date, effectiveTo: Date | null, status: PolicyStatus, createdAt: Date, updatedAt: Date). Import PolicyStatus from src/shared/types/leave.enums.ts (Phase 1). Create src/modules/leavePolicy/leavePolicy.repository.ts with ILeavePolicyRepository interface and LeavePolicyRepository class using the pg Pool from src/shared/db/connection.ts. Methods: findAll, findById, findByLeaveTypeId, findActiveByLeaveTypeId. Create src/modules/leavePolicy/index.ts barrel export. Include Jest unit tests in tests/unit/modules/leavePolicy/leavePolicy.repository.test.ts mocking the pg pool. This phase depends on src/shared/types/leave.enums.ts from Phase 1 — read it before generating any code that references PolicyStatus.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Verify before you finish (MANDATORY)
The code you write MUST compile and its tests MUST pass — a compilation or type error must NEVER be left for CI to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`.
- Install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`) for the files this phase touches.
- FIX every compilation error, type error, and failing test you introduced — including in test files — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.