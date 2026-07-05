# Implement this phase: Phase 3: Leave module — service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/0a43cce1-d400-4c5a-8276-13806d614206/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave module service layer.

Files to create:
- src/modules/leave/leave.service.interface.ts — Define `ILeaveService` interface with methods: createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, approveLeave(id: string, approverId: string): Promise<LeaveRequest>, rejectLeave(id: string, rejecterId: string, reason: string): Promise<LeaveRequest>, cancelLeave(id: string, cancellerId: string, reason: string): Promise<LeaveRequest>, getLeaveRequestById(id: string): Promise<LeaveRequest | null>, getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>, getLeaveRequestsByStatus(status: LeaveStatus): Promise<LeaveRequest[]>.
- src/modules/leave/leave.service.ts — Implement `LeaveService` class implementing ILeaveService. Inject ILeaveRepository via constructor. Business logic: validate date ranges (startDate before endDate), enforce that only PENDING requests can be approved/rejected, only APPROVED requests can be cancelled, set timestamps and actor IDs on status transitions.

This phase depends on:
- src/shared/types/leave.types.ts from Phase 1 (for LeaveStatus enum)
- src/modules/leave/leave.model.ts from Phase 2 (for LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto)
- src/modules/leave/leave.repository.ts from Phase 2 (for ILeaveRepository)

Include Jest unit tests in tests/unit/modules/leave/leave.service.test.ts with mocked repository.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.