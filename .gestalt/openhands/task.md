# Implement this phase: Phase 1: Shared enums and base repository interface

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e52e7dc9-5a2d-453b-b5a3-9d187c6021f7/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/leave.types.ts with TypeScript enums: LeaveType (ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), LeaveBalanceStatus (ACTIVE, EXHAUSTED, EXPIRED), EmployeeStatus (ACTIVE, ON_LEAVE, INACTIVE, PROBATION). Also create src/shared/base-repository.ts with a generic IBaseRepository<T> interface defining findById, findAll, create, update, delete method signatures. Include Jest unit tests in tests/unit/shared/ that verify enum values and that the base repository interface is structurally sound. This phase has no dependencies on prior phases — only on the existing src/shared/db/connection.ts for the db pool type reference.

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