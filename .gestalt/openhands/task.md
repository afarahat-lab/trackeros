# Implement this phase: Phase 7: AuditLog model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/76d847b2-5905-40af-b702-36710232b1e4/7`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/audit/audit.model.ts` — Define the `AuditLog` entity interface with exact fields: id (string), entityType (string), entityId (string), action (string), oldValues (Record<string, any> | null), newValues (Record<string, any> | null), performedBy (string | null), performedAt (Date), ipAddress (string | null), userAgent (string | null), createdAt (Date).
- `src/modules/audit/audit.repository.ts` — Define `IAuditLogRepository` interface with methods: findById(id: string): Promise<AuditLog | null>, findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>, findByPerformedBy(performedBy: string): Promise<AuditLog[]>, create(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>. Provide a stub `AuditLogRepository` class.

Include Jest unit tests in `tests/unit/modules/audit/audit.model.test.ts` and `tests/unit/modules/audit/audit.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

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
    - ipAddress: string | null
    - userAgent: string | null
    - createdAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `AuditLog` model file must follow the same JSDoc + interface export pattern as `src/modules/employee/employee.model.ts` and `src/modules/notification/notification.model.ts`: a JSDoc block describing the entity's purpose and invariants, followed by the exported interface. (see `src/modules/employee/employee.model.ts`)
- The `AuditLogRepository` stub class must follow the same pattern as `EmployeeRepository` and `NotificationRepository`: each method uses underscore-prefixed unused parameters, throws `new Error('not implemented')`, and the class explicitly `implements IAuditLogRepository`. (see `src/modules/employee/employee.repository.ts`)
- The barrel export `src/modules/audit/index.ts` must follow the same re-export pattern as `src/modules/employee/index.ts` and `src/modules/notification/index.ts`: re-export the model interface and the repository interface + stub class. (see `src/modules/employee/index.ts`)
- The model test must import `AuditLog` from the barrel `../../../../src/modules/audit` (not from the model file directly), matching the import pattern in `tests/unit/modules/employee/employee.model.test.ts`. (see `tests/unit/modules/employee/employee.model.test.ts`)
- The repository test must import `AuditLogRepository`, `IAuditLogRepository`, and `AuditLog` from the barrel `../../../../src/modules/audit`, matching the import pattern in `tests/unit/modules/notification/notification.repository.test.ts`. (see `tests/unit/modules/notification/notification.repository.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditLog`: Every AuditLog record is immutable — it has no update or delete lifecycle. Once created, its fields are permanent. The repository exposes only `create` and read methods; there is no mutation path.
- Reuse or extend `AuditLog`: Every AuditLog record must reference a valid domain entity via the composite `(entityType, entityId)` pair. The `entityType` is a string identifying the domain aggregate (e.g. 'LeaveRequest', 'LeaveBalance', 'LeavePolicy'), and `entityId` is the primary key of that entity. Referential integrity is enforced at the service/DB layer in later phases.
- Reuse or extend `AuditLog`: `oldValues` and `newValues` are independently nullable. When `action` is `CREATE`, `oldValues` must be `null` and `newValues` must be non-null. When `action` is `DELETE`, `oldValues` must be non-null and `newValues` must be `null`. When `action` is `UPDATE`, both must be non-null. This invariant is enforced at the service layer in a later phase.
### Interface contract — expose these operations (their shape is yours)
- IAuditLogRepository.create — No auth rule at the repository layer — auth is enforced at the service/controller layer in later phases.; Returns the created `AuditLog` with `id` and `createdAt` populated. The stub throws `'not implemented'`.
- IAuditLogRepository.findByEntity — No auth rule at the repository layer.; idempotent; Returns an array (empty if no matching logs). The stub throws `'not implemented'`.
### Integration points — connect to these
- src/shared/types/index.ts — The audit module is the sole dependency of this phase. The `AuditLog` entity does not reference any shared enum directly (action is a free-form string), but the module must be able to import shared types if needed in later phases.

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