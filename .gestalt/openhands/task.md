# Implement this phase: Phase 1: Shared enums and base types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/81628c0a-ef34-4e4d-a695-ae6c61db7b5f/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/index.ts with the canonical enums: LeaveType (values: ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and EmploymentStatus (values: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE). These enums are referenced by all downstream domain models. Include Jest unit tests in tests/unit/shared/types/types.test.ts verifying each enum has the correct members.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.