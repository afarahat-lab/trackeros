# Fix specific quality-gate violations: Phase 2: LeaveType model + repository (leave-policy module)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/32ad270f-dfe8-4e32-be27-804897fcc970/2/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The barrel import path used by the four updated files must resolve to the same LeaveTypeCode symbol that src/shared/types/index.ts re-exports from './leave-type-code.enum' — the barrel is the single established convention (already used by tests/unit/shared/types/index.test.ts) and the updated files must match it rather than reaching into the enum file directly. (see `src/shared/types/index.ts`)
- After the refactor, no in-scope file may contain an import specifier ending in 'leave-type-code.enum'; all four must import LeaveTypeCode solely from the shared/types barrel, matching the dependency rule that modules consume shared-types through its public entry point (index.ts), not its internals. (see `docs/ARCHITECTURE.md`)
- The leave-policy module's public barrel (src/modules/leave-policy/index.ts) re-exports must remain consistent with the (unchanged) internal file exports — LeaveType, ILeaveTypeRepository, CreateLeaveTypeDto, UpdateLeaveTypeDto, LeaveTypeRepository — so downstream consumers are unaffected by the internal import-path change. (see `src/modules/leave-policy/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveTypeCode`: The LeaveTypeCode enum members (annual, sick, emergency, unpaid, maternity, paternity) and their string values remain identical and are the same runtime object whether imported via the barrel or the direct enum file; the refactor must not change the enum's identity or values.
- Reuse or extend `LeaveType`: The LeaveType interface shape (id, code: LeaveTypeCode, label, description, isActive, createdAt, updatedAt) is unchanged after the import-path refactor; code remains typed as LeaveTypeCode resolved through the barrel.
### Interface contract — expose these operations (their shape is yours)
- ILeaveTypeRepository (findAll, findById, findByCode, create, update, delete) — N/A — repository layer, no auth boundary; refactor is import-path only.; Unchanged: findById/findByCode return null on miss, delete returns boolean, create/update return the entity or null. The import-path change must not alter any method's contract or error behavior.
### Integration points — connect to these
- src/shared/types (barrel) — The four in-scope files switch their LeaveTypeCode import source to this barrel; it is the established public entry point for shared types and already re-exports LeaveTypeCode.

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveType` — the entity MUST have exactly these fields:
    - id: string
    - code: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'
    - label: string
    - description: string | undefined
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

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
Before making the edits below, read the referenced files (those present in the working directory) to learn the project's architecture, conventions, and the cross-cutting rules your fix must still satisfy — then keep the edits consistent with them:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Replace all direct imports of LeaveTypeCode from the internal enum file path with imports through the shared/types barrel entry point. In src files, change `import { LeaveTypeCode } from '../../shared/types/leave-type-code.enum'` to `import { LeaveTypeCode } from '../../shared/types'`. In the test file, change `import { LeaveTypeCode } from '../../../../src/shared/types/leave-type-code.enum'` to `import { LeaveTypeCode } from '../../../../src/shared/types'`.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-policy/leave-type.model.ts
Line: 1
Offending code: `import { LeaveTypeCode } from '../../shared/types/leave-type-code.enum';`
Rule violated: module-public-entry-point
Action (do this now): Edit `src/modules/leave-policy/leave-type.model.ts` at line 1 in place to fix the `module-public-entry-point` violation.
What the quality gate found — apply this: [module-public-entry-point] The shared/types module has a declared public entry point at src/shared/types/index.ts that re-exports LeaveTypeCode. This import bypasses the barrel and reaches directly into the module's internal file, violating the rule: "Modules import from each other ONLY through their declared public entry point." Should be: import { LeaveTypeCode } from '../../shared/types';

- Site 2
File: src/modules/leave-policy/leave-type.repository.interface.ts
Line: 2
Offending code: `import { LeaveTypeCode } from '../../shared/types/leave-type-code.enum';`
Rule violated: module-public-entry-point
Action (do this now): Edit `src/modules/leave-policy/leave-type.repository.interface.ts` at line 2 in place to fix the `module-public-entry-point` violation.
What the quality gate found — apply this: [module-public-entry-point] Same violation: bypasses the shared/types barrel (index.ts) and imports directly from the internal file. Should import from '../../shared/types'.

- Site 3
File: src/modules/leave-policy/leave-type.repository.ts
Line: 9
Offending code: `import { LeaveTypeCode } from '../../shared/types/leave-type-code.enum';`
Rule violated: module-public-entry-point
Action (do this now): Edit `src/modules/leave-policy/leave-type.repository.ts` at line 9 in place to fix the `module-public-entry-point` violation.
What the quality gate found — apply this: [module-public-entry-point] Same violation: bypasses the shared/types barrel (index.ts) and imports directly from the internal file. Should import from '../../shared/types'.

- Site 4
File: tests/unit/modules/leave-policy/leave-type.repository.test.ts
Line: 2
Offending code: `import { LeaveTypeCode } from '../../../../src/shared/types/leave-type-code.enum';`
Rule violated: module-public-entry-point
Action (do this now): Edit `tests/unit/modules/leave-policy/leave-type.repository.test.ts` at line 2 in place to fix the `module-public-entry-point` violation.
What the quality gate found — apply this: [module-public-entry-point] Same violation: bypasses the shared/types barrel (index.ts) and imports directly from the internal file. Should import from '../../../../src/shared/types'.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.