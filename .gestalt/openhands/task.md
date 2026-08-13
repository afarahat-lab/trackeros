# Implement this phase: Phase 1: Shared types — enums and value types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/0a9e79d5-ceb7-41f8-a164-f84cb7818c71/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create `src/shared/types/index.ts` with all shared domain types that every downstream module depends on:

- `LeaveTypeCode` — union type: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
- `LeaveType` — interface with fields: `code: LeaveTypeCode`, `label: string`, `requiresDocumentation: boolean`, `isPaid: boolean`
- `LEAVE_TYPES` — const record mapping each `LeaveTypeCode` to its `LeaveType` properties (the canonical lookup table)
- `LeaveStatus` — enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
- `UserRole` — enum: `employee`, `manager`, `hr_admin`
- `DateRange` — interface: `startDate: Date`, `endDate: Date`
- `PaginationParams` — interface with `page: number`, `limit: number`
- `PaginationResult<T>` — generic interface with `data: T[]`, `total: number`, `page: number`, `limit: number`

Include Jest unit tests in `tests/unit/shared/types/` verifying each enum value and the LEAVE_TYPES lookup table.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Leave-day counting (used_days from start_date to end_date):
- Count BUSINESS DAYS ONLY: exclude weekends (Saturday and Sunday) and public holidays.
- Both start_date and end_date are INCLUSIVE.
- Whole days only (no half-days).
- Example: Mon Jun 1 to Fri Jun 5 = 5 days; a range spanning a weekend counts only the weekdays within it.

Other standard business rules for the module:
- Leave year: calendar year (Jan 1 to Dec 31), keyed off start_date.
- Balance = entitled - (used + pending). Deduct on APPROVAL (finalize); on submission the days are held as PENDING (a reservation); on reject or cancel release the reservation.
- Auto-create balances for all leave types on employee creation.
- Overlapping requests are prevented (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- A cross-year request deducts wholly from the fiscal year of start_date (no split).
- Separate emergency-leave pool from annual/sick.
- Every endpoint enforces RBAC (employees act on their own records; managers approve/reject their reports) plus input validation.
- When an employee has no manager, approval escalates to HR.
- Use-it-or-lose-it: no carryover of unused balance across leave years. [BINDING RULE — operator decision resolving: How are leave days counted when computing used_days from start_date to end_date? Are both dates inclusive? Are weekends and public holidays excluded?; apply everywhere these apply, not in one place only]

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