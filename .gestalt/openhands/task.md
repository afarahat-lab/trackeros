# Implement this phase: Phase 2: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/769755ef-b2c0-4812-bb19-4f18553fbfd5/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/policy/policy.model.ts with the `LeavePolicy` interface and `LeavePolicyQueryParams` DTO. The `LeavePolicy` interface must include: id, policyName, leaveType (import LeaveType from src/shared/types/leave.types.ts), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, allowNegativeBalance, maxConsecutiveDays, fiscalYear, createdAt, updatedAt.

Create src/modules/policy/policy.repository.ts with the `ILeavePolicyRepository` interface defining: findById, findByLeaveType, findActivePolicies, create, update, delete. Implement `LeavePolicyRepository` class using the pg Pool from src/shared/db/connection.ts.

This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references LeaveType. Include Jest unit tests in tests/unit/modules/policy/.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.