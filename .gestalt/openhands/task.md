# Implement this phase: Phase 2: Leave domain model types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/6f64b552-c5b8-42bc-86fa-01fa08ab4abe/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave module domain model types. This phase has no dependencies on prior phases — it defines pure TypeScript types.

Files to create:
- `src/modules/leave/leave.model.ts` — define all domain types:
  - `LeaveType` as a string literal union: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
  - `LeaveRequestStatus` as a string literal union: `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
  - `LeavePolicy` interface with fields: id (string), policyName (string), leaveType (LeaveType), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date)
  - `LeaveRequest` interface with fields: id (string), employeeId (string), leaveTypeId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), rejectionReason (string | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt (Date), updatedAt (Date)
  - `LeaveBalance` interface with fields: id (string), employeeId (string), leaveTypeId (string), entitlementDays (number), usedDays (number), accruedDays (number), year (number), createdAt (Date), updatedAt (Date)
  - `CreateLeaveRequestDto` interface with fields: employeeId (string), leaveTypeId (string), startDate (Date), endDate (Date), reason (string | undefined)
  - `UpdateLeaveRequestStatusDto` interface with fields: status (LeaveRequestStatus), reviewerId (string), rejectionReason (string | undefined)
- `src/modules/leave/index.ts` — barrel export of all types from leave.model.ts

Include Jest unit tests in `tests/unit/modules/leave/leave.model.test.ts` that verify the type definitions compile and that the literal union values are correct.

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