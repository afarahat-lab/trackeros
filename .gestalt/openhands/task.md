# Implement this phase: Phase 2: Leave module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/0a43cce1-d400-4c5a-8276-13806d614206/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave module domain model and repository together in a single phase.

Files to create:
- src/modules/leave/leave.model.ts — Define `LeaveRequest` interface with all attributes: id, employeeId, leaveTypeId, startDate, endDate, reason, status (LeaveStatus), approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, cancellationReason, createdAt, updatedAt. Also define `CreateLeaveRequestDto` (employeeId, leaveTypeId, startDate, endDate, reason?), `UpdateLeaveRequestDto` (Partial of status/reason fields), and `LeaveRequestQueryParams` (filters for employeeId, status, date range).
- src/modules/leave/leave.repository.ts — Define `ILeaveRepository` interface with methods: findById, findByEmployeeId, findByStatus, create, update, delete. Implement `LeaveRepository` class using the pg pool from src/shared/db/connection.ts. The repository must import and use the types from leave.model.ts.

This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references LeaveType, LeaveStatus, etc. Also depends on src/shared/db/connection.ts (already exists).

Include Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.