# Implement this phase: Phase 1: Shared enums and base types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/90e4805a-61d0-468c-987a-e8a6d4d1c968/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/leave.enums.ts with three enums: LeaveType (ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and BalanceStatus (ACTIVE, EXHAUSTED, EXPIRED). Create or update src/shared/types/index.ts to re-export all three enums. No existing files are dependencies — this is the foundational phase. Include Jest unit tests in tests/unit/shared/types/ verifying enum values.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.