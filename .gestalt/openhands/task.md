# Implement this phase: Phase 3: LeaveBalance model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/769755ef-b2c0-4812-bb19-4f18553fbfd5/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/balance/balance.model.ts with the `LeaveBalance` interface and `LeaveBalanceQueryParams` DTO. The `LeaveBalance` interface must include: id, employeeId, policyId, totalEntitlement, usedDays, pendingDays, availableDays, fiscalYear, createdAt, updatedAt.

Create src/modules/balance/balance.repository.ts with the `ILeaveBalanceRepository` interface defining: findByEmployeeId, findByEmployeeAndPolicy, findByEmployeeAndFiscalYear, create, update, deductDays, restoreDays. Implement `LeaveBalanceRepository` class using the pg Pool from src/shared/db/connection.ts.

This phase depends on src/shared/types/leave.types.ts from Phase 1 and src/modules/policy/policy.model.ts from Phase 2 — read both before generating any code. Include Jest unit tests in tests/unit/modules/balance/.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.