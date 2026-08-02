# Implement this phase: Phase 1: Shared types — enums, base entity, DTOs, and day-count utility

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the shared-types module at src/shared/types/ with these files:

1. **src/shared/types/leave-type.enum.ts** — Define `LeaveType` enum with values: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY.

2. **src/shared/types/leave-request-status.enum.ts** — Define `LeaveRequestStatus` enum with values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.

3. **src/shared/types/base-entity.interface.ts** — Define `BaseEntity` interface with fields: id (string), createdAt (Date), updatedAt (Date).

4. **src/shared/types/leave-request.dto.ts** — Define `CreateLeaveRequestDto` (employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason?: string) and `UpdateLeaveRequestDto` (status?: LeaveRequestStatus, rejectionReason?: string). Import LeaveRequestStatus from ./leave-request-status.enum.

5. **src/shared/types/index.ts** — Barrel export re-exporting all symbols from the four files above.

6. **src/shared/utils/day-count.ts** — Export a function `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number` that counts business days (Mon–Fri) excluding weekends and the provided holidays array. This is the single shared day-count function required by the binding rules.

Include Jest unit tests in **tests/unit/shared/types/types.test.ts** verifying enum values and DTO shape, and **tests/unit/shared/utils/day-count.test.ts** verifying business-day counting (excludes weekends, excludes holidays, inclusive of start and end when both are business days).

This phase has no dependencies on prior phases — it is the foundation.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated user identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth in this feature; the controller only CONSUMES `request.user` (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid; e.g. startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity — role comes from `request.user`.

7. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: Do unused leave days carry over to the next fiscal year, and if so, what is the cap?; What is the minimum granularity of leave — full days, half-days, or hours?; Do weekends and public holidays count as leave days consumed from the balance?; When a leave request spans two fiscal years, how are days allocated to each year's balance?; How is the fiscal year determined for leave balances? The domain model includes fiscalYear but the mapping rule (calendar year Jan–Dec, fiscal year Jul–Jun, or company-specific) is not specified in the feature description.; How is leave_balances.used_days computed — is it derived on-the-fly by aggregating approved leave_request days for that employee/policy/fiscal-year, or is it a stored counter that is incremented atomically when a leave request is approved (and decremented on cancellation)?; How are leave days counted — calendar days (inclusive start-to-end) or business/working days only? And when a leave request spans two fiscal years, how are days allocated to each year's balance?; How is remainingDays computed — stored as a derived column (totalDays - usedDays) in the DB, or computed at query time? If stored, what keeps it consistent with usedDays after every deduction/restore?; What is the fiscal-year boundary rule? Is it calendar year (Jan 1–Dec 31), a configurable start month, or per-company? Does a leave spanning the boundary consume days from the start-date fiscal year, the end-date fiscal year, or split proportionally?; apply everywhere these apply, not in one place only]

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