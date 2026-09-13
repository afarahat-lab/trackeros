# Continue the previous attempt (it hit the iteration limit before finishing)

A prior code-agent attempt on this work dir (`/tmp/gestalt/phase/d5341a09-a78c-4569-9d2f-9f6630b45d6d/3`) was stopped after reaching its iteration limit. Its work is ALREADY on disk here — do NOT restart from scratch or re-read everything; build on what exists. It made 20 file edit(s). Its last verification PASSED (`cd /tmp/gestalt/phase/d5341a09-a78c-4569-9d2f-9f6630b45d6d/3 && npm test 2>&1 | tail -60`).

Finish the task now: fix any failing build/type-check/tests, then RUN the build and the tests and fix anything still failing. Stop as soon as the build and tests pass. The full original task (with all mandatory constraints) follows for reference.

---

# Implement this phase: Phase 3 — balance read endpoint

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/d5341a09-a78c-4569-9d2f-9f6630b45d6d/3`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Extract the accrual-period UTC helpers into a shared module and add `GET /balances/me`. Approximately 6 files.

1. `src/shared/date/accrual.ts` — NEW file exporting `startOfUtcDay(date: Date): Date`, `addMonths(date: Date, months: number): Date`, and `periodContaining(anchor: Date, accrualMonths: number, date: Date): { start: Date; end: Date }`. Copy the exact UTC arithmetic currently in `LeaveService` (private `startOfUtcDay`/`addMonths`/`periodContaining`), including the 10,000-iteration safety bound and the ConflictError on a date preceding the anchor. This is the single source of truth for accrual-period derivation.

2. `src/modules/leave/leave.service.ts` — delete the private `startOfUtcDay`, `addMonths`, and `periodContaining` methods and import the three helpers from `src/shared/date/accrual.ts` instead. `resolveBalance` must call the shared `periodContaining`. No behaviour change.

3. `src/modules/balance/balance.service.ts` — add `getBalanceForEmployee(employeeId: string): Promise<...>` to `IBalanceService` and implement it in `BalanceService`. It returns ALL leave-type balances for the caller's CURRENT period as a LIST (never a single object, even when one element). For each leave type, resolve the policy's `accrualPeriodMonths`, compute the current period via the shared `periodContaining(employee.hireDate, accrualMonths, new Date())`, and look the balance up with `findByKey`. Each returned entry includes `leaveTypeCode`, `periodStart`, `periodEnd`, `entitledDays`, `usedDays`, `pendingDays`, and a computed `available = entitledDays - usedDays - pendingDays`. Read-only — no transaction, no writes.

4. `src/modules/balance/balance.routes.ts` — NEW file: `balanceRoutes(fastify)` registering `GET /balances/me` (200). Resolve the actor from `request.user` (never a client-supplied id) with a `resolveActor` helper matching `leave.routes.ts`, call `getBalanceForEmployee(actor.id)`, and map errors via `sendError`.

5. `src/modules/balance/index.ts` — export `balanceRoutes`.

6. `src/app.ts` — register `balanceRoutes`.

This phase depends on Phase 1 (`src/modules/employee` service for `getEmployeeById`), the existing `src/modules/balance/balance.service.ts` / `balance.repository.ts` / `balance.model.ts`, `src/modules/policy` (`getPolicyByLeaveTypeCode`), and `src/modules/leave/leave.service.ts`. Read them before generating. Do not add unit tests here (they land in Phase 5).

## Your iteration budget — and how to get more (READ BEFORE YOU START)

You have a HARD budget of **30 iterations** for this task; one tool call is one iteration. When it runs out you are CUT OFF mid-work — the unfinished phase is recorded as a FAILURE, not as progress. Nothing warns you as you approach it, so you cannot rely on noticing.

**Exploration is what exhausts it.** Measured on this platform's recent phases: the code-agent spent 19 of its 27 file-editing calls on `view` — it ran out of budget reading the codebase, not building the feature. Phases that were cut off had nearly all of their budget consumed before the writing started.

You have a `task` tool. It runs a FRESH sub-agent with its OWN separate 30-iteration budget and its OWN context window, in this same working directory. Everything that sub-agent reads and writes costs you **one** iteration, not 30. It is the supported way to get more capacity, and using it is normal — not an admission of difficulty.

### DELEGATE BY DEFAULT

**Assume you WILL delegate this phase. The question is not whether, but how to slice it.** Decide NOW, before your first edit — a decision made after you have spent half your budget exploring is a decision made too late.

Delegate unless the phase is *trivially* small, which means ALL of:
- it creates or changes **at most 2 files**, AND
- it introduces **no new module**, AND
- you are confident you can finish it, verified, in well under 10 iterations.

If you cannot say all three with confidence, delegate. When you are unsure, delegate — an unnecessary hand-off costs a few iterations, whereas running out costs the entire phase.

### Delegate the READING, not just the writing

The most valuable first delegation is usually a SURVEY, because that is where the budget actually goes. Instead of opening a dozen files yourself, send a sub-agent to read them and report back what you need: the existing conventions, the shapes and signatures you must match, where the seams are. It burns its own budget on that reading and returns you a digest for one iteration.

Then delegate the implementation slices.

### How to delegate
- Call `task` with `subagent_type='gestalt-implementer'`, ONE call per slice, at most **4** for this phase. Each call blocks until that sub-agent finishes and reports back — they never run at the same time.
- Split implementation slices by MODULE or FILE GROUP so they own DISJOINT files. Two slices must never edit the same file.
- Give each one a self-contained prompt: the exact files it owns, what to build, the conventions it must follow, and what to report back. It cannot see this task, so anything you do not tell it, it does not know.

**Never delegate the final verification.** Run the build and the tests YOURSELF, over the whole phase, after the slices are back — a sub-agent only sees its own slice, so its 'it passes' means 'my slice compiled', not 'the phase works'.

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

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The extracted startOfUtcDay/addMonths/periodContaining must reproduce the exact UTC arithmetic, safety bound, and ConflictError semantics of the current private helpers in LeaveService.resolveBalance. (see `src/modules/leave/leave.service.ts`)
- The balance route's resolveActor and sendError helpers must match the behaviour of the existing leave route helpers (actor from request.user, role membership check, AppError → { error, code } with status, other → 500). (see `src/modules/leave/leave.routes.ts`)
- getBalanceForEmployee must resolve the policy's accrualPeriodMonths via IPolicyService.getPolicyByLeaveTypeCode and the employee's hireDate via IEmployeeService.getEmployeeById, matching how LeaveService.resolveBalance derives the period. (see `src/modules/leave/leave.service.ts`)
- The balance lookup must use IBalanceRepository.findByKey(employeeId, leaveTypeCode, periodStart, periodEnd) with the same key semantics (at-most-one row per key). (see `src/modules/balance/balance.repository.ts`)
- The returned entry's available field must equal entitledDays - usedDays - pendingDays, the same sufficiency arithmetic used by validateSufficiency. (see `src/modules/validation/validation.service.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: A balance entry returned by getBalanceForEmployee is a projection of an existing LeaveBalance row: leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays are the persisted values, and available is derived as entitledDays - usedDays - pendingDays (never persisted).
- Reuse or extend `Accrual period (shared date helper)`: periodContaining(anchor, accrualMonths, date) returns the half-open UTC period [start, end) containing date, anchored at startOfUtcDay(anchor), stepping accrualMonths at a time with a 10,000-iteration bound; a date strictly before the anchor throws ConflictError.
### Interface contract — expose these operations (their shape is yours)
- getBalanceForEmployee(employeeId: string): Promise<BalanceEntry[]> — Caller is the authenticated actor; the employeeId is the actor's own id resolved at the route boundary from request.user.; idempotent; Read-only; throws NotFoundError when the employee or a policy is missing, and propagates ConflictError from periodContaining when the current date precedes the hire-date anchor.
- GET /balances/me — Requires an authenticated actor (request.user with a valid EmployeeRole); missing/invalid actor → 401.; idempotent; 200 with a list of balance entries; AppError mapped to { error, code } with its status, other throws → 500.
### Integration points — connect to these
- src/modules/employee (IEmployeeService.getEmployeeById) — Resolve the employee's hireDate, the accrual anchor for periodContaining.
- src/modules/policy (IPolicyService.getPolicyByLeaveTypeCode) — Resolve accrualPeriodMonths per leave type to compute the current period.
- src/modules/leave-type (ILeaveTypeService.getLeaveTypeByCode / repository findAll) — Enumerate the leave types whose balances must be returned.
- src/shared/date/accrual.ts — Single source of truth for accrual-period derivation consumed by both LeaveService and BalanceService.
- src/shared/errors (ConflictError, NotFoundError) — Error semantics for missing employee/policy and pre-anchor dates.

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
- **While fixing, re-run ONLY what you are fixing** — the specific failing test file(s), or the type-check alone for a type error. Do NOT re-run the whole suite after every edit. A measured run spent ~60 full build/test cycles inside a 30-iteration budget and was cut off mid-work: the suite is the slowest thing you can do, and re-running all of it to learn about one file buys nothing.
- Run the FULL build and the FULL suite ONCE at the end, to confirm the whole phase holds together. That run is the one that matters; the narrow ones are just your fix loop.
- If a command HANGS or produces no output, do not sit through it repeatedly: note it, work around it (a narrower target, or a timeout), and say so in your final message. Repeatedly interrupting and re-running the same hanging command is the single most expensive thing you can do with your budget.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.