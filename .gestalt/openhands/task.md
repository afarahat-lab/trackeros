# Fix specific quality-gate violations: Phase 3: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/cb89b522-6bc0-439f-8a0d-f905145254ee/3/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `findByLeaveType` SQL query must use the same `is_active = true` filter pattern already established by `findAllActive` in the same file. (see `src/modules/policy/policy.repository.ts (findAllActive method, line ~61)`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: Repository query methods that return a single policy by lookup criteria (`findByLeaveType`) must only return policies whose `isActive` is `true` — inactive policies are excluded at the query level, not filtered in application code.
### Interface contract — expose these operations (their shape is yours)
- IPolicyRepository.findByLeaveType — N/A — repository layer; no auth rule applies; idempotent; Returns null when no active policy matches the leave type (including when only an inactive policy exists). No thrown errors for missing rows.

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveType: LeaveType
    - entitlementDays: number
    - accrualRate: number | null
    - maxAccumulation: number | null
    - minimumNoticeDays: number | null
    - requiresManagerApproval: boolean
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
- Business policy answers (scoped to what the codebase provisions — do NOT introduce new unplanned data sources):

1/5. Fiscal (leave) year: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave start_date. Not April, not a configurable period, not an employee anniversary.

2/7. Accrual: ANNUAL LUMP-SUM granted UPFRONT at the start of the fiscal year (Jan 1). accrualRate = the annual entitlement (whole days) allocated in full on Jan 1 — NOT monthly, daily, or continuous accrual. Mid-year hires: pro-rate the first year by the whole months remaining from the hire date (rounded down).

3. Carry-over + maxAccumulation: USE-IT-OR-LOSE-IT — no carry-over of unused days across fiscal years. maxAccumulation is a cap on the TOTAL balance (a safety ceiling); since there is no carry-over, the balance never exceeds the annual entitlement, so maxAccumulation simply bounds it.

4. Day counting: WEEKDAYS ONLY — count Monday through Friday, exclude Saturday and Sunday. Do NOT exclude public holidays: there is NO holiday table/repository/provider in scope and you must NOT introduce one. Both start_date and end_date are INCLUSIVE. WHOLE DAYS ONLY (no half-days). Keep this as a self-contained pure date helper with no external dependency.

6. Negative balance: NO — never allow the balance to go negative. Reject a leave request whose business-day count exceeds the employees remaining available balance (available = entitled - (used + pending)). Return a validation error.

Cross-cutting rules:
- Deduct on APPROVAL: on submission hold the days as PENDING (reservation); on approval move pending to used; on reject or cancel release the reservation.
- Prevent overlapping requests (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- Emergency leave is a SEPARATE pool (distinct from annual/sick), bypasses the advance-notice requirement but still requires approval and deducts from its own balance.
- Employee data (managerId, employmentStatus, hireDate) comes from an injected IEmployeeRepository (same repository-interface pattern as other modules); the JWT provides ONLY the caller identity + role for RBAC. Approvals route to the target employee managerId; if null, escalate to HR (role hr_admin). Managers act only on direct reports.
- Every endpoint enforces RBAC + input validation. Balances auto-created for all leave types on employee creation. Only ACTIVE employees may submit. [BINDING RULE — operator decision resolving: What is the fiscal year start date? The LeaveBalance.fiscalYear field needs a concrete definition — e.g. does the fiscal year start on January 1, April 1, or a configurable date per organisation?; How does leave entitlement accrue over the fiscal year? The LeavePolicy.accrualRate field exists but its semantics are undefined — is it a monthly rate, a daily rate, or a lump sum at the start of the year?; What is the carry-over rule for unused leave at fiscal year end? LeavePolicy.maxAccumulation exists but its exact semantics (cap on carry-over? cap on total balance?) are not defined.; How are leave days counted from start_date and end_date? Are both dates inclusive? Are weekends and/or public holidays excluded from the count?; What defines the fiscal_year boundary for leave balances? Is it a calendar year, a company-configured fiscal year, or an employee-specific anniversary year?; Should leave balance be allowed to go negative when an employee submits a request exceeding their remaining balance?; How are leave balances accrued — annual lump-sum reset, monthly pro-rata, or continuous accrual?; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Update the `findByLeaveType` SQL query in `src/modules/policy/policy.repository.ts` to filter active policies only: change `'SELECT * FROM leave_policies WHERE leave_type = $1'` to `'SELECT * FROM leave_policies WHERE leave_type = $1 AND is_active = true'`.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/policy/policy.repository.ts
Line: 50
Offending code: `'SELECT * FROM leave_policies WHERE leave_type = $1',`
Rule violated: success-criteria-findByLeaveType-active
Action (do this now): Edit `src/modules/policy/policy.repository.ts` at line 50 in place to fix the `success-criteria-findByLeaveType-active` violation.
What the quality gate found — apply this: [success-criteria-findByLeaveType-active] The success criteria state: "PolicyRepository.findByLeaveType returns at most one LeavePolicy per leave type (the active policy for that type), or null if none exists." The current query does not include `AND is_active = true`, so it could return an inactive policy. The query should be: `SELECT * FROM leave_policies WHERE leave_type = $1 AND is_active = true`.

- Site 2
File: src/modules/policy/policy.repository.ts
Line: 50
Offending code: `'SELECT * FROM leave_policies WHERE leave_type = $1',`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/policy/policy.repository.ts` at line 50 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] findByLeaveType must return "the active policy for that type" per the spec, but the query does not filter by `is_active = true`. If both an active and an inactive policy exist for the same leave type, the query could return the inactive one.

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