# Implement this phase: Phase 6b: Leave module — service, routes & barrel export

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/63ff1071-5533-4487-9cf5-cd66e5b8b64e/9`. Do not clone anything; work only in this directory.

## What to build
src/modules/leave/leave.service.ts exports LeaveService class implementing ILeaveService
LeaveService constructor injects ILeaveRequestRepository, IEmployeeService, ILeavePolicyService, IBalanceService, IAuditService
submit() validates employee exists, policy exists and isActive, checks hasSufficientBalance, checks minimumNoticeDays, sets status to SUBMITTED
approve() validates current status is SUBMITTED, sets approvedBy/approvedAt, sets status to APPROVED, calls balanceService.deductDays
reject() validates current status is SUBMITTED, sets rejectedBy/rejectedAt/rejectionReason, sets status to REJECTED
cancel() handles both SUBMITTED (no restore) and APPROVED (calls balanceService.restoreDays), sets cancelledBy/cancelledAt/cancellationReason, sets status to CANCELLED
Day counting uses inclusive formula: (endDate.getTime() - startDate.getTime()) / (1000*60*60*24) + 1, Math.floor
Every state-changing operation logs an audit record via IAuditService.log
src/modules/leave/leave.routes.ts registers all 6 routes (POST /leave, POST /leave/:id/submit, POST /leave/:id/approve, POST /leave/:id/reject, POST /leave/:id/cancel, GET /leave/:id, GET /leave) following uptime.routes.ts pattern
src/modules/leave/index.ts barrel-exports all public symbols
All three files compile with tsc --noEmit without errors

## Success criteria
Implement the leave module runtime logic and HTTP routes. Depends on Phase 6a interfaces and Phases 1-5 service interfaces.

Files to create:
1. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor-injected dependencies: `ILeaveRequestRepository`, `IEmployeeService` (Phase 2), `ILeavePolicyService` (Phase 4), `IBalanceService` (Phase 5), `IAuditService` (Phase 3). Apply ALL binding rules:
   - Day counting: `daysRequested = Math.floor((endDate.getTime() - startDate.getTime()) / (1000*60*60*24)) + 1`
   - `submit`: validate employee exists, validate policy exists and isActive, check `hasSufficientBalance`, check `minimumNoticeDays` (if set, startDate >= now + minimumNoticeDays), set status to SUBMITTED.
   - `approve`: validate current status is SUBMITTED, set approvedBy/approvedAt, set status to APPROVED, call `balanceService.deductDays`.
   - `reject`: validate current status is SUBMITTED, set rejectedBy/rejectedAt/rejectionReason, set status to REJECTED.
   - `cancel`: validate status is APPROVED or SUBMITTED. If APPROVED, call `balanceService.restoreDays`. Set cancelledBy/cancelledAt/cancellationReason, set status to CANCELLED.
   - Every state-changing operation logs an audit record via `IAuditService.log`.
   - Emergency leave follows same `requiresManagerApproval` path — no special handling.

2. `src/modules/leave/leave.routes.ts` — Fastify route definitions. Routes: POST /leave (create), POST /leave/:id/submit, POST /leave/:id/approve, POST /leave/:id/reject, POST /leave/:id/cancel, GET /leave/:id, GET /leave (query). Each handler instantiates the service with its dependencies and delegates. Follow the pattern in `src/modules/uptime/uptime.routes.ts`.

3. `src/modules/leave/index.ts` — Barrel export of all public symbols.

Dependencies (read-only, already exist):
- `src/modules/leave/leave.model.ts` (Phase 6a)
- `src/modules/leave/leave.repository.ts` (Phase 6a)
- `src/modules/leave/leave.service.interface.ts` (Phase 6a)
- `src/modules/employee/employee.service.interface.ts` (Phase 2)
- `src/modules/audit/audit.service.interface.ts` (Phase 3)
- `src/modules/policy/policy.service.interface.ts` (Phase 4)
- `src/modules/balance/balance.service.interface.ts` (Phase 5)
- `src/modules/uptime/uptime.routes.ts` (Phase 1) — for route pattern reference

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Phase 6a: Leave module — interfaces & model": src/modules/leave/leave.model.ts, src/modules/leave/leave.repository.ts, src/modules/leave/leave.service.interface.ts
- "Phase 6c: Leave module — unit tests": tests/unit/modules/leave/leave.service.test.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Phase 6c: Leave module — unit tests. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions — keep everything MINIMAL, uniform, and self-consistent: (1) Day counting = inclusive calendar days for ALL leave types: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar and do NOT vary counting by leave type. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, entitlement check, reporting). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no per-company/tenant/jurisdiction configuration. (3) Emergency leave ALWAYS requires manager approval, exactly like every other leave type — no auto-approval, no separate emergency policy flag, no special SLA. The policy requiresManagerApproval flag governs uniformly. (4) Balances are integers (full-day granularity only); remaining_days = total_entitlement - used_days exactly; if a fractional value ever arises, floor it. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Specifically: (a) inclusive or exclusive of the end date, and (b) calendar days or business/working days? The answer affects balance deduction arithmetic, minimum-notice calculations, and sufficiency checks everywhere.; Can an APPROVED leave request be cancelled after its startDate has already passed (or partially passed)? If so, how is the balance restoration calculated — full days, only remaining future days, or prorated?; How is the fiscal year defined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), a configurable company fiscal year (e.g. Apr 1 – Mar 31), or per-employee based on hire date anniversary?; How are leave days counted — calendar days or business/working days? The count affects both the balance decrement on approval and the validation that sufficient balance exists before submission.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `daysRequested` formula must match the binding rule from the reconciled architecture: `Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1`. This same formula must be used for balance deduction, sufficiency check, and any future overlap detection. (see `.gestalt/architecture/reconciled.json → business_rules[0]`)
- Route handler structure must follow the pattern in `src/modules/uptime/uptime.routes.ts`: export an async function receiving `FastifyInstance`, register routes with `fastify.get`/`fastify.post`, instantiate service with dependencies inside each handler, delegate to service, wrap in try/catch returning `{ error: string }` on failure. (see `src/modules/uptime/uptime.routes.ts`)
- `IAuditService.log` calls must use `entityType: 'LeaveRequest'`, `entityId` matching the LeaveRequest's `id`, `action` from `AuditAction` enum (`SUBMITTED` for submit, `APPROVED` for approve, `REJECTED` for reject, `CANCELLED` for cancel), and `performedBy` matching the actor ID passed to the operation. (see `src/modules/audit/audit.service.interface.ts`)
- `IBalanceService.deductDays` and `IBalanceService.restoreDays` accept a balance `id` (string) and `days` (number). The leave service must first resolve the correct balance via `IBalanceService.getByEmployeeAndPolicy(employeeId, leavePolicyId)`, then pass its `id` to deduct/restore. (see `src/modules/balance/balance.service.interface.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest transitions through a strict lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED). From SUBMITTED or APPROVED it may transition to CANCELLED. No other transitions are valid. The `status` field must always reflect the current lifecycle state.
- Reuse or extend `LeaveRequest`: When status is APPROVED, `approvedBy` and `approvedAt` must be non-null. When status is REJECTED, `rejectedBy`, `rejectedAt`, and `rejectionReason` must be non-null. When status is CANCELLED, `cancelledBy`, `cancelledAt`, and `cancellationReason` must be non-null.
### Interface contract — expose these operations (their shape is yours)
- submit — Authenticated user; the caller's identity must match the LeaveRequest's employeeId or have manager/hr_admin role.; 404 if LeaveRequest not found; 409 if status is not DRAFT; 422 if employee not found, policy not found/inactive, insufficient balance, or minimumNoticeDays not met.
- approve — Authenticated user with 'manager' or 'hr_admin' role.; 404 if LeaveRequest not found; 409 if status is not SUBMITTED; 422 if balance deduction fails (e.g., insufficient balance, balance not ACTIVE).
- reject — Authenticated user with 'manager' or 'hr_admin' role.; 404 if LeaveRequest not found; 409 if status is not SUBMITTED; 422 if rejectionReason is empty/missing.
- cancel — Authenticated user; the caller must be the request owner (employeeId match) or have manager/hr_admin role.; 404 if LeaveRequest not found; 409 if status is not SUBMITTED or APPROVED; 422 if cancellationReason is empty/missing.
- create — Authenticated user; the caller's identity must match the employeeId in the DTO or have hr_admin role.; 422 if employeeId/leavePolicyId missing or empty, startDate/endDate invalid (endDate before startDate), or daysRequested <= 0.
### Integration points — connect to these
- src/modules/employee/employee.service.interface.ts — IEmployeeService.getById — Validates that the employee referenced by a LeaveRequest exists during submit.
- src/modules/balance/balance.service.interface.ts — IBalanceService (hasSufficientBalance, getByEmployeeAndPolicy, deductDays, restoreDays) — Checks balance sufficiency during submit; deducts days on approve; restores days on cancel of an approved request.
- src/modules/policy/policy.service.interface.ts — ILeavePolicyService.getById — Validates that the policy referenced by a LeaveRequest exists and isActive during submit.
- src/modules/audit/audit.service.interface.ts — IAuditService.log — Every state-changing operation (submit, approve, reject, cancel) must log an audit record per GP-002.

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