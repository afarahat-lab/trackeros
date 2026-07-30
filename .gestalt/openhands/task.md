# Implement this phase: Phase 2: Employee model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/9086d214-f416-4a0d-87b3-3d75d74d909d/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee module at `src/modules/employee/`:

- `src/modules/employee/employee.model.ts` — `Employee` entity extending `BaseEntity` from `src/shared/types/index.ts` (Phase 1). Fields: `id: string`, `employeeCode: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN'`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`.
- `src/modules/employee/employee.repository.ts` — `IEmployeeRepository` interface with: `findById(id: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findManagerId(employeeId: string): Promise<string | null>`, `findHrAdmins(): Promise<Employee[]>`. Also `EmployeeRepository` class implementing it using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/employee/index.ts` — barrel export.

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code that references `BaseEntity`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated design decisions:

1. Day counting: Business days — exclude Saturdays and Sundays. No public-holiday calendar in scope; weekends only.
2. Minimum notice period: measured from the start of the submission day (midnight) — the more lenient, employee-friendly rule.
3. Fiscal/leave year boundary: Calendar year (Jan 1 – Dec 31). The leave_balances.year field is the calendar year; balances reset Jan 1.
4. Partial-day leave: Whole days only — reject fractional-day requests. used_days/pending_days are integers.
5. Balance deduction timing: Deduct on submission (reserve the balance immediately). Restore on rejection and on cancellation. submitLeaveRequest deducts; rejectLeaveRequest and cancelLeaveRequest restore. Approval does not re-deduct.
6. Employee with no manager (managerId null) but approval required: Escalate to a designated HR/admin approver role — route the request to that role rather than auto-approving, auto-rejecting, or blocking.
7. Fiscal year: Calendar year (Jan 1 – Dec 31) — same as (3), not a configurable company fiscal year.
8. Leave year boundary: Calendar year (Jan 1 – Dec 31) — same as (3). Not fiscal-configurable and not a rolling window. [BINDING RULE — operator decision resolving: Should leave day counting use calendar days or business days (excluding weekends and/or public holidays)?; Should the minimum notice period be measured from the submission timestamp or from the start of the submission day (midnight)?; What defines the fiscal/leave year boundary for balance allocation and reset?; How are partial-day leave durations counted and rounded in balance calculations (e.g., half-day leave = 0.5 days)?; When does balance deduction occur — on leave submission or on manager approval?; What happens when an employee has no manager (managerId is null) but the leave policy requires approval?; Should the fiscal year follow the calendar year (Jan 1 – Dec 31) or a configurable company fiscal year (e.g., Apr 1 – Mar 31)?; What defines the leave year boundary for balance allocation and reset?; apply everywhere these apply, not in one place only]

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

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