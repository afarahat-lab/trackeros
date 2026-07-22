# Implement this phase: Phase 1: Domain model, validation schemas, and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c243fe87-8f44-48cb-bfdd-495fbcb59c13/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/leave/leave.model.ts with:
- LeaveRequestStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED)
- LeaveType enum (annual, sick, emergency, unpaid, maternity, paternity)
- LeaveRequest interface with all fields: id, employeeId, leaveTypeId, startDate, endDate, daysRequested, reason, status, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, createdAt, updatedAt
- CreateLeaveRequestDto interface (employeeId, leaveTypeId, startDate, endDate, reason)
- UpdateLeaveRequestDto interface (startDate, endDate, reason — all optional)
- LeaveRequestQueryParams interface (status, leaveTypeId, startDateFrom, startDateTo, endDateFrom, endDateTo, limit, offset — all optional)

Create src/modules/leave/leave.validation.ts with Zod schemas:
- createLeaveRequestSchema validating CreateLeaveRequestDto
- updateLeaveRequestSchema validating UpdateLeaveRequestDto
- leaveRequestQuerySchema validating LeaveRequestQueryParams

Create src/modules/leave/leave.repository.ts with:
- ILeaveRepository interface: findById(id), findByEmployeeId(employeeId, params), create(dto), update(id, dto), delete(id), findAll(params)
- KnexLeaveRepository class implementing ILeaveRepository using the pg Pool from src/shared/db/connection.ts

This phase depends on existing file src/shared/db/connection.ts — read it before generating any database code. Include Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.