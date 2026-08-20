# Fix specific quality-gate violations: Phase 2: Balance & Audit Log (part 1/2)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/3350baf6-9bd5-4cac-b688-f263972317f9/5/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- `PgBalanceRepository` must follow the same pattern as `PgEmployeeRepository` and `PgLeavePolicyRepository`: import `pool` from `src/shared/db/connection.ts`, use a `mapRowToBalance` function for snake_case→camelCase conversion, use a `COLUMN_MAP` lookup for dynamic UPDATE SET clause construction, and use parameterized `$1, $2, …` placeholders. (see `src/modules/employee/employee.repository.ts`)
- `PgAuditLogRepository` must follow the same pattern as `PgEmployeeRepository`: import `pool` from `src/shared/db/connection.ts`, use a `mapRowToAuditLog` function for snake_case→camelCase conversion, and use parameterized `$1, $2, …` placeholders. (see `src/modules/employee/employee.repository.ts`)
- `BalanceService` must match the pattern of `LeavePolicyService`: stateless class, constructor receives the repository interface, methods delegate to the repository and apply domain logic (throwing typed errors for not-found/invalid states). (see `src/modules/leave-policy/leave-policy.service.ts`)
- The `Balance` entity interface, `IBalanceRepository`, `IBalanceService`, and error classes (`InsufficientBalanceError`, `BalanceNotFoundError`) already exist in `balance.model.ts` and must not be modified — the concrete implementations must satisfy these interfaces exactly as declared. (see `src/modules/balance/balance.model.ts`)
- The `AuditLog` entity interface, `IAuditLogRepository`, and `AuditLogValidationError` already exist in `audit-log.model.ts` and must not be modified — the concrete implementation must satisfy these interfaces exactly as declared. (see `src/modules/audit-log/audit-log.model.ts`)
- The `BalanceStatus` enum (`active`, `exhausted`) from `src/shared/types/index.ts` must be used for the `Balance.status` field — no hardcoded string literals. (see `src/shared/types/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `Balance`: `remainingDays` must always equal `totalEntitlement - usedDays`. Any mutation to `usedDays` (via `deductDays`) must update `remainingDays` in the same atomic operation. When `remainingDays` reaches 0, `status` must transition to `BalanceStatus.exhausted`.
- Reuse or extend `AuditLog`: Every `AuditLog` record must have a non-empty `entityType`, `entityId`, `action`, and `performedBy`. The `changes` field must be a plain object (not an array, not null) — it captures the before/after diff of the state change.
### Interface contract — expose these operations (their shape is yours)
- IBalanceRepository.deductDays — Throws `BalanceNotFoundError` (code `NOT_FOUND`) when no balance row matches the given `id`. Throws `InsufficientBalanceError` (code `INSUFFICIENT_BALANCE`) when `remainingDays < days`. Returns the updated `Balance` on success — never returns null.
- IBalanceService.getBalance — Throws `BalanceNotFoundError` (code `NOT_FOUND`) when no balance exists for the given employee and leave type. Returns `Balance` on success — never returns null.
- IBalanceService.deductBalance — Throws `BalanceNotFoundError` when no balance exists for the given employee and leave type. Throws `InsufficientBalanceError` when `remainingDays < days`. Returns the updated `Balance` on success.
- IAuditLogRepository.create — Throws `AuditLogValidationError` (code `VALIDATION_ERROR`) when required fields (`entityType`, `entityId`, `action`, `performedBy`) are missing or empty. Returns the created `AuditLog` on success.
### Integration points — connect to these
- src/shared/db/connection.ts — Both `PgBalanceRepository` and `PgAuditLogRepository` must import the `pool` from this module for all database operations, following the same pattern as `PgEmployeeRepository` and `PgLeavePolicyRepository`.
- src/shared/types/index.ts — `BalanceStatus` enum (`active`, `exhausted`) is used by `Balance.status` and must be imported by the balance repository and service for the exhaustion transition logic.
- src/modules/balance/balance.model.ts — The concrete `PgBalanceRepository`, `BalanceService`, `BalanceController`, and balance routes all import their interfaces and entity types from this file. Must not be modified — only consumed.
- src/modules/audit-log/audit-log.model.ts — The concrete `PgAuditLogRepository` imports `IAuditLogRepository`, `AuditLog`, and `AuditLogValidationError` from this file. Must not be modified — only consumed.

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Balance` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leaveType: string
    - totalEntitlement: number
    - usedDays: number
    - remainingDays: number
    - fiscalYear: number
    - status: string
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
- Calendar days inclusive: start_date through end_date, all days count toward used_days (weekends and public holidays included). end_date is inclusive. [BINDING RULE — operator decision resolving: How are leave days counted — are start_date and end_date inclusive, and do weekends/public holidays count toward the used-days total?; apply everywhere these apply, not in one place only]

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
File: src/modules/balance/balance.model.ts
Line: 42
Offending code: `deductDays(id: string, days: number): Promise<Balance>;`
Rule violated: review/spec-conformance
Action (do this now): Edit `src/modules/balance/balance.model.ts` at line 42 in place to fix the `review/spec-conformance` violation.
What the quality gate found — apply this: [review/spec-conformance] Success criterion #2 specifies return type `Promise<Balance | null>` for `IBalanceRepository.deductDays`, but the code declares `Promise<Balance>`. Note: the DOMAIN.md and the interface constraints (which require throwing on NOT_FOUND rather than returning null) both support `Promise<Balance>`, so the code is consistent with the domain model — the success criterion appears to have the wrong nullability.

### Edit 2
File: src/modules/balance/balance.model.ts
Line: 47
Offending code: `getBalance(employeeId: string, leaveType: string): Promise<Balance>;`
Rule violated: review/spec-conformance
Action (do this now): Edit `src/modules/balance/balance.model.ts` at line 47 in place to fix the `review/spec-conformance` violation.
What the quality gate found — apply this: [review/spec-conformance] Success criterion #3 specifies return type `Promise<Balance | null>` for `IBalanceService.getBalance`, but the code declares `Promise<Balance>`. The DOMAIN.md also documents `Promise<Balance>` (non-nullable), so the code is consistent with the domain model — the success criterion appears to have the wrong nullability.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.