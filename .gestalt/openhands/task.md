# Implement this phase: Phase 1: Balance domain model and repository interfaces

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/29db188e-aa3b-40f9-a0ff-8dc33e2c5647/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the balance module domain model and repository interfaces.

Create `src/modules/balance/balance.model.ts` with:
- `LeaveBalanceStatus` enum (ACTIVE, EXHAUSTED, FROZEN, CLOSED)
- `BalanceAdjustmentStatus` enum (PENDING, APPLIED, REVERSED)
- `AdjustmentType` type alias: `'DEBIT' | 'CREDIT'`
- `LeaveBalance` interface with fields: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays (derived as totalEntitlement - usedDays), fiscalYear, status (LeaveBalanceStatus), createdAt, updatedAt
- `BalanceAdjustment` interface with fields: id, leaveBalanceId, leaveRequestId (string | null), adjustmentType (AdjustmentType), amountDays, reason, performedBy (string | null), status (BalanceAdjustmentStatus), appliedAt (Date | null), createdAt, updatedAt
- `CreateLeaveBalanceDto` interface with: employeeId, policyId, totalEntitlement, fiscalYear
- `CreateBalanceAdjustmentDto` interface with: leaveBalanceId, leaveRequestId (optional), adjustmentType, amountDays, reason, performedBy (optional)

Create `src/modules/balance/balance.repository.ts` with:
- `ILeaveBalanceRepository` interface: findByEmployeePolicyFiscalYear(employeeId, policyId, fiscalYear), findById(id), create(dto), updateUsedDays(id, usedDays), findAllByEmployeeId(employeeId)
- `IBalanceAdjustmentRepository` interface: findByLeaveBalanceId(leaveBalanceId), create(dto), updateStatus(id, status, appliedAt)

Create `tests/unit/modules/balance/balance.model.test.ts` with Jest tests verifying:
- remainingDays is correctly derived as totalEntitlement - usedDays
- CreateLeaveBalanceDto and CreateBalanceAdjustmentDto shape validation
- AdjustmentType only accepts 'DEBIT' or 'CREDIT'

This phase has no dependencies on prior phases — it is the foundation for all subsequent balance phases.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.