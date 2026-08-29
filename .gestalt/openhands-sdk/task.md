# Implement this phase: Phase 3 — Notification module (~3 files)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/dd1a6d9f-1b67-4054-9579-5cb7ccee58f3/5`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the notification module under src/modules/notification/ (the exact path its Module Boundary declares).

- src/modules/notification/notification.model.ts — Notification entity with EXACT fields: id, recipientId, type, title, message, relatedEntityType (string|null), relatedEntityId (string|null), status ('PENDING'|'SENT'|'READ'|'ARCHIVED'), createdAt, readAt (Date|null). Also declare INotificationRepository and INotificationService interfaces.
- src/modules/notification/notification.repository.ts — PgNotificationRepository implementing INotificationRepository, using the shared pool from src/shared/db/connection.ts (optional client param as last argument).
- src/modules/notification/notification.service.ts — NotificationService implementing INotificationService.

Include Jest unit tests in tests/unit/modules/notification/ (mock the pg pool). This phase depends on src/shared/db/connection.ts and src/shared/types/errors.ts from Phase 1 — read them before generating code.

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

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Notification` — the entity MUST have exactly these fields:
    - id: string
    - recipientId: string
    - type: string
    - title: string
    - message: string
    - relatedEntityType: string | null
    - relatedEntityId: string | null
    - status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'
    - createdAt: Date
    - readAt: Date | null

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- Reuse the shared pg Pool exported from src/shared/db/connection.ts as the default DB executor; do not create a new Pool. (see `src/shared/db/connection.ts`)
- Match the audit module's model/repository/service/index layout, interface-in-model convention, optional-client-as-last-param pattern, snake_case row mapping with type-guard fallback, and service id/timestamp/null-coercion behavior. (see `src/modules/audit/audit.model.ts`)
- Match the audit test conventions: jest.mock the shared connection pool, mock the repository interface, and assert mapping/null/passthrough/id/timestamp behavior with no real DB access. (see `tests/unit/modules/audit/audit.service.test.ts`)
- Use the shared error types (e.g. NotFoundError) from src/shared/types/errors.ts for typed error semantics rather than ad-hoc errors. (see `src/shared/types/errors.ts`)
- The Notification entity fields and status union must match the reconciled architecture's Notification entity and the notifications conceptual table (recipient_id FK -> employees.id; indexes on recipient_id, status, and (related_entity_type, related_entity_id)). (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `Notification`: A Notification is created with status 'PENDING' and readAt null; its status may only ever be one of PENDING, SENT, READ, ARCHIVED, and readAt is set only when the notification transitions to READ (otherwise null).
- Reuse or extend `Notification`: relatedEntityType and relatedEntityId are either both present (a link to a related entity such as a leave request) or both null; they are never partially set.
- Reuse or extend `Notification`: recipientId references an existing employee (conceptual FK recipient_id -> employees.id); createdAt is immutable once written.
### Interface contract — expose these operations (their shape is yours)
- create(notification, client?) — Persists a notification row and returns the persisted Notification; accepts an optional PoolClient as the last argument for unit-of-work participation.
- findById(id, client?) — Returns the Notification or null when no row matches; accepts an optional PoolClient as the last argument.
- findByRecipient(recipientId, client?) — Returns notifications for a recipient (optionally filtered by status), ordered newest-first; accepts an optional PoolClient as the last argument.
- updateStatus(id, status, client?) — Transitions a notification's status (e.g. PENDING->SENT, SENT->READ, ->ARCHIVED) and sets readAt when transitioning to READ; accepts an optional PoolClient as the last argument.
- notify(input, client?) — Service operation that builds a Notification (generating id and createdAt, coercing absent optionals to null) and persists it via the repository, passing the optional client through.
### Integration points — connect to these
- src/shared/db/connection.ts — Shared pg Pool used as the default executor for all repository queries.
- src/shared/types/errors.ts — Shared typed error classes (e.g. NotFoundError) for repository/service error semantics.
- pg PoolClient type — Optional last-parameter client for unit-of-work participation in the leave orchestrator's transaction (Phase 6).

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