# Continue the previous attempt (it hit the iteration limit before finishing)

A prior code-agent attempt on this work dir (`/tmp/gestalt/phase/63ff1071-5533-4487-9cf5-cd66e5b8b64e/8`) was stopped after reaching its iteration limit. Its work is ALREADY on disk here — do NOT restart from scratch or re-read everything; build on what exists. It made 11 file edit(s). The prior attempt did NOT run the build/tests before it was cut off.

Finish the task now: fix any failing build/type-check/tests, then RUN the build and the tests and fix anything still failing. Stop as soon as the build and tests pass. The full original task (with all mandatory constraints) follows for reference.

---

# Implement this phase: Phase 6: Leave module

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/63ff1071-5533-4487-9cf5-cd66e5b8b64e/8`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the leave module at `src/modules/leave/`. Create these files:

1. `src/modules/leave/leave.model.ts` — Define the `LeaveRequest` interface with ALL canonical fields: `id: string`, `employeeId: string`, `leavePolicyId: string`, `startDate: Date`, `endDate: Date`, `reason: string | undefined`, `status: LeaveRequestStatus`, `approvedBy: string | null`, `approvedAt: Date | null`, `rejectedBy: string | null`, `rejectedAt: Date | null`, `rejectionReason: string | null`, `cancelledBy: string | null`, `cancelledAt: Date | null`, `cancellationReason: string | null`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveRequestStatus` from `src/shared/types/index.ts` (Phase 1). Also define `CreateLeaveRequestDto` (employeeId, leavePolicyId, startDate, endDate, reason?) and `UpdateLeaveRequestDto` (Partial of status-relevant fields) and `LeaveRequestQueryParams` (status?, employeeId?, startDate?, endDate?) in this same file.

2. `src/modules/leave/leave.repository.ts` — Define `ILeaveRequestRepository` interface with methods: `findById(id: string): Promise<LeaveRequest | null>`, `findByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>`, `findByDateRange(start: Date, end: Date): Promise<LeaveRequest[]>`, `query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>`, `create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>`, `update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>`, `delete(id: string): Promise<boolean>`.

3. `src/modules/leave/leave.service.interface.ts` — Define `ILeaveService` interface with: `create(data: CreateLeaveRequestDto): Promise<LeaveRequest>`, `submit(id: string): Promise<LeaveRequest>`, `approve(id: string, approverId: string): Promise<LeaveRequest>`, `reject(id: string, rejectorId: string, reason: string): Promise<LeaveRequest>`, `cancel(id: string, cancelledBy: string, reason: string): Promise<LeaveRequest>`, `getById(id: string): Promise<LeaveRequest | null>`, `getByEmployee(employeeId: string): Promise<LeaveRequest[]>`, `query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>`.

4. `src/modules/leave/leave.service.ts` — Implement `LeaveService` class implementing `ILeaveService`. Constructor-injected dependencies: `ILeaveRequestRepository`, `IEmployeeService` (from Phase 2), `ILeavePolicyService` (from Phase 4), `IBalanceService` (from Phase 5), `IAuditService` (from Phase 3). Apply ALL BINDING rules:
   - Day counting: `daysRequested = (endDate.getTime() - startDate.getTime()) / (1000*60*60*24) + 1` (inclusive calendar days, integer via Math.floor).
   - On `submit`: validate employee exists, validate policy exists and isActive, check `hasSufficientBalance`, check `minimumNoticeDays` (if set, startDate must be >= now + minimumNoticeDays), set status to SUBMITTED.
   - On `approve`: validate current status is SUBMITTED, set approvedBy/approvedAt, set status to APPROVED, call `balanceService.deductDays`.
   - On `reject`: validate current status is SUBMITTED, set rejectedBy/rejectedAt/rejectionReason, set status to REJECTED.
   - On `cancel`: validate status is APPROVED or SUBMITTED. If APPROVED, call `balanceService.restoreDays`. Set cancelledBy/cancelledAt/cancellationReason, set status to CANCELLED.
   - Every state-changing operation logs an audit record via `IAuditService.log`.
   - Emergency leave follows the same `requiresManagerApproval` path as all other types — no special handling.

5. `src/modules/leave/leave.routes.ts` — Fastify route definitions. Register routes: POST /leave (create), POST /leave/:id/submit, POST /leave/:id/approve, POST /leave/:id/reject, POST /leave/:id/cancel, GET /leave/:id, GET /leave (query). Each handler instantiates the service with its dependencies and delegates. Follow the pattern in `src/modules/uptime/uptime.routes.ts`.

6. `src/modules/leave/index.ts` — Barrel export of all public symbols.

This phase depends on files from Phases 1-5. Read these before generating:
- `src/shared/types/index.ts` (Phase 1) — for LeaveRequestStatus
- `src/modules/employee/employee.service.interface.ts` (Phase 2) — for IEmployeeService
- `src/modules/audit/audit.service.interface.ts` (Phase 3) — for IAuditService
- `src/modules/policy/policy.service.interface.ts` (Phase 4) — for ILeavePolicyService
- `src/modules/balance/balance.service.interface.ts` (Phase 5) — for IBalanceService

Include Jest unit tests in `tests/unit/modules/leave/` covering all state transitions, balance deduction/restoration, and validation logic with mock dependencies.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions — keep everything MINIMAL, uniform, and self-consistent: (1) Day counting = inclusive calendar days for ALL leave types: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar and do NOT vary counting by leave type. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, entitlement check, reporting). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no per-company/tenant/jurisdiction configuration. (3) Emergency leave ALWAYS requires manager approval, exactly like every other leave type — no auto-approval, no separate emergency policy flag, no special SLA. The policy requiresManagerApproval flag governs uniformly. (4) Balances are integers (full-day granularity only); remaining_days = total_entitlement - used_days exactly; if a fractional value ever arises, floor it. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Specifically: (a) inclusive or exclusive of the end date, and (b) calendar days or business/working days? The answer affects balance deduction arithmetic, minimum-notice calculations, and sufficiency checks everywhere.; Can an APPROVED leave request be cancelled after its startDate has already passed (or partially passed)? If so, how is the balance restoration calculated — full days, only remaining future days, or prorated?; How is the fiscal year defined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), a configurable company fiscal year (e.g. Apr 1 – Mar 31), or per-employee based on hire date anniversary?; How are leave days counted — calendar days or business/working days? The count affects both the balance decrement on approval and the validation that sufficient balance exists before submission.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `LeaveRequestStatus` enum used by the leave module MUST be the one defined in `src/shared/types/index.ts` — no local redefinition or shadow enum. (see `src/shared/types/index.ts`)
- The `AuditAction` enum values used in audit log calls (CREATED, SUBMITTED, APPROVED, REJECTED, CANCELLED) MUST match the enum defined in `src/shared/types/index.ts`. (see `src/shared/types/index.ts`)
- The `IEmployeeService` interface used by LeaveService MUST match the one exported from `src/modules/employee/index.ts`. Specifically, `getById(id: string): Promise<Employee | null>` is the method used for employee existence validation. (see `src/modules/employee/index.ts`)
- The `ILeavePolicyService` interface used by LeaveService MUST match the one exported from `src/modules/policy/index.ts`. Specifically, `getById(id: string): Promise<LeavePolicy | null>` is used for policy validation, and the `isActive` boolean field on the returned `LeavePolicy` is checked. (see `src/modules/policy/index.ts`)
- The `IBalanceService` interface used by LeaveService MUST match the one exported from `src/modules/balance/index.ts`. Specifically: `hasSufficientBalance(employeeId, leavePolicyId, requestedDays)` for pre-submit checks, `getByEmployeeAndPolicy(employeeId, leavePolicyId)` to obtain the balance id, `deductDays(balanceId, days)` on approve, and `restoreDays(balanceId, days)` on cancel-from-APPROVED. (see `src/modules/balance/index.ts`)
- The `IAuditService` interface used by LeaveService MUST match the one exported from `src/modules/audit/index.ts`. Specifically, `log(record: CreateAuditRecordDto): Promise<AuditRecord>` is called with entityType='LeaveRequest', the request id as entityId, the appropriate AuditAction, the actor id as performedBy, and an optional changes object. (see `src/modules/audit/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest MUST always be in exactly one of the five lifecycle states: DRAFT → SUBMITTED → (APPROVED | REJECTED); cancellable from SUBMITTED or APPROVED to CANCELLED. Once in a terminal state (APPROVED, REJECTED, CANCELLED), no further transitions are permitted except APPROVED→CANCELLED.
- Reuse or extend `LeaveRequest`: When status is APPROVED, approvedBy and approvedAt MUST be non-null. When status is REJECTED, rejectedBy, rejectedAt, and rejectionReason MUST be non-null. When status is CANCELLED, cancelledBy, cancelledAt, and cancellationReason MUST be non-null. These actor/timestamp/reason fields MUST be null in all other states.
- Reuse or extend `LeaveRequest`: startDate MUST be on or before endDate. The computed daysRequested (inclusive calendar days) MUST be a positive integer ≥ 1.
### Interface contract — expose these operations (their shape is yours)
- LeaveService.submit — Caller must be authenticated; the employeeId on the request must match the authenticated user's id or the caller must hold the 'manager' or 'hr_admin' role.; Throws ValidationError if: employee not found, policy not found or not active, insufficient balance, minimumNoticeDays not met, request not in DRAFT status. Returns the updated LeaveRequest with status SUBMITTED on success.
- LeaveService.approve — Caller must hold the 'manager' or 'hr_admin' role.; Throws ValidationError if: request not found, request not in SUBMITTED status, balance lookup fails, balance deduction fails (insufficient balance or balance not ACTIVE). On success, status is APPROVED, balance is deducted, and audit is logged. The status update and balance deduction must be atomic (same transaction).
- LeaveService.reject — Caller must hold the 'manager' or 'hr_admin' role.; Throws ValidationError if: request not found, request not in SUBMITTED status, rejectionReason is empty. On success, status is REJECTED with actor/timestamp/reason set, and audit is logged. No balance interaction.
- LeaveService.cancel — Caller must be the request owner (employeeId match) or hold the 'manager' or 'hr_admin' role.; Throws ValidationError if: request not found, request not in SUBMITTED or APPROVED status, cancellationReason is empty. If APPROVED, restores balance days atomically with the status update. On success, status is CANCELLED with actor/timestamp/reason set, and audit is logged.
- LeaveService.create — Caller must be authenticated.; Throws ValidationError if required fields (employeeId, leavePolicyId, startDate, endDate) are missing or if startDate > endDate. Returns the created LeaveRequest with status DRAFT. No cross-module validation is performed at this stage.
### Integration points — connect to these
- src/modules/employee/index.ts — LeaveService calls IEmployeeService.getById to validate that the employee exists before allowing submission.

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