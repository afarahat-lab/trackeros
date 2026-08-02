# Implement this phase: Phase 8: Audit module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/9`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the audit module. Depends on src/shared/types/base-entity.interface.ts from Phase 1 — read it before generating.

Files to create (3 source files):

1. **src/modules/audit/audit.model.ts** — Define `AuditLog` entity extending `BaseEntity` with fields: actorId (string), action (string — e.g. 'LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED'), targetId (string), targetType (string — e.g. 'LeaveRequest'), details (Record<string, unknown> | null), timestamp (Date). Import BaseEntity from ../../shared/types/base-entity.interface.

2. **src/modules/audit/audit.repository.ts** — Define `IAuditLogRepository` interface: create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog>, findByTarget(targetId: string, targetType: string): Promise<AuditLog[]>, findByActor(actorId: string): Promise<AuditLog[]>. Implement `PgAuditLogRepository` using the shared pg pool from src/shared/db/connection.ts.

3. **src/modules/audit/index.ts** — Barrel export of AuditLog, IAuditLogRepository, PgAuditLogRepository.

Include Jest unit tests in **tests/unit/modules/audit/audit.repository.test.ts**.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated user identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth in this feature; the controller only CONSUMES `request.user` (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid; e.g. startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity — role comes from `request.user`.

7. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: Do unused leave days carry over to the next fiscal year, and if so, what is the cap?; What is the minimum granularity of leave — full days, half-days, or hours?; Do weekends and public holidays count as leave days consumed from the balance?; When a leave request spans two fiscal years, how are days allocated to each year's balance?; How is the fiscal year determined for leave balances? The domain model includes fiscalYear but the mapping rule (calendar year Jan–Dec, fiscal year Jul–Jun, or company-specific) is not specified in the feature description.; How is leave_balances.used_days computed — is it derived on-the-fly by aggregating approved leave_request days for that employee/policy/fiscal-year, or is it a stored counter that is incremented atomically when a leave request is approved (and decremented on cancellation)?; How are leave days counted — calendar days (inclusive start-to-end) or business/working days only? And when a leave request spans two fiscal years, how are days allocated to each year's balance?; How is remainingDays computed — stored as a derived column (totalDays - usedDays) in the DB, or computed at query time? If stored, what keeps it consistent with usedDays after every deduction/restore?; What is the fiscal-year boundary rule? Is it calendar year (Jan 1–Dec 31), a configurable start month, or per-company? Does a leave spanning the boundary consume days from the start-date fiscal year, the end-date fiscal year, or split proportionally?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The AuditLog entity must extend the BaseEntity interface exactly as defined — inheriting id (string), createdAt (Date), updatedAt (Date) — using `import type { BaseEntity } from '../../shared/types/base-entity.interface'`, matching the import path used by all 5 prior modules (employee, policy, balance, leave, notification). (see `src/shared/types/base-entity.interface.ts`)
- The repository must import and use the shared `pool` (a pg.Pool instance) exported from this file at module level — `import { pool } from '../../shared/db/connection'` — with no constructor injection, matching the pattern in all 5 prior repository implementations (employee, policy, balance, leave, notification). (see `src/shared/db/connection.ts`)
- The audit repository must follow the same structural pattern as this reference repository: crypto randomUUID import, pool import, model type import, private snake_case *Row interface, private rowTo* mapper function, exported I*Repository interface, exported Pg*Repository class implementing it, create() with randomUUID() + INSERT ... RETURNING *, array lookups via result.rows.map(rowMapper), no constructor, module-level pool usage. (see `src/modules/notification/notification.repository.ts`)
- The audit module barrel must use the same export pattern: `export type { ... }` for interfaces and model types (AuditLog, IAuditLogRepository) and `export { ... }` for the concrete repository class (PgAuditLogRepository) — matching the barrel export convention across all prior modules. (see `src/modules/notification/index.ts`)
- The audit repository test must follow the same test structure as this reference: jest.mock the shared db connection module before importing pool, cast pool.query as jest.Mock, use makeRow()/makeEntity() helper factories, beforeEach instantiates the repo and clears mocks, mock results cast `as never`, cover success (field mapping + SQL/params verification), empty results (empty array for array methods), and error cases (connection refused, query timeout, unique constraint violation). (see `tests/unit/modules/leave/leave.repository.test.ts`)
- The audit repository's create() method must follow the same INSERT pattern: generate id via randomUUID(), set now = new Date() for createdAt/updatedAt, use parameterized INSERT with RETURNING *, and map the returned row through the row mapper — matching the established create() implementation across employee, policy, balance, leave, and notification repositories. (see `src/modules/employee/employee.repository.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditLog`: An AuditLog entry is immutable once created — the repository exposes no update or delete method; audit records are append-only and never modified or removed after insertion.
- Reuse or extend `AuditLog`: Every AuditLog entry must have a non-null actorId, action, targetId, and targetType — these identify who performed the action, what action was performed, and what entity was acted upon; only the details field may be null.
- Reuse or extend `AuditLog`: AuditLog extends BaseEntity, so every persisted entry carries a server-generated id (UUID via randomUUID), createdAt, and updatedAt — the caller never supplies these fields; they are populated by the repository on insert.
- Reuse or extend `AuditLog`: The timestamp field records when the audited action occurred (distinct from the BaseEntity createdAt which records when the log entry itself was persisted) — both must be preserved through the create → persist → return round-trip.
### Interface contract — expose these operations (their shape is yours)
- IAuditLogRepository.create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog> — No auth enforcement at the repository layer — RBAC is enforced at the API boundary (GP-005); the repository is a pure data-access interface called by the service layer.; Rejects (propagates the underlying pg error) on connection failure, query timeout, or constraint violation — errors are never swallowed; the caller is responsible for handling.
- IAuditLogRepository.findByTarget(targetId: string, targetType: string): Promise<AuditLog[]> — No auth enforcement at the repository layer — RBAC is enforced at the API boundary; the repository is a pure data-access interface.; idempotent; Rejects (propagates the underlying pg error) on connection failure or query timeout; returns an empty array (never null) when zero rows match the targetId + targetType composite.
- IAuditLogRepository.findByActor(actorId: string): Promise<AuditLog[]> — No auth enforcement at the repository layer — RBAC is enforced at the API boundary; the repository is a pure data-access interface.; idempotent; Rejects (propagates the underlying pg error) on connection failure or query timeout; returns an empty array (never null) when zero rows match the actorId.
### Integration points — connect to these
- src/shared/types/base-entity.interface.ts (BaseEntity interface) — AuditLog extends BaseEntity — the model file imports the interface to inherit id, createdAt, updatedAt; this is the sole external type dependency of the audit module per the reconciled architecture dependency map (audit → shared-types only).
- src/shared/db/connection.ts (shared pg.Pool instance) — The PgAuditLogRepository implementation imports the module-level `pool` to execute all SQL queries — this is the sole database access point, satisfying the no-direct-db-outside-repository constraint.
- src/modules/leave/leave.service.ts (Phase 10 — future) — The leave service will consume IAuditLogRepository.create() to write audit records on every state-changing operation (submit, approve, reject, cancel), satisfying GP-002; the audit module's barrel is the import surface the leave service will use.
- .gestalt/architecture/reconciled.json (audit module ownership) — The reconciled architecture declares the audit module at src/modules/audit/ owning IAuditLogRepository, PgAuditLogRepository, and AuditLog entity — the implementation must match this declared ownership boundary; the dependency map shows audit → shared-types only (no other module dependencies).

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