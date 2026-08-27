# Implement this phase: Phase 5: Leave module (core) (~5 files)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/2a5d3d87-ce68-4c51-a1e4-6c85bde3c2fd/5`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave module — model (with DTOs + day-count helper), repository interface, service interface, service implementation, and routes.

**This phase depends on ALL prior phases. Read these files before generating any code:**
- `src/shared/types/index.ts` from Phase 1 — for `LeaveStatus`, `LeaveType`, `BaseEntity`
- `src/modules/employee/employee.model.ts` from Phase 1 — for `Employee`
- `src/modules/policy/policy.model.ts` from Phase 2 — for `LeavePolicy`
- `src/modules/balance/balance.model.ts` from Phase 3 — for `LeaveBalance`
- `src/modules/balance/balance.repository.interface.ts` from Phase 3 — for `IBalanceRepository`
- `src/modules/balance/balance.service.interface.ts` from Phase 3 — for `IBalanceService`
- `src/modules/audit/audit.model.ts` from Phase 4 — for `AuditRecord`, `AuditAction`
- `src/modules/audit/audit.repository.interface.ts` from Phase 4 — for `IAuditRepository`
- `src/modules/audit/audit.service.interface.ts` from Phase 4 — for `IAuditService`

**Files to create:**

1. `src/modules/leave/leave.model.ts` — Define:
   - `LeaveRequest` entity interface with EXACT canonical fields: `id: string, employeeId: string, policyId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveStatus, approvedBy: string | null, approvedAt: Date | null, createdAt: Date, updatedAt: Date`. Import `LeaveStatus` from `../../shared/types/index.ts` and `BaseEntity` from `../../shared/types/index.ts`.
   - `CreateLeaveRequestDto`: `employeeId: string, policyId: string, startDate: Date, endDate: Date, reason?: string`
   - `UpdateLeaveRequestDto`: `startDate?: Date, endDate?: Date, reason?: string`
   - `LeaveRequestQueryParams`: `employeeId?: string, status?: LeaveStatus, startDate?: Date, endDate?: Date`
   - **`countLeaveDays(startDate: Date, endDate: Date): number`** — BINDING RULE #6: exported helper computing `endDate - startDate + 1` (inclusive, calendar days, no weekend/holiday exclusion). This is the SINGLE canonical day-count function; every call site in the service MUST use it.

2. `src/modules/leave/leave.repository.interface.ts` — Define `ILeaveRequestRepository` interface with methods:
   - `findById(id: string): Promise<LeaveRequest | null>`
   - `findByEmployee(employeeId: string, queryParams?: LeaveRequestQueryParams): Promise<LeaveRequest[]>`
   - `findApprovedOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeRequestId?: string): Promise<LeaveRequest[]>` — for overlap detection at approval time
   - `create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`
   - `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest>`
   - `updateStatus(id: string, status: LeaveStatus, approvedBy?: string | null, approvedAt?: Date | null): Promise<LeaveRequest>`
   Import `LeaveRequest`, `LeaveRequestQueryParams` from `./leave.model`, `LeaveStatus` from `../../shared/types/index.ts`.

3. `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with methods:
   - `submit(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — creates DRAFT→PENDING, reserves days, audits
   - `approve(requestId: string, approverId: string): Promise<LeaveRequest>` — PENDING→APPROVED with overlap check + balance sufficiency, commits days, audits
   - `reject(requestId: string, rejectorId: string): Promise<LeaveRequest>` — PENDING→REJECTED, releases days, audits
   - `cancel(requestId: string, employeeId: string): Promise<LeaveRequest>` — PENDING→CANCELLED (releases) or APPROVED→CANCELLED (restores), audits
   - `getById(requestId: string): Promise<LeaveRequest | null>`
   - `query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>`
   Import `LeaveRequest`, `CreateLeaveRequestDto`, `LeaveRequestQueryParams` from `./leave.model`.

4. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor takes: `ILeaveRequestRepository`, `IBalanceRepository`, `IAuditRepository`, `IPolicyRepository`.

   **BINDING RULES implemented in this file:**

   **`submit`:** Validate `startDate < endDate`. Compute `days = countLeaveDays(startDate, endDate)`. Determine `year = startDate.getFullYear()`. Look up active policy via `IPolicyRepository.findActiveByLeaveType` — if none, throw. Validate minimum notice: if `policy.minimumNoticeDays` is set, `startDate - today >= minimumNoticeDays`. Get or create balance for `(employeeId, policyId, year, policy.entitlementDays)`. Reserve days on balance: `pendingDays += days`. Create LeaveRequest with `status = PENDING`. Audit with action `CREATE`. All in one logical flow.

   **`approve`:** Fetch request, validate `status === PENDING`. Compute `days = countLeaveDays(request.startDate, request.endDate)`. Determine `year = request.startDate.getFullYear()`. **Overlap check:** call `findApprovedOverlapping(employeeId, startDate, endDate, requestId)` — if any results, throw Error. **Balance sufficiency:** check `availableDays >= days` via balance. Commit days: `pendingDays -= days, usedDays += days`. Update request: `status = APPROVED, approvedBy = approverId, approvedAt = new Date()`. Audit with action `APPROVE`.

   **`reject`:** Fetch request, validate `status === PENDING`. Compute `days = countLeaveDays(...)`. Release days: `pendingDays -= days`. Update request: `status = REJECTED`. Audit with action `REJECT`.

   **`cancel`:** Fetch request, validate `employeeId` matches `request.employeeId`. If `status === PENDING`: compute days, release days (`pendingDays -= days`), set `status = CANCELLED`. If `status === APPROVED`: compute days, restore days (`usedDays -= days`), set `status = CANCELLED`. Otherwise throw. Audit with action `DELETE` (or a generic cancel audit).

   **Every mutating method** uses `countLeaveDays` from `./leave.model` — never inline day-count arithmetic.

   Import from: `./leave.model`, `./leave.repository.interface`, `./leave.service.interface`, `../../shared/types/index.ts`, `../balance/balance.repository.interface`, `../audit/audit.repository.interface`, `../policy/policy.repository.interface`.

5. `src/modules/leave/leave.routes.ts` — Fastify route registration following the existing `uptime.routes.ts` pattern. Register routes under prefix `/leave`:
   - `POST /leave` — submit a leave request (body: CreateLeaveRequestDto)
   - `GET /leave/:id` — get by id
   - `GET /leave` — query with query string params (employeeId, status, startDate, endDate)
   - `POST /leave/:id/approve` — approve (body: { approverId: string })
   - `POST /leave/:id/reject` — reject (body: { rejectorId: string })
   - `POST /leave/:id/cancel` — cancel (body: { employeeId: string })

   Instantiate `LeaveService` with stub/mock repositories for now (the concrete Knex implementations come in a later phase). Each handler wraps in try/catch returning 500 on error. Import `LeaveService` from `./leave.service`, `CreateLeaveRequestDto` from `./leave.model`.

**Tests:** Include Jest unit tests at `tests/unit/modules/leave/leave.service.spec.ts` mocking all four repository dependencies. Test: submit creates PENDING request and reserves days; approve with no overlap and sufficient balance succeeds; approve with overlap throws; approve with insufficient balance throws; reject releases days; cancel on PENDING releases days; cancel on APPROVED restores days; cancel on REJECTED throws; countLeaveDays returns correct inclusive count.

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
- CONSOLIDATED DECISION — binding for every phase of this feature.

1 — THERE IS NO FISCAL YEAR. The leave year IS the CALENDAR year: 1 January to 31 December.
Balances reset on 1 January. Do NOT implement a configurable fiscal-year start month and do
NOT implement employee-anniversary years (the latter would additionally require hire dates
this feature does not own). Store the year as a plain integer (e.g. 2026) on the balance
record and derive it from the leave request's startDate. A request whose range crosses
31 December is charged IN FULL to the year of its startDate — never split across two years.

2 — NO overlapping APPROVED leave for the same employee. Enforce at APPROVAL time, not at
submission: a submission-time check cannot account for other PENDING requests approved later,
so approval is the only authoritative gate. Run the overlap check and the balance-sufficiency
check at the SAME point in the approval path so both invariants hold together. Overlap = any
intersection of the [startDate, endDate] range with an existing APPROVED request for that
employee, regardless of leave type.

3 — NO half-day leave. Leave is counted in WHOLE days only; every day counter is an integer.
Do not add a fraction, a half-day flag, or a start/end period (AM/PM) field. This is a
deliberate scope decision: half-days would make every counter fractional and would interact
badly with the inclusive day-count rule in (6).

4 — remainingDays IS DERIVED, NEVER STORED. The balance record holds three non-negative
integer counters — entitlementDays, usedDays, pendingDays — and availability is always
computed:
    availableDays = entitlementDays - usedDays - pendingDays
Do not add a remainingDays column. A stored counter updated on every deduction and
restoration is the classic drift defect: two code paths disagree and the balance silently
goes wrong. Expose it as a computed property/selector so every caller derives it identically.

The ONLY permitted writes to the counters:
- SUBMIT a request for n days:  pendingDays += n   (reserve; usedDays unchanged)
- APPROVE it:                   pendingDays -= n, usedDays += n   (availableDays unchanged —
                                the days were already reserved at submit)
- REJECT a PENDING request:     pendingDays -= n   (release)
- CANCEL a PENDING request:     pendingDays -= n   (release)
- CANCEL an APPROVED request:   usedDays -= n      (restore)
No counter may go negative; a transition that would take one below zero is an ERROR, not a
clamp. The sufficiency check before approval is n <= availableDays.

5 — NO CARRY-OVER AND NO ACCRUAL. The full annual entitlement is available from 1 January.
Unused days simply EXPIRE at 31 December — they do not roll into the next year, and there is
no monthly/pro-rata accrual, no maximum-carry-over cap, and no expiry-deadline logic. On
1 January a fresh balance row is created for the new year with usedDays = 0 and
pendingDays = 0. Mid-year joiners receive the full entitlement (no proration).

6 — LEAVE DAY COUNT = CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. Do NOT exclude weekends. Do NOT exclude public holidays.
There is no holiday calendar in scope.
Implement this EXACTLY ONCE as a single shared exported helper (e.g.
countLeaveDays(startDate, endDate)) in the leave domain module, and call that helper from
EVERY site needing a day count: balance deduction on APPROVED, restoration on CANCELLED, the
sufficiency check before approval, entitlement comparison, and minimumNoticeDays enforcement.
No call site may re-derive the count inline — inline re-derivation is the anti-pattern this
decision exists to prevent.

STANDING DECISIONS carried forward from earlier runs of this feature (unchanged):
- Emergency leave has its OWN entitlement pool, separate from annual; default 5 days. Model
  all types uniformly: annual, sick and emergency each get their own LeavePolicy entitlement
  and their own LeaveBalance record. No special-casing of any type in the balance logic.
- NO documentation requirement for sick leave. Do NOT add a PENDING_DOCUMENTATION state and
  do NOT add any document-tracking entity. The LeaveRequest lifecycle is exactly:
  PENDING -> APPROVED | REJECTED, and PENDING | APPROVED -> CANCELLED.
- Every operation that changes a LeaveRequest status AND balance counters AND writes an audit
  record must run all three through the SAME transaction client, in ONE transaction, so a
  failure rolls back the whole thing. [BINDING RULE — operator decision resolving: What is the fiscal year start month? The domain currently assumes January (calendar year). Many organisations use April or July. This affects which fiscalYear a leave request maps to for balance lookups.; Should the system prevent overlapping leave requests for the same employee? If so, what states count as "active" for overlap detection (APPROVED only, or SUBMITTED + APPROVED)?; Should the system support half-day leave requests? The current model uses Date for startDate/endDate, implying full-day granularity.; How should remainingDays be computed — as a derived field (totalEntitlement - usedDays) or as a stored column that is updated on every deduction/restoration?; What are the fiscal-year boundary rules for balance carry-over and accrual? Should unused days carry over to the next fiscal year, and if so, up to what cap?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; apply everywhere these apply, not in one place only]

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