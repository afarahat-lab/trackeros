# Implement this phase: Phase 1: Shared types foundation

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/63ff1071-5533-4487-9cf5-cd66e5b8b64e/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the shared types module at `src/shared/types/index.ts`. Define and export three enums exactly as the architecture specifies:

- `LeaveRequestStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `LeaveType`: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY
- `AuditAction`: CREATED, UPDATED, APPROVED, REJECTED, CANCELLED, DELETED

This is a standalone file with no dependencies on other project modules. Use the existing project conventions: TypeScript strict mode, no `any` types, ES module exports.

Include a Jest unit test file at `tests/unit/shared/types/index.test.ts` that verifies each enum has the correct members and that enum values are distinct.

This phase has no dependencies on prior phases — it is the foundation.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions — keep everything MINIMAL, uniform, and self-consistent: (1) Day counting = inclusive calendar days for ALL leave types: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar and do NOT vary counting by leave type. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, entitlement check, reporting). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no per-company/tenant/jurisdiction configuration. (3) Emergency leave ALWAYS requires manager approval, exactly like every other leave type — no auto-approval, no separate emergency policy flag, no special SLA. The policy requiresManagerApproval flag governs uniformly. (4) Balances are integers (full-day granularity only); remaining_days = total_entitlement - used_days exactly; if a fractional value ever arises, floor it. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Specifically: (a) inclusive or exclusive of the end date, and (b) calendar days or business/working days? The answer affects balance deduction arithmetic, minimum-notice calculations, and sufficiency checks everywhere.; Can an APPROVED leave request be cancelled after its startDate has already passed (or partially passed)? If so, how is the balance restoration calculated — full days, only remaining future days, or prorated?; How is the fiscal year defined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), a configurable company fiscal year (e.g. Apr 1 – Mar 31), or per-employee based on hire date anniversary?; How are leave days counted — calendar days or business/working days? The count affects both the balance decrement on approval and the validation that sufficient balance exists before submission.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `AuditAction` enum members must match the audit action names referenced in the reconciled architecture's business rules and the audit module's planned `AuditRecord.action` field. Specifically: CREATED, UPDATED, APPROVED, REJECTED, CANCELLED, DELETED. (see `.gestalt/architecture/reconciled.json`)
- The `LeaveRequestStatus` enum members must match the lifecycle states declared in the reconciled architecture's `LeaveRequest` entity: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. (see `.gestalt/architecture/reconciled.json`)
- The `LeaveType` enum members must match the leave categories declared in the reconciled architecture's `LeaveType` entity: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequestStatus`: The enum is a closed set of five lifecycle states: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. No other values are valid for a LeaveRequest status. Every member value is distinct.
- Reuse or extend `LeaveType`: The enum is a closed set of six leave categories: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY. Every member value is distinct. The feature scope explicitly covers ANNUAL, SICK, and EMERGENCY; the remaining types are defined for completeness.
- Reuse or extend `AuditAction`: The enum is a closed set of six auditable actions: CREATED, UPDATED, APPROVED, REJECTED, CANCELLED, DELETED. Every member value is distinct. These values are used by the audit module to classify every state-changing operation.

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