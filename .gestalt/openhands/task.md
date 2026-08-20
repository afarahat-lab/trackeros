# Implement this phase: Phase 2: Balance & Audit Log (part 2/2)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/3350baf6-9bd5-4cac-b688-f263972317f9/6`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Implement the concrete repository classes for Balance and AuditLog, plus the Balance service, controller, and routes. This phase depends on the models/interfaces from part 1/2.

Read these files before generating: `src/modules/balance/balance.model.ts`, `src/modules/audit-log/audit-log.model.ts`, `src/shared/db/connection.ts`, `src/app.ts`.

Files to create:

1. `src/modules/balance/balance.repository.ts` — Implement `PgBalanceRepository` satisfying `IBalanceRepository`. Use pg Pool. Methods: findByEmployeeId, findByEmployeeIdAndLeaveType, findByEmployeeIdAndFiscalYear, create, update, deductDays (UPDATE remaining_days = remaining_days - $days, used_days = used_days + $days, set status to 'exhausted' if remaining reaches 0). Import from `./balance.model.ts`.

2. `src/modules/balance/balance.service.ts` — Implement `BalanceService` satisfying `IBalanceService`. Constructor takes `IBalanceRepository`. getBalance delegates to repo, hasSufficientBalance checks remainingDays >= requestedDays, deductBalance delegates to repo.deductDays. [BINDING RULE: Calendar days inclusive — the service must accept the pre-calculated day count; the calculation itself lives in the leave-request module.]

3. `src/modules/balance/balance.controller.ts` — Fastify route handlers: getBalance (GET /balance/:employeeId/:leaveType), getBalances (GET /balance/:employeeId). Import BalanceService.

4. `src/modules/balance/balance.routes.ts` — Register Fastify routes for the balance controller. Export a plugin function.

5. `src/modules/audit-log/audit-log.repository.ts` — Implement `PgAuditLogRepository` satisfying `IAuditLogRepository`. Use pg Pool. Methods: findByEntity, create, findAll with optional filters.

6. `tests/unit/modules/balance/balance.repository.spec.ts` — Jest tests for PgBalanceRepository (mock pg Pool).
   `tests/unit/modules/balance/balance.service.spec.ts` — Jest tests for BalanceService (mock IBalanceRepository).
   `tests/unit/modules/audit-log/audit-log.repository.spec.ts` — Jest tests for PgAuditLogRepository.

Note: The balance routes should be registered in `src/app.ts` in a follow-up integration phase or as part of this phase if the app.ts already supports plugin registration.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Calendar days inclusive: start_date through end_date, all days count toward used_days (weekends and public holidays included). end_date is inclusive. [BINDING RULE — operator decision resolving: How are leave days counted — are start_date and end_date inclusive, and do weekends/public holidays count toward the used-days total?; apply everywhere these apply, not in one place only]

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

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- PgBalanceRepository must import pool from src/shared/db/connection (not create its own Pool instance). (see `src/shared/db/connection.ts`)
- PgAuditLogRepository must import pool from src/shared/db/connection (not create its own Pool instance). (see `src/shared/db/connection.ts`)
- Balance entity, IBalanceRepository, IBalanceService, InsufficientBalanceError, and BalanceNotFoundError must be imported from ./balance.model.ts — not redefined. (see `src/modules/balance/balance.model.ts`)
- AuditLog entity, IAuditLogRepository, and AuditLogValidationError must be imported from ./audit-log.model.ts — not redefined. (see `src/modules/audit-log/audit-log.model.ts`)
- BalanceStatus enum must be imported from src/shared/types/index.ts — not redefined locally. (see `src/shared/types/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `Balance`: remainingDays = totalEntitlement - usedDays must hold after every state change. deductDays is the only operation that mutates usedDays/remainingDays; it must decrement remainingDays and increment usedDays by the same amount atomically.
- Reuse or extend `Balance`: status transitions: active → exhausted when remainingDays reaches 0 or below. The transition is computed in SQL (CASE WHEN remaining_days - $days <= 0 THEN 'exhausted' ELSE status END) and must never be set to 'exhausted' while remainingDays > 0.
- Reuse or extend `AuditLog`: Every AuditLog record is immutable after creation — no update or delete methods exist on IAuditLogRepository. The create method is the only write path.
### Interface contract — expose these operations (their shape is yours)
- IBalanceRepository.deductDays — Returns null when the balance row does not exist (id not found). The caller (BalanceService) is responsible for translating null into BalanceNotFoundError.
- IBalanceService.deductBalance — Throws BalanceNotFoundError (code: NOT_FOUND) when no balance exists for the given employeeId+leaveType or when deductDays returns null. Throws InsufficientBalanceError (code: INSUFFICIENT_BALANCE) when remainingDays < days. Accepts a pre-calculated day count; the service does NOT compute days from dates — that responsibility lives in the leave-request module.
- IBalanceService.hasSufficientBalance — idempotent; Returns false (not an error) when the balance does not exist. Returns false when remainingDays < requestedDays. Returns true only when remainingDays >= requestedDays.
- IAuditLogRepository.findAll — idempotent; All filter parameters are optional. When no filters are provided, returns all audit logs ordered by created_at DESC. Dynamic WHERE clause construction uses indexed placeholders ($1, $2, …) built incrementally.
### Integration points — connect to these
- src/shared/db/connection.ts (pg Pool) — Both PgBalanceRepository and PgAuditLogRepository depend on the shared pg Pool for all database operations.
- src/modules/balance/balance.model.ts (IBalanceRepository, IBalanceService, error classes) — PgBalanceRepository implements IBalanceRepository; BalanceService implements IBalanceService and consumes IBalanceRepository; BalanceController consumes BalanceService. The leave-request module (Phase 3) will consume IBalanceService for balance checks and deductions.
- src/modules/audit-log/audit-log.model.ts (IAuditLogRepository) — PgAuditLogRepository implements IAuditLogRepository. The leave-request module (Phase 3) will consume IAuditLogRepository to write audit records for all state-changing operations.
- src/app.ts (Fastify instance) — The balance routes plugin is exported and ready for registration via app.register(balanceRoutes) in a follow-up integration phase.

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