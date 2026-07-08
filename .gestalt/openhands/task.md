# Implement this phase: Phase 1: Shared leave enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/a88212d7-6a1c-4612-8a09-8a5db627b262/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/leave.types.ts with the foundational enums used across all leave modules: LeaveType (ANNUAL, SICK, EMERGENCY), LeaveRequestStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and BalanceStatus (ACTIVE, EXHAUSTED, FROZEN). These are plain TypeScript enums with no external dependencies. Include Jest unit tests in tests/unit/shared/types/leave.types.test.ts to verify enum values.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.