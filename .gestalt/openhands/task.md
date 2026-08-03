# Implement this phase: Phase 1: Shared enums and business-days utility

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/8177937e-ec7c-4649-b943-9d9104b82731/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the foundational shared types and utility that every downstream module depends on.

Files to create:
- `src/shared/types/leave-type-code.enum.ts` — Define the `LeaveTypeCode` enum with members: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY.
- `src/shared/types/leave-request-status.enum.ts` — Define the `LeaveRequestStatus` enum with members: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- `src/shared/utils/business-days.ts` — Implement and export `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number`. Exclude weekends (Saturday/Sunday) and the provided holidays array. Normalize all dates to UTC midnight for calendar-date comparison. Count whole business days only. For now, accept holidays as a parameter (the holidays table/repository comes in a later phase).
- `src/shared/types/index.ts` — Barrel re-export of both enums.

Include Jest unit tests in `tests/unit/shared/types/` for enum value correctness and in `tests/unit/shared/utils/business-days.test.ts` covering: weekday range with no holidays, range spanning a weekend, range with holidays, same-day (zero days), and end-before-start (error).

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. A single shared countBusinessDays function + a `holidays` table (public-holiday calendar) is used by every call site (balance sufficiency check, deduction, restoration). Whole days only — no half-day/partial-day leave. Compare dates by CALENDAR-DATE equality in UTC (normalize each day/holiday/weekend check to UTC midnight; compare the YYYY-MM-DD triple), never by raw timestamp — so a holiday matches regardless of time-of-day/timezone.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth here; the controller only CONSUMES request.user (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid: startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole) and reject(..., approverRole). The controller reads request.user and passes id + role; the service enforces the business rule (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state read inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: How is used_days on leave_balances computed — derived live from approved leave_requests or stored counter incremented/decremented on state changes?; Are leave days always whole days, or does the system need to support half-day or hourly leave requests?; When should leave balance be deducted — at application time or at approval time?; How is used_days on leave_balances computed — is it derived live from approved leave_requests (SUM of day counts where status=APPROVED) or is it a stored counter incremented/decremented on approval/rejection/cancellation?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveTypeCode enum members must match the reconciled architecture's shared-types module ownership: "LeaveTypeCode enum (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY)" and "LeaveRequestStatus enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED)". No member may be added, removed, or renamed without updating this source. (see `.gestalt/architecture/reconciled.json`)
- The LeaveRequestStatus enum must match the architecture's declared lifecycle: "LeaveRequest: DRAFT → SUBMITTED → (APPROVED | REJECTED) → CANCELLED" — the five members DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED are the complete set. (see `docs/ARCHITECTURE.md`)
- countBusinessDays must implement the reconciled business rule for day counting: "BUSINESS DAYS ONLY, excluding weekends AND public holidays ... Whole days only — no half-day/partial-day leave. Compare dates by CALENDAR-DATE equality in UTC (normalize each day/holiday/weekend check to UTC midnight; compare the YYYY-MM-DD triple), never by raw timestamp." The function signature and normalization behavior must conform to this rule. (see `.gestalt/architecture/reconciled.json`)
- Test file placement and naming must conform to jest.config.js: testMatch ['**/tests/**/*.test.(ts|js)'] and moduleDirectories including 'src'. Tests must be discoverable by the configured runner without modifying the Jest config. (see `jest.config.js`)
### Entity invariants — enforce these
- Reuse or extend `LeaveTypeCode`: The enum's member set is closed and fixed at exactly {ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY}; each member's string value equals its own uppercase name. No other leave-type code may be introduced without updating this enum and all downstream consumers.
- Reuse or extend `LeaveRequestStatus`: The enum's member set is closed and fixed at exactly {DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED}; each member's string value equals its own uppercase name. These are the only valid lifecycle states a LeaveRequest may occupy.
### Interface contract — expose these operations (their shape is yours)
- countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number — idempotent; Must throw when endDate is strictly before startDate (end-before-start). The thrown error must be a real Error (not a silent return of a negative/zero number).
### Integration points — connect to these
- src/modules/leave-type/leave-type.model.ts (Phase 3) — LeaveType.code is typed as LeaveTypeCode; the leave-type module imports this enum from src/shared/types. The enum's member set and string values must be stable before Phase 3 consumes them.
- src/modules/leave-request/leave-request.model.ts (Phase 6) and leave-request.service.ts (Phase 7) — LeaveRequest.status is typed as LeaveRequestStatus, and the Phase 7 service computes business days via countBusinessDays (passing an empty holidays array for now). Both the enum and the utility are consumed by the leave-request orchestrator.
- src/shared/types/index.ts (barrel) — All downstream modules import the enums through the shared-types barrel per the architecture's dependency rule (modules import only through declared public entry points). The barrel must re-export both enums so consumers never reach into individual enum files.

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Architecture & constraint rules the quality gate enforces (satisfy these now)
The quality gate judges your code against the rules below and BLOCKS the phase on any violation — a violation it rates critical escalates to a human with no automatic retry. These are the same rules the gate checks, so comply up front rather than leaving them for the gate:
- Data access is only permitted in the designated data access layer of this project. Code in business logic, presentation, or routing layers must delegate all data operations to the data access layer.
- The data access layer is the only layer permitted to contain connection management, query execution, and direct interaction with the data store.
- Each architectural layer communicates only with its immediately adjacent layer. Layers must not bypass intermediate layers.
- Dependencies flow in one direction only — from outer layers toward inner layers. Inner layers must not depend on outer layers.
- Error handling must be explicit. Callers must not be exposed to unhandled failures from dependencies.

## Golden principles (NON-NEGOTIABLE — satisfy every one that applies)
These are the project's non-negotiable invariants. A violation is a GOLDEN_PRINCIPLE_BREACH: the quality gate BLOCKS the phase and escalates to a human with NO automatic retry, so it is far more costly than an ordinary finding. Apply EVERY principle relevant to the code you write in this phase — e.g. enforce role-based access control on every API endpoint you add, and validate all inputs at API boundaries before use:
- GP-001 — Repository pattern: All database access goes through repository interfaces. Never query the database directly from services or controllers.
- GP-002 — Audit records: All state-changing operations write an audit record.
- GP-003 — Input validation: Validate all inputs at API boundaries before processing.
- GP-004 — No sensitive data in logs: Never log passwords, tokens, PII, or financial data.
- GP-005 — RBAC enforcement: All API endpoints enforce role-based access control.
- GP-006 — Error handling: No unhandled promise rejections. All async errors are caught and handled.

## Project stack & references
Before writing code, read the referenced files below (those present in the working directory) to learn the project's language, framework, test runner, and conventions, and the cross-cutting rules your code must satisfy — then follow the existing repository conventions:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

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