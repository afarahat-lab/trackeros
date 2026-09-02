# Implement this phase: Phase 6a — Notification entity and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/f5a0dfb3-f8f1-4335-94b2-5d8d22cf459f/6`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
notification.model.ts exports the Notification entity/interface with exactly the canonical fields and types listed (id, recipientId, type, title, message, relatedEntityType, relatedEntityId, status: NotificationStatus, createdAt, readAt).
notification.model.ts imports NotificationStatus from src/shared/types/leave.types.ts and does not redefine it.
notification.repository.ts exports NotificationRepository implemented with raw pg parameterized SQL against the shared pool from src/shared/db/connection.ts.
All write methods on NotificationRepository accept an optional client?: PoolClient parameter and use it when provided.
Both files compile cleanly with TypeScript and contain no BullMQ/background-fanout logic.

## Success criteria
Create the notification module foundation. First read src/shared/types/leave.types.ts (NotificationStatus enum) and src/shared/db/connection.ts (shared pool) from Phase 1. Create src/modules/notification/notification.model.ts defining the Notification entity with the exact canonical fields: id: string, recipientId: string, type: string, title: string, message: string, relatedEntityType: string | null, relatedEntityId: string | null, status: NotificationStatus, createdAt: Date, readAt: Date | null. Create src/modules/notification/notification.repository.ts implementing NotificationRepository using raw pg parameterized SQL against the shared pool, with optional client?: PoolClient on write methods. No background fanout (no BullMQ).

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Phase 6b — Notification service": src/modules/notification/notification.service.ts
- "Phase 6c — Notification unit tests": tests/unit/modules/notification/notification.service.spec.ts, tests/unit/modules/notification/notification.repository.spec.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Phase 6c — Notification unit tests. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

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
- 1. DAY COUNT — Inclusive calendar days: days = (endDate - startDate) + 1. A single-day request counts as 1. This SAME count is used for BOTH the balance-sufficiency check and the balance deduction; they must never compute it independently. Implement it ONCE as a shared pure helper (e.g. src/shared/leave/day-count.ts) and call that helper from every site. No weekend/holiday exclusion.

2. FISCAL-YEAR BOUNDARY — Attribute the WHOLE request to the fiscal year of startDate. Exactly one LeaveBalance row is ever debited per request; do not split days across years, and do not reject boundary-crossing requests.

3. RBAC — Three roles: employee, manager, hr_admin. Manager INHERITS every employee permission. Matrix: employee may create/submit/cancel their OWN request and view their OWN balances; manager may additionally approve/reject requests of their subordinates (and may file their own leave, via inheritance); hr_admin may view and act on ALL requests and may adjust balances. A manager may NOT approve their own request. Enforce with a route-level requireRole(...) guard, never an inline check inside a service.

4. GRANULARITY — Whole days only. Reject fractional-day requests at the API boundary with 400. used_days and remaining_days are INTEGERS; there is no rounding rule anywhere. Guard against negative balances: an approval that would drive remaining_days below zero is rejected, not clamped.

5. and 15. BACKGROUND JOBS — NONE. No BullMQ, no accrual scheduler, no notification fanout in this feature. (bullmq is not a dependency of this project.) Questions 5 and 15 are the same question; this answer covers both.

6. LOCAL DEV AUTH — Seeded local users. No mock OIDC provider.

7. LeaveStatus ENUM — The root ARCHITECTURE.md set is authoritative: PENDING / APPROVED / REJECTED / CANCELLED. No DRAFT and no SUBMITTED state. A created request is PENDING immediately. Update DOMAIN.md to match; ARCHITECTURE.md wins.

8. DATA ACCESS — Raw pg with parameterized SQL against the shared pg.Pool exported by src/shared/db/connection.ts. Knex is for MIGRATIONS ONLY and must not be used in repository queries. Repository methods that take part in a multi-step write accept an optional client?: PoolClient; the calling service owns the unit of work.

9. VALIDATION — zod, at the API boundary. Do not use class-validator in new code.

10. CANONICAL ENTITY NAMES — LeaveBalance, LeavePolicy, AuditLog. Those exact names for the entity, the repository, and the table (snake_case: leave_balances, leave_policies, audit_logs). Balance / Policy / Audit / AuditRecord are not to be used.

11. PACKAGE HYGIENE — Leave package.json AS-IS for this feature. Do not rename it and do not prune express/class-validator/zod. Dependency cleanup is out of scope here and pruning risks breaking the existing status/uptime modules.

12. ERROR SHAPE — { error: string; code: string }. `error` is a human-readable message, `code` a stable machine constant (e.g. INSUFFICIENT_BALANCE, LEAVE_NOT_FOUND, FORBIDDEN). Used for every 400/401/403/404.

13. UPTIME MODULE — Leave it as-is. Do not refactor it. New modules follow the canonical repository/controller pattern regardless.

14. CONTRACTS PACKAGE — @trackeros/contracts is NOT scaffolded (there is no packages/ directory) and must NOT be created in this feature. Keep shared types in src/shared/types. [BINDING RULE — operator decision resolving: How is the day count for a LeaveRequest derived from startDate and endDate (inclusive vs exclusive, calendar vs business days), and is it the same count used for both the balance sufficiency check and the balance deduction?; Which fiscal year does a LeaveRequest map to when startDate and endDate span a fiscal-year boundary, and how is the day count split across years for balance deduction?; What is the concrete RBAC role model (employee/manager/hr_admin) and which roles may perform each leave action (create, submit, approve, reject, cancel, view balances)?; How are leave_balances.used_days and remaining_days computed, rounded, and bounded when a request is approved (e.g. partial-day requests, half-day rounding, negative-balance guard)?; Are background jobs required via BullMQ for leave workflows (accrual schedulers, notification fanout)?; How should local development auth be implemented concretely (seeded local users vs mock OIDC provider)?; LeaveStatus enum value discrepancy: DOMAIN.md defines DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED, while root ARCHITECTURE.md uses PENDING/APPROVED/REJECTED/CANCELLED. Which set is authoritative for the leave_requests.status field and shared types?; Should concrete repositories use Knex query builder or raw pg (parameterized SQL) against the shared pg.Pool?; Which validation library should be standardized for API-boundary input validation?; What are the canonical names for duplicate/overlapping domain entities (Balance vs LeaveBalance, Policy vs LeavePolicy, Audit vs AuditLog vs AuditRecord)?; Should package.json name be changed from leave-management to trackeros, and should express/class-validator/zod be pruned to match the declared Fastify stack?; What is the exact error response shape beyond the required 400/401/403/404 status codes?; Should the existing uptime module be refactored to the canonical repository/controller pattern, or left as-is?; Is the shared @trackeros/contracts package already scaffolded, or does it need to be created?; What background jobs, if any, are required via BullMQ for leave/expense workflows (accrual schedulers, notification fanout)?; apply everywhere these apply, not in one place only]

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
- Import NotificationStatus from the shared types module (re-exported by src/shared/types/index.ts) rather than declaring a new enum; the values must be exactly PENDING, SENT, READ, ARCHIVED. (see `src/shared/types/leave.types.ts`)
- Use the shared pg Pool exported from src/shared/db (re-exported by src/shared/db/index.ts) as the default connection; write methods accept an optional PoolClient as the last parameter and fall back to the shared pool. (see `src/shared/db/connection.ts`)
- Match the notifications table contract: snake_case columns id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at; PK id; FK recipient_id -> employees.id; indexes on recipient_id, status, and related_entity_type/related_entity_id. (see `docs/ARCHITECTURE.md`)
- Reuse RepositoryError and UniqueConstraintError from the employee module's public entry point (src/modules/employee/index.ts) rather than re-declaring them; add only a notification-specific not-found error locally. (see `src/modules/employee/employee.errors.ts`)
- Mirror the sibling repository pattern: private mapRow converting snake_case rows to camelCase entities, a *_COLUMNS constant, raw pg parameterized SQL, and the interface + concrete class co-located in the repository file. (see `src/modules/audit/audit.repository.ts`)
### Entity invariants — enforce these
- Reuse or extend `Notification`: status is always one of the shared NotificationStatus values (PENDING | SENT | READ | ARCHIVED); a newly created notification is PENDING unless the caller supplies a status, and readAt is null until the notification is marked read.
- Reuse or extend `Notification`: id and createdAt are generated by the repository (id via randomUUID, createdAt = now) and are never caller-supplied; readAt is repository-managed and set only by markRead.
- Reuse or extend `Notification`: relatedEntityType and relatedEntityId are either both present or both null (they identify the same related entity); recipientId references an existing employees.id.
### Interface contract — expose these operations (their shape is yours)
- create — Persists a notification and returns the mapped entity; generates id/createdAt, defaults status to PENDING and readAt to null. Takes an optional PoolClient as the last parameter to join a caller's transaction.
- findByRecipient — Returns all notifications for a recipient ordered deterministically (e.g. createdAt DESC, id); always uses the shared pool and never accepts a client.
- findByEntity — Returns notifications matching a related entity type + id; always uses the shared pool and never accepts a client.
- updateStatus — Persists a supplied NotificationStatus for an identified notification; throws a typed not-found error when no row matches; takes an optional PoolClient as the last parameter.
- markRead — Sets readAt to now and status to READ for an identified notification; throws a typed not-found error when no row matches; takes an optional PoolClient as the last parameter.
### Integration points — connect to these
- src/shared/types (NotificationStatus enum) — The Notification entity's status field is typed with the shared enum; no local enum is declared.
- src/shared/db (shared pg Pool) — The repository's default connection for all queries; write methods fall back to it when no PoolClient is supplied.
- src/modules/employee (RepositoryError, UniqueConstraintError) — The notification repository reuses the shared error base classes from the employee module's public entry point.
- employees table (recipient_id FK) — recipientId references employees.id; the FK enforces referential integrity for notification recipients.

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