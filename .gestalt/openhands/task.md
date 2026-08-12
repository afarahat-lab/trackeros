# Implement this phase: Phase 3: Policy module — model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/7f3a8cc3-b777-42b1-b2e3-a0c62205ede1/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the policy module at `src/modules/policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:
- `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with canonical fields: id, policyName, leaveType (LeaveType enum imported from `src/shared/types`), entitlementDays, accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays, requiresManagerApproval, isActive, isPaid, createdAt, updatedAt.
- `src/modules/policy/policy.repository.ts` — Define `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findAllActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`. Implement `LeavePolicyRepository` using the pg pool from `src/shared/db/connection.ts` with parameterized queries.
- `src/modules/policy/index.ts` — Barrel export.
- `tests/unit/modules/policy/policy.repository.test.ts` — Jest unit tests mocking the db layer.

Approximately 4–5 files.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers:
1. Fiscal/leave year: calendar year (Jan 1 to Dec 31), keyed off the leave startDate.
2. Overlapping leave requests: PREVENTED. Reject a new SUBMITTED or APPROVED request whose date range overlaps (inclusive) any existing SUBMITTED or APPROVED request for the same employee. Adjacent non-overlapping ranges are allowed.
3. Cross-fiscal-year request: deduct the whole request from a single fiscal year (the fiscal year of startDate). Do not split across years.
4. Balance initialization: auto-create balances for ALL leave types on employee creation (not lazily).
5 & 6. Balance deduction timing: deduct on APPROVAL (finalize). On submission the days are counted as PENDING (a reservation, not a deduction); on approval move pending to used; on reject or cancel release the reservation. Available balance = entitled - (used + pending).

Standard rules that apply throughout:
- Count business days only (exclude weekends); whole days only.
- Separate emergency leave pool from annual/sick.
- Every endpoint enforces RBAC (employees act on their own records; managers approve/reject their reports) plus input validation.
- When an employee has no manager, approval escalates to HR.
- Use-it-or-lose-it: no carryover of unused balance across leave years. [BINDING RULE — operator decision resolving: Should the fiscal year be calendar year (Jan 1 – Dec 31) or a configurable period (e.g., Apr 1 – Mar 31)? The current domain rule uses calendar year of startDate.; Should overlapping leave requests be prevented? E.g., an employee with an existing APPROVED or SUBMITTED request for Jan 5–10 should not be allowed to submit another for Jan 8–12.; When a leave request spans two fiscal years (e.g., Dec 28 – Jan 3), should the balance be deducted from a single fiscal year (the year of startDate) or split across both years?; How are leave balances initialized for new employees — auto-created for all leave types on employee creation, or created lazily on first leave application?; When should leave balance be deducted — on submission (reserve/hold) or on approval (finalize)? The domain rule already specifies deduction on approval, but the application architect raised this as an open question.; When should leave balance be deducted — on submission (reserve/hold) or on approval (finalize)?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeavePolicy.leaveType field must be typed as the LeaveType enum exported from src/shared/types/index.ts (reusing the enum, not re-declaring a string-union), so that the six values (ANNUAL/SICK/EMERGENCY/UNPAID/MATERNITY/PATERNITY) remain the single source of truth across modules. (see `src/shared/types/index.ts`)
- The repository must obtain its database connection by importing the `pool` (a pg.Pool) from src/shared/db/connection.ts — the same shared connection every module uses — rather than constructing its own Pool, so that connection lifecycle and DATABASE_URL configuration remain centralized. (see `src/shared/db/connection.ts`)
- The LeavePolicy interface field set and the leave_policies table column set must match the canonical shapes in .gestalt/architecture/reconciled.json (domain_entities LeavePolicy attributes and sql_schemas leave_policies): 12 interface fields mapping to snake_case columns with PK id, index on leave_type, and no soft-delete column. Do not add or remove fields. (see `.gestalt/architecture/reconciled.json`)
- The policy repository must follow the same structural conventions established by src/modules/employee/employee.repository.ts: a snake_case *Row interface, a rowTo* mapper function, a create method that generates id via crypto.randomUUID and timestamps via new Date then re-selects the persisted row, and a barrel index.ts re-exporting the model, interface, and concrete class. The sole intentional divergence is raw pg parameterized queries instead of Knex. (see `src/modules/employee/employee.repository.ts`)
- The module path and ownership must match docs/ARCHITECTURE.md's reconciled section: policy module at src/modules/policy/ owning LeavePolicy model, ILeavePolicyRepository, and LeavePolicyRepository, with dependency flow policy → shared-types only (no imports from employee/balance/leave/audit in this phase). (see `docs/ARCHITECTURE.md`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A LeavePolicy is uniquely associated with a single LeaveType; the leave_type column is indexed and the application enforces at most one active policy per leave type (is_active = true), per the reconciled schema note "unique active policy lookup per leave type (application-enforced unique where is_active = true)".
- Reuse or extend `LeavePolicy`: A LeavePolicy has no soft-delete lifecycle — the leave_policies table has no deleted_at column; deactivation is expressed via the is_active flag, not row deletion. Repository read methods therefore do not filter on a deleted_at column (unlike the Employee module).
- Reuse or extend `LeavePolicy`: The id, createdAt, and updatedAt fields are system-generated at creation time and are never supplied by the caller; the create method accepts Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'> and populates these internally (id via crypto.randomUUID, timestamps via new Date).
- Reuse or extend `LeavePolicy`: accrualRate and maxAccumulation are genuinely nullable (number | null): a null value denotes "no accrual / no accumulation cap" rather than zero, and the row mapper must preserve null rather than coercing it.
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyRepository.findById — idempotent; Returns null when no row matches the id (not-found is a normal empty result, not a thrown error). Database/query errors propagate as rejected promises (GP-006: no unhandled rejections at the call site).
- ILeavePolicyRepository.findByLeaveType — idempotent; Returns null when no policy exists for the given LeaveType. The leaveType parameter is typed as the LeaveType enum, so invalid string values are rejected at compile time. Database errors propagate as rejected promises.
- ILeavePolicyRepository.findAllActive — idempotent; Returns an empty array (not null) when no active policies exist. Filters on is_active = true. Database errors propagate as rejected promises.
- ILeavePolicyRepository.create — Generates id/createdAt/updatedAt, inserts the row, then re-selects and returns the persisted entity. A duplicate-leave-type or constraint violation propagates as a rejected promise (GP-006). The returned entity must reflect the database's stored values, not just the in-memory input.
### Integration points — connect to these
- src/shared/types/index.ts (LeaveType enum) — The policy model and repository depend on the LeaveType enum for typing the leaveType field and the findByLeaveType parameter; this is the policy module's only cross-module dependency per the reconciled dependency map (policy → shared-types).
- src/shared/db/connection.ts (pg.Pool) — The repository executes parameterized queries through the shared pg.Pool, satisfying the no-direct-db-outside-repository constraint and centralizing connection configuration.
- tests/unit/modules/employee/employee.repository.test.ts (test pattern) — The policy repository test must mirror the employee test's structure (mocking the db layer, covering found/null/array/create cases) but adapt the mock strategy to raw pg's {rows:[...]} return shape rather than the Knex thenable query-builder chain, as settled during discovery.
- Phase 7 (PolicyService) and Phase 4 (Balance module) — downstream consumers — The ILeavePolicyRepository interface and LeavePolicy model produced here are the contract that Phase 7's PolicyService will delegate to and that Phase 4's BalanceService will consume (balance → policy dependency); the interface signatures must remain stable for those phases to build on.

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