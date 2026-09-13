# Fix specific quality-gate violations: Sub-phase 3b — balance service method + routes + index export

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/d5341a09-a78c-4569-9d2f-9f6630b45d6d/4/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- `addMonths` must be the shared symbol imported from `src/shared/date/accrual.ts` (not a local re-implementation). (see `src/shared/date/accrual.ts`)
- The balance module must obtain its `IPolicyService` through the policy module's public entry point rather than constructing a `LeaveTypeService`. (see `src/modules/policy/index.ts`)
- The balance module's public entry point must continue to export `createBalanceService`, `IBalanceService`, `BalanceService`, `BalanceEntry`, and `balanceRoutes` unchanged. (see `src/modules/balance/index.ts`)
### Interface contract — expose these operations (their shape is yours)
- createBalanceService() factory — none (factory); unchanged — returns a concrete IBalanceService wired with PostgreSQL-backed collaborators
- IBalanceService.getBalanceForEmployee — auth enforced at route boundary (resolveActor); service method itself is unauthenticated; idempotent; unchanged — read-only, no transaction; NotFoundError only for unknown employee via getEmployeeById
### Integration points — connect to these
- src/modules/policy/ — balance obtains its policy service from policy's public entry point instead of constructing leave-type directly
- src/shared/date/accrual.ts — single source of truth for addMonths consumed by balance.service.ts

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - role: EmployeeRole
    - managerId: string | null
    - department: string
    - hireDate: Date
    - terminationDate: Date | null
    - employmentStatus: EmploymentStatus
    - passwordHash: string | null

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Answers to all four, plus two facts about the existing code that change how 3 and 4 must be implemented.

1. DATE-RANGE BOUNDARIES — inclusive on both edges, which is also "match the existing findByQuery semantics exactly". These are the same answer: LeaveRequestRepository.findByQuery already builds `start_date >= $n`, `start_date <= $n`, `end_date >= $n`, `end_date <= $n`. Do not change those operators. A calendar-day range in this domain is inclusive throughout — `requestedDays = endDate - startDate + 1` is documented as the canonical inclusive count in shared/types — so an exclusive upper bound would contradict the rest of the model.

2. GET /balances/me — return ALL leave-type balances for the caller's current period, as a list. Rationale: the endpoint exists so a client can render a leave screen, which shows every balance at once; a required leaveTypeCode param would force the client into N calls to draw one screen, and picking annual-only would silently hide sick and emergency. The singular wording in the brief was imprecise — this answer supersedes it. Return a list even when it has one element; do not special-case the single-balance shape. Include the leave type code, the period start/end, and entitled/used/pending/available on each entry.

3. ACCRUAL-PERIOD DERIVATION — extract into a shared module (option 1). Create something like `src/shared/date/accrual.ts` exporting `startOfUtcDay`, `addMonths` and `periodContaining`, and have BOTH LeaveService and the balance path import it. LeaveService.resolveBalance must be changed to call the shared version, so exactly one copy exists.

   Not option 2 (move into balance): these are pure UTC date arithmetic with no balance-domain knowledge, so they do not belong to that module, and a shared home makes them unit-testable without either module. That matters specifically here — this arithmetic is where a real timezone defect already lived: node-pg parses `date` columns to LOCAL midnight while these helpers use getUTC*, which silently shifted every accrual period by a day on any non-UTC server. `src/shared/db/connection.ts` now pins DATE parsing to UTC. Add direct unit tests for the extracted helpers, including a non-UTC case (e.g. run with TZ=Asia/Riyadh) so that defect cannot come back unnoticed.

   Not option 3 (duplicate) under any circumstances.

4. MANAGER VISIBILITY — direct reports plus self. `employee.manager_id === actor.id`, one level only, plus the manager's own requests. NOT transitive: a subtree query is a recursive CTE for a scope nobody has asked for, and "my team" in this domain means the people who report to me. ADMIN sees all; EMPLOYEE sees only their own. Apply the identical rule to GET /leaves and GET /leaves/:id, and remember that a request the caller may not see must return the SAME response as one that does not exist.

TWO FACTS THAT AFFECT THE IMPLEMENTATION — check these against the code before you design:

  - `LeaveRequestQueryParams` (src/shared/types) currently has status, leaveTypeCode, the four date bounds, limit and offset — and NO employee filter. So role scoping cannot be expressed through findByQuery as it stands. EXTEND the params type (e.g. an `employeeIds?: string[]` matched with `employee_id = ANY($n)`, which covers all three roles: one id for EMPLOYEE, manager+reports for MANAGER, omitted for ADMIN) and extend findByQuery to honour it. Do not bypass the repository by writing SQL in a service, and do not filter in application code after fetching every row — the scope must be in the query.
  - `employee.repository` has create, findById, findByEmployeeNumber and findByEmail — but nothing that lists by manager. Add a `findByManagerId` (or equivalent) to the employee repository and its interface for the MANAGER case. `findByEmail` already exists and is what POST /auth/login should use to look up the account.

Everything else in the original brief stands unchanged, including that the smoke check must be extended with real-value assertions for each new endpoint and that its existing stages must keep passing unweakened. [BINDING RULE — operator decision resolving: Are the date-range filter boundaries (startDateFrom/startDateTo/endDateFrom/endDateTo) inclusive or exclusive at each edge?; GET /balances/me returns "the caller's current leave balance" — but balances are per leave type. Which leave type (or all types) is returned?; How should the accrual-period derivation be shared between LeaveService.resolveBalance and the new GET /balances/me path?; What is the exact visibility scope for MANAGER on GET /leaves and GET /leaves/:id?; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Import addMonths from ../../shared/date/accrual and delete the private addMonths method; update carryForward to call the shared addMonths.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/balance/balance.service.ts
Line: 226
Offending code: `private addMonths(date: Date, months: number): Date {`
Rule violated: no-redefine-symbol
Action (do this now): Edit `src/modules/balance/balance.service.ts` at line 226 in place to fix the `no-redefine-symbol` violation.
What the quality gate found — apply this: [no-redefine-symbol] The shared module src/shared/date/accrual.ts already exports an `addMonths` function with byte-for-byte identical logic (shift by months, clamp day to last day of target month). BalanceService re-declares a private copy of the SAME concept instead of importing the shared symbol, violating the "do not redefine a symbol another module already owns" rule. The file already imports `periodContaining` from the same shared module, so the duplicate `addMonths` should be imported too.

- Site 2
File: src/modules/balance/balance.service.ts
Line: 228
Offending code: `private addMonths(date: Date, months: number): Date {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/balance/balance.service.ts` at line 228 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] BalanceService re-implements period arithmetic that already exists in the shared module. The spec's consistency requirement states "Reuse the shared periodContaining ... do not re-implement period arithmetic in the balance service," and the binding rule requires exactly one copy of this arithmetic. `src/shared/date/accrual.ts` already exports an identical `addMonths`, but balance.service.ts imports only `periodContaining` and keeps a private `addMonths` (used by `carryForward`), leaving a duplicate copy of the UTC month-shift logic.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 1
File: src/modules/balance/balance.routes.ts
Line: 44
Offending code: `new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository())),`
Rule violated: dependency-direction
Action (do this now): Edit `src/modules/balance/balance.routes.ts` at line 44 in place to fix the `dependency-direction` violation.
What the quality gate found — apply this: [dependency-direction] The committed dependency map for this feature (docs/ARCHITECTURE.md) lists balance → employee, policy, shared-types, shared-errors, shared-db — leave-type is NOT an allowed dependency. This line constructs `LeaveTypeService`/`PgLeaveTypeRepository` (imported from `../leave-type`), creating a direct balance → leave-type dependency that the spec constraint explicitly forbids ("do NOT add a balance -> leave-type dependency"). The PolicyService's leave-type collaborator should be wired elsewhere (e.g. a policy-module factory or app.ts registration), not by the balance module.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.