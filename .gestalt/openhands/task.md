# Implement this phase: Phase 3: LeavePolicy model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/be068fd3-a1c9-4eb0-ae38-156852fec5c5/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeavePolicy domain model and repository.

Create `src/modules/leave-policy/leave-policy.model.ts` with the LeavePolicy entity using the exact canonical fields: id, policyName, leaveType (import LeaveType from `src/shared/types/leave-type.enum.ts` from Phase 1), entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt.

Create `src/modules/leave-policy/leave-policy.repository.ts` with:
- `ILeavePolicyRepository` interface declaring: findById(id), findByLeaveType(leaveType), findActive(), findAll(), save(policy), update(id, partial)
- `PgLeavePolicyRepository` class implementing ILeavePolicyRepository using `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/leave-policy/`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all foundational questions:

1. Day counting (questions 1 and 3): Business days only — exclude weekends and public holidays from the count. days = number of business days between startDate and endDate inclusive. Apply this single rule everywhere a day count is derived from a date range: balance sufficiency validation, usedDays deduction, remainingDays computation, entitlement enforcement, and reporting.

2. Balance materialization: Materialized transactional. On each APPROVE, atomically increment leave_balances.used_days by the request's business-day count within the same transaction; on REJECT or CANCEL of a previously-approved request, atomically restore it. remaining_days = total_entitlement - used_days (computed, not stored). Deduction happens on approval (not on submission). Balances are never computed by live aggregate queries at read time.

Additional standing rules: whole days only (no partial/half days); leave year is the calendar year; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (an employee sees/acts only on their own requests; a manager/HR acts on their reports); validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only?; How are leave_balances.used_days and remaining_days computed — are they derived live from approved leave_requests (sum of day counts) or are they materialized and updated transactionally on each approval/rejection?; How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only? This affects balance sufficiency checks, balance deductions, entitlement comparisons, and reporting.; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveType: LeaveType
    - entitlementDays: number
    - accrualRate: number | null
    - maxAccumulation: number | null
    - minimumNoticeDays: number | null
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeavePolicy entity must be a plain exported interface (not a class) mirroring the Employee model's declaration style, so downstream modules consume it the same way. (see `src/modules/employee/employee.model.ts`)
- The PgLeavePolicyRepository must follow the Employee repository's structural pattern: an interface declaring the operations, a class implementing it, a private mapRow(row: Record<string, unknown>) using `as` casts (no `any`), and an update that does findById-then-merge-then-full-column UPDATE returning null when not found. (see `src/modules/employee/employee.repository.ts`)
- The leave-policy index.ts must re-export the model type(s) and the repository interface + class from their files, matching the Employee index.ts re-export convention so the module is consumed only through its public entry point. (see `src/modules/employee/index.ts`)
- The LeavePolicy entity's leaveType field must be typed as the LeaveType enum exported from this file (ANNUAL/SICK/EMERGENCY), not a string literal union or a re-declared enum, so the shared-types contract stays the single source of truth. (see `src/shared/types/leave-type.enum.ts`)
- The repository must obtain its database connection by importing the `pool` export from this file, not by constructing a new Pool, so all modules share one connection source. (see `src/shared/db/connection.ts`)
- The repository tests must mirror the Employee repository test conventions: jest.mock('shared/db/connection', () => ({ pool: { query: jest.fn() } })), a makeEntity(overrides) helper, a makeRow(entity) helper producing snake_case rows, and per-method describe blocks covering the found and not-found paths. (see `tests/unit/modules/employee/employee.repository.test.ts`)
- The model test must mirror the Employee model test conventions: assert the exact canonical field set via Object.keys().sort() comparison, assert nullability of the nullable fields, and assert all enum member cases are accepted. (see `tests/unit/modules/employee/employee.model.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A LeavePolicy has exactly two lifecycle states expressed via the isActive boolean (ACTIVE when true, INACTIVE when false); there is no deleted/terminated state and no deletedAt field — a policy is deactivated, never hard-deleted, through the repository.
- Reuse or extend `LeavePolicy`: The leaveType of a LeavePolicy is constrained to the LeaveType enum members (ANNUAL, SICK, EMERGENCY) defined in the shared-types module; a policy cannot be created or persisted with a leaveType outside that set.
- Reuse or extend `LeavePolicy`: The three numeric fields accrualRate, maxAccumulation, and minimumNoticeDays are nullable (number | null) — a policy may legitimately omit accrual/accumulation/notice configuration by setting them to null; the repository must preserve null rather than coercing to 0 or undefined.
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyRepository.findById(id) — Returns the matching LeavePolicy or null when no row exists for the id; never throws on a missing row.
- ILeavePolicyRepository.findByLeaveType(leaveType) — Returns an array of LeavePolicy rows matching the given LeaveType (possibly empty); never returns null.
- ILeavePolicyRepository.findActive() — Returns an array of LeavePolicy rows where isActive is true (possibly empty); never returns null.
- ILeavePolicyRepository.findAll() — Returns an array of all LeavePolicy rows regardless of isActive state (possibly empty); never returns null.
- ILeavePolicyRepository.save(policy) — Inserts the given LeavePolicy and returns the persisted entity as read back from the database (via RETURNING *); the caller supplies the id and timestamps.
- ILeavePolicyRepository.update(id, partial) — Performs a read-then-merge: returns null when no existing row is found for the id (no INSERT/upsert); otherwise merges the partial onto the existing entity, sets updatedAt to the current time, writes all columns, and returns the updated entity or null if the row vanished between read and write.
### Integration points — connect to these
- shared-types module (src/shared/types/leave-type.enum.ts) — LeavePolicy imports the LeaveType enum to type its leaveType field; this is the only cross-module dependency for this phase and is declared in the reconciled dependency map (leave-policy → shared-types).
- shared db connection (src/shared/db/connection.ts) — PgLeavePolicyRepository uses the shared `pool` for all queries against the leave_policies table; this is the database integration point governed by GP-001 and the no-direct-db-outside-repository constraint.
- leave-balance module (Phase 4) and leave-request module (Phase 5) — Downstream modules will import the LeavePolicy type and ILeavePolicyRepository from this module's public entry point to reference policy entitlements and validate policies; this phase establishes the contract they depend on.

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