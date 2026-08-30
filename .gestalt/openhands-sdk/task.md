# Continue the previous attempt (it hit the iteration limit before finishing)

A prior code-agent attempt on this work dir (`/tmp/gestalt/phase/dd1a6d9f-1b67-4054-9579-5cb7ccee58f3/7`) was stopped after reaching its iteration limit. Its work is ALREADY on disk here — do NOT restart from scratch or re-read everything; build on what exists. It made 6 file edit(s). Its last verification PASSED (`cd /tmp/gestalt/phase/dd1a6d9f-1b67-4054-9579-5cb7ccee58f3/7 && npm run build 2>&1 | tail -30 && echo "EXIT=$?" && git status`).

Finish the task now: fix any failing build/type-check/tests, then RUN the build and the tests and fix anything still failing. Stop as soon as the build and tests pass. The full original task (with all mandatory constraints) follows for reference.

---

# Implement this phase: Phase 4b — Leave service + controller + routes + app registration

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/dd1a6d9f-1b67-4054-9579-5cb7ccee58f3/7`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
src/modules/leave/leave.service.ts exists and implements ILeaveService, computing n via countLeaveDays once per operation and enforcing sufficiency + overlap on APPROVE in the same place.
Balance year is derived from startDate once; a request crossing 31 Dec is charged in full to its startDate's year.
Status change, balance counter change, and audit write run through the same unit-of-work client in one transaction.
src/modules/leave/leave.controller.ts and leave.routes.ts exist and expose Fastify routes for submit/approve/reject/cancel.
src/app.ts registers the leave routes alongside the existing uptimeRoutes and the app still starts.

## Success criteria
Create the leave orchestrator and HTTP layer.

- src/modules/leave/leave.service.ts — LeaveService orchestrating submit/approve/reject/cancel. Compute n via countLeaveDays once per operation. On APPROVE: enforce sufficiency (n <= availableDays) and overlap (no intersecting APPROVED request for the same employee, regardless of leave type) in the same place. Derive the balance year from startDate once (binding rule 4 — a request crossing 31 Dec is charged in full to its startDate's year; never split). Every status change + balance counter change + audit write runs through the SAME unit-of-work client in ONE transaction (pass the client through to balance and audit services).
- src/modules/leave/leave.controller.ts and src/modules/leave/leave.routes.ts — Fastify routes/controller.
- Register the routes in src/app.ts (read it first; it currently registers uptimeRoutes).

Read src/modules/balance/balance.service.ts, src/modules/audit/audit.service.ts, src/modules/notification/notification.service.ts, and src/app.ts before generating code that references them. Do NOT create tests in this sub-phase.

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Phase 4a — Leave model + repository": src/modules/leave/leave.model.ts, src/modules/leave/leave.repository.ts
- "Phase 4c — Leave module unit tests": tests/unit/modules/leave/leave.service.test.ts, tests/unit/modules/leave/leave.model.test.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Phase 4c — Leave module unit tests. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

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

1 — LEAVE DAY COUNT = CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. Do NOT exclude weekends. Do NOT exclude public holidays.
There is no holiday calendar in scope for this feature.
Implement this EXACTLY ONCE as a single shared exported helper (e.g.
countLeaveDays(startDate, endDate)) in the leave domain module, and call that helper from
EVERY site needing a day count: balance deduction on APPROVED, restoration on CANCELLED, the
sufficiency check before approval, entitlement comparison, and minimumNoticeDays enforcement.
No call site may re-derive the count inline — inline re-derivation is the anti-pattern this
decision exists to prevent.

2 — THERE IS NO FISCAL YEAR. The leave year IS the CALENDAR year: 1 January to 31 December.
Balances reset on 1 January. Do NOT implement a configurable fiscal-year start month and do
NOT implement employee-anniversary years (the latter would need hire dates this feature does
not own). Store the year as a plain integer (e.g. 2026) on the balance record.
NO CARRY-OVER AND NO ACCRUAL: the full annual entitlement is available from 1 January, and
unused days simply EXPIRE at 31 December — they do not roll over, there is no monthly or
pro-rata accrual, no carry-over cap and no expiry-deadline logic. On 1 January a fresh balance
row is created for the new year with usedDays = 0 and pendingDays = 0. Mid-year joiners
receive the FULL entitlement (no proration).

3 — SEPARATE BALANCES PER LEAVE TYPE, and ALL types require manager approval.
Annual, sick and emergency each get their OWN LeavePolicy entitlement and their OWN
LeaveBalance record. Emergency leave does NOT draw from the annual pool; its default
entitlement is 5 days. Model all three uniformly — no special-casing of any type anywhere in
the balance logic.
Every type goes through the SAME approval lifecycle: PENDING -> APPROVED | REJECTED, and
PENDING | APPROVED -> CANCELLED. There is no auto-approving type and no post-hoc approval path.
NO documentation requirement for sick leave: do NOT add a PENDING_DOCUMENTATION state and do
NOT add any document-tracking entity.

4 — A REQUEST IS NEVER SPLIT ACROSS TWO YEARS. A request whose [startDate, endDate] range
crosses 31 December is charged IN FULL to the balance year of its startDate. Do not split the
day count between two balance records, do not create a second linked request, and do not
reject it for crossing the boundary. Derive the balance year from startDate, once.

BALANCE COUNTER SEMANTICS (binding, and the reason remainingDays is never stored):
The balance record holds three non-negative integer counters — entitlementDays, usedDays,
pendingDays — and availability is ALWAYS derived, never stored:
    availableDays = entitlementDays - usedDays - pendingDays
The ONLY permitted writes:
- SUBMIT a request for n days:  pendingDays += n   (reserve; usedDays unchanged)
- APPROVE it:                   pendingDays -= n, usedDays += n
- REJECT a PENDING request:     pendingDays -= n   (release)
- CANCEL a PENDING request:     pendingDays -= n   (release)
- CANCEL an APPROVED request:   usedDays -= n      (restore)
No counter may go negative; a transition that would take one below zero is an ERROR, not a
clamp. The sufficiency check before approval is n <= availableDays.

TRANSACTIONS: every operation that changes a LeaveRequest status AND balance counters AND
writes an audit record must run all three through the SAME unit-of-work client in ONE
transaction, so a failure rolls back all three. Repository AND service methods that
participate take the client as an OPTIONAL LAST parameter and pass it through; when omitted
they use the shared pool. Negative guards live in ONE place (the balance service) and are
never duplicated into callers.

OVERLAP: no overlapping APPROVED leave for the same employee, enforced at APPROVAL time (not
submission) in the same place as the sufficiency check. Overlap = any intersection of the
[startDate, endDate] range with an existing APPROVED request, regardless of leave type. [BINDING RULE — operator decision resolving: Should leave duration be measured in calendar days or business (working) days, and should weekends/public holidays be excluded from the count?; How is the fiscal year boundary defined for balance accrual and carry-over, and is unused annual leave carried over or forfeited?; Should sick and emergency leave be deducted from the same annual entitlement pool or tracked as separate balances, and do they require manager approval?; Can a leave request span multiple fiscal years, and if so how is the duration split across the two balances?; What is the rounding direction and precision for remaining_days when entitlement is fractional (accrual_rate present) or when used_days is fractional?; How is the fiscal year boundary defined for balance accrual and carry-over (e.g. calendar year Jan 1–Dec 31 vs. a company-specific fiscal year), and is unused annual leave carried over or forfeited?; How are leave days counted when computing used_days and remaining_days (e.g. inclusive vs exclusive of end_date, half-day support, weekend/holiday exclusion, rounding direction)?; How are leave days counted for a request spanning partial days or weekends/holidays?; How is the fiscal year derived for a leave request?; What is the rounding rule for partial-day balances (e.g. half-day leave)?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The service must call BalanceService.reserve/approve/reject/cancel with the day count n and the unit-of-work client, matching the exact method signatures (balanceId, days, [requestStatus], client?) declared in IBalanceService — do not reimplement counter math. (see `src/modules/balance/balance.model.ts`)
- The service must call AuditService.record(input, client?) with the AuditLogInput shape (entityType/entityId/action/oldValues/newValues/performedBy) and pass the same unit-of-work client. (see `src/modules/audit/audit.model.ts`)
- The service must call NotificationService.notify(input, client?) with the NotificationInput shape and honor its both-or-null relatedEntityType/relatedEntityId invariant. (see `src/modules/notification/notification.model.ts`)
- The service must import countLeaveDays from the leave module and use it as the single day-count source; the returned value is endDate - startDate + 1 inclusive calendar days. (see `src/modules/leave/leave.model.ts`)
- The service must use the shared error types (ValidationError, NotFoundError, InsufficientBalanceError, OverlapError) and their statusCode/code contract rather than ad-hoc errors. (see `src/shared/types/errors.ts`)
- Routes must register against the Fastify instance in the same style as uptimeRoutes (async plugin function receiving fastify) and be registered in src/app.ts alongside the existing uptimeRoutes registration. (see `src/app.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Lifecycle transitions are strictly SUBMITTED -> APPROVED | REJECTED, and SUBMITTED | APPROVED -> CANCELLED; approve/reject/cancel must reject requests not in the correct prior state (e.g. approving a non-SUBMITTED request is an error).
- Reuse or extend `LeaveRequest`: On APPROVE, approvedBy/approvedAt are set; on REJECT, rejectedBy/rejectedAt/rejectionReason are set; on CANCEL, cancelledBy/cancelledAt are set — each transition stamps its actor/timestamp fields and updates updatedAt.
- Reuse or extend `LeaveBalance`: Counter transitions follow the binding semantics: SUBMIT reserves pendingDays += n; APPROVE moves pendingDays -= n / usedDays += n; REJECT/CANCEL(pending) release pendingDays -= n; CANCEL(approved) restores usedDays -= n — all via BalanceService, never directly.
- Reuse or extend `AuditLog`: Every state-changing operation (submit/approve/reject/cancel) writes exactly one audit record with the matching action (SUBMIT/APPROVE/REJECT/CANCEL) and the request id as entityId, in the same transaction as the status change.
### Interface contract — expose these operations (their shape is yours)
- submit — employee (own request); actorId must equal the request's employeeId; invalid input -> ValidationError (400); unknown employee/leaveType/policy -> NotFoundError (404); insufficient balance -> InsufficientBalanceError (422)
- approve — manager or hr_admin; no self-approval (actorId must not equal the request's employeeId); not found -> NotFoundError (404); wrong prior state -> ValidationError (400); insufficient balance -> InsufficientBalanceError (422); overlap -> OverlapError (422)
- reject — manager or hr_admin; not found -> NotFoundError (404); wrong prior state -> ValidationError (400); missing rejectionReason -> ValidationError (400)
- cancel — employee (own request) or hr_admin; not found -> NotFoundError (404); wrong prior state (not SUBMITTED/APPROVED) -> ValidationError (400)
### Integration points — connect to these
- src/modules/balance/balance.service.ts (BalanceService) — Orchestrator delegates all counter transitions (reserve/approve/reject/cancel) and sufficiency derivation; negative guards live here only.
- src/modules/audit/audit.service.ts (AuditService) — Every state-changing operation writes an audit record in the same transaction (GP-002).
- src/modules/notification/notification.service.ts (NotificationService) — Lifecycle events (submitted/approved/rejected/cancelled) notify the employee/manager.
- src/modules/leave/leave.repository.ts (PgLeaveRequestRepository) — Persistence of the LeaveRequest aggregate and the findApprovedOverlapping overlap query used at approval.
- src/shared/db/connection.ts (pool) — Source of the unit-of-work PoolClient for the single transaction spanning status + balance + audit writes.
- src/app.ts (Fastify app registration) — Leave routes must be registered so endpoints are reachable.

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