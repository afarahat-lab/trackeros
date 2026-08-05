# Implement this phase: Phase 4: LeaveBalance model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/be068fd3-a1c9-4eb0-ae38-156852fec5c5/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveBalance domain model and repository. This phase depends on Employee (Phase 2) and LeavePolicy (Phase 3) types for foreign-key references.

Create `src/modules/leave-balance/leave-balance.model.ts` with the LeaveBalance entity using the exact canonical fields: id, employeeId, policyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status ('ACTIVE' | 'CLOSED' | 'FORECAST'), createdAt, updatedAt. Import Employee and LeavePolicy types from their respective modules for reference typing.

Create `src/modules/leave-balance/leave-balance.repository.ts` with:
- `ILeaveBalanceRepository` interface declaring: findById(id), findByEmployeeId(employeeId), findByEmployeeAndPolicy(employeeId, policyId), findByEmployeeAndFiscalYear(employeeId, fiscalYear), save(balance), update(id, partial), incrementUsedDays(id, days) — atomic increment for the materialized balance rule
- `PgLeaveBalanceRepository` class implementing ILeaveBalanceRepository using `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/leave-balance/`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all foundational questions:

1. Day counting (questions 1 and 3): Business days only — exclude weekends and public holidays from the count. days = number of business days between startDate and endDate inclusive. Apply this single rule everywhere a day count is derived from a date range: balance sufficiency validation, usedDays deduction, remainingDays computation, entitlement enforcement, and reporting.

2. Balance materialization: Materialized transactional. On each APPROVE, atomically increment leave_balances.used_days by the request's business-day count within the same transaction; on REJECT or CANCEL of a previously-approved request, atomically restore it. remaining_days = total_entitlement - used_days (computed, not stored). Deduction happens on approval (not on submission). Balances are never computed by live aggregate queries at read time.

Additional standing rules: whole days only (no partial/half days); leave year is the calendar year; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (an employee sees/acts only on their own requests; a manager/HR acts on their reports); validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only?; How are leave_balances.used_days and remaining_days computed — are they derived live from approved leave_requests (sum of day counts) or are they materialized and updated transactionally on each approval/rejection?; How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only? This affects balance sufficiency checks, balance deductions, entitlement comparisons, and reporting.; apply everywhere these apply, not in one place only]

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
    - status: 'ACTIVE' | 'CLOSED' | 'FORECAST'
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveBalance repository must obtain its database connection from the same shared pool export used by the Employee and LeavePolicy repositories, so all modules share one connection source and the optional-client unit-of-work pattern can pass a pool.connect() client across modules. (see `src/shared/db/connection.ts`)
- The repository's row-mapping must follow the established snake_case-column → camelCase-field convention used by PgEmployeeRepository and PgLeavePolicyRepository (private mapRow mapping Record<string, unknown> to the typed entity), so LeaveBalance rows map consistently with the rest of the data layer. (see `src/modules/employee/employee.repository.ts`)
- The LeaveBalance entity shape (fields, status union, numeric fiscalYear) must match the reconciled architecture's canonical LeaveBalance attributes exactly, and the module's public index.ts must re-export the entity type and repository interface/class following the same export pattern as the employee and leave-policy modules. (see `.gestalt/architecture/reconciled.json`)
- The unit tests must mock shared/db/connection (pool.query, and pool.connect for the client path) using the same jest.mock pattern and moduleDirectories path aliases (modules/leave-balance, shared/db/connection) as the existing employee and leave-policy repository tests, so the test harness resolves modules identically. (see `tests/unit/modules/employee/employee.repository.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: A LeaveBalance is scoped to exactly one employee, one leave policy, and one fiscal year; the combination (employeeId, policyId, fiscalYear) is unique — there is at most one balance row per employee per policy per fiscal year (per the reconciled SQL schema unique constraint).
- Reuse or extend `LeaveBalance`: remainingDays must always equal totalEntitlement minus usedDays (the materialized-balance invariant); usedDays may never exceed totalEntitlement for an ACTIVE balance (no negative remaining balance drawable).
- Reuse or extend `LeaveBalance`: status is one of ACTIVE, CLOSED, or FORECAST; only ACTIVE balances are drawable (used by leave-request approval), CLOSED balances are historical/finalized, and FORECAST balances are future-year and not yet usable for deductions.
- Reuse or extend `LeaveBalance`: employeeId references an existing Employee and policyId references an existing LeavePolicy (foreign-key integrity per the reconciled data model); a balance cannot reference a deleted employee or an inactive policy for new ACTIVE balances.
### Interface contract — expose these operations (their shape is yours)
- incrementUsedDays(id, days, client?) — Must execute as a single atomic UPDATE that increments used_days by `days` (positive for deduction, negative for restoration) and returns the updated LeaveBalance or null if the id does not exist. When client is provided the UPDATE runs on the caller's open transaction; when omitted it auto-commits via the shared pool. Must not perform a read-then-write sequence that breaks atomicity.
- findByEmployeeAndPolicy(employeeId, policyId) — Returns the single matching LeaveBalance or null when none exists; must not throw on a missing row. Honors the uniqueness of (employeeId, policyId, fiscalYear) only within a fiscal year — if multiple fiscal years exist for the same employee+policy, the contract must define which is returned (see ambiguity) or return the ACTIVE one.
- findById(id), findByEmployeeId(employeeId), findByEmployeeAndFiscalYear(employeeId, fiscalYear) — Returns the matching LeaveBalance or null when not found; returns an empty array (not null) for the multi-row finders findByEmployeeId and findByEmployeeAndFiscalYear when no balances match, consistent with the existing employee/leave-policy repository return conventions.
- save(balance), update(id, partial) — save persists a full LeaveBalance row and returns the mapped entity; update applies a partial merge onto the existing row (returning null when the id is absent) and must preserve the remainingDays = totalEntitlement - usedDays invariant. Neither operation writes audit records (out of scope for this phase).
### Integration points — connect to these
- Employee module (src/modules/employee) — public entry point exports the Employee type used for LeaveBalance.employeeId reference typing. — LeaveBalance.employeeId is a foreign key to employees.id; the model imports the Employee type for reference typing per the phase plan and the reconciled dependency map (leave-balance depends on employee).
- LeavePolicy module (src/modules/leave-policy) — public entry point exports the LeavePolicy type used for LeaveBalance.policyId reference typing. — LeaveBalance.policyId is a foreign key to leave_policies.id; the model imports the LeavePolicy type for reference typing per the phase plan and the reconciled dependency map (leave-balance depends on leave-policy).
- LeaveRequest service (Phase 9) — future consumer of incrementUsedDays within a shared transaction. — The optional-client parameter on incrementUsedDays is the contract the Phase 9 LeaveRequest service relies on: it acquires a pool client, issues BEGIN, passes that client to both the leave-request status update and incrementUsedDays, then COMMIT/ROLLBACK — implementing the materialized transactional balance deduction on APPROVE and restoration on REJECT/CANCEL.
- LeaveBalance service (Phase 8) — future consumer of the repository for initializeBalance, getRemainingDays, and hasSufficientBalance. — Phase 8 injects ILeaveBalanceRepository to read balances and compute remainingDays; the repository read operations and the remainingDays invariant defined here are the foundation for those service methods.

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
- Modules import from each other ONLY through their declared public entry point (`index.ts`)
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