# Fix specific quality-gate violations: Phase 4 — balance module

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/babd3932-368b-46a5-a4dc-6dccaafd84ba/4/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## This is fix attempt 2, but you are starting from a CLEAN branch
No earlier fix attempt's changes are present in this working tree — this branch was created from the phase's own state, not from a previous attempt. Do NOT look for a prior attempt's edits; they are not here. Work from the code that IS present, and if a file named below does not exist yet, CREATE it with the required content rather than reporting that there is nothing to change.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- BalanceService must obtain the transaction boundary exclusively through the IUnitOfWork.withTransaction contract (service owns the unit of work, data-access layer opens it), never importing the pool/client directly. (see `src/shared/db/unit-of-work.ts`)
- BalanceService must forward the transaction's PoolClient as the optional last argument to IBalanceRepository.create/findById/findByKey/update, matching the existing optional-client signatures (which fall back to the shared pool when omitted). (see `src/modules/balance/balance.repository.ts`)
- The transaction-boundary pattern must match AGENTS.md item 5: withTransaction is placed in the service (not the repository), and participating repository/service methods take the client as an optional last parameter. (see `AGENTS.md`)
### Entity invariants — enforce these
- Reuse or extend `BalanceService`: openPeriod and carryForward each execute their state-changing work atomically: either all repository writes within the operation succeed together or none are persisted (the injected IUnitOfWork.withTransaction provides this all-or-nothing boundary).
- Reuse or extend `BalanceService`: getBalance and getBalanceById are pure read-only operations that never open a transaction and never mutate balance state.
### Interface contract — expose these operations (their shape is yours)
- BalanceService.openPeriod — Preserves existing error semantics: ValidationError(400) for invalid input/non-positive entitlement, NotFoundError(404) for unknown employee/policy, ConflictError(409) for a duplicate balance key. A transaction failure propagates to the caller unchanged.
- BalanceService.carryForward — Preserves existing error semantics: ValidationError(400) for invalid sourceBalanceId / non-closable period / negative counters, NotFoundError(404) for missing source balance. A transaction failure propagates to the caller unchanged.
### Integration points — connect to these
- src/shared/db/unit-of-work.ts (IUnitOfWork) — BalanceService injects IUnitOfWork and calls withTransaction to own the atomic boundary for openPeriod/carryForward.
- src/modules/balance/balance.repository.ts (IBalanceRepository) — BalanceService forwards the transaction's PoolClient to create/findById/findByKey/update so balance writes join the transaction.
- src/modules/employee (IEmployeeService) and src/modules/policy (IPolicyService) — Read-only cross-module lookups used by openPeriod/carryForward; unchanged and do not accept a client.

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — all 12 questions. Guiding principles: follow the EXISTING codebase convention where one exists; prefer the simplest rule that is consistent across every consumer; add no new runtime dependency unless required; treat DOMAIN.md as canonical for domain vocabulary.

1. DAY COUNT: Count ALL CALENDAR DAYS, inclusive. requestedDays = endDate - startDate + 1. Do NOT exclude weekends or public holidays. This single derivation is canonical and MUST be used identically by sufficiency checks, balance deduction, and policy max-duration enforcement — implement it ONCE as a shared helper and call it from every consumer; do not re-derive it per module.

2. ACCRUAL: Grant the FULL entitlement at the start of each accrual period. No pro-rata, no monthly installments. entitledDays is the policy's full allowance for the period regardless of how much of the period has elapsed.

3. CARRY FORWARD: Carry forward unused entitled days up to the fixed cap in carryForwardDays (a HARD CAP, not a fixed allowance). Days above the cap are forfeited. When a balance period is CLOSED, min(unused, carryForwardDays) rolls into the next OPEN period.

4. MIGRATIONS: Adopt knex migrations. knex is already in package.json — use it rather than adding a new tool. Create the knexfile and a migrations directory as part of the persistence work.

5. CONTROLLER LAYER: Routes call services DIRECTLY, matching the existing uptime module pattern. Do NOT introduce controller files for any new module. Consistency with the existing codebase wins, and it keeps per-phase file counts smaller.

6. NOTIFICATIONS: Keep notifications SYNCHRONOUS (direct insert). Do NOT add BullMQ. Do not defer notifications entirely — implement them synchronously inside the existing transaction boundary.

7. ENUM NAMING: Adopt the DOMAIN.md scheme as canonical. LeaveStatus = DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. LeaveType = lowercase annual, sick, emergency, unpaid, maternity, paternity. These are the persisted string values in leave_requests.status and leave_policies.leave_type. Where root ARCHITECTURE.md disagrees, DOMAIN.md wins and ARCHITECTURE.md should be updated to match.

8. PERSISTENCE INFRASTRUCTURE: YES — create the concrete PgUnitOfWork implementation of IUnitOfWork, plus the shared base repository and shared error types, IN THIS persistence slice. Do NOT defer them to a separate shared-infrastructure phase and do not reference them by interface only. The approve/reject transaction contract (status change + balance update + audit + notification) cannot be implemented without a concrete withTransaction, so it must exist before any consumer phase. Follow the established convention: the SERVICE owns the unit of work, the DATA-ACCESS layer opens it.

9. DUPLICATE of question 4 — same decision: adopt knex migrations, create knexfile + migrations directory.

10. DUPLICATE/REFINEMENT of question 1 — same decision: INCLUSIVE, days = endDate - startDate + 1. No half-day handling: leave is whole-day only. Half-days are out of scope.

11. DUPLICATE of question 5 — same decision: routes call services directly, no controller layer, match the existing uptime pattern.

12. DUPLICATE of question 6 — same decision: do NOT add BullMQ to package.json; notifications are synchronous direct inserts. [BINDING RULE — operator decision resolving: Should the inclusive calendar-day count (requestedDays = endDate - startDate + 1) exclude weekends and/or public holidays, or count all calendar days?; Should leave balances accrue pro-rata over the accrual period, or be granted in full at the start of each period?; Should unused entitled days carry forward to the next accrual period, and if so up to what cap?; What migration mechanism should be established for PostgreSQL schema changes?; Should a controller layer be introduced for all new modules, or should routes call services directly?; Should BullMQ be added for notification fanout/accrual jobs, or keep notifications synchronous?; Which naming scheme is canonical for LeaveStatus and LeaveType enums: DOMAIN.md (DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED; annual/sick/emergency/unpaid/maternity/paternity) or root ARCHITECTURE.md (PENDING/APPROVED/REJECTED/CANCELLED; ANNUAL/SICK/MATERNITY/PATERNITY/UNPAID/OTHER)?; Should the persistence layer define the missing IUnitOfWork concrete implementation (PgUnitOfWork) and the shared base repository / error types, given none exist in the codebase?; What migration mechanism should be established, given no migrations or knexfile currently exist?; How should leave days be counted for a date range (inclusive vs exclusive end date, and half-day handling)?; Should a controller layer be introduced for new modules, or should routes call services directly (as the existing uptime module does)?; Should BullMQ be added to package.json before implementing notification fanout/accrual jobs?; apply everywhere these apply, not in one place only]

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
Before making the edits below, read the referenced files (those present in the working directory) to learn the project's architecture, conventions, and the cross-cutting rules your fix must still satisfy — then keep the edits consistent with them:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Inject IUnitOfWork from src/shared/db/index.ts into BalanceService and wrap openPeriod and carryForward in withTransaction, forwarding the transaction PoolClient to all repository calls.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/balance/balance.service.ts
Line: 32
Offending code: `constructor(
    private readonly repository: IBalanceRepository,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: IPolicyService
  ) {}`
Rule violated: unit-of-work-transaction
Action (do this now): Edit `src/modules/balance/balance.service.ts` at line 32 in place to fix the `unit-of-work-transaction` violation.
What the quality gate found — apply this: [unit-of-work-transaction] ARCHITECTURE.md's cross-cutting contract and the phase spec constraint require the service to own the unit of work via an injected IUnitOfWork.withTransaction, with participating methods accepting an optional trailing PoolClient. BalanceService does not inject IUnitOfWork and its multi-step operations (openPeriod's findByKey+create, carryForward's findById+findByKey+create/update) run outside any transaction boundary, so concurrent carryForward calls can create duplicate next-period rows and violate the "at most one balance row per (employeeId, leaveTypeCode, periodStart, periodEnd)" invariant.

- Site 2
File: src/modules/balance/balance.service.ts
Line: 35
Offending code: `private readonly policyService: IPolicyService`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/balance/balance.service.ts` at line 35 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Spec constraint #2 requires "the service owns the unit of work via an injected IUnitOfWork.withTransaction". BalanceService's constructor injects only IBalanceRepository, IEmployeeService, and IPolicyService — no IUnitOfWork — and neither openPeriod nor carryForward wraps its multi-step read/write sequence in a transaction. carryForward performs findById → getPolicyByLeaveTypeCode → findByKey → update/create non-atomically, so concurrent calls can double-carry. The repository methods do accept an optional trailing PoolClient (satisfying the second half of the constraint), but the service never opens a transaction boundary.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.