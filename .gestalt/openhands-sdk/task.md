# Implement this phase: Phase 6b — leave service + routes + public index

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/babd3932-368b-46a5-a4dc-6dccaafd84ba/7`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
src/modules/leave/leave.service.ts exports ILeaveService and LeaveService implementing create (DRAFT), submit (SUBMITTED), and approve/reject (APPROVED/REJECTED).
The approve/reject workflow runs inside PgUnitOfWork.withTransaction and atomically performs status change, balance update (usedDays/pendingDays), audit log insert, and synchronous notification insert.
requestedDays is computed via the shared helper from src/modules/validation/index.ts and is never re-derived locally.
src/modules/leave/leave.routes.ts defines Fastify routes that call the service directly (no separate controller file), matching the src/modules/uptime/uptime.routes.ts pattern.
src/modules/leave/index.ts publicly exports the model, repository, service, and routes.
No test files are created in this sub-phase.

## Success criteria
Build the leave orchestration and HTTP surface on top of Phase 6a.

Create:
- src/modules/leave/leave.service.ts — ILeaveService + LeaveService. Orchestrates the full workflow: create (DRAFT), submit (SUBMITTED), approve/reject (APPROVED/REJECTED). The approve/reject transaction MUST run inside PgUnitOfWork.withTransaction (from src/shared/db/unit-of-work.ts) and atomically perform: status change + balance update (usedDays/pendingDays) + audit log insert + synchronous notification insert. requestedDays is computed via the shared helper from src/modules/validation/index.ts (Phase 5) — never re-derive it.
- src/modules/leave/leave.routes.ts — Fastify routes. Per BINDING rule 5, routes call services DIRECTLY (matching src/modules/uptime/uptime.routes.ts pattern) — do NOT create a separate controller file.
- src/modules/leave/index.ts — public exports.

Import from: src/shared/types/index.ts, src/shared/errors/index.ts, src/shared/db/unit-of-work.ts, src/modules/balance/index.ts, src/modules/audit/index.ts, src/modules/notification/index.ts, src/modules/validation/index.ts. Depends on Phases 1, 3, 4, 5 and Phase 6a — read those index.ts files before generating code referencing their types. Do NOT create tests yet.

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Phase 6a — leave model + repository": src/modules/leave/leave.model.ts, src/modules/leave/leave.repository.ts
- "Phase 6c — leave service unit tests": tests/unit/modules/leave/leave.service.test.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Phase 6c — leave service unit tests. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

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

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Notification` — the entity MUST have exactly these fields:
    - id
    - recipientId
    - type
    - title
    - message
    - relatedEntityType
    - relatedEntityId
    - status
    - createdAt
    - readAt

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- requestedDays must be computed by calling the canonical requestedDays(startDate, endDate) helper — the single source of truth is src/shared/types/index.ts (the validation module imports it from there rather than re-exporting it). (see `src/shared/types/index.ts`)
- The approve/reject transaction must use IUnitOfWork.withTransaction exactly as defined (service owns the boundary, data-access opens it); match the signature and client-forwarding pattern. (see `src/shared/db/unit-of-work.ts`)
- Balance updates must go through IBalanceRepository.update with the same Partial<Omit<LeaveBalance,'id'>> changes shape and optional trailing PoolClient. (see `src/modules/balance/balance.repository.ts`)
- Audit inserts must use IAuditService.record(input, client?) with CreateAuditLogInput (actorId, action, entityType, entityId, beforeState, afterState) and forward the transaction client. (see `src/modules/audit/audit.service.interface.ts`)
- Notification inserts must use INotificationService.create(input, client?) with CreateNotificationInput and forward the transaction client (status defaults to PENDING). (see `src/modules/notification/notification.service.interface.ts`)
- Leave persistence must go through ILeaveRepository (create/findById/update) with the exact 12-field LeaveRequest shape and UpdateLeaveRequestDto changes. (see `src/modules/leave/leave.repository.ts`)
- Route handlers must follow the direct-service-call pattern (instantiate service, call it, map AppError to status codes) rather than a controller layer. (see `src/modules/uptime/uptime.routes.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Lifecycle is strictly DRAFT → SUBMITTED → APPROVED|REJECTED (CANCELLED out of scope here); a request may only be submitted from DRAFT, and only a SUBMITTED request may be approved or rejected.
- Reuse or extend `LeaveRequest`: requestedDays is always the canonical inclusive day count (endDate - startDate + 1) computed by the shared helper; the service never stores a locally-derived value.
- Reuse or extend `LeaveBalance`: Reservation lifecycle: submit increments pendingDays; approve decrements pendingDays and increments usedDays; reject decrements pendingDays only — counters must never go negative.
- Reuse or extend `AuditLog`: Every state-changing leave operation (create/submit/approve/reject) produces exactly one AuditLog row with the correct AuditAction (CREATE/UPDATE/APPROVE/REJECT) and the actor as actorId.
- Reuse or extend `Notification`: Approve/reject produces a synchronous Notification insert (status PENDING) inside the same transaction as the status change and balance update.
### Interface contract — expose these operations (their shape is yours)
- create — Requires an authenticated actor (EMPLOYEE or above); the created request's employeeId is the requester.; Invalid input → ValidationError (400); insufficient balance → ConflictError (409).
- submit — Requires an authenticated actor; only the request's owner may submit.; Unknown request → NotFoundError (404); invalid state transition (not DRAFT) → ConflictError (409).
- approve — Requires MANAGER or ADMIN; no self-approval; approver must be the requester's manager or an ADMIN.; Unknown request → NotFoundError (404); invalid state transition (not SUBMITTED) → ConflictError (409); unauthorized actor → ForbiddenError (403).
- reject — Requires MANAGER or ADMIN; no self-rejection; approver must be the requester's manager or an ADMIN.; Unknown request → NotFoundError (404); invalid state transition (not SUBMITTED) → ConflictError (409); unauthorized actor → ForbiddenError (403).
### Integration points — connect to these
- src/modules/balance/index.ts — LeaveService reads and mutates LeaveBalance (pendingDays/usedDays) during submit/approve/reject via IBalanceRepository/IBalanceService.
- src/modules/audit/index.ts — LeaveService writes an AuditLog for every state-changing operation (GP-002).
- src/modules/notification/index.ts — LeaveService inserts synchronous notifications on approve/reject within the transaction.
- src/modules/validation/index.ts — LeaveService delegates date-range and balance-sufficiency validation (and derives requestedDays via the shared helper).
- src/modules/employee/index.ts — LeaveService resolves the requester/approver (manager relationship, self-approval guard) via IEmployeeService.
- src/shared/db/unit-of-work.ts — LeaveService injects IUnitOfWork and runs approve/reject inside withTransaction.

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