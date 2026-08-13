# Implement this phase: Phase 1: Shared Enums (LeaveStatus, LeaveTypeCode)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/32ad270f-dfe8-4e32-be27-804897fcc970/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the shared enum files under src/shared/types/:

1. `src/shared/types/leave-status.enum.ts` — Define and export the LeaveStatus enum with members: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. Use a TypeScript string enum or const object with a union type.

2. `src/shared/types/leave-type-code.enum.ts` — Define and export the LeaveTypeCode enum with members: annual, sick, emergency, unpaid, maternity, paternity.

3. `src/shared/types/index.ts` — Barrel file that re-exports everything from leave-status.enum.ts and leave-type-code.enum.ts.

Include Jest unit tests in `tests/unit/shared/types/` verifying each enum value exists and the barrel re-exports correctly.

No prior phase dependencies — this is the foundation.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers for the leave management module:

1/5/8/10. Fiscal (leave) year boundary: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave start_date. Not hire-date anniversary, not configurable.

2/9. Accrual: ANNUAL LUMP-SUM allocation at the start of the fiscal year (Jan 1) — each employee is granted the full entitlement for that leave type up front (not monthly pro-rata). Mid-year hires: pro-rate the first year by the number of whole months remaining in the year from the hire date (rounded down). maxAccumulation caps the balance; accrualRate is the annual entitlement. Carryover: USE-IT-OR-LOSE-IT — unused balance does NOT carry across fiscal years.

3/6. Emergency leave: it is a SEPARATE pool with its own entitlement, distinct from annual and sick. Emergency leave bypasses the normal advance-notice requirement (it can be applied for same-day / retroactively), but still goes through manager approval and still deducts from its own balance. It does not draw from annual or sick.

4. Deduction timing: deduct on APPROVAL (finalize). On submission the requested days are held as PENDING (a reservation); on approval the pending days move to used; on reject or cancel the reservation is released. Available balance = entitled - (used + pending). Deduct at approval time, not at the start of the leave period.

7. Day counting: BUSINESS/WORKING DAYS only — exclude weekends (Saturday, Sunday) and public holidays. Both start_date and end_date are inclusive. Whole days only (no half-days).

Cross-cutting rules that apply throughout:
- Overlapping leave requests are prevented (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- A request spanning two fiscal years deducts wholly from the fiscal year of start_date (no split).
- Balances are auto-created for all leave types on employee creation.
- Every endpoint enforces RBAC (employees act on their own records; managers approve/reject their direct reports) plus input validation.
- When an employee has no manager, approval escalates to HR. [BINDING RULE — operator decision resolving: How is the fiscal year boundary determined for LeaveBalance?; How does leave accrual work? LeavePolicy defines accrualRate and maxAccumulation, but the accrual mechanics (frequency, proration for mid-year hires, carryover rules) are not specified.; Does emergency leave have special rules that distinguish it from annual and sick leave?; When a leave request is approved, should the balance be deducted immediately at approval time or at the start of the leave period?; How is the fiscal year boundary determined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), the employee's hire-date anniversary, or a configurable organisation-wide fiscal year start?; Does emergency leave have special rules that distinguish it from annual and sick leave? The feature description lists all three but does not specify whether emergency leave bypasses notice periods, approval requirements, or balance checks.; How are leave days counted — calendar days or business/working days?; What are the fiscal year boundaries for balance scoping?; How does leave balance accrual work — annual lump-sum allocation at fiscal-year start vs. monthly pro-rata accrual?; What is the fiscal year boundary — calendar year (Jan 1 – Dec 31) or a configurable company fiscal year?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The barrel's named re-export style must match the existing project convention: `export { Symbol } from './file';` statements, no default exports, no wildcard re-exports. (see `src/modules/status/index.ts`)
- The LeaveStatus enum values must match the reconciled domain model's LeaveRequestStatus.value union exactly: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' (uppercase string literals), even though the export is named LeaveStatus. (see `.gestalt/architecture/reconciled.json`)
- The LeaveTypeCode enum values must match the reconciled domain model's LeaveType.code union exactly: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity' (lowercase string literals). (see `.gestalt/architecture/reconciled.json`)
- The module path and ownership must match the reconciled architecture's module boundary: shared-types at src/shared/types/ owning exactly the LeaveStatus and LeaveTypeCode enums — no other artifacts in this phase. (see `docs/ARCHITECTURE.md`)
### Entity invariants — enforce these
- Reuse or extend `LeaveStatus`: The set of members is closed and exactly {DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED}; each member's runtime value is its own uppercase name, so LeaveStatus is both a value namespace and a type assignable to the union of those five string literals. The export name is LeaveStatus even though the reconciled domain entity is named LeaveRequestStatus.
- Reuse or extend `LeaveTypeCode`: The set of members is closed and exactly {annual, sick, emergency, unpaid, maternity, paternity}; each member's runtime value is its own lowercase name, so LeaveTypeCode is both a value namespace and a type assignable to the union of those six string literals. These codes drive policy lookup and balance tracking downstream.
### Interface contract — expose these operations (their shape is yours)
- Barrel re-export of LeaveStatus and LeaveTypeCode from src/shared/types/index.ts — consumers import both symbols via the module's public entry point (index.ts), never from the internal .enum.ts files directly, per the architecture rule that modules are imported only through their declared public entry point. — idempotent; A missing or misnamed export must surface as a TypeScript compile error (cannot find name) at the consumer's import site, not a runtime failure.
### Integration points — connect to these
- leave-policy module (Phase 2) — imports LeaveTypeCode from src/shared/types/leave-type-code.enum.ts to type the LeaveType.code field and drive policy lookup. — LeaveType.code is typed as LeaveTypeCode; the leave-policy module is the first downstream consumer per the dependency map (leave-policy → shared-types).
- leave-request module (Phase 5) — imports LeaveStatus from src/shared/types/leave-status.enum.ts to type the LeaveRequest.status field and govern state transitions. — LeaveRequest.status is typed as LeaveStatus and the state-transition rules (DRAFT→SUBMITTED, etc.) reference these enum members; leave-request → shared-types per the dependency map.
- leave-balance and notification modules (Phases 4, 7) — depend on shared-types per the reconciled dependency map (leave-balance → shared-types, notification → shared-types). — Both modules transitively consume the shared enum vocabulary; this phase establishes the canonical enum surface they import through the barrel.

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