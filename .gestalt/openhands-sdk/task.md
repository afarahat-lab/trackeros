# Continue the previous attempt (it hit the iteration limit before finishing)

A prior code-agent attempt on this work dir (`/tmp/gestalt/phase/e735cca3-597e-44fe-9270-69c735e34133/8`) was stopped after reaching its iteration limit. Its work is ALREADY on disk here — do NOT restart from scratch or re-read everything; build on what exists. It made 13 file edit(s). Its last verification FAILED (`cd /tmp/gestalt/phase/e735cca3-597e-44fe-9270-69c735e34133/8 && npx jest --passWithNoTests 2>&1`):
2m0 total\n\x1b[1mSnapshots:   \x1b[22m0 total\n\x1b[1mTime:\x1b[22m        49 s\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\n\x1b[1mTest Suites: \x1b[22m0 of 5 total\n\x1b[1mTests:       \x1b[22m0 total\n\x1b[1mSnapshots:   \x1b[22m0 total\n\x1b[1mTime:\x1b[22m        57 s'}]

Finish the task now: fix any failing build/type-check/tests, then RUN the build and the tests and fix anything still failing. Stop as soon as the build and tests pass. The full original task (with all mandatory constraints) follows for reference.

---

# Implement this phase: Phase 5b: Balance service, controller, routes, and barrel

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e735cca3-597e-44fe-9270-69c735e34133/8`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
`BalanceService` is exported with methods: `getOrCreateBalance`, `getBalancesForEmployee`, `hasSufficientBalance`, `reserveDays`, `commitDays`, `restoreDays`
`getOrCreateBalance` fetches policy entitlement via `PolicyService.getEntitlementForType` when creating a new balance
Fiscal year is derived as `startDate.getFullYear()` (calendar-year rule)
`hasSufficientBalance` correctly checks `remainingDays >= requestedDays`
`reserveDays` / `commitDays` / `restoreDays` delegate to the corresponding repository atomic methods
`BalanceController` exports `getBalances` (GET `/balances?employeeId=&year=`) and `getBalance` (GET `/balances/:id`)
`balanceRoutes` is a Fastify plugin registering the two GET routes
`index.ts` barrel re-exports all public symbols from the module
Code compiles without errors (`tsc --noEmit` passes for all four files)

## Success criteria
Build `BalanceService` (business logic for balance lifecycle), `BalanceController` (Fastify route handlers), `BalanceRoutes` (Fastify plugin), and the barrel file. Depends on Phase 5a (model + repository) and Phase 3 (PolicyService).

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Phase 5a: Balance model and repository": src/modules/balance/balance.model.ts, src/modules/balance/balance.repository.ts
- "Phase 5c: Balance module unit tests": tests/unit/modules/balance/balance.service.spec.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Phase 5c: Balance module unit tests. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

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
- BalanceService must use PolicyService.getEntitlementForType(leaveType) to resolve entitlement when creating a new balance — must match the exact signature: (leaveType: LeaveType) => Promise<number>, which throws PolicyNotFoundError if no active policy exists (see `src/modules/policy/policy.service.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: remainingDays = totalEntitlement - usedDays - pendingDays (derived, never stored). Status derives from remainingDays: ACTIVE when > 0, EXHAUSTED when = 0, unless overridden by FROZEN or CLOSED (which are terminal overrides). The BalanceService must never set _status directly to ACTIVE or EXHAUSTED — those are derived; it may only set FROZEN or CLOSED explicitly.
- Reuse or extend `LeaveBalance`: The combination (employeeId, policyId, fiscalYear) is unique. getOrCreateBalance must never create a duplicate — it must check existence first. The repository's create method already enforces this with DuplicateBalanceError, but the service must not rely on the error for normal flow.
- Reuse or extend `LeaveBalance`: pendingDays must never exceed (totalEntitlement - usedDays). The repository's deductPendingDays enforces this atomically; the service must not bypass this guard.
### Interface contract — expose these operations (their shape is yours)
- BalanceService.getOrCreateBalance — No auth enforcement at service layer — RBAC is enforced at the route level by requireRole guard; idempotent; Throws PolicyNotFoundError if no active policy exists for the leaveType. Throws BalanceNotFoundError only if the repository returns null on a lookup that should succeed (internal consistency).
- BalanceService.hasSufficientBalance — No auth enforcement at service layer; idempotent; Returns false (never throws) when no balance exists or remainingDays < requestedDays. Returns true when remainingDays >= requestedDays.
- BalanceService.reserveDays / commitDays / restoreDays — No auth enforcement at service layer; Each resolves the balance via findByEmployeeYearAndPolicy; throws BalanceNotFoundError if no balance exists. Delegates to the corresponding atomic repository method. Returns null from repository as BalanceNotFoundError. The repository may return null if the atomic guard fails (e.g., insufficient remaining for reserveDays); the service must surface this as a distinct error (e.g., 'Insufficient balance for reservation').
- BalanceController route handlers (getBalances, getBalance) — RBAC enforced by requireRole guard at route registration — minimum 'employee' role for GET endpoints; idempotent; Returns error responses matching the error_response_contract: 404 with NOT_FOUND for missing balances, 400 with VALIDATION_ERROR for invalid query params. Never leaks internal error details to the client.

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