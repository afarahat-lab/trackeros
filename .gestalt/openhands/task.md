# Implement this phase: Phase 6: AuditLog model, repository, and service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/cb89b522-6bc0-439f-8a0d-f905145254ee/6`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the AuditLog domain model, repository, and service at the exact paths declared by the architecture's Module Boundaries for the audit module (`src/modules/audit/`).

Files to create:
- `src/modules/audit/audit.model.ts` — Define the `AuditLog` interface with the canonical fields: `id: string`, `entityType: string`, `entityId: string`, `action: string`, `oldValues: Record<string, unknown> | null`, `newValues: Record<string, unknown> | null`, `performedBy: string | null`, `performedAt: Date`, `createdAt: Date`, `updatedAt: Date`.
- `src/modules/audit/audit.repository.ts` — Define `IAuditRepository` interface with methods: `create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog>`, `findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>`. Implement `AuditRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with method: `log(params: { entityType: string; entityId: string; action: string; oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null; performedBy: string | null }): Promise<void>`.
- `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. It injects `IAuditRepository` and delegates to it, setting `performedAt: new Date()`.
- `src/modules/audit/index.ts` — Barrel export.

This phase depends on `src/shared/db/connection.ts` (existing). No dependency on other phases.

Include Jest unit tests in `tests/unit/modules/audit/`.

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

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `AuditLog` — the entity MUST have exactly these fields:
    - id: string
    - entityType: string
    - entityId: string
    - action: string
    - oldValues: Record<string, any> | null
    - newValues: Record<string, any> | null
    - performedBy: string | null
    - performedAt: Date
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `AuditRepository` constructor signature and pool-accepting pattern MUST match the existing repository convention: `constructor(client?: Pool | PoolClient)` with `this.db = client ?? pool`. Reference: `src/modules/employee/employee.repository.ts` lines 28-30. (see `src/modules/employee/employee.repository.ts`)
- The `AuditRepository` MUST use a private `rowToAuditLog` helper function that maps `snake_case` database columns to `camelCase` TypeScript properties, following the exact same pattern as `rowToEmployee` in `src/modules/employee/employee.repository.ts`. Column mapping: `entity_type` → `entityType`, `entity_id` → `entityId`, `old_values` → `oldValues`, `new_values` → `newValues`, `performed_by` → `performedBy`, `performed_at` → `performedAt`, `created_at` → `createdAt`, `updated_at` → `updatedAt`. (see `src/modules/employee/employee.repository.ts`)
- The `AuditService` constructor MUST accept `IAuditRepository` via dependency injection (constructor parameter), following the same pattern that `LeaveService` will use to inject `IAuditService` in Phase 8. The service MUST NOT instantiate the repository internally. (see `src/modules/employee/employee.repository.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditLog`: An `AuditLog` record is immutable once created — it represents a point-in-time snapshot of a state change. No update or delete operations exist on the repository. The `id`, `createdAt`, and `updatedAt` fields are generated on insert and never change.
- Reuse or extend `AuditLog`: Every `AuditLog` record MUST have a non-empty `entityType` and `entityId` — these together identify the domain entity whose state changed. `action` MUST be a non-empty string describing the operation (e.g., 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'CANCEL'). `performedAt` MUST be set to the moment the state change occurred (not the moment the audit record was persisted).
### Interface contract — expose these operations (their shape is yours)
- IAuditService.log — None at this layer — auth is enforced at the HTTP boundary (controller/middleware), not in the service. The `performedBy` parameter is trusted caller-supplied data.; If the underlying repository `create` call fails (e.g., database connection error, constraint violation), the error MUST propagate to the caller — the service does not swallow or transform repository errors. The method returns `Promise<void>` on success.
- IAuditRepository.create — None — repository has no auth concern.; Returns the created `AuditLog` with server-generated `id`, `createdAt`, and `updatedAt`. On database failure, the error propagates to the caller.
- IAuditRepository.findByEntity — None — repository has no auth concern.; idempotent; Returns an array of `AuditLog` records matching the given `entityType` and `entityId`, ordered by `performedAt DESC` (most recent first). Returns an empty array (not null) when no records match. On database failure, the error propagates to the caller.
### Integration points — connect to these
- src/shared/db/connection.ts — The `AuditRepository` imports the shared `pool` as its default database connection, identical to all existing repositories.

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
- Modules import from each other ONLY through their declared public entry point (`index.ts`)
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