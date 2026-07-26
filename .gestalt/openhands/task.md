# Implement this phase: Phase 3: Leave repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/6f64b552-c5b8-42bc-86fa-01fa08ab4abe/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave repository implementing data access for leave requests and balances. This phase depends on `src/modules/leave/leave.model.ts` from Phase 2 — read it before generating any code that references its types.

Files to create:
- `src/modules/leave/leave.repository.ts` — implement `ILeaveRepository` interface and `LeaveRepository` class using the pg Pool from `src/shared/db/connection.ts`. Methods:
  - `findById(id: string): Promise<LeaveRequest | null>` — SELECT by id
  - `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>` — SELECT all requests for an employee, ordered by created_at DESC
  - `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>` — SELECT by status
  - `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — INSERT a new leave request with status 'DRAFT', return the created row
  - `updateStatus(id: string, dto: UpdateLeaveRequestStatusDto): Promise<LeaveRequest | null>` — UPDATE status and reviewer fields based on the new status (APPROVED sets approved_by/approved_at, REJECTED sets rejected_by/rejected_at/rejection_reason, CANCELLED sets cancelled_by/cancelled_at), return updated row or null
  - `getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>` — SELECT balance row
  - `upsertBalance(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>` — INSERT ON CONFLICT UPDATE balance
  - `decrementBalance(employeeId: string, leaveTypeId: string, year: number, days: number): Promise<LeaveBalance | null>` — decrement used_days by the given amount
- Update `src/modules/leave/index.ts` — add exports for `ILeaveRepository` and `LeaveRepository`

Include Jest unit tests in `tests/unit/modules/leave/leave.repository.test.ts` that mock the pg Pool and test each repository method.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Verify before you finish (MANDATORY)
The code you write MUST compile and its tests MUST pass — a compilation or type error must NEVER be left for CI to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`.
- Install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`) for the files this phase touches.
- FIX every compilation error, type error, and failing test you introduced — including in test files — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.