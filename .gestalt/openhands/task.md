# Implement this phase: Phase 3: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave-policy module at `src/modules/leave-policy/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:

1. `src/modules/leave-policy/leave-policy.model.ts` — Define and export the `LeavePolicy` entity interface with canonical fields: `id: string`, `policyName: string`, `leaveTypeId: string`, `entitlementDays: number`, `accrualRate: number | undefined`, `maxAccumulation: number | undefined`, `minimumNoticeDays: number | undefined`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Also define and export the `LeaveType` entity interface here if not already present in shared-types: `id: string`, `code: string`, `label: string`, `description: string | undefined`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`.

2. `src/modules/leave-policy/leave-policy.repository.ts` — Define and export:
   - `ILeavePolicyRepository` interface: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>`, `findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`
   - `LeavePolicyRepository` class implementing the interface using the pg pool from `src/shared/db/connection.ts`.

3. `src/modules/leave-policy/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/leave-policy/leave-policy.repository.spec.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. Validate all inputs at the API boundary (GP-003) before calling the service. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g., Apr 1 – Mar 31)?; Should leave day counting use calendar days or business days (excluding weekends and/or public holidays)?; Should the system support half-day leave requests?; Should leave balances be pre-seeded at the start of each fiscal year, or lazily initialized on first request?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; When does the fiscal year start, and should it be configurable per organization?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveTypeId: string
    - entitlementDays: number
    - accrualRate: number | undefined
    - maxAccumulation: number | undefined
    - minimumNoticeDays: number | undefined
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The leave-policy repository must match the employee repository's structural pattern: COLUMN_MAP (camelCase→snake_case), READ_ONLY_FIELDS Set, rowToEntity mapper with `new Date(...)` and `?? null`, parameterized SQL with `RETURNING *`, dynamic SET clause in update appending `updated_at = NOW()`, and interface + class co-located in the same file with the class implementing the interface. (see `src/modules/employee/employee.repository.ts`)
- The leave-policy repository test must match the employee repository spec's structure: jest.mock on the shared db connection path, mockQuery.mockReset() in beforeEach, a makeRow(overrides) helper producing snake_case rows, per-method test groups (success with exact mockQuery call args + mapped entity assertions, not-found/empty, error propagation via mockRejectedValueOnce), create asserting Date instances, and update asserting the SET clause excludes read-only fields via regex on the SQL string. (see `tests/unit/modules/employee/employee.repository.spec.ts`)
- The leave-policy barrel index.ts must mirror the employee barrel pattern: re-export the model interface(s) and the repository interface + class from their respective files. (see `src/modules/employee/index.ts`)
- The repository must import the `pool` (a pg.Pool) from the shared db connection module using the relative path `../../shared/db/connection` (module at src/modules/leave-policy/), matching how the employee repository imports it. (see `src/shared/db/connection.ts`)
- The LeavePolicy and LeaveType entity field shapes must match the reconciled architecture's domain_entities definitions exactly — LeavePolicy (id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt) and LeaveType (id, code, label, description, isActive, createdAt, updatedAt). (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: At most one active policy may exist per leaveTypeId at any time — enforced by the unique index on (leave_type_id, is_active). The repository's `findActiveByLeaveTypeId` relies on this invariant to return a single `LeavePolicy | null`.
- Reuse or extend `LeavePolicy`: The entity has no soft-delete lifecycle — there is no `deletedAt` field and no `deleted_at` column; `findAll` returns every row regardless of any deletion state.
- Reuse or extend `LeaveType`: The `LeaveType` entity interface (id, code, label, description, isActive, createdAt, updatedAt) is distinct from the shared-types `LeaveType` enum (annual, sick, emergency, unpaid, maternity, paternity) — they share a name but represent different concepts (a persisted catalog row vs. a controlled vocabulary). The entity interface must be defined in the leave-policy model file, not re-exported from shared-types.
### Interface contract — expose these operations (their shape is yours)
- findById(id: string): Promise<LeavePolicy | null> — Returns null when no row matches the given id; propagates underlying database errors without swallowing them.
- findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> — Returns an empty array when no policies exist for the given leave type; propagates database errors.
- findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null> — Returns the single active policy for the leave type (guaranteed unique by the (leave_type_id, is_active) index) or null when none exists; propagates database errors.
- findAll(): Promise<LeavePolicy[]> — Returns all leave-policy rows with no soft-delete filter; returns an empty array when the table is empty; propagates database errors.
- create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> — Persists a new row and returns the fully-mapped entity with database-generated id, createdAt, and updatedAt; propagates unique-constraint violations (e.g. duplicate active policy per leave type) and other database errors.
- update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> — Applies only the provided non-read-only fields, appends updated_at = NOW(), and returns the updated entity or null when no row matches; when no updatable keys are provided, returns the existing entity without issuing an UPDATE; propagates database errors.
### Integration points — connect to these
- src/shared/db/connection.ts — The repository class depends on the shared pg `pool` for all database access; this is the only external dependency of the leave-policy module in this phase.
- src/modules/leave-balance/ (Phase 4) — Phase 4 (leave-balance) will import the `LeavePolicy` entity interface from this module's barrel to type its `policyId` reference and to look up active policies; the barrel must export `LeavePolicy` for downstream consumption.
- src/modules/leave-request/ (Phase 5) — Phase 5 (leave-request) will import `LeavePolicy` from this module's barrel to enforce policy rules (requiresManagerApproval, minimumNoticeDays, entitlementDays) during request submission; the barrel must export `LeavePolicy`.
- src/modules/leave-policy/leave-policy.service.ts (Phase 7) — Phase 7 will build the service layer on top of the `ILeavePolicyRepository` interface and `LeavePolicyRepository` class produced in this phase; the repository interface must be exported from the barrel for constructor injection.

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