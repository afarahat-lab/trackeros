# Fix specific quality-gate violations: Phase 1: Foundation & Shared Types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/d8fc2ea6-3dd4-4741-b0ac-513d3ac0f17f/1/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- Employee model must import EmploymentStatus from shared/types/employment-status.enum (via the barrel shared/types/index.ts). The enum values are ACTIVE, INACTIVE, TERMINATED. (see `src/shared/types/employment-status.enum.ts`)
- LeavePolicy model must import LeaveType from shared/types/leave-type.enum (via the barrel shared/types/index.ts). The enum values are annual, sick, emergency, unpaid, maternity, paternity. (see `src/shared/types/leave-type.enum.ts`)
- EmployeeRepository and LeavePolicyRepository must extend BaseRepository<T> from shared/base-repository.ts, which provides findById, findAll, create, update, delete using the shared pg Pool. The tableName property must be set to the correct table name ('employees' and 'leave_policies' respectively). (see `src/shared/base-repository.ts`)
- All error classes used in service methods (e.g., NotFoundError when an employee/policy is not found) must be imported from shared/error-types.ts. The existing classes are NotFoundError (404), ValidationError (422), ConflictError (409), UnauthorizedError (401). (see `src/shared/error-types.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: An Employee's employmentStatus must be one of ACTIVE, INACTIVE, or TERMINATED. Only ACTIVE employees may have leave requests submitted on their behalf. managerId is nullable (employees with no manager exist, e.g. CEO). employeeNumber and email are unique across all employees.
- Reuse or extend `LeavePolicy`: A LeavePolicy's leaveType must be a valid LeaveType enum value. entitlementDays must be a positive integer. For each LeaveType, at most one LeavePolicy may be active (isActive = true) at any time. isActive transitions are ACTIVE ↔ INACTIVE; a policy cannot be deleted while any LeaveRequest references it.
### Interface contract — expose these operations (their shape is yours)
- IEmployeeService.getById — No auth enforcement at this layer — auth is enforced at the controller/route layer in later phases.; idempotent; Returns null if employee not found (no throw).
- IEmployeeService.isActive — No auth enforcement at this layer.; idempotent; Returns false if employee not found or employmentStatus is not ACTIVE; never throws.
- ILeavePolicyService.isLeaveTypeActive — No auth enforcement at this layer.; idempotent; Returns false if no active policy exists for the given LeaveType; never throws.

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

### Edit 1
File: src/shared/error-types.ts
Line: 11
Offending code: `public readonly statusCode: number = 422;`
Rule violated: review/correctness
Action (do this now): Edit `src/shared/error-types.ts` at line 11 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] ValidationError.statusCode is 422, but the phase spec requires 400: "(404, 400, 409, 401 respectively)". The ARCHITECTURE.md error contract mentions 422 for domain rule violations, but the spec.json success criterion explicitly mandates 400 for ValidationError.

### Edit 2
File: src/shared/base-repository.ts
Line: 20
Offending code: `async findById(id: string): Promise<T | null> {`
Rule violated: review/correctness
Action (do this now): Edit `src/shared/base-repository.ts` at line 20 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] Success criterion #6 requires every repository method on BaseRepository<T> to accept an optional PoolClient parameter for transactional use. None of the five CRUD methods (findById, findAll, create, update, delete) accept a PoolClient — they all use `this.pool` directly. The `queryWithClient` helper exists but is unused by the CRUD methods.

### Edit 3
File: tests/unit/shared/types/enums.test.ts
Line: 1
Offending code: `import { LeaveStatus } from 'shared/types/leave-status.enum';`
Rule violated: review/completeness
Action (do this now): Edit `tests/unit/shared/types/enums.test.ts` at line 1 in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] The spec success criterion requires the test to verify "that the barrel index re-exports them." The test imports all enums from individual files (`shared/types/leave-status.enum`, etc.) rather than from the barrel `shared/types`. There is no assertion that the barrel index (`src/shared/types/index.ts`) correctly re-exports the enums.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.