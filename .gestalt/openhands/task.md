# Implement this phase: Phase 2a — LeavePolicy model & repository interface

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/825d20d1-d747-449a-b683-c4c1e534f9eb/2`. Do not clone anything; work only in this directory.

## What to build
src/modules/leave-policy/leave-policy.model.ts exists with the LeavePolicy type/interface containing all specified fields
src/modules/leave-policy/leave-policy.repository.ts exists with the ILeavePolicyRepository interface declaring all 6 CRUD methods with correct signatures
Both files compile without errors when checked with tsc --noEmit

## Success criteria
Create the core type definitions for the leave-policy module. This sub-phase produces zero runtime side-effects — only TypeScript types and interfaces.

Files to create:
1. src/modules/leave-policy/leave-policy.model.ts — Define the LeavePolicy entity with EXACT fields: id (string), policyName (string), leaveType (LeaveType from src/shared/types/index.ts), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date). Export the LeavePolicy interface/type.

2. src/modules/leave-policy/leave-policy.repository.ts — Define the ILeavePolicyRepository interface with methods: findById(id: string): Promise<LeavePolicy | null>, findByLeaveType(leaveType: string): Promise<LeavePolicy | null>, findAll(): Promise<LeavePolicy[]>, create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>, update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>, delete(id: string): Promise<boolean>.

Depends on: src/shared/types/index.ts (Phase 1, for LeaveType enum).

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Day counting = inclusive calendar days: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar. This single formula is BINDING at every call site (deduction, sufficiency check, overlap detection). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscal-year start. A leave request is assumed within one calendar year. (3) Half-day leave is NOT supported — minimum unit is 1 full day; balances are integers; no time-of-day on startDate/endDate and no isHalfDay flag. (4) Balance seeding = pre-seed leave_balances via a scheduled job at year start for all active employees, so a leave_balances row is ALWAYS present for an employee-year-type (repository uses straightforward read/update, never read-then-compute). Keep the LeaveBalance entity. (5) Deduction semantics = Option A atomic dual-update: deductBalance increments usedDays AND decrements remainingDays in ONE transaction; restoreBalance reverses both; recalculateRemainingDays stays consistent with that (remainingDays = totalEntitlement - usedDays). All sibling methods MUST agree on this — no BR-001 drift. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is it inclusive calendar days (endDate - startDate + 1), business days only (excluding weekends/holidays), or half-day granularity? This affects deduction amounts, balance sufficiency checks, and overlap detection.; What defines the fiscal year boundary for LeaveBalance? When a leave request spans two fiscal years, does it draw from one balance or split across two?; Is half-day leave supported? If so, how is it modeled — a boolean flag, or time components on startDate/endDate?; How are leave balances seeded for a new year — are they pre-inserted by a scheduled job at year start, or computed on-the-fly as (policy.days_per_year - SUM(approved leave days))?; Balance deduction semantics: when deductBalance is called, should it (a) increment usedDays AND decrement remainingDays atomically, or (b) only decrement remainingDays and let a separate recalculateRemainingDays reconcile usedDays later? The Balance entity tracks both fields independently.; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveType: string
    - entitlementDays: number
    - accrualRate: number | null
    - maxAccumulation: number | null
    - minimumNoticeDays: number | null
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `LeaveType` enum used by `LeavePolicy.leaveType` MUST be the canonical enum exported from `src/shared/types/index.ts` — do not define a local copy or use a plain string union. (see `src/shared/types/index.ts`)
- The `LeavePolicy` entity MUST be defined as a TypeScript interface (not a class), matching the convention established by `UptimeStatus` in `src/modules/uptime/uptime.model.ts` and `SystemStatus` in `src/modules/status/status.model.ts`. (see `src/modules/uptime/uptime.model.ts`)
- The module MUST use barrel exports via `index.ts`, re-exporting `LeavePolicy` from the model file and `ILeavePolicyRepository` from the repository file, following the pattern in `src/modules/uptime/index.ts`. (see `src/modules/uptime/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A LeavePolicy is uniquely identified by its `id` field. The `leaveType` field references a value from the `LeaveType` enum defined in `src/shared/types/index.ts`. The `isActive` boolean governs whether the policy is currently in effect — only one policy per `leaveType` should be active at a time (enforced at the service layer in a later phase). Nullable fields (`accrualRate`, `maxAccumulation`, `minimumNoticeDays`) represent optional policy rules; `null` means the rule is not enforced for that policy.
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyRepository.create — No auth rule at this layer — the repository interface is a data-access contract; RBAC is enforced at the service/controller layer in a later phase.; Returns the created `LeavePolicy` with `id`, `createdAt`, and `updatedAt` populated. The caller must handle persistence failures (e.g., unique constraint violations on `leaveType`).
- ILeavePolicyRepository.update — No auth rule at this layer.; Returns the updated `LeavePolicy` or `null` if no policy with the given `id` exists. The `data` parameter is `Partial<LeavePolicy>` — only supplied fields are changed.
- ILeavePolicyRepository.delete — No auth rule at this layer.; idempotent; Returns `true` if a policy was deleted, `false` if no policy with the given `id` existed. Deleting a non-existent policy is not an error.
### Integration points — connect to these
- src/shared/types/index.ts — Imports the `LeaveType` enum for the `LeavePolicy.leaveType` field. This is the sole external dependency of this phase.

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