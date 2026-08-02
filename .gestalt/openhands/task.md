# Implement this phase: Phase 4: Balance module — model, repository interface, and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the balance module. Depends on src/shared/types/base-entity.interface.ts and src/shared/types/enums.ts from Phase 1, src/modules/employee/employee.model.ts from Phase 2, and src/modules/policy/policy.model.ts from Phase 3 — read all four before generating.

Files to create (3 source files):

1. **src/modules/balance/balance.model.ts** — Define `LeaveBalance` entity extending `BaseEntity` with exact fields: employeeId (string), leavePolicyId (string), totalEntitlement (number), usedDays (number), fiscalYear (number), status ('ACTIVE' | 'EXHAUSTED' | 'CLOSED'). Per binding rules: usedDays is a denormalized counter (source of truth), remainingDays is COMPUTED at query time and NEVER stored. Import BaseEntity from ../../shared/types/base-entity.interface.

2. **src/modules/balance/balance.repository.ts** — Define `ILeaveBalanceRepository` interface: findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>, findByEmployeeId(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>, create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>, updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance | null> (atomic update for deduction/restoration). Implement `PgLeaveBalanceRepository` using the shared pg pool. The repository must expose a method that computes remainingDays as totalEntitlement - usedDays at query time.

3. **src/modules/balance/index.ts** — Barrel export.

Include Jest unit tests in **tests/unit/modules/balance/balance.repository.test.ts**.

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
- LeaveBalance must extend the BaseEntity interface exactly as defined (id: string, createdAt: Date, updatedAt: Date) — import from the deep path, not the shared barrel. (see `src/shared/types/base-entity.interface.ts`)
- The balance repository must follow the established repository pattern: a private *Row interface for snake_case DB columns, a rowTo* mapper converting to the camelCase entity, a Pg*Repository class implementing the I*Repository interface, and use of the shared pool from src/shared/db/connection.ts. (see `src/modules/policy/policy.repository.ts`)
- The balance barrel (index.ts) must export the model type, the repository interface type, and the concrete repository class, matching the export shape used by the policy and employee barrels. (see `src/modules/policy/index.ts`)
- The balance repository test must follow the established test pattern: jest.mock the shared db/connection module, mock pool.query, provide makeRow/makeEntity helpers, and cover success, null/empty, and error (pool rejection) paths for each method. (see `tests/unit/modules/policy/policy.repository.test.ts`)
- The LeaveBalance entity shape must match the reconciled architecture's domain entity definition (employeeId, leavePolicyId, totalEntitlement, usedDays, remainingDays, fiscalYear, status union, plus BaseEntity fields); remainingDays is listed as an attribute but binding rule #5 mandates it be computed, not stored. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: usedDays is the denormalized source-of-truth counter; it is the only persisted consumption value. remainingDays is never persisted and is always derived as totalEntitlement - usedDays on every read.
- Reuse or extend `LeaveBalance`: A LeaveBalance is uniquely identified by the composite key (employeeId, leavePolicyId, fiscalYear); findByEmployeeAndPolicy resolves at most one balance for that triple.
- Reuse or extend `LeaveBalance`: status is constrained to the lifecycle values ACTIVE, EXHAUSTED, or CLOSED; the repository does not mutate status in this phase (status transitions are a service-layer concern deferred to a later phase).
- Reuse or extend `LeaveBalance`: LeaveBalance extends BaseEntity, inheriting id (string), createdAt (Date), and updatedAt (Date); create generates id via randomUUID and sets createdAt/updatedAt server-side, matching the employee/policy pattern.
### Interface contract — expose these operations (their shape is yours)
- findByEmployeeAndPolicy(employeeId, leavePolicyId, fiscalYear) — Returns null when no matching row exists; rejects the promise on a pool/connection error (propagates, no swallow).
- findByEmployeeId(employeeId, fiscalYear) — Returns an empty array when no rows match (never null); rejects the promise on a pool/connection error.
- create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>) — Generates id/createdAt/updatedAt server-side and returns the persisted entity with remainingDays hydrated; rejects on a unique-constraint violation or pool error.
- updateUsedDays(id, usedDays) — No auth context at the repository layer; RBAC is enforced upstream (deferred to controller/service phase).; Single atomic UPDATE ... RETURNING *; returns null when no row matches the id; rejects on a pool error. Must not perform a read-then-write.
### Integration points — connect to these
- src/shared/db/connection.ts (shared pg pool) — The PgLeaveBalanceRepository executes all SQL through the shared pool, matching the employee and policy repositories.
- src/shared/types/base-entity.interface.ts — LeaveBalance extends BaseEntity; the deep-path import establishes the shared-types ← balance dependency declared in the reconciled dependency map.
- src/modules/leave (future LeaveRequestService, Phase 9) — The leave service will consume ILeaveBalanceRepository for sufficiency checks (remainingDays >= days), atomic deduction on submit (updateUsedDays), and restoration on reject/cancel — this phase delivers the contract that integration depends on.

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