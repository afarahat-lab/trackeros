# Implement this phase: Phase 6a: Leave module — interfaces & model

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/63ff1071-5533-4487-9cf5-cd66e5b8b64e/8`. Do not clone anything; work only in this directory.

## What to build
src/modules/leave/leave.model.ts exports LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams
src/modules/leave/leave.model.ts imports LeaveRequestStatus from src/shared/types/index.ts
src/modules/leave/leave.repository.ts exports ILeaveRequestRepository with all 8 method signatures
src/modules/leave/leave.service.interface.ts exports ILeaveService with all 8 method signatures
All three files compile with tsc --noEmit without errors

## Success criteria
Create the type definitions and interfaces that the leave module implementation and tests will depend on. No runtime logic yet — only contracts and data shapes.

Files to create:
1. `src/modules/leave/leave.model.ts` — Define `LeaveRequest` interface with ALL canonical fields: `id`, `employeeId`, `leavePolicyId`, `startDate`, `endDate`, `reason`, `status` (LeaveRequestStatus), `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `cancelledBy`, `cancelledAt`, `cancellationReason`, `createdAt`, `updatedAt`. Also define `CreateLeaveRequestDto` (employeeId, leavePolicyId, startDate, endDate, reason?), `UpdateLeaveRequestDto` (Partial of status-relevant fields), and `LeaveRequestQueryParams` (status?, employeeId?, startDate?, endDate?). Import `LeaveRequestStatus` from `src/shared/types/index.ts`.

2. `src/modules/leave/leave.repository.ts` — Define `ILeaveRequestRepository` interface with: `findById`, `findByEmployee`, `findByStatus`, `findByDateRange`, `query`, `create`, `update`, `delete`. All method signatures as specified in the parent phase.

3. `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with: `create`, `submit`, `approve`, `reject`, `cancel`, `getById`, `getByEmployee`, `query`. All method signatures as specified in the parent phase.

Dependencies (read-only, already exist):
- `src/shared/types/index.ts` (Phase 1) — for LeaveRequestStatus

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Phase 6b: Leave module — service, routes & barrel export": src/modules/leave/leave.service.ts, src/modules/leave/leave.routes.ts, src/modules/leave/index.ts
- "Phase 6c: Leave module — unit tests": tests/unit/modules/leave/leave.service.test.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Phase 6c: Leave module — unit tests. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions — keep everything MINIMAL, uniform, and self-consistent: (1) Day counting = inclusive calendar days for ALL leave types: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar and do NOT vary counting by leave type. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, entitlement check, reporting). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no per-company/tenant/jurisdiction configuration. (3) Emergency leave ALWAYS requires manager approval, exactly like every other leave type — no auto-approval, no separate emergency policy flag, no special SLA. The policy requiresManagerApproval flag governs uniformly. (4) Balances are integers (full-day granularity only); remaining_days = total_entitlement - used_days exactly; if a fractional value ever arises, floor it. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Specifically: (a) inclusive or exclusive of the end date, and (b) calendar days or business/working days? The answer affects balance deduction arithmetic, minimum-notice calculations, and sufficiency checks everywhere.; Can an APPROVED leave request be cancelled after its startDate has already passed (or partially passed)? If so, how is the balance restoration calculated — full days, only remaining future days, or prorated?; How is the fiscal year defined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), a configurable company fiscal year (e.g. Apr 1 – Mar 31), or per-employee based on hire date anniversary?; How are leave days counted — calendar days or business/working days? The count affects both the balance decrement on approval and the validation that sufficient balance exists before submission.; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveRequest` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leavePolicyId: string
    - startDate: Date
    - endDate: Date
    - reason: string | undefined
    - status: LeaveRequestStatus
    - approvedBy: string | null
    - approvedAt: Date | null
    - rejectedBy: string | null
    - rejectedAt: Date | null
    - rejectionReason: string | null
    - cancelledBy: string | null
    - cancelledAt: Date | null
    - cancellationReason: string | null
    - createdAt: Date
    - updatedAt: Date
- `LeaveRequestStatus` — the entity MUST have exactly these fields:
    - DRAFT
    - SUBMITTED
    - APPROVED
    - REJECTED
    - CANCELLED

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- `LeaveRequest.status` must use the `LeaveRequestStatus` enum from `src/shared/types/index.ts` — the single source of truth for all leave request lifecycle states (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED). (see `src/shared/types/index.ts`)
- `ILeaveRequestRepository` method signatures must match the repository pattern established by sibling modules: `findById` → `Promise<T | null>`, `create` → `Promise<T>`, `update` → `Promise<T | null>`, `delete` → `Promise<boolean>`. The `create` parameter must use `Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>`. (see `src/modules/employee/employee.repository.ts`)
- `ILeaveService` method signatures for `create`, `getById`, `getByEmployee`, and `query` must follow the same DTO-driven pattern used by `IEmployeeService`, `ILeavePolicyService`, and `IBalanceService`: domain DTOs defined in the model file, service interface imports and uses them. (see `src/modules/balance/balance.service.interface.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Every `LeaveRequest` has a `status` field typed as `LeaveRequestStatus` (imported from `src/shared/types/index.ts`). The status drives the lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED); cancellable from DRAFT, SUBMITTED, or APPROVED. Actor-timestamp pairs (`approvedBy`/`approvedAt`, `rejectedBy`/`rejectedAt`, `cancelledBy`/`cancelledAt`) are nullable and must be set atomically with their corresponding status transition.
### Interface contract — expose these operations (their shape is yours)
- ILeaveService.create — Caller must be authenticated (JWT). The `employeeId` in the DTO must match the authenticated user's identity unless the caller holds `manager` or `hr_admin` role.; Returns the created `LeaveRequest` with status DRAFT. Must validate that `employeeId` references an existing active employee, `leavePolicyId` references an existing active policy, `startDate` ≤ `endDate`, and `startDate` is not in the past. Violations produce a 400 or 422 error.
- ILeaveService.submit — Caller must be authenticated. The request's `employeeId` must match the authenticated user's identity unless the caller holds `manager` or `hr_admin` role.; Validates current status is DRAFT, employee exists and is active, policy exists and is active, `hasSufficientBalance` returns true, `minimumNoticeDays` is satisfied (if set). Sets status to SUBMITTED. Violations produce 409 (invalid state transition) or 422 (business rule).
- ILeaveService.approve — Caller must hold `manager` or `hr_admin` role.; Validates current status is SUBMITTED. Sets `approvedBy`/`approvedAt`, status to APPROVED, and calls `balanceService.deductDays`. Must execute atomically within a transaction. Violations produce 409 (invalid state transition) or 422 (balance deduction failure).
- ILeaveService.reject — Caller must hold `manager` or `hr_admin` role.; Validates current status is SUBMITTED. Sets `rejectedBy`/`rejectedAt`/`rejectionReason`, status to REJECTED. Must execute atomically within a transaction. Violations produce 409 (invalid state transition).
- ILeaveService.cancel — Caller must be authenticated. The request's `employeeId` must match the authenticated user's identity unless the caller holds `manager` or `hr_admin` role.; Validates current status is SUBMITTED or APPROVED. If APPROVED, calls `balanceService.restoreDays`. Sets `cancelledBy`/`cancelledAt`/`cancellationReason`, status to CANCELLED. Must execute atomically within a transaction when restoring balance. Violations produce 409 (invalid state transition).
- ILeaveService.getById — Caller must be authenticated. Returns the request only if the caller is the owning employee, their manager, or holds `hr_admin` role.; idempotent; Returns `LeaveRequest | null`. Null when the request does not exist or the caller lacks access.
### Integration points — connect to these
- src/shared/types/index.ts — `LeaveRequestStatus` enum is imported by `leave.model.ts` and `leave.repository.ts`. This is the sole runtime dependency of the three files in this sub-phase.

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