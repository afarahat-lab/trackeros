# Continue the previous attempt (it hit the iteration limit before finishing)

A prior code-agent attempt on this work dir (`/tmp/gestalt/fix/f5a0dfb3-f8f1-4335-94b2-5d8d22cf459f/4/1`) was stopped after reaching its iteration limit. Its work is ALREADY on disk here — do NOT restart from scratch or re-read everything; build on what exists. It made 11 file edit(s). Its last verification PASSED (`cd /tmp/gestalt/fix/f5a0dfb3-f8f1-4335-94b2-5d8d22cf459f/4/1 && npx jest tests/unit/modules/policy/policy.errors.spec.ts tests/unit/modules/employee/employee.errors.spec.ts --runInBand 2>&1 | tail -40`).

Finish the task now: fix any failing build/type-check/tests, then RUN the build and the tests and fix anything still failing. Stop as soon as the build and tests pass. The full original task (with all mandatory constraints) follows for reference.

---

# Fix specific quality-gate violations: Phase 4 — Policy module

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/f5a0dfb3-f8f1-4335-94b2-5d8d22cf459f/4/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The shared UniqueConstraintError and RepositoryError must match the error-shape contract { error: string; code: string } with a stable machine code in SCREAMING_SNAKE_CASE. (see `docs/ARCHITECTURE.md`)
- The employee repository's unique-violation throw sites must emit code DUPLICATE_EMPLOYEE, matching the existing employee.repository.ts behaviour. (see `src/modules/employee/employee.repository.ts`)
- The policy repository's unique-violation throw sites must emit code DUPLICATE_POLICY, matching the existing policy.repository.ts behaviour. (see `src/modules/policy/policy.repository.ts`)
- The shared error classes must be importable through the shared module's public entry point, consistent with the module dependency rule that modules import only via index.ts. (see `AGENTS.md`)
### Entity invariants — enforce these
- Reuse or extend `UniqueConstraintError`: A single shared class; constructor (code, message) with code required and no default; carries no module-specific knowledge; its code field is populated from the caller-supplied argument.
- Reuse or extend `RepositoryError`: A single shared base error class extending Error with a stable machine code field; module-specific NotFoundError classes extend it and remain in their own modules.
- Reuse or extend `EmployeeNotFoundError`: Remains in the employee module; extends the shared RepositoryError; preserves code EMPLOYEE_NOT_FOUND.
- Reuse or extend `PolicyNotFoundError`: Remains in the policy module; extends the shared RepositoryError; preserves code POLICY_NOT_FOUND.

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- 1. DAY COUNT — Inclusive calendar days: days = (endDate - startDate) + 1. A single-day request counts as 1. This SAME count is used for BOTH the balance-sufficiency check and the balance deduction; they must never compute it independently. Implement it ONCE as a shared pure helper (e.g. src/shared/leave/day-count.ts) and call that helper from every site. No weekend/holiday exclusion.

2. FISCAL-YEAR BOUNDARY — Attribute the WHOLE request to the fiscal year of startDate. Exactly one LeaveBalance row is ever debited per request; do not split days across years, and do not reject boundary-crossing requests.

3. RBAC — Three roles: employee, manager, hr_admin. Manager INHERITS every employee permission. Matrix: employee may create/submit/cancel their OWN request and view their OWN balances; manager may additionally approve/reject requests of their subordinates (and may file their own leave, via inheritance); hr_admin may view and act on ALL requests and may adjust balances. A manager may NOT approve their own request. Enforce with a route-level requireRole(...) guard, never an inline check inside a service.

4. GRANULARITY — Whole days only. Reject fractional-day requests at the API boundary with 400. used_days and remaining_days are INTEGERS; there is no rounding rule anywhere. Guard against negative balances: an approval that would drive remaining_days below zero is rejected, not clamped.

5. and 15. BACKGROUND JOBS — NONE. No BullMQ, no accrual scheduler, no notification fanout in this feature. (bullmq is not a dependency of this project.) Questions 5 and 15 are the same question; this answer covers both.

6. LOCAL DEV AUTH — Seeded local users. No mock OIDC provider.

7. LeaveStatus ENUM — The root ARCHITECTURE.md set is authoritative: PENDING / APPROVED / REJECTED / CANCELLED. No DRAFT and no SUBMITTED state. A created request is PENDING immediately. Update DOMAIN.md to match; ARCHITECTURE.md wins.

8. DATA ACCESS — Raw pg with parameterized SQL against the shared pg.Pool exported by src/shared/db/connection.ts. Knex is for MIGRATIONS ONLY and must not be used in repository queries. Repository methods that take part in a multi-step write accept an optional client?: PoolClient; the calling service owns the unit of work.

9. VALIDATION — zod, at the API boundary. Do not use class-validator in new code.

10. CANONICAL ENTITY NAMES — LeaveBalance, LeavePolicy, AuditLog. Those exact names for the entity, the repository, and the table (snake_case: leave_balances, leave_policies, audit_logs). Balance / Policy / Audit / AuditRecord are not to be used.

11. PACKAGE HYGIENE — Leave package.json AS-IS for this feature. Do not rename it and do not prune express/class-validator/zod. Dependency cleanup is out of scope here and pruning risks breaking the existing status/uptime modules.

12. ERROR SHAPE — { error: string; code: string }. `error` is a human-readable message, `code` a stable machine constant (e.g. INSUFFICIENT_BALANCE, LEAVE_NOT_FOUND, FORBIDDEN). Used for every 400/401/403/404.

13. UPTIME MODULE — Leave it as-is. Do not refactor it. New modules follow the canonical repository/controller pattern regardless.

14. CONTRACTS PACKAGE — @trackeros/contracts is NOT scaffolded (there is no packages/ directory) and must NOT be created in this feature. Keep shared types in src/shared/types. [BINDING RULE — operator decision resolving: How is the day count for a LeaveRequest derived from startDate and endDate (inclusive vs exclusive, calendar vs business days), and is it the same count used for both the balance sufficiency check and the balance deduction?; Which fiscal year does a LeaveRequest map to when startDate and endDate span a fiscal-year boundary, and how is the day count split across years for balance deduction?; What is the concrete RBAC role model (employee/manager/hr_admin) and which roles may perform each leave action (create, submit, approve, reject, cancel, view balances)?; How are leave_balances.used_days and remaining_days computed, rounded, and bounded when a request is approved (e.g. partial-day requests, half-day rounding, negative-balance guard)?; Are background jobs required via BullMQ for leave workflows (accrual schedulers, notification fanout)?; How should local development auth be implemented concretely (seeded local users vs mock OIDC provider)?; LeaveStatus enum value discrepancy: DOMAIN.md defines DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED, while root ARCHITECTURE.md uses PENDING/APPROVED/REJECTED/CANCELLED. Which set is authoritative for the leave_requests.status field and shared types?; Should concrete repositories use Knex query builder or raw pg (parameterized SQL) against the shared pg.Pool?; Which validation library should be standardized for API-boundary input validation?; What are the canonical names for duplicate/overlapping domain entities (Balance vs LeaveBalance, Policy vs LeavePolicy, Audit vs AuditLog vs AuditRecord)?; Should package.json name be changed from leave-management to trackeros, and should express/class-validator/zod be pruned to match the declared Fastify stack?; What is the exact error response shape beyond the required 400/401/403/404 status codes?; Should the existing uptime module be refactored to the canonical repository/controller pattern, or left as-is?; Is the shared @trackeros/contracts package already scaffolded, or does it need to be created?; What background jobs, if any, are required via BullMQ for leave/expense workflows (accrual schedulers, notification fanout)?; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Remove the local RepositoryError and UniqueConstraintError class declarations from src/modules/policy/policy.errors.ts and import them from the employee module's public entry point (src/modules/employee/index.ts) instead.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/policy/policy.errors.ts
Line: 1
Offending code: `export class RepositoryError extends Error {`
Rule violated: no-redefine-symbol
Action (do this now): Edit `src/modules/policy/policy.errors.ts` at line 1 in place to fix the `no-redefine-symbol` violation.
What the quality gate found — apply this: [no-redefine-symbol] The `RepositoryError` base class (a base error carrying a `code` property) is already exported by the employee module's public entry point (src/modules/employee/index.ts exports `RepositoryError` from employee.errors.ts). The policy module re-declares an identical symbol with the same shape and meaning instead of importing it. This duplicates a symbol owned by another module, violating the rule against redefining symbols another module already owns.

- Site 2
File: src/modules/policy/policy.errors.ts
Line: 11
Offending code: `export class UniqueConstraintError extends RepositoryError {`
Rule violated: no-redefine-symbol
Action (do this now): Edit `src/modules/policy/policy.errors.ts` at line 11 in place to fix the `no-redefine-symbol` violation.
What the quality gate found — apply this: [no-redefine-symbol] `UniqueConstraintError` (a RepositoryError subclass carrying a stable machine code) is already exported by the employee module's public entry point (src/modules/employee/index.ts). The policy module re-declares the same symbol with the same shape and meaning (a RepositoryError subclass with a `code` property) instead of importing it, duplicating a symbol owned by another module.

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