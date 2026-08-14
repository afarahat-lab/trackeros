# Fix specific quality-gate violations: Phase 9: LeaveBalanceService (leave-balance module)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/32ad270f-dfe8-4e32-be27-804897fcc970/9/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The pendingDays floor in finalizeDeduction must reuse the exact defensive pattern already established in releaseReservation within the same service file: compute the new pendingDays via Math.max(0, balance.pendingDays - days) before calling the repository update, rather than inlining the raw subtraction. (see `src/modules/leave-balance/leave-balance.service.ts (releaseReservation method)`)
- The consolidated LeavePolicy import in the test file must resolve to the same type exported by the leave-policy barrel, which re-exports LeavePolicy from the internal model — ensuring type-equivalence and no behavioral change. (see `src/modules/leave-policy/index.ts`)
- The test file's barrel import must remain consistent with the source service file's existing barrel import pattern: both import ILeavePolicyService and AppError (and now LeavePolicy) from the leave-policy public entry point, never from internal module files. (see `src/modules/leave-balance/leave-balance.service.ts (line 4 import statement)`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: pendingDays must never be driven below zero by any balance-mutating operation. The finalizeDeduction operation (which moves pendingDays to usedDays on approval) must enforce this floor just as releaseReservation already does, so that an over-deduction (days > pendingDays) clamps pendingDays to 0 rather than producing a negative value.
- Reuse or extend `LeaveBalance`: remainingDays is a computed field equal to totalEntitlement - usedDays - pendingDays; the pendingDays floor in finalizeDeduction preserves the consistency of this computation by preventing negative pendingDays from inflating remainingDays beyond totalEntitlement - usedDays.
### Interface contract — expose these operations (their shape is yours)
- LeaveBalanceService.finalizeDeduction(employeeId, policyId, days, fiscalYear) — Throws AppError with code NOT_FOUND when no balance record exists for the given employee/policy/fiscal-year triple. On success, atomically updates the balance in a single repository update call: pendingDays is set to Math.max(0, balance.pendingDays - days) and usedDays is set to balance.usedDays + days. The pendingDays result must never be negative.
- LeaveBalanceService.releaseReservation(employeeId, policyId, days, fiscalYear) — Throws AppError with code NOT_FOUND when no balance record exists. On success, sets pendingDays to Math.max(0, balance.pendingDays - days) and does not alter usedDays. This is the reference defensive pattern that finalizeDeduction must match.
### Integration points — connect to these
- leave-policy module public barrel (src/modules/leave-policy/index.ts) — The test file consumes the LeavePolicy type via this barrel; the barrel must re-export LeavePolicy (it already does) so the consolidated import resolves correctly.
- leave-balance repository update interface (ILeaveBalanceRepository.update) — finalizeDeduction persists the floored pendingDays and incremented usedDays through a single update call; the repository contract for atomic field updates must be respected.

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

### Edit 1
File: tests/unit/modules/leave-balance/leave-balance.service.test.ts
Line: 5
Offending code: `import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';`
Rule violated: barrel-import-constraint
Action (do this now): Edit `tests/unit/modules/leave-balance/leave-balance.service.test.ts` at line 5 in place to fix the `barrel-import-constraint` violation.
What the quality gate found — apply this: [barrel-import-constraint] The spec constraint states: "The leave-policy module is imported only through its index.ts barrel (where ILeavePolicyService and AppError are re-exported); never import leave-policy internals directly." The LeavePolicy type IS re-exported from the leave-policy barrel at src/modules/leave-policy/index.ts line 8 (`export { LeavePolicy } from './leave-policy.model';`), so this direct import of the internal model file bypasses the public barrel entry point. The fix is to import LeavePolicy from the barrel: `import { ILeavePolicyService, AppError, LeavePolicy } from '../../../../src/modules/leave-policy';`

### Edit 2
File: src/modules/leave-balance/leave-balance.service.ts
Line: 119
Offending code: `pendingDays: balance.pendingDays - days,`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.ts` at line 119 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] finalizeDeduction does not guard against driving pendingDays below zero: it computes `pendingDays: balance.pendingDays - days` without a Math.max(0, ...) floor. The entityInvariants in the phase spec state "pendingDays >= 0 and usedDays >= 0 after any service operation; reserveDays, finalizeDeduction, and releaseReservation must never drive either counter below zero." If called with days > pendingDays (e.g. a bug in the Phase 10 orchestrator), this would violate the invariant. releaseReservation already applies Math.max(0, ...) for the same reason.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.