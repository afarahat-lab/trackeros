# Implement this phase: Phase 2: Leave domain model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/be7ddf67-d8cd-4b4b-9a8e-9a007adf8c79/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/leave/leave.model.ts with: LeaveRequestStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), LeaveType interface (id, code, name, description, isPaid, requiresDocumentation, isActive, createdAt, updatedAt), LeavePolicy interface (id, policyName, leaveTypeId, entitlementDays, accrualRate, maxCarryoverDays, minRequestDays, maxConsecutiveDays, requiresDocumentation, isActive, createdAt, updatedAt), LeaveRequest interface (id, employeeId, leaveTypeId, startDate, endDate, reason, status: LeaveRequestStatus, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, cancelledBy, cancelledAt, cancellationReason, createdAt, updatedAt), CreateLeaveRequestDto, and UpdateLeaveRequestStatusDto. Create src/modules/leave/leave.repository.ts with ILeaveRepository interface and KnexLeaveRepository class extending BaseKnexRepository from src/shared/base.repository.ts. This phase depends on src/shared/base.repository.ts and src/shared/error.types.ts from Phase 1 — read them before generating. Include Jest unit tests in tests/unit/modules/leave/leave.repository.test.ts.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.