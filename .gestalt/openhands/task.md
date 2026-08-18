# Fix specific quality-gate violations: Phase 2: Employee & LeavePolicy Modules

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/d8fc2ea6-3dd4-4741-b0ac-513d3ac0f17f/2/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `findByLeaveType` SQL query must match the reconciled architecture invariant: "Each LeaveType has exactly one active LeavePolicy at any time." The query must include `AND is_active = true`. (see `.gestalt/architecture/reconciled.json → domain_entities[1] (LeavePolicy) purpose field`)
- The `isActive` method must use the `EmploymentStatus` enum from `shared/types` for its comparison, matching the type declared in `employee.model.ts`. (see `src/modules/employee/employee.model.ts → employmentStatus field typed as EmploymentStatus`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: For any given LeaveType, at most one LeavePolicy with `isActive = true` exists at any time. The `findByLeaveType` repository method MUST enforce this by filtering `is_active = true` in its query, returning the single active policy or null.
- Reuse or extend `Employee`: The `employmentStatus` field is typed as the `EmploymentStatus` enum. All comparisons against this field MUST use the enum values (`EmploymentStatus.ACTIVE`, `EmploymentStatus.INACTIVE`, `EmploymentStatus.TERMINATED`), never raw string literals.
### Interface contract — expose these operations (their shape is yours)
- LeavePolicyRepository.findByLeaveType — N/A — repository layer, no auth; idempotent; Returns the single active LeavePolicy for the given LeaveType, or null if no active policy exists. Must not return inactive policies.
- EmployeeService.isActive — N/A — service layer, no auth; idempotent; Throws NotFoundError if employee does not exist. Returns boolean: true only when employmentStatus equals EmploymentStatus.ACTIVE.

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

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscal-year start, no per-policy override. (2) Cross-year requests = single-year: the ENTIRE LeaveRequest is charged to the fiscal year of its startDate; a request never touches two LeaveBalance records; do NOT build multi-balance/pro-rate logic. (3 & 7) Day counting = inclusive calendar days: daysRequested = (endDate - startDate) + 1; weekends and public holidays ARE counted; do NOT introduce a holiday calendar. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, reporting). (4) Accrual = annual lump sum: the full totalEntitlement is granted at fiscal-year start; NO monthly pro-rata, NO per-pay-period, NO accrual scheduler; partial-year employees get the full entitlement. (5) Emergency leave ALWAYS bypasses minimumNoticeDays, regardless of policy setting. (6) Granularity = full days only: leave balances are INTEGERS (total_entitlement, used_days, remaining_days are whole numbers), so no fractional days ever arise and no rounding is needed; remaining_days = total_entitlement - used_days exactly. If a fractional value ever arises, floor it. This integer rule is consistent across deduction on approval, restoration on cancellation, and display. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom period (e.g. Apr 1 – Mar 31)?; How should a LeaveRequest whose date range spans two fiscal years be handled?; Should leave day counting use calendar days or business days?; How does leave entitlement accrue — lump sum at fiscal year start, monthly pro-rata, or per-pay-period?; Does emergency leave bypass the minimumNoticeDays constraint?; When leave_balances.remaining_days is computed from total_entitlement minus used_days, what rounding direction applies if fractional days arise (e.g. half-day leave, pro-rated entitlements)?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Implement getSubordinates to filter by employmentStatus ACTIVE after fetching from repository, and update the test to verify that only ACTIVE employees are returned.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/employee/employee.service.ts
Line: 48
Offending code: `return this.employeeRepository.findByManagerId(managerId);`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/employee/employee.service.ts` at line 48 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] getSubordinates does not filter by employmentStatus ACTIVE. The spec requires: "returns only employees whose managerId matches the given id AND whose employmentStatus is ACTIVE." The repository's findByManagerId only filters by manager_id and deleted_at IS NULL — it does not restrict to ACTIVE employees.

- Site 2
File: tests/unit/modules/employee/employee.service.spec.ts
Line: 100
Offending code: `mockRepository.findByManagerId.mockResolvedValue(subordinates);`
Rule violated: review/spec-violation
Action (do this now): Edit `tests/unit/modules/employee/employee.service.spec.ts` at line 100 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] getSubordinates test does not verify that only ACTIVE employees are returned. The spec requires filtering by employmentStatus ACTIVE, but the test delegates directly to findByManagerId without any ACTIVE filtering assertion.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Change isActive to return false when the employee does not exist (instead of throwing NotFoundError), update the test to expect false, and correct the documentation to state that isActive returns false for nonexistent employees.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/employee/employee.service.ts
Line: 52
Offending code: `throw new NotFoundError(`Employee with id ${id} not found`);`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/employee/employee.service.ts` at line 52 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] isActive throws NotFoundError when employee does not exist. The spec requires: "returns false when the employee does not exist or is not ACTIVE (never throws)." The implementation throws instead of returning false.

- Site 2
File: tests/unit/modules/employee/employee.service.spec.ts
Line: 128
Offending code: `it('should throw NotFoundError when employee not found', async () => {`
Rule violated: review/spec-violation
Action (do this now): Edit `tests/unit/modules/employee/employee.service.spec.ts` at line 128 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] Test validates the wrong behavior for isActive: it expects NotFoundError to be thrown when the employee does not exist. The spec requires isActive to return false (never throw) for nonexistent employees.

- Site 3
File: docs/ARCHITECTURE.md
Line: 38
Offending code: `- **employee.service.ts** — `IEmployeeService` with `getById`, `getByEmployeeNumber`, `getByEmail` (all throw `NotFoundError` when not found), `getSubordinates`, `isActive` (throws `NotFoundError` for nonexistent employee; returns boolean for existing). `EmployeeService` delegates to `IEmployeeRepository`.`
Rule violated: review/spec-violation
Action (do this now): Edit `docs/ARCHITECTURE.md` at line 38 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] ARCHITECTURE.md documents isActive as throwing NotFoundError for nonexistent employees, but the spec requires isActive to return false (never throw) when the employee does not exist.

- Site 4
File: docs/ARCHITECTURE.md
Line: 52
Offending code: `- Service methods follow a "throw on not found" pattern: `getById`, `getByEmployeeNumber`, `getByEmail`, `getByLeaveType` all throw `NotFoundError` rather than returning `null`. Existence-check methods (`isActive`, `isLeaveTypeActive`) diverge: `isActive` throws for nonexistent employees; `isLeaveTypeActive` returns `false` for nonexistent policies.`
Rule violated: review/spec-violation
Action (do this now): Edit `docs/ARCHITECTURE.md` at line 52 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] ARCHITECTURE.md documents isActive as throwing for nonexistent employees, contradicting the spec which requires isActive to return false (never throw) when the employee does not exist.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 3 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Change the return types of getById, getByEmployeeNumber, getByEmail in IEmployeeService and getById, getByLeaveType in ILeavePolicyService to Promise<T | null>.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/employee/employee.service.ts
Line: 7
Offending code: `getById(id: string): Promise<Employee>;`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/employee/employee.service.ts` at line 7 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] IEmployeeService.getById declares return type Promise<Employee> but the spec requires Promise<Employee | null>. Same applies to getByEmployeeNumber and getByEmail (lines 8-9). The spec success criterion #5 explicitly requires nullable return types for these three methods.

- Site 2
File: src/modules/leave-policy/leave-policy.service.ts
Line: 8
Offending code: `getById(id: string): Promise<LeavePolicy>;`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/leave-policy/leave-policy.service.ts` at line 8 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] ILeavePolicyService.getById declares return type Promise<LeavePolicy> but the spec requires Promise<LeavePolicy | null>. Same applies to getByLeaveType (line 9). The spec success criterion #6 explicitly requires nullable return types for these two methods.

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