# Implement this phase: Phase 4: LeaveBalance model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/219727ae-a952-461a-b605-c6d40c0c1e42/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveBalance domain model and repository.

Files to create:
- `src/modules/leave-balance/leave-balance.model.ts` — Define the `LeaveBalance` entity interface with exact fields: id: string, employeeId: string, policyId: string, totalEntitlement: number, usedDays: number, remainingDays: number, fiscalYear: number, status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED', createdAt: Date, updatedAt: Date.
- `src/modules/leave-balance/leave-balance.repository.interface.ts` — Define `ILeaveBalanceRepository` interface with methods: findById(id), findByEmployeeId(employeeId), findByEmployeeAndPolicy(employeeId, policyId), findByEmployeeAndFiscalYear(employeeId, fiscalYear), create(balance), update(id, balance), upsert(balance).
- `src/modules/leave-balance/leave-balance.repository.ts` — Implement `PgLeaveBalanceRepository` class implementing ILeaveBalanceRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all questions:
1/7/9 (day counting — the single binding rule everywhere a day count is derived): BUSINESS DAYS ONLY — exclude weekends and public holidays. days = number of business days between startDate and endDate inclusive. Apply this ONE rule to balance sufficiency, deductions/reversals (used_days), notice-period checks, overlap detection, and reporting.
2/8 (minimumNoticeDays): submission date = the date the request transitioned to SUBMITTED (not createdAt); measure the notice as BUSINESS days between the submission date and startDate.
3 (overlap): INCLUSIVE overlap — two ranges overlap iff startA <= endB AND startB <= endA. Adjacent dates (A ends Fri, B starts Sat) do NOT overlap.
4 (fiscal year): CALENDAR year, Jan 1 - Dec 31.
5 (carryover): USE-IT-OR-LOSE-IT — unused entitled days expire at fiscal-year end; no carryover, no maxCarryover field.
6 (emergency leave): SEPARATE pool — annual, sick, and emergency each have their own entitlement and balance row; no cross-pool debiting.
10 (available balance): entitled - (used + pending) — pending requests consume balance immediately to prevent double-booking.
Standing rules: whole days only (no partial/half days); used_days is deducted on APPROVAL and restored on reject/cancel of a previously-approved request; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (employee acts on own requests; manager acts on direct reports; HR admin acts on all) and validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is the range inclusive of both boundaries, exclusive of endDate, or based on calendar business days excluding weekends/holidays?; For the minimumNoticeDays check, is 'submission date' the date the request was created (createdAt) or the date it transitioned to SUBMITTED? And is the day count measured as calendar days or business days?; For the overlapping-leave check, are adjacent date ranges (e.g., request A ends Friday, request B starts Saturday) considered overlapping?; How is the fiscal year defined — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g. Apr 1 – Mar 31)?; How should unused annual leave be handled at fiscal-year rollover — carry over fully, carry over with a cap, or expire?; Should emergency leave be drawn from the same annual/sick balance pools, or is it a separate entitlement with its own policy rules?; How are leave days counted from startDate and endDate? Is the range inclusive of both boundaries (days = endDate - startDate + 1), exclusive of endDate (days = endDate - startDate), or based on calendar business days excluding weekends/holidays?; For the minimumNoticeDays check, is "submission date" the date the request was created (createdAt) or the date it transitioned to SUBMITTED? And is the day count measured as calendar days or business days?; How are leave days counted — calendar days or business days? Are weekends and public holidays excluded from the day count?; What is the binding computation for available balance — entitled minus (used + pending), or entitled minus used only?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveBalance` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - policyId: string
    - totalEntitlement: number
    - usedDays: number
    - remainingDays: number
    - fiscalYear: number
    - status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED'
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- PgLeaveBalanceRepository must extend BaseRepository (via a private inner class) and use its generic query<T extends Record<string, unknown>> helper for all SQL, matching the BaseRepository signature in src/shared/base-repository.ts. (see `src/shared/base-repository.ts`)
- The repository structure (private inner BaseRepository subclass as `private readonly base`, snake_case Row interface with [key:string]:unknown index signature, rowToLeaveBalance mapper, isLeaveBalanceRow type guard using unknown, create with randomUUID id + new Date timestamps + RETURNING *, update with dynamic SET clauses + updated_at append + findById delegation, error message 'Failed to create leave balance') must mirror the established pattern in src/modules/leave-policy/leave-policy.repository.ts and src/modules/employee/employee.repository.ts. (see `src/modules/leave-policy/leave-policy.repository.ts`)
- The test file must follow the established test pattern: jest.mock the db connection BEFORE importing pool, makeLeaveBalanceRow() (snake_case) and makeLeaveBalance() (camelCase) helpers, beforeEach mockQuery.mockReset(), and per-method coverage of success/not-found/type-guard-failure/error — matching tests/unit/modules/leave-policy/leave-policy.repository.test.ts and tests/unit/modules/employee/employee.repository.test.ts. (see `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`)
- The leave_balances table columns and the unique constraint (employee_id, leave_policy_id, fiscal_year) that upsert's ON CONFLICT targets must match the reconciled architecture's sql_schemas entry for leave_balances in .gestalt/architecture/reconciled.json. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: Lifecycle is ACTIVE → EXHAUSTED (when remainingDays reaches 0) or CLOSED (at fiscal-year end); EXHAUSTED → ACTIVE is permitted on cancellation reversal; CLOSED is terminal and cannot transition to any other status. The repository must not reject any of these status values but is not responsible for enforcing transition legality.
- Reuse or extend `LeaveBalance`: The natural key is (employeeId, policyId, fiscalYear); at most one ACTIVE/EXHAUSTED balance row may exist per employee per policy per fiscal year, enforced by the unique constraint on (employee_id, leave_policy_id, fiscal_year) which upsert relies on.
- Reuse or extend `LeaveBalance`: remainingDays is the derived balance (totalEntitlement − usedDays); the entity is updated atomically on APPROVED and CANCELLED-from-APPROVED leave-request transitions, but the repository only persists the values it is given — it does not recompute remainingDays.
### Interface contract — expose these operations (their shape is yours)
- ILeaveBalanceRepository.findById(id) — Returns the mapped LeaveBalance or null when not found / type-guard failure; propagates underlying database errors unchanged.
- ILeaveBalanceRepository.findByEmployeeId(employeeId) — Returns an array of mapped LeaveBalance rows (filtering out type-guard failures); propagates database errors unchanged.
- ILeaveBalanceRepository.findByEmployeeAndPolicy(employeeId, policyId) — Returns the mapped LeaveBalance or null when not found / type-guard failure; propagates database errors unchanged.
- ILeaveBalanceRepository.findByEmployeeAndFiscalYear(employeeId, fiscalYear) — Returns an array of mapped LeaveBalance rows (filtering out type-guard failures); propagates database errors unchanged.
- ILeaveBalanceRepository.create(balance) — Throws 'Failed to create leave balance' when the insert returns no row or a row failing the type guard; propagates underlying database errors unchanged.
- ILeaveBalanceRepository.update(id, balance) — Returns the updated LeaveBalance or null when not found / type-guard failure; delegates to findById when no fields are supplied; propagates database errors unchanged.
- ILeaveBalanceRepository.upsert(balance) — idempotent; Returns the mapped LeaveBalance in both the insert and conflict-update paths; throws when the returned row fails the type guard; propagates underlying database errors unchanged.
### Integration points — connect to these
- src/shared/base-repository.ts (Phase 1) — PgLeaveBalanceRepository extends BaseRepository and uses its query helper for all database access.
- src/shared/db/connection.ts (Phase 1) — The repository (via BaseRepository) uses the exported pool for PostgreSQL queries; tests mock this module's pool.query.
- leave-policy module (Phase 3) and employee module (Phase 2) — Per the reconciled dependency map, leave-balance depends on leave-policy, employee, and shared-types; this phase's repository references policyId and employeeId as foreign keys to those modules' tables, though it does not import their code directly.
- Phase 9 LeaveBalanceService — The ILeaveBalanceRepository interface and PgLeaveBalanceRepository created here are the data-access contract that the future LeaveBalanceService (deductDays, restoreDays, getAvailableBalance) will inject and call.

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
- Do not redefine a symbol another module already owns. Before declaring an error class, DTO, interface, enum, or constant, check whether a symbol representing the SAME concept is already exported by another module; if so, import it from that module's public entry point instead of declaring a second copy. The test is conceptual identity, NOT name identity — a symbol that shares a name but represents a genuinely DIFFERENT concept (different fields or meaning, owned by THIS module) is a legitimately distinct declaration and is not a violation; only flag a declaration that duplicates the shape and meaning of an existing exported symbol.

## Module boundary & dependency rules (satisfy these now)
The quality gate's review judges your code against the project's cross-module dependency rules below and BLOCKS the phase on a violation. These govern how modules depend on each other: import another module ONLY through its declared public entry point (its barrel / index) — never reach into another module's internal files — and introduce no circular dependencies. Comply now rather than leaving them for the gate:
- Modules import from each other ONLY through their declared public entry point (`index.ts`, `__init__.py`, package root — whatever the stack uses)
- No circular dependencies between modules

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