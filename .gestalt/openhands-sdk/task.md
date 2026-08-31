# Implement this phase: Phase 2 — Leaf modules: employee, policy, audit (part 3/3)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/b07feb33-7931-41ca-b4f7-c3dc02411147/4`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build ONLY the routes + unit tests (layer 3) for the employee, policy, and audit modules.

Create Fastify route files:
- src/modules/employee/employee.routes.ts: register employee endpoints (list/get/create/update) wired to EmployeeService.
- src/modules/policy/policy.routes.ts: register policy endpoints wired to PolicyService.
- src/modules/audit/audit.routes.ts: register audit-log query endpoints wired to AuditService.

Update each module's index.ts barrel to export the routes.

Include Jest unit tests:
- tests/unit/modules/employee/employee.service.spec.ts
- tests/unit/modules/policy/policy.service.spec.ts
- tests/unit/modules/audit/audit.service.spec.ts

This phase depends on Phase 2 parts 1/3 and 2/3 (model, repository, service files under src/modules/employee/, src/modules/policy/, src/modules/audit/) — read them before generating routes/tests so signatures match exactly. Do not reference the leave, balance, or notification modules.

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

FIRST, THE AUTHORITY RULE (this settles questions 4-7):
THE DISK IS THE TRUTH. Where PLAN.md, docs/DOMAIN.md or docs/ARCHITECTURE.md disagree with
what actually exists under src/, the code on disk wins and the documents are stale. Those
documents accumulated from earlier runs whose code never merged. Do NOT "reconcile" them by
writing code to match a document, and do NOT skip work because a document says it is done.

4 — PLAN.md's [deployed] markers on phases 1-6 are STALE. Verified: PLAN.md marks six phases
deployed, and NONE of src/modules/{leave,balance,employee,policy,notification,audit} exists —
only src/modules/status, src/modules/uptime and src/shared/db are present. Treat all six as
NOT BUILT and build them. Do not trust a [deployed] marker as evidence that anything exists;
check the filesystem. Do not edit PLAN.md to fix this — the platform owns that file.

5 — LeaveBalance is canonical. Delete/ignore the "Balance" definition in docs/DOMAIN.md as a
near-duplicate. One entity, named LeaveBalance, with the three integer counters below.

6 — LeaveRequestStatus is canonical. Ignore "LeaveStatus". The type is named for the entity it
belongs to, consistent with LeaveRequest.

7 — AuditLog is canonical for the ENTITY, and its persisted table is audit_logs.
"Audit" and "AuditRecord" are duplicates — ignore them. "AuditServiceInterface" is not an
entity at all; it is the service contract and keeps that name.
NAMING CONVENTION, binding everywhere: TypeScript identifiers are camelCase, database columns
are snake_case, and the repository is the ONLY layer that maps between them. No snake_case in
TypeScript field names; no camelCase in SQL.

3 — src/shared/types/ contains ONLY types used by TWO OR MORE modules: the cross-module enums
(LeaveType, LeaveRequestStatus, UserRole, AuditAction) and any DTO/contract shape genuinely
shared across module boundaries. A type used by exactly one module lives IN that module.
src/shared/types is not a dumping ground for every interface — if you cannot name the second
consumer, it does not belong there.

1 & 8 — WHOLE DAYS ONLY, CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. No half-day or partial-day granularity: no fractional field, no
AM/PM period, no rounding rules — every day counter is an INTEGER, so there is nothing to round.
Do NOT exclude weekends. Do NOT exclude public holidays. There is no holiday calendar in scope.
Implement the count EXACTLY ONCE as a shared exported helper (e.g. countLeaveDays(start, end))
and call it from every site that needs a day count. No call site may re-derive it inline.

2 — remaining/available days is DERIVED, never stored, and MAY go negative:
    availableDays = entitlementDays - usedDays - pendingDays
If a data correction or a policy change lowers entitlementDays below what is already used, the
derived value goes negative and that is CORRECT — it says the employee is over-drawn, which is
information the business needs. Do NOT clamp it to zero: clamping hides the overdraw and makes
the number lie. Consequences of a negative balance follow automatically and need no special
case: the approval sufficiency check is `n <= availableDays`, which simply fails, so no new
leave can be approved until the balance recovers.
Separately, and unchanged: the three stored counters are NON-NEGATIVE. A transition that would
take usedDays or pendingDays below zero is an ERROR, not a clamp. Lowering entitlementDays is
allowed even when it makes availableDays negative — it is a correction, not a transition.

STANDING DECISIONS carried forward (unchanged):
- Separate balance per leave type: annual, sick and emergency each get their own LeavePolicy
  entitlement and their own LeaveBalance. Emergency does not draw from annual (default 5 days).
  All types use the same approval lifecycle: PENDING -> APPROVED | REJECTED, and
  PENDING | APPROVED -> CANCELLED. No documentation requirement for sick leave.
- Leave year = CALENDAR year (1 Jan - 31 Dec). No carry-over, no accrual, no proration. A
  request crossing 31 December is charged IN FULL to its startDate's year, never split.
- No overlapping APPROVED leave per employee, enforced at APPROVAL time alongside the
  sufficiency check, regardless of leave type.
- Transactions: the SERVICE owns the unit of work; the DATA-ACCESS layer opens it via an
  injected IUnitOfWork.withTransaction(fn). Services never touch the pool. Participating
  methods take the client as an optional LAST parameter. See AGENTS.md Architecture rules 5. [BINDING RULE — operator decision resolving: Does leave duration support partial/half-day granularity, or only whole inclusive calendar days?; How should remaining_days be bounded if used_days exceeds entitlement due to data correction or policy change?; What exact contents should src/shared/types/ contain beyond the cross-module enums?; How should the PLAN.md drift be reconciled — phases 1-6 are marked [deployed] but none of the leave/balance/employee/policy/notification/audit files exist on disk?; Which balance entity is canonical: Balance or LeaveBalance (near-duplicate definitions in docs/DOMAIN.md)?; Is LeaveRequest.status typed as LeaveRequestStatus or LeaveStatus?; Which audit entity shape and field naming convention is canonical among Audit, AuditLog, AuditRecord, and AuditServiceInterface (camelCase vs snake_case)?; How are leave days counted (inclusive vs exclusive of end date) and rounded for partial days?; How is remaining_days bounded (floor at zero vs allow negative) when used_days exceeds entitlement?; Which LeaveStatus enum values are authoritative — DOMAIN.md (DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED) or root ARCHITECTURE.md (PENDING/APPROVED/REJECTED/CANCELLED)?; What exact contents should src/shared/types/ contain beyond leave.types.ts (e.g. index.ts barrel, other shared DTOs)?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - managerId: string | null
    - department: string | null
    - hireDate: Date
    - terminationDate: Date | null
    - employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

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