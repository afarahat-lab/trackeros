# Implement this phase: Sub-phase 4c: Barrel files and unit tests

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e735cca3-597e-44fe-9270-69c735e34133/6`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
src/modules/audit/index.ts barrel file re-exports all public symbols from audit.model.ts, audit.repository.ts, and audit.service.ts
src/modules/notification/index.ts barrel file re-exports all public symbols from notification.model.ts, notification.repository.ts, and notification.service.ts
tests/unit/modules/audit/audit.service.spec.ts contains Jest unit tests for AuditService.log(), getEntityHistory(), and getUserActions() using a mocked AuditRepository
tests/unit/modules/notification/notification.service.spec.ts contains Jest unit tests for NotificationService.send(), getForUser(), and markRead() using a mocked NotificationRepository
All tests pass with npx jest

## Success criteria
Create barrel index files for both modules and write all unit tests. Depends on sub-phases 4a and 4b being complete.

Create exactly 4 files:

1. **`src/modules/audit/index.ts`** — Barrel file re-exporting all public symbols from `audit.model.ts`, `audit.repository.ts`, and `audit.service.ts`.

2. **`src/modules/notification/index.ts`** — Barrel file re-exporting all public symbols from `notification.model.ts`, `notification.repository.ts`, and `notification.service.ts`.

3. **`tests/unit/modules/audit/audit.service.spec.ts`** — Jest unit tests for `AuditService`:
   - Mock `AuditRepository` using `jest.fn()`
   - Test `log()`: verifies repository.create is called and returns the created AuditLog
   - Test `getEntityHistory()`: verifies repository.findByEntity is called with correct args and returns results
   - Test `getUserActions()`: verifies repository.findByPerformer is called with correct args (including optional limit) and returns results

4. **`tests/unit/modules/notification/notification.service.spec.ts`** — Jest unit tests for `NotificationService`:
   - Mock `NotificationRepository` using `jest.fn()`
   - Test `send()`: verifies repository.create is called with correct fields and returns the created Notification
   - Test `getForUser()`: verifies repository.findByRecipient is called with correct args (including optional limit) and returns results
   - Test `markRead()`: verifies repository.markAsRead is called with correct id

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Sub-phase 4a: Audit module implementation": src/modules/audit/audit.model.ts, src/modules/audit/audit.repository.ts, src/modules/audit/audit.service.ts
- "Sub-phase 4b: Notification module implementation": src/modules/notification/notification.model.ts, src/modules/notification/notification.repository.ts, src/modules/notification/notification.service.ts

## Your iteration budget — and how to get more (READ BEFORE YOU START)

You have a HARD budget of **30 iterations** for this task; one tool call is one iteration. When it runs out you are CUT OFF mid-work — the unfinished phase is recorded as a FAILURE, not as progress. Nothing warns you as you approach it.

**Exploration is what exhausts it.** On the last phase that was cut off here, the agent spent 19 of its 27 file-editing calls on `view` — it ran out of budget reading the codebase, not building the feature. Do not repeat that.

You have a `task` tool. It runs a FRESH sub-agent with its OWN separate 15-iteration budget and its OWN context window, in this same working directory. Everything that sub-agent reads and writes costs you **one** iteration, not 15. That is how you get more capacity — it is the supported mechanism, not a last resort.

**DELEGATE if ANY of these is true — decide NOW, before you start editing:**
- the phase spans more than one module, or names more than ~3 files to create;
- you expect to read more than a handful of files to understand what to build;
- you have already used 10 iterations and have not yet edited anything.

**How to delegate:**
- Call `task` with `subagent_type='gestalt-implementer'`, ONE call per coherent slice, at most **4** for this phase. Each call blocks until that sub-agent finishes and reports back.
- Split by MODULE or FILE GROUP so slices own DISJOINT files. Two slices must never edit the same file.
- Give each slice a self-contained prompt: the exact files it owns, what to build, the conventions it must follow, and what to report back. It cannot see this task.

**Do NOT delegate when the phase is genuinely small.** A one- or two-file phase costs more to hand off and describe than to do directly — just build it. Delegation is for scope that will not fit your budget, not a default step.

**Never delegate the final verification.** Run the build and the tests YOURSELF, on the whole phase, after the slices are back — a sub-agent only sees its own slice.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — binding for every phase of this feature.

1 — LEAVE DAY COUNT = CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. Do NOT exclude weekends. Do NOT exclude public holidays.
There is no holiday calendar in scope for this feature.
Implement this EXACTLY ONCE as a single shared exported helper (e.g. countLeaveDays(startDate, endDate))
in the leave domain module, and call that helper from EVERY site needing a day count:
balance deduction on APPROVED, balance restoration on CANCELLED, the sufficiency check
before approval, entitlement comparison, and minimumNoticeDays enforcement. No call site
may re-derive the count inline — inline re-derivation is the anti-pattern this decision exists
to prevent.

2 — THE leave_balances YEAR IS THE CALENDAR YEAR: 1 January to 31 December.
Balances reset on 1 January. Do NOT implement a configurable fiscal-year start and do NOT
implement employee-specific anniversary years — neither is in scope, and the anniversary
variant would additionally require employee hire dates that this feature does not own.
Store the year as a plain integer year (e.g. 2026) on the balance record and derive it from
the leave request's startDate. A request whose range crosses 31 December is charged in full
to the year of its startDate — do not split a request across two balance years.

NOTE, to remove an ambiguity from the previous run's decision on this same feature: earlier
wording said entitlements "reset per fiscal year". That was loose. The binding definition is
the CALENDAR year as stated above, and it applies uniformly to annual, sick and emergency
entitlements. There is exactly one year definition in this system.

STANDING DECISIONS carried forward from the previous run of this feature (unchanged, still
binding wherever they apply):
- No overlapping APPROVED leave for the same employee; enforce at APPROVAL time, not at
  submission, in the same place as the balance sufficiency check. Overlap = any intersection
  of [startDate, endDate] with an existing APPROVED request, regardless of leave type.
- Emergency leave has its OWN entitlement pool, separate from annual; default 5 days.
  Model all types uniformly: annual, sick and emergency each get their own LeavePolicy
  entitlement and their own LeaveBalance record. No special-casing in balance logic.
- NO documentation requirement for sick leave. Do NOT add a PENDING_DOCUMENTATION state and
  do NOT add any document-tracking entity. The LeaveRequest lifecycle is exactly:
  PENDING -> APPROVED | REJECTED, and PENDING | APPROVED -> CANCELLED. [BINDING RULE — operator decision resolving: Should leave day counting exclude weekends and/or public holidays, or use pure calendar days as currently specified?; How is the "year" boundary for leave_balances defined — calendar year (Jan 1 – Dec 31), fiscal year, or employee-specific anniversary year?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- Barrel file `src/modules/audit/index.ts` must follow the exact named-export pattern of `src/modules/employee/index.ts`: export model interfaces/types from the model file, repository class from the repository file, and service class from the service file — no wildcard re-exports. (see `src/modules/employee/index.ts`)
- Barrel file `src/modules/notification/index.ts` must follow the exact named-export pattern of `src/modules/employee/index.ts`: export model interfaces/types from the model file, repository class from the repository file, and service class from the service file — no wildcard re-exports. (see `src/modules/employee/index.ts`)
- Audit service unit tests must follow the structure of `tests/unit/modules/employee/employee.service.spec.ts`: `jest.Mocked<IAuditRepository>` mock with `jest.fn()` per method, `beforeEach` creating fresh mocks, and tests verifying correct delegation arguments and return values. (see `tests/unit/modules/employee/employee.service.spec.ts`)
- Notification service unit tests must follow the structure of `tests/unit/modules/employee/employee.service.spec.ts`: `jest.Mocked<INotificationRepository>` mock with `jest.fn()` per method, `beforeEach` creating fresh mocks, and tests verifying correct delegation arguments and return values. (see `tests/unit/modules/employee/employee.service.spec.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditLog`: AuditLog records are immutable — the repository exposes only `create`, `findByEntity`, and `findByPerformer`; no update or delete operations exist. The `performedAt` timestamp is set by the repository on creation, not by the caller.
- Reuse or extend `Notification`: Notifications are immutable after creation except for the `isRead` field, which transitions exactly once from `false` to `true` via `markAsRead`. The `markAsRead` operation is idempotent — calling it on an already-read notification is safe and produces no error. If the notification does not exist, the operation silently does nothing (no throw).
### Interface contract — expose these operations (their shape is yours)
- AuditService.log(entry) — Delegates directly to IAuditRepository.create. No domain errors thrown by the service itself — any errors propagate from the repository layer.
- AuditService.getEntityHistory(entityType, entityId) — idempotent; Read-only, delegates to IAuditRepository.findByEntity. Returns empty array when no records exist.
- AuditService.getUserActions(performedBy, limit?) — idempotent; Read-only, delegates to IAuditRepository.findByPerformer. Optional `limit` parameter is passed through to the repository. Returns empty array when no records exist.
- NotificationService.send(recipientId, title, body, type, metadata?) — Delegates to INotificationRepository.create. `metadata` defaults to `null` when omitted. No domain errors thrown by the service itself.
- NotificationService.getForUser(recipientId, limit?) — idempotent; Read-only, delegates to INotificationRepository.findByRecipient. Optional `limit` parameter is passed through. Returns empty array when no notifications exist.
- NotificationService.markRead(id) — idempotent; Delegates to INotificationRepository.markAsRead. Idempotent — safe to call on already-read notifications. Does not throw if the notification does not exist.

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