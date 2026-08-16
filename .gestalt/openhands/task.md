# Implement this phase: Phase 8: LeaveRequestService — core orchestration

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/76d847b2-5905-40af-b702-36710232b1e4/8`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveRequestService at `src/modules/leave-request/`. This phase depends on all prior model and repository files — read them before generating any code.

Files to create (approximately 3):
- `src/modules/leave-request/leave-request.service.interface.ts` — Define `ILeaveRequestService` interface with methods: createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>, submit(id: string): Promise<LeaveRequest>, approve(id: string, approverId: string): Promise<LeaveRequest>, reject(id: string, approverId: string): Promise<LeaveRequest>, cancel(id: string): Promise<LeaveRequest>, findById(id: string): Promise<LeaveRequest | null>, findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>, query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>.
- `src/modules/leave-request/leave-request.service.ts` — Implement `LeaveRequestService` class. Constructor takes: ILeaveRequestRepository, ILeaveBalanceRepository, ILeavePolicyRepository, IEmployeeRepository. Key logic:
  - `createDraft`: validate employee exists, validate policy exists and isActive, validate startDate <= endDate, create with status DRAFT.
  - `submit`: validate request is in DRAFT state, validate policy minimumNoticeDays (if set, startDate must be >= now + minimumNoticeDays), check balance has sufficient remainingDays using the BINDING formula `daysRequested = (endDate - startDate) + 1` (calendar days inclusive), transition to SUBMITTED.
  - `approve`: validate request is SUBMITTED, validate approver is the employee's manager (employee.managerId === approverId), deduct `daysRequested` from LeaveBalance.usedDays and recalculate remainingDays, set status APPROVED, approvedBy, approvedAt.
  - `reject`: validate request is SUBMITTED, validate approver is manager, set status REJECTED.
  - `cancel`: validate request is APPROVED or SUBMITTED, if APPROVED restore usedDays on balance, set status CANCELLED, cancelledAt.
- `tests/unit/modules/leave-request/leave-request.service.test.ts` — Jest unit tests with mocked repositories covering all state transitions and the BINDING day-counting formula.

Use the exact BINDING formula everywhere: `daysRequested = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1`. All dates are full-day granularity — no time-of-day considerations.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `LeaveRequest` entity returned by all service methods must conform to the `LeaveRequest` interface defined in `src/modules/leave-request/leave-request.model.ts` — same fields, same types, same nullability. (see `src/modules/leave-request/leave-request.model.ts`)
- The `LeaveRequestQueryParams` parameter of `query` must match the interface defined in `src/shared/types/index.ts` — fields `employeeId`, `status`, `leavePolicyId`, `startDateFrom`, `startDateTo` with the same types and optionality. (see `src/shared/types/index.ts`)
- The `CreateLeaveRequestDto` parameter of `createDraft` must match the interface defined in `src/shared/types/index.ts` — fields `employeeId`, `leavePolicyId`, `startDate`, `endDate`, `reason` with the same types and optionality. (see `src/shared/types/index.ts`)
- The `LeaveBalance.remainingDays` invariant (`remainingDays = totalEntitlement - usedDays`) defined in `src/modules/leave-balance/leave-balance.model.ts` must be preserved by every balance mutation in `approve` and `cancel`. (see `src/modules/leave-balance/leave-balance.model.ts`)
- The `LeaveRequest` lifecycle invariant documented in `src/modules/leave-request/leave-request.model.ts` (DRAFT → SUBMITTED → APPROVED | REJECTED; cancellable from SUBMITTED or APPROVED) must be enforced by every state-transitioning method. (see `src/modules/leave-request/leave-request.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: Lifecycle state machine: DRAFT → SUBMITTED → (APPROVED | REJECTED). From SUBMITTED or APPROVED, may transition to CANCELLED. No other transitions are valid. The service must reject any attempt to transition outside this graph (e.g., DRAFT→APPROVED, REJECTED→CANCELLED, APPROVED→SUBMITTED).
- Reuse or extend `LeaveRequest`: When `status === APPROVED`, both `approvedBy` and `approvedAt` must be non-null. When `status !== APPROVED`, both must be null. `cancelledAt` must be null unless `status === CANCELLED`, in which case it must be non-null.
- Reuse or extend `LeaveBalance`: `remainingDays` MUST equal `totalEntitlement - usedDays` at all times. Every mutation to `usedDays` (deduction on approve, restoration on cancel) MUST recalculate `remainingDays` accordingly before persisting.
- Reuse or extend `LeaveBalance`: A balance with `status === 'CLOSED'` must not be mutated. The service must check the balance status before deducting or restoring `usedDays` and reject the operation if the balance is CLOSED.
### Interface contract — expose these operations (their shape is yours)
- createDraft — Caller identity is not validated by the service itself (RBAC is enforced at the controller/route layer in Phase 9). The service accepts the `employeeId` from the DTO and trusts the caller.; Throws if employee not found, policy not found or inactive, or startDate > endDate. Error shape: `{ error: string; code: string }`.
- submit — RBAC deferred to controller layer (Phase 9).; Throws if request not found, request not in DRAFT status, minimumNoticeDays violated, balance not found, insufficient remainingDays, or balance is CLOSED. Error shape: `{ error: string; code: string }`.
- approve — RBAC deferred to controller layer (Phase 9). The service validates that `approverId === employee.managerId` as a business rule, not as an auth concern.; Throws if request not found, request not in SUBMITTED status, approverId does not match employee.managerId, balance not found, or balance is CLOSED. Error shape: `{ error: string; code: string }`.
- reject — RBAC deferred to controller layer (Phase 9). The service validates that `approverId === employee.managerId` as a business rule.; Throws if request not found, request not in SUBMITTED status, or approverId does not match employee.managerId. Error shape: `{ error: string; code: string }`.
- cancel — RBAC deferred to controller layer (Phase 9).; Throws if request not found, request not in SUBMITTED or APPROVED status, or (if APPROVED) balance not found or balance is CLOSED. Error shape: `{ error: string; code: string }`.
- findById / findByEmployeeId / query — RBAC deferred to controller layer (Phase 9).; idempotent; Read-only; no business-rule errors. Return null or empty array on no results.
### Integration points — connect to these
- src/modules/leave-request/leave-request.repository.ts (ILeaveRequestRepository) — Service calls `findById`, `create`, and `update` on this repository for all leave request persistence operations.
- src/modules/leave-policy/leave-policy.repository.ts (ILeavePolicyRepository) — Service calls `findById` on this repository during `createDraft` (to validate policy exists and isActive) and during `submit` (to read `minimumNoticeDays`).
- src/modules/employee/employee.repository.ts (IEmployeeRepository) — Service calls `findById` on this repository during `createDraft` (to validate employee exists) and during `approve`/`reject` (to retrieve `managerId` for approver validation).

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