# Implement this phase: Phase 6: Audit model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/6`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the audit module at `src/modules/audit/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:

1. `src/modules/audit/audit.model.ts` — Define and export the `AuditRecord` entity interface: `id: string`, `entityType: string`, `entityId: string`, `action: AuditAction`, `performedBy: string`, `details: Record<string, unknown> | null`, `createdAt: Date`. Import `AuditAction` from `src/shared/types/index.ts`.

2. `src/modules/audit/audit.repository.ts` — Define and export:
   - `IAuditRepository` interface: `create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>`, `findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>`, `findByUser(performedBy: string): Promise<AuditRecord[]>`
   - `AuditRepository` class implementing the interface using the pg pool from `src/shared/db/connection.ts`.

3. `src/modules/audit/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/audit/audit.repository.spec.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. Validate all inputs at the API boundary (GP-003) before calling the service. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g., Apr 1 – Mar 31)?; Should leave day counting use calendar days or business days (excluding weekends and/or public holidays)?; Should the system support half-day leave requests?; Should leave balances be pre-seeded at the start of each fiscal year, or lazily initialized on first request?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; When does the fiscal year start, and should it be configurable per organization?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The AuditRecord model file must import AuditAction from the shared-types barrel using the same relative-path style as the existing module models (e.g. leave-request.model.ts imports LeaveStatus from '../../shared/types/index'). (see `src/modules/leave-request/leave-request.model.ts`)
- The AuditRepository must follow the established repository structure: interface + implementing class co-located in one .repository.ts file, a private rowTo<Entity> mapper converting snake_case DB columns to camelCase entity fields with new Date(...) wrapping for date columns, parameterized SQL via pool.query, INSERT ... RETURNING * for create, and empty-array / null returns for not-found. (see `src/modules/leave-request/leave-request.repository.ts`)
- The audit module barrel must re-export the model type plus the repository interface and class in the same shape as existing module barrels (e.g. export { AuditRecord } from './audit.model'; export { IAuditRepository, AuditRepository } from './audit.repository';). (see `src/modules/leave-request/index.ts`)
- The audit repository must import the module-level `pool` singleton directly from '../../shared/db/connection' (no constructor injection), matching how employee.repository.ts and leave-request.repository.ts access the pool. (see `src/shared/db/connection.ts`)
- The unit test must mirror the existing repository spec structure: jest.mock the connection module as { pool: { query: jest.fn() } }, a makeRow helper returning snake_case rows, beforeEach that resets mocks and reinstantiates the repo, and happy-path / not-found / error-propagation cases — matching leave-request.repository.spec.ts. (see `tests/unit/modules/leave-request/leave-request.repository.spec.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditRecord`: An AuditRecord is immutable once persisted — the repository exposes no update or delete operation; the only write path is create, which inserts a new row and never mutates an existing one.
- Reuse or extend `AuditRecord`: The `action` value of every persisted AuditRecord must be a member of the AuditAction enum (CREATED, SUBMITTED, APPROVED, REJECTED, CANCELLED, BALANCE_DEDUCTED, BALANCE_RESTORED) imported from shared-types; the repository does not accept or persist arbitrary action strings.
- Reuse or extend `AuditRecord`: `id` and `createdAt` are always DB-generated and never supplied by the caller — create accepts Omit&lt;AuditRecord, 'id' | 'createdAt'&gt; and the returned record always carries both populated (createdAt as a Date).
### Interface contract — expose these operations (their shape is yours)
- IAuditRepository.create — Rejects the promise with the underlying pg error (e.g. unique-constraint violation, connection failure) without catching or transforming it; never returns null on the create path.
- IAuditRepository.findByEntity — idempotent; Returns an empty array when no rows match; rejects with the underlying pg error on failure.
- IAuditRepository.findByUser — idempotent; Returns an empty array when no rows match; rejects with the underlying pg error on failure.
### Integration points — connect to these
- src/shared/types/index.ts — AuditAction enum is imported from the shared-types barrel; the audit module's only cross-module dependency is shared-types (per the reconciled dependency map: audit → shared-types).
- src/shared/db/connection.ts — The module-level pg.Pool singleton is imported by AuditRepository for all SQL execution; no other DB access path is permitted.
- src/modules/leave-request/ (future Phase 10) — The LeaveRequestService will consume IAuditRepository.create to write audit records on every state-changing operation (GP-002); this phase establishes the repository contract that later phases depend on.

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