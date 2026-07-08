# Implement this phase: Phase 3: LeaveBalance model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/a88212d7-6a1c-4612-8a09-8a5db627b262/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/balance/balance.model.ts with the LeaveBalance interface and LeaveBalanceQueryParams type. LeaveBalance attributes: id, employeeId, leavePolicyId, totalEntitlement, usedDays, remainingDays, pendingDays, fiscalYear, status (import BalanceStatus from src/shared/types/leave.types.ts from Phase 1), createdAt, updatedAt. Also create src/modules/balance/balance.repository.ts with the ILeaveBalanceRepository interface declaring findByEmployeeId, findByEmployeeAndPolicy, create, update, deductDays, and addPendingDays methods operating on LeaveBalance. Include Jest unit tests in tests/unit/modules/balance/balance.repository.test.ts. This phase depends on src/shared/types/leave.types.ts from Phase 1 — read it before generating any code that references BalanceStatus.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.