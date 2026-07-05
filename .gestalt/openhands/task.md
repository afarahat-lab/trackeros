# Implement this phase: Phase 1: Shared type enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/769755ef-b2c0-4812-bb19-4f18553fbfd5/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/leave.types.ts with the canonical enums defined in ARCHITECTURE.md:

- `LeaveType` enum: ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, OTHER
- `LeaveStatus` enum: PENDING, APPROVED, REJECTED, CANCELLED
- `NotificationType` enum: LEAVE_REQUEST_CREATED, LEAVE_REQUEST_APPROVED, LEAVE_REQUEST_REJECTED, LEAVE_REQUEST_CANCELLED, LEAVE_BALANCE_LOW, LEAVE_BALANCE_EXPIRING
- `AuditAction` enum: CREATE, UPDATE, DELETE
- `EntityType` enum: LEAVE_REQUEST, LEAVE_BALANCE, LEAVE_POLICY, EMPLOYEE, NOTIFICATION

Include Jest unit tests in tests/unit/shared/types/leave.types.spec.ts verifying each enum has the correct members. This phase has no dependencies on any other phase — it is the foundation all other phases build on.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.