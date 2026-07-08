# Implement this phase: Phase 2: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/a88212d7-6a1c-4612-8a09-8a5db627b262/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/policy/policy.model.ts with the LeavePolicy interface and LeavePolicyQueryParams type. LeavePolicy attributes: id, policyName, leaveType (import LeaveType from src/shared/types/leave.types.ts from Phase 1), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt. Also create src/modules/policy/policy.repository.ts with the ILeavePolicyRepository interface declaring findByLeaveType, findById, findAll, create, update, and softDelete methods operating on LeavePolicy. Include Jest unit tests in tests/unit/modules/policy/policy.repository.test.ts. This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references LeaveType.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.