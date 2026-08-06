# Implement this phase: Phase 3: LeavePolicy model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/219727ae-a952-461a-b605-c6d40c0c1e42/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeavePolicy domain model and repository.

Files to create:
- `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` entity interface with exact fields: id: string, policyName: string, leaveType: LeaveType, entitlementDays: number, accrualRate: number | undefined, maxAccumulation: number | undefined, minimumNoticeDays: number | undefined, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date. Import LeaveType from `src/shared/types/index.ts`.
- `src/modules/leave-policy/leave-policy.repository.interface.ts` — Define `ILeavePolicyRepository` interface with methods: findById(id), findByLeaveType(leaveType), findAllActive(), create(policy), update(id, policy), deactivate(id).
- `src/modules/leave-policy/leave-policy.repository.ts` — Implement `PgLeavePolicyRepository` class implementing ILeavePolicyRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`.

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
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveType: LeaveType
    - entitlementDays: number
    - accrualRate: number | undefined
    - maxAccumulation: number | undefined
    - minimumNoticeDays: number | undefined
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The repository implementation must mirror the Employee repository structure: a private row interface with snake_case columns and an index signature, a rowToEntity mapper, an isEntityRow type guard narrowing from unknown without any, a private inner class extending BaseRepository instantiated as this.base, hand-written SQL via this.base.query, randomUUID() for IDs, new Date() for timestamps, and a dynamic SET-clause builder with a paramIndex counter for update. (see `src/modules/employee/employee.repository.ts`)
- The LeaveType enum (annual | sick | emergency | unpaid | maternity | paternity) must be imported from src/shared/types/index.ts and used as the type of LeavePolicy.leaveType; the model must not redefine the enum locally. (see `src/shared/types/index.ts`)
- The repository must extend BaseRepository (via a private inner class) and use its generic query<T extends Record<string, unknown>> helper for all SQL; it must not call pool.query directly or bypass the repository pattern. (see `src/shared/base-repository.ts`)
- The unit test must follow the Employee repository test structure: jest.mock the db connection pool before importing the repository, cast pool.query as jest.Mock, provide makeRow (snake_case) and makeEntity (camelCase) helpers, reset the mock in beforeEach, and assert SQL text contains expected table/clause fragments for each method. (see `tests/unit/modules/employee/employee.repository.test.ts`)
- The repository interface must use the same Omit/Partial<Omit> create/update signature convention as IEmployeeRepository — create accepts Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'> and update accepts Partial<Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'>>. (see `src/modules/employee/employee.repository.interface.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: Lifecycle is ACTIVE/INACTIVE governed by the isActive boolean; deactivate() transitions a policy to inactive (is_active = false) and is the only state-changing operation in this phase — there is no hard delete, only deactivation.
- Reuse or extend `LeavePolicy`: Each leave type maps to a single active LeavePolicy; findByLeaveType returns at most one record (the first active row for that leave type), reflecting the architecture's one-active-policy-per-leave-type rule.
- Reuse or extend `LeavePolicy`: createdAt and updatedAt are set to the current time on creation and updatedAt is always bumped on any update or deactivation; the repository never accepts caller-supplied id, createdAt, or updatedAt (they are Omit'd from create and update input types).
### Interface contract — expose these operations (their shape is yours)
- findById(id) — Returns the LeavePolicy or null when not found or when the row fails the type guard; propagates underlying database errors without swallowing them.
- findByLeaveType(leaveType) — Returns the single active LeavePolicy for the given leave type or null when none exists or the row fails the type guard; propagates database errors.
- findAllActive() — Returns an array of active LeavePolicy entities, filtering out any rows that fail the type guard; returns an empty array when none exist; propagates database errors.
- create(policy) — Persists a new row with a generated UUID and current timestamps and returns the mapped entity; throws a typed Error when the insert returns no row or a row failing the type guard; propagates database errors.
- update(id, policy) — Persists only provided fields, always bumps updated_at, returns the updated entity or null on not-found/type-guard failure; falls back to findById returning the current record when no fields are provided; propagates database errors.
- deactivate(id) — Sets is_active=false and updated_at=now; returns true when a row was affected (rowCount > 0) or false when the id was not found; propagates database errors.
### Integration points — connect to these
- src/shared/types/index.ts — Imports the LeaveType enum used to type LeavePolicy.leaveType; this is the sole cross-module dependency for the leave-policy module per the reconciled dependency map (leave-policy → shared-types).
- src/shared/base-repository.ts — The repository implementation extends BaseRepository to inherit the generic query helper and pool access; required by the repository-pattern constraint (GP-001) and the Employee module template.
- src/shared/db/connection.ts — The pool is consumed transitively via BaseRepository; unit tests mock this module's pool export before importing the repository, matching the Employee test pattern.
- src/modules/employee/employee.repository.ts (and its test) — The Employee repository is the direct structural template for the LeavePolicy repository (row interface, mapper, type guard, base class, SQL style, update SET-clause builder, create error throw); the implementation and tests must be structurally consistent with it.

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