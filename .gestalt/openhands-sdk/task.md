# Implement this phase: Phase 1 — shared-types + employee read support

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/d5341a09-a78c-4569-9d2f-9f6630b45d6d/1`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Add the employee filter to the leave query params and the employee manager-listing read support that later phases consume. Approximately 5 files.

1. `src/shared/types/index.ts` — add `employeeIds?: string[]` to the existing `LeaveRequestQueryParams` interface (do NOT add any other field). This is the role-scoping hook that `findByQuery` will honour in Phase 4.

2. `src/modules/employee/employee.repository.interface.ts` — add `findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>` to `IEmployeeRepository`.

3. `src/modules/employee/employee.repository.ts` — implement `findByManagerId` with `SELECT id, employee_number, first_name, last_name, email, role, manager_id, department, hire_date, termination_date, employment_status FROM employees WHERE manager_id = $1`, reusing the existing `mapRow`. Do NOT touch `password_hash` here (that column does not exist yet — it arrives with the Phase 2 migration).

4. `src/modules/employee/employee.service.interface.ts` — add `getEmployeesByManagerId(managerId: string): Promise<Employee[]>` to `IEmployeeService`.

5. `src/modules/employee/employee.service.ts` — implement `getEmployeesByManagerId` by delegating to `this.repository.findByManagerId(managerId)`.

This phase depends on the existing files `src/modules/employee/employee.model.ts`, `employee.repository.ts`, `employee.repository.interface.ts`, `employee.service.ts`, `employee.service.interface.ts`, and `src/shared/types/index.ts` — read them before generating. Do not add routes, services beyond the above, or tests in this phase.

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

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- findByManagerId must reuse the existing `mapRow` helper and the exact employee column list already used by findById/findByEmployeeNumber/findByEmail. (see `src/modules/employee/employee.repository.ts`)
- The Employee return type of findByManagerId/getEmployeesByManagerId must match the existing Employee interface (field names and types). (see `src/modules/employee/employee.model.ts`)
- employeeIds must be added to the existing LeaveRequestQueryParams interface without disturbing the other fields. (see `src/shared/types/index.ts`)
- The repository method signature must follow the existing optional-client-last pattern (client?: PoolClient) with fallback to the shared pool. (see `src/modules/employee/employee.repository.interface.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: The Employee entity shape is unchanged; findByManagerId returns Employee instances whose managerId equals the queried managerId, preserving the existing field mapping (including managerId: string | null).
- Reuse or extend `LeaveRequestQueryParams`: employeeIds is an optional array of employee id strings used to scope leave queries by employee; it is additive and does not alter existing query-param semantics.
### Interface contract — expose these operations (their shape is yours)
- findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]> — None at this layer; authorization is applied by the consuming service/controller in later phases.; idempotent; Read-only; returns an empty array when no employees match (no throw for empty result).
- getEmployeesByManagerId(managerId: string): Promise<Employee[]> — None at this layer; role-scoping/authorization is deferred to later phases.; idempotent; Pure delegation to repository.findByManagerId; returns empty array for no matches, no not-found throw.
### Integration points — connect to these
- src/modules/leave (Phase 4 findByQuery) — employeeIds on LeaveRequestQueryParams is the role-scoping hook that leave findByQuery will honour in Phase 4.
- Manager team-view / time-off calendar surfaces (later phases) — getEmployeesByManagerId provides the manager-listing read support those surfaces consume.

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