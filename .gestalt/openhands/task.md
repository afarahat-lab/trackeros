# Implement this phase: Phase 1: Shared types and base repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/219727ae-a952-461a-b605-c6d40c0c1e42/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the foundational shared types and base repository.

Files to create:
- `src/shared/types/index.ts` — Define and export the three enums exactly as specified: `LeaveType` (values: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'), `LeaveRequestStatus` (values: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'), `UserRole` (values: 'employee' | 'manager' | 'hr_admin').
- `src/shared/base-repository.ts` — Abstract base class providing common PostgreSQL query helpers using the `pool` from `src/shared/db/connection.ts`. Include methods: `query(text, params)`, `findById(table, id)`, `findAll(table)`, `insert(table, data)`, `update(table, id, data)`, `delete(table, id)`. Use TypeScript generics. No `any` types — use `unknown` with type guards.

Existing files to read before generating: `src/shared/db/connection.ts` (for the pool export).

Include Jest unit tests in `tests/unit/shared/base-repository.test.ts`.

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

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The base repository must import and use the single shared `pool` exported from the db connection module (new Pool({ connectionString: process.env.DATABASE_URL, ... })) rather than creating its own Pool, so that all repositories share one connection pool and the no-direct-db-outside-repository constraint holds at the foundation. (see `src/shared/db/connection.ts`)
- The three exported enums (LeaveType, LeaveRequestStatus, UserRole) must match exactly the value sets declared in the reconciled architecture's domain_entities and modules sections — LeaveType: annual|sick|emergency|unpaid|maternity|paternity; LeaveRequestStatus: DRAFT|SUBMITTED|APPROVED|REJECTED|CANCELLED; UserRole: employee|manager|hr_admin — because every downstream module (employee, leave-policy, leave-balance, leave-request, audit, notification) imports from shared-types per the dependency map. (see `.gestalt/architecture/reconciled.json`)
- All shared types and base repository source must compile under the project's strict CommonJS/ES2022 tsconfig (strict: true, baseUrl: ./src) so that `npm run build` (tsc --noEmit) exits 0. (see `tsconfig.json`)
- The base repository unit tests must run under the project's ts-jest configuration (preset: ts-jest, testMatch: **/tests/**/*.test.(ts|js), moduleDirectories including src) so that `npx jest --passWithNoTests` discovers and passes them. (see `jest.config.js`)
- The base repository must remain a thin, generic, table-parameterized helper with no domain-specific query logic, consistent with ARCHITECTURE.md's "thin repository layer" pattern and the module boundary that places shared utilities (db connection, base repository, error types) under src/shared/. (see `docs/ARCHITECTURE.md`)
### Entity invariants — enforce these
- Reuse or extend `LeaveType`: The enum is closed over exactly six members — annual, sick, emergency, unpaid, maternity, paternity — each mapping to its lowercase string value; no member may be added, removed, or renamed without a reconciled-architecture change, because every LeavePolicy and LeaveBalance in later phases keys off these values.
- Reuse or extend `LeaveRequestStatus`: The enum is closed over exactly five members — DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED — each mapping to its uppercase string value; these are the only valid lifecycle states a LeaveRequest may hold, and the LeaveRequest state machine in Phase 9 depends on this exact set.
- Reuse or extend `UserRole`: The enum is closed over exactly three members — employee, manager, hr_admin — each mapping to its lowercase string value; these are the only roles the Auth Contract (request.user.role) and RBAC guards in Phase 10 may accept.
- Reuse or extend `BaseRepository`: BaseRepository is abstract and cannot be instantiated directly; it provides only generic, table-parameterized query helpers and owns no domain-specific logic, so every concrete repository in Phases 2–7 must extend it rather than re-implementing pool access.
### Interface contract — expose these operations (their shape is yours)
- BaseRepository.query — execute an arbitrary parameterized SQL text against the shared pool and return the typed QueryResult — Any error from the underlying pool (connection, syntax, constraint) must propagate to the caller unchanged; the method must not swallow or transform it.
- BaseRepository.findById — select a single row by primary key from a named table — idempotent; Returns the row when found, null when no row matches; pool errors propagate unchanged.
- BaseRepository.findAll — select all rows from a named table — idempotent; Returns an array of rows (empty array when the table has no rows); pool errors propagate unchanged.
- BaseRepository.insert — insert a row from a key/value map into a named table and return the inserted row — Returns the inserted row (via RETURNING *); constraint-violation and other pool errors propagate unchanged.
- BaseRepository.update — update the row matching a primary key in a named table from a key/value map and return the updated row — Returns the updated row when a row matched (via RETURNING *), null when no row matched the id; pool errors propagate unchanged.
- BaseRepository.delete — delete the row matching a primary key from a named table — idempotent; Returns true when a row was removed (rowCount > 0), false when no row matched; pool errors propagate unchanged.
### Integration points — connect to these
- src/shared/types/index.ts → all domain modules (employee, leave-policy, leave-balance, leave-request, audit, notification) in Phases 2–7 — Every concrete repository and service imports LeaveType, LeaveRequestStatus, and/or UserRole from this module per the reconciled dependency map (all modules → shared-types); the enum value sets are the contract those modules compile against.
- src/shared/base-repository.ts → concrete Pg*Repository classes (PgEmployeeRepository, PgLeavePolicyRepository, PgLeaveBalanceRepository, PgLeaveRequestRepository, PgAuditLogRepository, PgNotificationRepository) in Phases 2–7 — Each concrete repository extends BaseRepository to inherit the generic query/find/insert/update/delete helpers and shared pool access, satisfying GP-001 (repository pattern) and the no-direct-db-outside-repository constraint without re-implementing pool wiring.
- src/shared/db/connection.ts → src/shared/base-repository.ts (and transitively all concrete repositories) — The single shared pool is the only database connection source; the base repository consumes it and every concrete repository inherits that consumption, ensuring one connection pool across the application.

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