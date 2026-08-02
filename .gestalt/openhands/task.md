# Implement this phase: Phase 1: Shared types — enums, base entity, DTOs, and day-count utility

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the shared-types foundation. All later phases depend on these types.

Files to create (5 source files):

1. **src/shared/types/enums.ts** — Define `LeaveType` enum (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY) and `LeaveRequestStatus` enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) in a single file.

2. **src/shared/types/base-entity.interface.ts** — Define `BaseEntity` interface: id (string), createdAt (Date), updatedAt (Date).

3. **src/shared/types/leave-request.dto.ts** — Define `CreateLeaveRequestDto` (employeeId: string, leavePolicyId: string, startDate: Date, endDate: Date, reason?: string) and `UpdateLeaveRequestDto` (status?: LeaveRequestStatus, rejectionReason?: string). Import from ./enums.

4. **src/shared/types/index.ts** — Barrel export re-exporting all symbols from the three files above.

5. **src/shared/utils/day-count.ts** — Export `countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number`. Counts Mon–Fri inclusive, excludes weekends and the provided holidays array. This is the single shared day-count function mandated by the binding rules.

Include Jest unit tests: **tests/unit/shared/types/types.test.ts** (enum values, DTO shape) and **tests/unit/shared/utils/day-count.test.ts** (excludes weekends, excludes holidays, inclusive range).

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

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The enum member sets must match the reconciled architecture exactly: LeaveType = ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY; LeaveRequestStatus = DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. No additional or missing members are permitted, since downstream entities (LeavePolicy.leaveType, LeaveRequest.status) and business rules (sufficiency skip for UNPAID; manager approval for SICK/EMERGENCY) depend on these exact values. (see `.gestalt/architecture/reconciled.json`)
- countBusinessDays must remain the single shared day-count function at src/shared/utils/day-count.ts and must preserve its documented contract: counts Mon–Fri in the inclusive range [startDate, endDate], excludes weekends and the provided holidays array, returns 0 when startDate > endDate, and compares holidays by calendar date (year/month/day). The known local-time-vs-UTC divergence is explicitly deferred and must not be "fixed" in this phase. (see `docs/ARCHITECTURE.md`)
- UpdateLeaveRequestDto.status must be typed as LeaveRequestStatus (imported from the canonical enum source), not as a string literal union or string, so the DTO and the enum cannot drift. If the enum source is consolidated into enums.ts, the DTO import path must be updated to match and must continue to resolve the same LeaveRequestStatus type. (see `src/shared/types/leave-request.dto.ts`)
- The barrel must re-export the same set of symbols the existing barrel exposes (LeaveType, LeaveRequestStatus, BaseEntity, CreateLeaveRequestDto, UpdateLeaveRequestDto) so downstream modules that import from the public entry point are unaffected by the internal file consolidation. The export kinds (value export for enums, type export for interfaces/DTOs) must be preserved. (see `src/shared/types/index.ts`)
- The types test must continue to import the enums, BaseEntity, and DTOs and assert their values/shapes. If the enum source is consolidated into enums.ts, the test imports must be updated to the canonical path so the test still compiles and passes against the consolidated source — the test must not reference a deleted file. (see `tests/unit/shared/types/types.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveType`: The enum's membership is closed and stable: exactly ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY, each a string-valued member equal to its own name. No member may be added, removed, or renamed without breaking downstream policy/leave modules that switch on these values.
- Reuse or extend `LeaveRequestStatus`: The enum's membership is closed and stable: exactly DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, each a string-valued member equal to its own name. These are the only legal lifecycle states for a LeaveRequest; the ordering DRAFT→SUBMITTED→(APPROVED|REJECTED|CANCELLED) is enforced by later phases, so the enum must not gain or lose members here.
- Reuse or extend `BaseEntity`: BaseEntity is the structural contract every persisted domain entity (Employee, LeavePolicy, LeaveBalance, LeaveRequest, AuditLog) extends: it carries identity (id: string) and lifecycle timestamps (createdAt, updatedAt). It must remain a pure interface with no behavior and no optional members, so every extending entity is guaranteed to be persistable and auditable.
- Reuse or extend `CreateLeaveRequestDto`: The DTO is the input shape for drafting a leave request: employeeId, leavePolicyId, startDate, endDate are required and reason is optional. It must not encode status or audit fields — status is set by the service lifecycle, never by the caller — so the DTO stays a pure transport object with no lifecycle authority.
- Reuse or extend `UpdateLeaveRequestDto`: The DTO is the input shape for transitioning a leave request: status (LeaveRequestStatus) and rejectionReason are both optional. It must reference LeaveRequestStatus by type so only legal lifecycle states can be expressed; it must not carry identity or balance fields, keeping it a pure transport object.
### Interface contract — expose these operations (their shape is yours)
- countBusinessDays(startDate: Date, endDate: Date, holidays: Date[]): number — None — pure function with no auth surface.; idempotent; Must be a pure, side-effect-free function. Returns 0 when startDate > endDate (inverted range). Must not throw for valid Date inputs or empty holidays arrays; holiday comparison must treat a holiday falling on a weekend as already-excluded (no negative contribution).
- shared-types public entry point (src/shared/types/index.ts barrel export) — None — barrel re-export has no auth surface.; idempotent; The barrel must re-export every public symbol (LeaveType, LeaveRequestStatus, BaseEntity, CreateLeaveRequestDto, UpdateLeaveRequestDto) so that a missing or misnamed export surfaces as a compile error at downstream import sites rather than a runtime failure.
### Integration points — connect to these
- src/modules/policy/policy.model.ts (Phase 3) — LeavePolicy.leaveType is typed as LeaveType imported from the shared-types public entry point; this phase must expose LeaveType so the policy module can bind leave categories to entitlement rules.
- src/modules/leave/leave.model.ts (Phase 5) and src/modules/leave/leave.service.ts (Phase 9) — LeaveRequest.status is typed as LeaveRequestStatus and the service switches on lifecycle states (DRAFT→SUBMITTED→APPROVED/REJECTED/CANCELLED); this phase must expose the enum and DTOs so the leave module can model and transition requests.
- src/modules/balance/balance.repository.ts (Phase 4) and src/modules/leave/leave.service.ts (Phase 9) — The balance sufficiency check, deduction, and restoration all compute requested days via countBusinessDays; this phase must expose the single shared day-count function so every call site computes business days identically.
- src/modules/employee/employee.model.ts (Phase 2), src/modules/policy/policy.model.ts (Phase 3), src/modules/balance/balance.model.ts (Phase 4), src/modules/leave/leave.model.ts (Phase 5), src/modules/audit/audit.model.ts (Phase 8) — Every persisted domain entity extends BaseEntity to inherit id/createdAt/updatedAt; this phase must expose the BaseEntity interface as the structural contract for all entity models.

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