# Implement this phase: Sub-phase 4c: LeaveRequest Service Unit Tests

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/d8fc2ea6-3dd4-4741-b0ac-513d3ac0f17f/6`. Do not clone anything; work only in this directory.

## What to build
All 15+ test cases pass when run with Jest
All dependencies are properly mocked (IEmployeeService, ILeavePolicyService, ILeaveBalanceService, ILeaveRequestRepository)
submit tests cover: valid submission, insufficient balance, overlapping dates, emergency bypass, minimumNoticeDays violation
approve test verifies deductDays called with correct inclusive-day count
reject test verifies no balance operations occur
cancel tests cover both APPROVED→CANCELLED (balance restored) and SUBMITTED→CANCELLED (no balance change)
cross-year test verifies fiscal year = calendar year of startDate
getById and query tests verify correct repository delegation
Tests use Jest describe/it/expect patterns consistent with project conventions

## Success criteria
Write comprehensive Jest unit tests for LeaveRequestService covering all core workflows and edge cases.

Files to create (1):

- `tests/unit/modules/leave-request/leave-request.service.spec.ts` — Jest tests using mocked dependencies (IEmployeeService, ILeavePolicyService, ILeaveBalanceService, ILeaveRequestRepository). Test cases:
  * create draft — returns a LeaveRequest with status DRAFT
  * submit with valid policy and sufficient balance — status transitions to SUBMITTED
  * submit with insufficient balance — throws ValidationError
  * submit with overlapping dates — throws ConflictError
  * submit emergency leave bypassing minimumNoticeDays — succeeds when policy.emergencyLeaveAllowed is true
  * submit with non-emergency leave failing minimumNoticeDays — throws ValidationError
  * approve — deducts balance via deductDays, sets approvedBy/approvedAt, status=APPROVED
  * reject — no balance change, sets approvedBy/approvedAt, status=REJECTED
  * cancel from APPROVED — restores balance via addDays, sets cancelledBy/cancelledAt, status=CANCELLED
  * cancel from SUBMITTED — no balance change, status=CANCELLED
  * cross-year request charged to startDate fiscal year — verify fiscal year used in balance operations matches startDate's calendar year
  * getById returns the request or throws NotFoundError
  * query filters by employeeId, status, date range
  * getEmployeeRequests delegates to repository.findByEmployeeId

Read before generating: all files from Sub-phases 4a and 4b, plus `src/shared/error-types.ts`.

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Sub-phase 4a: LeaveRequest Model &amp; Repository": src/modules/leave-request/leave-request.model.ts, src/modules/leave-request/leave-request.repository.ts, src/modules/leave-request/index.ts
- "Sub-phase 4b: LeaveRequest Service, Controller &amp; Routes": src/modules/leave-request/leave-request.service.ts, src/modules/leave-request/leave-request.controller.ts, src/modules/leave-request/leave-request.routes.ts

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscal-year start, no per-policy override. (2) Cross-year requests = single-year: the ENTIRE LeaveRequest is charged to the fiscal year of its startDate; a request never touches two LeaveBalance records; do NOT build multi-balance/pro-rate logic. (3 & 7) Day counting = inclusive calendar days: daysRequested = (endDate - startDate) + 1; weekends and public holidays ARE counted; do NOT introduce a holiday calendar. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, reporting). (4) Accrual = annual lump sum: the full totalEntitlement is granted at fiscal-year start; NO monthly pro-rata, NO per-pay-period, NO accrual scheduler; partial-year employees get the full entitlement. (5) Emergency leave ALWAYS bypasses minimumNoticeDays, regardless of policy setting. (6) Granularity = full days only: leave balances are INTEGERS (total_entitlement, used_days, remaining_days are whole numbers), so no fractional days ever arise and no rounding is needed; remaining_days = total_entitlement - used_days exactly. If a fractional value ever arises, floor it. This integer rule is consistent across deduction on approval, restoration on cancellation, and display. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom period (e.g. Apr 1 – Mar 31)?; How should a LeaveRequest whose date range spans two fiscal years be handled?; Should leave day counting use calendar days or business days?; How does leave entitlement accrue — lump sum at fiscal year start, monthly pro-rata, or per-pay-period?; Does emergency leave bypass the minimumNoticeDays constraint?; When leave_balances.remaining_days is computed from total_entitlement minus used_days, what rounding direction applies if fractional days arise (e.g. half-day leave, pro-rated entitlements)?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; apply everywhere these apply, not in one place only]

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
    - cancelledBy: string | null
    - cancelledAt: Date | null
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- Must use the same error classes imported from `shared/error-types` — NotFoundError, ValidationError, ConflictError — matching the exact class names and constructor signatures defined there (see `src/shared/error-types.ts`)
- Must use the same enum values from `shared/types` — LeaveStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), LeaveType (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY), EmploymentStatus (ACTIVE, INACTIVE, TERMINATED) (see `src/shared/types/index.ts`)
- Must match the ILeaveRequestService interface exactly as declared in `leave-request.service.ts` — all 9 method signatures (create, submit, approve, reject, cancel, update, getById, query, getEmployeeRequests) with their parameter types and return types (see `src/modules/leave-request/leave-request.service.ts`)
- Must match the ILeaveBalanceService interface — specifically `deductDays(employeeId, leavePolicyId, fiscalYear, startDate, endDate)`, `restoreDays(employeeId, leavePolicyId, fiscalYear, days)`, and `getRemainingDays(employeeId, leavePolicyId, fiscalYear)` — with their exact parameter lists (see `src/modules/balance/balance.service.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest in DRAFT status is the only valid starting state for `submit`; SUBMITTED is the only valid state for `approve` and `reject`; only SUBMITTED or APPROVED can transition to CANCELLED; only DRAFT can be updated via `update`
- Reuse or extend `LeaveBalance`: Balance deduction on approve uses inclusive calendar days: `daysRequested = (endDate - startDate) + 1`. Balance restoration on cancel-from-APPROVED restores the same computed day count. `remainingDays = totalEntitlement - usedDays` (integer arithmetic).
### Interface contract — expose these operations (their shape is yours)
- ILeaveRequestService.create — Throws ValidationError when endDate < startDate, when employee is not ACTIVE, or when policy is not active. Returns LeaveRequest with status DRAFT on success.
- ILeaveRequestService.submit — Throws NotFoundError when request not found. Throws ValidationError when status is not DRAFT, employee not active, policy not active, minimum notice not met (unless emergency), or insufficient balance. Throws ConflictError when overlapping requests exist. Returns LeaveRequest with status SUBMITTED on success.
- ILeaveRequestService.approve — Throws NotFoundError when request not found. Throws ValidationError when status is not SUBMITTED. Calls ILeaveBalanceService.deductDays. Sets approvedBy and approvedAt. Returns LeaveRequest with status APPROVED on success.
- ILeaveRequestService.reject — Throws NotFoundError when request not found. Throws ValidationError when status is not SUBMITTED. Does NOT call any balance service method. Sets approvedBy and approvedAt. Returns LeaveRequest with status REJECTED on success.
- ILeaveRequestService.cancel — Throws NotFoundError when request not found. Throws ValidationError when status is neither SUBMITTED nor APPROVED. When cancelling from APPROVED: calls ILeaveBalanceService.restoreDays. When cancelling from SUBMITTED: no balance call. Sets cancelledBy and cancelledAt. Returns LeaveRequest with status CANCELLED on success.
### Integration points — connect to these
- src/modules/leave-request/leave-request.service.ts — Subject under test — the LeaveRequestService class and ILeaveRequestService interface are the targets being verified by these unit tests

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