# Implement this phase: Phase 1: Shared leave types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/0a43cce1-d400-4c5a-8276-13806d614206/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/leave.types.ts with all shared enums and types used across leave, balance, and policy modules:

- `LeaveType` enum: ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, OTHER
- `LeaveStatus` enum: PENDING, APPROVED, REJECTED, CANCELLED
- `LeaveBalanceStatus` enum: ACTIVE, EXHAUSTED, EXPIRED
- `EmploymentStatus` enum: ACTIVE, TERMINATED, ON_LEAVE
- `NotificationType` enum: LEAVE_REQUEST_CREATED, LEAVE_REQUEST_APPROVED, LEAVE_REQUEST_REJECTED, LEAVE_REQUEST_CANCELLED, LEAVE_BALANCE_LOW, LEAVE_BALANCE_EXPIRING
- `AuditAction` enum: CREATE, UPDATE, DELETE
- `EntityType` enum: LEAVE_REQUEST, LEAVE_BALANCE, LEAVE_POLICY, EMPLOYEE, NOTIFICATION

This file has zero dependencies on other project files. Include Jest unit tests in tests/unit/shared/types/leave.types.test.ts verifying each enum has the correct members.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.