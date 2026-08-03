# Implement this phase: Phase 4: LeavePolicy module (model + repository + service interface)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/8177937e-ec7c-4649-b943-9d9104b82731/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the LeavePolicy domain model, repository, and service interface. This phase depends on `src/modules/leave-type/leave-type.model.ts` from Phase 3 — read it before generating any code that references LeaveType or leaveTypeId.

Files to create:
- `src/modules/leave-policy/leave-policy.model.ts` — Define the `LeavePolicy` interface with exact fields: id: string, policyName: string, leaveTypeId: string, entitlementDays: number, accrualRate: number | undefined, maxAccumulation: number | undefined, minimumNoticeDays: number | undefined, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date.
- `src/modules/leave-policy/leave-policy.repository.ts` — Define `ILeavePolicyRepository` interface with methods: findById(id: string): Promise<LeavePolicy | null>, findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>, findAllActive(): Promise<LeavePolicy[]>. Implement `LeavePolicyRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/leave-policy/leave-policy.service.interface.ts` — Define `ILeavePolicyService` interface with method: getPolicyForLeaveType(leaveTypeId: string): Promise<LeavePolicy | null>.
- `src/modules/leave-policy/index.ts` — Barrel export of model, repository, and service interface.

Include Jest unit tests in `tests/unit/modules/leave-policy/leave-policy.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. A single shared countBusinessDays function + a `holidays` table (public-holiday calendar) is used by every call site (balance sufficiency check, deduction, restoration). Whole days only — no half-day/partial-day leave. Compare dates by CALENDAR-DATE equality in UTC (normalize each day/holiday/weekend check to UTC midnight; compare the YYYY-MM-DD triple), never by raw timestamp — so a holiday matches regardless of time-of-day/timezone.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth here; the controller only CONSUMES request.user (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid: startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole) and reject(..., approverRole). The controller reads request.user and passes id + role; the service enforces the business rule (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state read inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: How is used_days on leave_balances computed — derived live from approved leave_requests or stored counter incremented/decremented on state changes?; Are leave days always whole days, or does the system need to support half-day or hourly leave requests?; When should leave balance be deducted — at application time or at approval time?; How is used_days on leave_balances computed — is it derived live from approved leave_requests (SUM of day counts where status=APPROVED) or is it a stored counter incremented/decremented on approval/rejection/cancellation?; apply everywhere these apply, not in one place only]

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
- The LeavePolicyRepository must mirror the structural pattern of LeaveTypeRepository: a standalone row-to-entity mapper function, a class with private readonly db: Pool and constructor(dbPool: Pool = pool), try/catch in every method throwing 'Failed to ...' errors, and parameterized $1 SQL via this.db.query. (see `src/modules/leave-type/leave-type.repository.ts`)
- The repository must import the shared pool (a pg.Pool) from src/shared/db/connection.ts as the default constructor argument — the same connection source used by all other module repositories. (see `src/shared/db/connection.ts`)
- The row-to-entity mapper must follow the same snake_case-to-camelCase conversion convention as rowToLeaveType: direct cast for non-nullable columns, ?? undefined for nullable columns, and new Date(...) wrapping for created_at and updated_at timestamp columns. (see `src/modules/leave-type/leave-type.repository.ts`)
- The repository unit test must follow the same test structure as the leave-type repository test: jest.mock('pg'), mock Pool with a jest.fn() query, snake_case mock rows, a field-by-field assertion helper, and per-method cases for happy path (exact SQL + params), null/empty return, injection safety, and error-throw path. (see `tests/unit/modules/leave-type/leave-type.repository.test.ts`)
- The barrel export (index.ts) must follow the same pattern as the leave-type barrel: re-export the model interface, the repository interface and concrete class, and the service interface from their respective files. (see `src/modules/leave-type/index.ts`)
- The LeavePolicy model fields and the leave_policies table columns must match the reconciled architecture: the entity attributes (id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt) and the SQL schema columns (id, policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at) must be consistent with the authoritative reconciled.json definitions. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A LeavePolicy is associated with exactly one LeaveType via its leaveTypeId foreign key, which is a plain string referencing leave_types.id — the LeavePolicy model does not import or embed the LeaveType type.
- Reuse or extend `LeavePolicy`: A LeavePolicy has an active/inactive lifecycle governed by the isActive boolean; findAllActive returns only policies where is_active is true, while findById and findByLeaveTypeId return policies regardless of active state.
- Reuse or extend `LeavePolicy`: The accrualRate, maxAccumulation, and minimumNoticeDays fields are optional policy parameters — when the database column is NULL, the mapped entity field must be undefined (not null and not zero), preserving the semantic distinction between "not configured" and "configured as zero."
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyRepository.findById(id: string): Promise<LeavePolicy | null> — idempotent; Returns null when no row matches the given id; throws an Error with a 'Failed to find leave policy by id: <message>' prefix when the underlying pool query rejects.
- ILeavePolicyRepository.findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> — idempotent; Returns an empty array when no rows match the given leaveTypeId; throws an Error with a 'Failed to find leave policies by leave type id: <message>' prefix when the underlying pool query rejects.
- ILeavePolicyRepository.findAllActive(): Promise<LeavePolicy[]> — idempotent; Returns an empty array when no active policies exist; throws an Error with a 'Failed to find all active leave policies: <message>' prefix when the underlying pool query rejects.
- ILeavePolicyService.getPolicyForLeaveType(leaveTypeId: string): Promise<LeavePolicy | null> — idempotent; Returns null when no policy exists for the given leave type; the implementation (Phase 10) will delegate to findByLeaveTypeId and return the first active policy. This phase declares the interface contract only.
### Integration points — connect to these
- src/shared/db/connection.ts — The LeavePolicyRepository depends on the shared pg.Pool export for database connectivity, using it as the default constructor argument.
- src/modules/leave-type/leave-type.model.ts — The LeavePolicy.leaveTypeId field is a foreign key to leave_types.id; the dependency is conceptual (plain string FK, no type import), but the LeaveType module must exist as the referenced entity for the FK to be valid.
- src/modules/leave-balance/leave-balance.model.ts (Phase 5) — LeaveBalance will reference LeavePolicy via leavePolicyId; the LeavePolicy model and repository produced in this phase are prerequisites for the leave-balance module in Phase 5.
- src/modules/leave-request/leave-request.service.ts (Phase 7) — The LeaveRequest service will consume ILeavePolicyService.getPolicyForLeaveType to look up minimumNoticeDays and requiresManagerApproval during request submission; the service interface declared in this phase is the contract Phase 7 depends on.

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