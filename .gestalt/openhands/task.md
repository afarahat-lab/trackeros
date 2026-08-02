# Implement this phase: Phase 6: Holidays repository — model and data access for public holidays

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/7`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create a minimal holidays data layer for the public-holiday calendar required by the binding rules. Depends on src/shared/types/base-entity.interface.ts from Phase 1 — read it before generating.

Files to create (3 source files):

1. **src/shared/holidays/holiday.model.ts** — Define `Holiday` interface: id (string), date (Date), name (string), country (string). This is a simple data interface (not extending BaseEntity since holidays are reference data).

2. **src/shared/holidays/holiday.repository.ts** — Define `IHolidayRepository` interface: findByDateRange(startDate: Date, endDate: Date): Promise<Holiday[]>, findByYear(year: number): Promise<Holiday[]>. Implement `PgHolidayRepository` using the shared pg pool from src/shared/db/connection.ts. The repository returns Date objects that can be passed directly to the `countBusinessDays` function from Phase 1.

3. **src/shared/holidays/index.ts** — Barrel export of Holiday, IHolidayRepository, PgHolidayRepository.

Include Jest unit tests in **tests/unit/shared/holidays/holiday.repository.test.ts**.

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
- PgHolidayRepository must import the shared `pool` from src/shared/db/connection.ts — the same pool instance used by all other repositories (employee, policy, balance, leave). No separate database connection or Pool instantiation. (see `src/shared/db/connection.ts`)
- The repository's returned Holiday.date values must be directly passable as the `holidays: Date[]` argument to countBusinessDays. The date objects must have local date components (getFullYear/getMonth/getDate) matching the stored holiday date, because countBusinessDays uses isSameDay() which compares local-time getters — not UTC. (see `src/shared/utils/day-count.ts`)
- The repository implementation must follow the established pattern: define a private *Row interface for DB columns, a private rowTo* mapper function, use pool.query<RowType>(sql, params) accessing result.rows, and have the class implement the interface (PgHolidayRepository implements IHolidayRepository). Errors propagate as rejected promises without try/catch. (see `src/modules/balance/balance.repository.ts`)
- The unit test must follow the established test pattern: jest.mock the shared db connection module, import pool after the mock, cast pool.query as jest.Mock, use makeRow()/makeEntity() helper factories with overrides, structure as describe('PgHolidayRepository') with nested describe blocks per method, call jest.clearAllMocks() in beforeEach, and cast mock resolved values with `as never`. (see `tests/unit/modules/balance/balance.repository.test.ts`)
- The Holiday interface must NOT extend BaseEntity. BaseEntity defines id/createdAt/updatedAt; Holiday is reference data with only id/date/name/country and no lifecycle timestamps. base-entity.interface.ts is read for awareness only — it is not imported by the holidays module. (see `src/shared/types/base-entity.interface.ts`)
### Entity invariants — enforce these
- Introduce `Holiday`: Holiday is reference data, not a domain aggregate — it does not extend BaseEntity and carries no createdAt/updatedAt lifecycle timestamps. It is immutable from the application's perspective (read-only access only in this phase).
- Reuse or extend `Holiday`: Every Holiday returned by the repository must have a non-null date that is a valid JS Date object whose local date components correspond to the actual public holiday date, ensuring compatibility with countBusinessDays' isSameDay() comparison.
### Interface contract — expose these operations (their shape is yours)
- IHolidayRepository.findByDateRange(startDate: Date, endDate: Date): Promise<Holiday[]> — idempotent; Read-only query with no side effects. Returns an empty array (not null) when no holidays fall within the inclusive range. Database errors propagate as rejected promises without swallowing.
- IHolidayRepository.findByYear(year: number): Promise<Holiday[]> — idempotent; Read-only query with no side effects. Returns an empty array (not null) when no holidays exist for the requested calendar year. Database errors propagate as rejected promises without swallowing.
### Integration points — connect to these
- src/shared/utils/day-count.ts (countBusinessDays) — The repository's primary consumer contract: findByDateRange returns Holiday[] whose .date values are extracted and passed as the holidays: Date[] argument to countBusinessDays. The Phase 10 leave service will call findByDateRange, map results to Date[], and invoke countBusinessDays for business-day calculation.
- src/shared/db/connection.ts (shared pg pool) — PgHolidayRepository depends on the shared Pool instance for all database queries, consistent with every other repository in the codebase.
- Phase 10 leave service (ILeaveRequestService) — The leave service constructor will accept IHolidayRepository to fetch holidays for a leave request's date range, enabling accurate business-day counting that excludes public holidays per binding rule 2.

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