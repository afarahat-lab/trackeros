# Implement this phase: Phase 3: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e7c49d71-30a2-45f6-9ac3-179c69d7de0f/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeavePolicy domain model and its repository in the leave module. This phase depends on `src/shared/types/index.ts` from Phase 1 (for `LeaveType`) and `src/shared/base-repository.ts` + `src/shared/db/connection.ts` from Phase 2 — read those before generating.

Files to create:
- `src/modules/leave/leave-policy.model.ts` — Define the `LeavePolicy` interface with all attributes from the architecture: id, policyName, leaveType (import LeaveType from `src/shared/types/index.ts`), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, allowsNegativeBalance, maxConsecutiveDays, createdAt, updatedAt.
- `src/modules/leave/leave-policy.repository.ts` — Define `ILeavePolicyRepository` interface and implement `LeavePolicyRepository` class extending `BaseRepository<LeavePolicy>` from `src/shared/base-repository.ts`. Include methods: `findById`, `findAll`, `findByLeaveType`, `create`, `update`, `softDelete`.

Include Jest unit tests at `tests/unit/modules/leave/leave-policy.repository.test.ts`.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.