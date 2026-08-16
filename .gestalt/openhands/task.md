# Fix specific quality-gate violations: Phase 9: LeaveRequest routes and controller

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/76d847b2-5905-40af-b702-36710232b1e4/9/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The error-to-HTTP-status mapping must match the reconciled architecture's error_response_contract: 409 for business rule conflicts (INVALID_STATE_TRANSITION, INSUFFICIENT_BALANCE, BALANCE_CLOSED, POLICY_INACTIVE), 400 for validation errors (INVALID_DATE_RANGE, MINIMUM_NOTICE_VIOLATION). (see `.gestalt/architecture/reconciled.json → error_response_contract`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: The LeaveRequest entity's status lifecycle (DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED) is enforced by the service layer. Any attempt to transition outside the legal state graph must produce an INVALID_STATE_TRANSITION error, which the HTTP layer must surface as a 409 Conflict — not a 400 Bad Request — because the request is syntactically valid but conflicts with the current resource state.
### Interface contract — expose these operations (their shape is yours)
- Error-to-HTTP-status mapping (mapErrorToHttpStatus) — Must partition error codes into: 400 (INVALID_DATE_RANGE, MINIMUM_NOTICE_VIOLATION), 403 (NOT_MANAGER), 404 (EMPLOYEE_NOT_FOUND, POLICY_NOT_FOUND, REQUEST_NOT_FOUND, BALANCE_NOT_FOUND), 409 (INVALID_STATE_TRANSITION, INSUFFICIENT_BALANCE, BALANCE_CLOSED, POLICY_INACTIVE), 500 (all others).

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveRequest` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leavePolicyId: string
    - startDate: Date
    - endDate: Date
    - reason: string | undefined
    - status: LeaveRequestStatus
    - approvedBy: string | null
    - approvedAt: Date | null
    - cancelledAt: Date | null
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
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Fix the HTTP error-to-status mapping so INVALID_STATE_TRANSITION, INSUFFICIENT_BALANCE, BALANCE_CLOSED, and POLICY_INACTIVE all return 409 (keeping INVALID_DATE_RANGE and MINIMUM_NOTICE_VIOLATION at 400), and update all three INVALID_STATE_TRANSITION test cases to expect 409 instead of 400 with corrected test descriptions.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-request/leave-request.routes.ts
Line: 19
Offending code: `case 'INVALID_STATE_TRANSITION':`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/leave-request/leave-request.routes.ts` at line 19 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] Spec requires INVALID_STATE_TRANSITION → 409, but mapErrorToHttpStatus returns 400. The same block also incorrectly maps INSUFFICIENT_BALANCE, BALANCE_CLOSED, and POLICY_INACTIVE to 400 instead of the spec-required 409.

- Site 2
File: tests/unit/modules/leave-request/leave-request.routes.test.ts
Line: 248
Offending code: `it('should return 400 for INVALID_STATE_TRANSITION', async () => {`
Rule violated: review/spec-violation
Action (do this now): Edit `tests/unit/modules/leave-request/leave-request.routes.test.ts` at line 248 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] Spec success criterion #5 requires the test to cover "a 409 from an invalid state transition", but the test expects 400. This applies to all three INVALID_STATE_TRANSITION test cases (lines 248, 302, 372).

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 1
File: src/modules/leave-request/leave-request.routes.ts
Line: 159
Offending code: `fastify.get<{ Params: { employeeId: string } }>(`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/leave-request/leave-request.routes.ts` at line 159 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] Spec requires the employee-specific route (`/leave-requests/employee/:employeeId`) to be registered before the parameterized `:id` route to prevent route collision. Currently `GET /leave-requests/:id` is registered at line 123, before the employee route at line 159.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.