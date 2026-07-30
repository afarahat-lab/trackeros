# Implement this phase: Phase 1: Shared types — BaseEntity, LeaveType, LeaveRequestStatus

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/9086d214-f416-4a0d-87b3-3d75d74d909d/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create `src/shared/types/index.ts` with:
- `BaseEntity` interface: `id: string`, `createdAt: Date`, `updatedAt: Date`
- `LeaveType` enum: `ANNUAL`, `SICK`, `EMERGENCY`, `UNPAID`, `MATERNITY`, `PATERNITY`
- `LeaveRequestStatus` enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`

Include Jest unit tests in `tests/unit/shared/types/types.test.ts` verifying enum values and interface shape. This phase has no dependencies on any prior phase files.

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

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The new type declarations must match the existing model style: plain `export interface` / `export enum` statements with no decorators, no classes, and no runtime imports. The existing uptime.model.ts and status.model.ts establish this convention. (see `src/modules/uptime/uptime.model.ts`)
- If the shared-types module exposes its symbols via a barrel index.ts, it must follow the existing convention where index.ts re-exports the public symbols from the model file. The existing uptime/index.ts and status/index.ts establish this pattern. Since src/shared/types/index.ts is itself the module's public entry point, defining the types directly in it is also consistent. (see `src/modules/uptime/index.ts`)
- The source file must compile under the project's tsconfig.json settings: strict mode (no implicit any, strict null checks), target ES2022, module commonjs, baseUrl ./src. The file is included by the "include": ["src"] glob and must not trigger any type errors under these settings. (see `tsconfig.json`)
- The test file must be discoverable by jest.config.js: it must match the testMatch glob **/tests/**/*.test.(ts|js) and be transformable by the ts-jest preset. The test may import the source types via a bare import (shared/types) since moduleDirectories includes 'src', or via a relative path — both resolve correctly. (see `jest.config.js`)
### Entity invariants — enforce these
- Reuse or extend `BaseEntity`: BaseEntity is a pure data shape (no owned business logic) used by more than one module, so it must be defined in the shared-types module (src/shared/types/) and exported from that module's public entry point. It must remain a methodless interface — no behavior, no lifecycle methods — so downstream entities extend it as a structural contract only.
- Reuse or extend `LeaveType`: LeaveType is a cross-module value type (used by leave-policy, leave-balance, and leave-request) with no owned behavior, so it must be defined in the shared-types module and exported from its public entry point. Its member set is closed and fixed at the six declared values; no additional leave types may be added without an architecture change, because downstream policy and balance logic depends on the exact set.
- Reuse or extend `LeaveRequestStatus`: LeaveRequestStatus is a cross-module value type (used by leave-request and audit-log) with no owned behavior, so it must be defined in the shared-types module and exported from its public entry point. Its member set is closed and fixed at the five declared lifecycle states (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED); the LeaveRequest lifecycle transitions defined in ARCHITECTURE.md depend on exactly these values, so no status may be added or removed without an architecture change.
### Interface contract — expose these operations (their shape is yours)
- Importing BaseEntity, LeaveType, and LeaveRequestStatus from the shared-types module's public entry point (src/shared/types/index.ts) — N/A — pure type definitions, no runtime auth boundary; idempotent; No runtime errors — these are compile-time type exports. A missing or misnamed export surfaces as a TypeScript compile error (tsc --noEmit fails), not a runtime exception.
### Integration points — connect to these
- Five downstream modules (employee, leave-policy, leave-balance, leave-request, audit-log) will import BaseEntity, LeaveType, and/or LeaveRequestStatus from src/shared/types/index.ts in subsequent phases. The exported symbol names and their types are the contract these phases depend on. — The shared-types module is the foundation with zero upstream dependencies; all five domain modules depend on it. The exact exported names (BaseEntity, LeaveType, LeaveRequestStatus) and their member sets must be stable so downstream phases can import them without modification.

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