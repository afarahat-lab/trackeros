# Implement this phase: Phase 4: LeaveRequest model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/a88212d7-6a1c-4612-8a09-8a5db627b262/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/leave/leave.model.ts with the LeaveRequest interface, CreateLeaveRequestDto, UpdateLeaveRequestDto, and LeaveRequestQueryParams. LeaveRequest attributes: id, employeeId, leavePolicyId, startDate, endDate, reason, status (import LeaveRequestStatus from src/shared/types/leave.types.ts from Phase 1), approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, cancellationReason, createdAt, updatedAt. Also create src/modules/leave/leave.repository.ts with the ILeaveRepository interface declaring findByEmployeeId, findById, create, updateStatus, and findAll methods operating on LeaveRequest. Include Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts. This phase depends on src/shared/types/leave.types.ts from Phase 1, src/modules/policy/policy.model.ts from Phase 2, and src/modules/balance/balance.model.ts from Phase 3 — read them before generating any code that references their types.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.