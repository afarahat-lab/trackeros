# Implement this phase: Phase 9: LeaveBalance service and Notification service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/9`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create two service layers in one phase. This phase depends on:
- `src/modules/leave-balance/leave-balance.model.ts` and `src/modules/leave-balance/leave-balance.repository.ts` from Phase 4
- `src/modules/leave-policy/leave-policy.service.ts` from Phase 7
- `src/shared/types/index.ts` from Phase 1
Read all before generating.

Files to create (approximately 5):

**LeaveBalance service:**
1. `src/modules/leave-balance/leave-balance.service.interface.ts` — Define `ILeaveBalanceService`:
   - `getBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>`
   - `getAllBalances(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>`
   - `initializeBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance>` — looks up active policy via `ILeavePolicyService`, sets `totalEntitlement` from policy, `usedDays=0`, `pendingDays=0`, `remainingDays=totalEntitlement` (computed), `status='ACTIVE'`
   - `deductDays(employeeId: string, leaveTypeId: string, fiscalYear: number, days: number): Promise<LeaveBalance>` — atomically increments `usedDays`; throws if remaining would go below zero
   - `restoreDays(employeeId: string, leaveTypeId: string, fiscalYear: number, days: number): Promise<LeaveBalance>` — atomically decrements `usedDays`

2. `src/modules/leave-balance/leave-balance.service.ts` — Implement `LeaveBalanceService` class implementing `ILeaveBalanceService`. Inject `ILeaveBalanceRepository` and `ILeavePolicyService` via constructor. The `remainingDays` field must be computed as `totalEntitlement - usedDays` at query time — never stored. `deductDays` must check `totalEntitlement - usedDays - days >= 0` before proceeding.

3. Update `src/modules/leave-balance/index.ts` to export the service.

**Notification service:**
4. `src/modules/notification/notification.service.interface.ts` — Define `INotificationService`:
   - `notifyLeaveSubmitted(request: LeaveRequestDTO): Promise<void>`
   - `notifyLeaveApproved(request: LeaveRequestDTO): Promise<void>`
   - `notifyLeaveRejected(request: LeaveRequestDTO): Promise<void>`
   - `notifyLeaveCancelled(request: LeaveRequestDTO): Promise<void>`

5. `src/modules/notification/notification.service.ts` — Implement `NotificationService` class implementing `INotificationService`. Stub implementation that logs to console (real email/SMS deferred). Import `LeaveRequestDTO` from `src/shared/types/index.ts`.

6. `src/modules/notification/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/leave-balance/leave-balance.service.spec.ts` and `tests/unit/modules/notification/notification.service.spec.ts`.

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
- `LeaveBalance` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leaveTypeId: string
    - policyId: string
    - totalEntitlement: number
    - usedDays: number
    - pendingDays: number
    - remainingDays: number
    - fiscalYear: number
    - status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN'
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The service's remainingDays computation must match the repository's rowToLeaveBalance formula exactly: remainingDays = totalEntitlement - usedDays (not totalEntitlement - usedDays - pendingDays). The repository already computes this at read time; the service must not recompute or override it with a different formula. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- The service must call the repository's atomic incrementUsedDays/decrementUsedDays methods for deduct/restore (which use UPDATE ... SET used_days = used_days +/- $n) rather than read-modify-write via update(); this preserves the atomic counter semantics established in Phase 4. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- The service must never include remainingDays in the create input passed to the repository — the repository's create signature is Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'> and remainingDays is in READ_ONLY_FIELDS, so any attempt to write it would be silently dropped or cause a type error. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- initializeBalance must source totalEntitlement and policyId from the LeavePolicy returned by ILeavePolicyService.getActivePolicy(leaveTypeId) — specifically policy.entitlementDays and policy.id — matching the field names established in the leave-policy model and service interface. (see `src/modules/leave-policy/leave-policy.service.interface.ts`)
- NotificationService methods must accept the LeaveRequestDTO shape as defined in shared-types (id, employeeId, leaveTypeId, startDate, endDate, reason?, rejectionReason?, status, approvedBy, approvedAt, cancelledAt, createdAt, updatedAt) — imported from the shared-types barrel, not redefined locally. (see `src/shared/types/dtos.ts`)
- The leave-balance barrel update must mirror the leave-policy barrel pattern: export both the service interface (ILeaveBalanceService) and the service class (LeaveBalanceService) alongside the existing model and repository exports, so cross-module consumers import through index.ts only. (see `src/modules/leave-policy/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: remainingDays is always derived as totalEntitlement - usedDays at read time and is never persisted or written through any create/update path; every balance returned by the service must satisfy remainingDays === totalEntitlement - usedDays.
- Reuse or extend `LeaveBalance`: A newly initialized balance has usedDays=0, pendingDays=0, status='ACTIVE', and totalEntitlement equal to the active policy's entitlementDays for the given leaveTypeId; the policyId on the balance must reference the policy that was active at initialization time.
- Reuse or extend `LeaveBalance`: usedDays must never become negative and must never exceed totalEntitlement as a result of service operations: deductDays is rejected before any mutation when totalEntitlement - usedDays - days < 0, and restoreDays must not drive usedDays below zero.
### Interface contract — expose these operations (their shape is yours)
- LeaveBalanceService.initializeBalance(employeeId, leaveTypeId, fiscalYear) — Must throw a typed error when no active policy exists for the given leaveTypeId (getActivePolicy returns null); on success returns a persisted LeaveBalance with status ACTIVE and entitlement sourced from the policy.
- LeaveBalanceService.deductDays(employeeId, leaveTypeId, fiscalYear, days) — Must throw a typed error when the balance does not exist for the employee/type/year combination, or when totalEntitlement - usedDays - days < 0 (insufficient remaining); on success atomically increments usedDays and returns the updated balance.
- LeaveBalanceService.restoreDays(employeeId, leaveTypeId, fiscalYear, days) — Must throw a typed error when the balance does not exist for the employee/type/year combination; on success atomically decrements usedDays and returns the updated balance.
- NotificationService.notifyLeave<Event>(request: LeaveRequestDTO) — Must resolve to void without throwing for all four event variants (submitted, approved, rejected, cancelled); the stub logs to console and performs no external I/O, so no transient-failure retry semantics apply.
### Integration points — connect to these
- src/modules/leave-policy (ILeavePolicyService.getActivePolicy) — LeaveBalanceService.initializeBalance depends on the leave-policy service to resolve the active policy for a leaveTypeId, sourcing policyId and entitlementDays for the new balance. This is the leave-balance → leave-policy dependency edge.
- src/modules/leave-balance (ILeaveBalanceRepository) — LeaveBalanceService delegates all persistence (create, findByEmployeeAndType, findByEmployee, incrementUsedDays, decrementUsedDays) to the existing repository interface from Phase 4; no direct DB access.
- src/shared/types (LeaveRequestDTO) — NotificationService imports LeaveRequestDTO from the shared-types barrel as the parameter type for all four notify methods; this is the notification → shared-types dependency edge.
- Phase 10 — leave-request orchestration (ILeaveBalanceService, INotificationService) — Phase 10's LeaveRequestService will consume both new services: initializeBalance/deductDays on submit, restoreDays on reject/cancel, and the four notification methods on each lifecycle transition. The interfaces and barrel exports produced here are the contract Phase 10 depends on.

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