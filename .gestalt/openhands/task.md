# Implement this phase: Phase 1: Shared leave domain types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/357a7337-e072-4b6f-8300-3faec0e7f1e5/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/leave.ts with three enums used across all leave modules:
- `LeaveType` enum: ANNUAL, SICK, EMERGENCY
- `LeaveRequestStatus` enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `BalanceStatus` enum: ACTIVE, EXHAUSTED, FROZEN

Also create src/shared/types/index.ts as a barrel re-export of leave.ts.

Include Jest unit tests in tests/unit/shared/types/ verifying each enum has the correct members.

No dependencies on prior phases — this is the foundation.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.