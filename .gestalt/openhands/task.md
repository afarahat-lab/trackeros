# Implement this phase: Phase 5: LeaveRequest model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/219727ae-a952-461a-b605-c6d40c0c1e42/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveRequest domain model and repository.

Files to create:
- `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` entity interface with exact fields: id: string, employeeId: string, leaveTypeId: string, leavePolicyId: string, startDate: Date, endDate: Date, daysCount: number, reason: string | undefined, status: LeaveRequestStatus, approvedBy: string | null, approvedAt: Date | null, cancelledBy: string | null, cancelledAt: Date | null, createdAt: Date, updatedAt: Date. Import LeaveRequestStatus from `src/shared/types/index.ts`.
- `src/modules/leave-request/leave-request.repository.interface.ts` — Define `ILeaveRequestRepository` interface with methods: findById(id), findByEmployeeId(employeeId), findByEmployeeAndStatus(employeeId, status), findOverlapping(employeeId, startDate, endDate), findPendingByManagerId(managerId), findAll(filters), create(request), update(id, request), updateStatus(id, status, metadata).
- `src/modules/leave-request/leave-request.repository.ts` — Implement `PgLeaveRequestRepository` class implementing ILeaveRequestRepository, extending the base repository from `src/shared/base-repository.ts`.

This phase depends on `src/shared/types/index.ts` and `src/shared/base-repository.ts` from Phase 1 — read both before generating any code.

Include Jest unit tests in `tests/unit/modules/leave-request/leave-request.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all questions:
1/7/9 (day counting — the single binding rule everywhere a day count is derived): BUSINESS DAYS ONLY — exclude weekends and public holidays. days = number of business days between startDate and endDate inclusive. Apply this ONE rule to balance sufficiency, deductions/reversals (used_days), notice-period checks, overlap detection, and reporting.
2/8 (minimumNoticeDays): submission date = the date the request transitioned to SUBMITTED (not createdAt); measure the notice as BUSINESS days between the submission date and startDate.
3 (overlap): INCLUSIVE overlap — two ranges overlap iff startA <= endB AND startB <= endA. Adjacent dates (A ends Fri, B starts Sat) do NOT overlap.
4 (fiscal year): CALENDAR year, Jan 1 - Dec 31.
5 (carryover): USE-IT-OR-LOSE-IT — unused entitled days expire at fiscal-year end; no carryover, no maxCarryover field.
6 (emergency leave): SEPARATE pool — annual, sick, and emergency each have their own entitlement and balance row; no cross-pool debiting.
10 (available balance): entitled - (used + pending) — pending requests consume balance immediately to prevent double-booking.
Standing rules: whole days only (no partial/half days); used_days is deducted on APPROVAL and restored on reject/cancel of a previously-approved request; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (employee acts on own requests; manager acts on direct reports; HR admin acts on all) and validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is the range inclusive of both boundaries, exclusive of endDate, or based on calendar business days excluding weekends/holidays?; For the minimumNoticeDays check, is 'submission date' the date the request was created (createdAt) or the date it transitioned to SUBMITTED? And is the day count measured as calendar days or business days?; For the overlapping-leave check, are adjacent date ranges (e.g., request A ends Friday, request B starts Saturday) considered overlapping?; How is the fiscal year defined — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g. Apr 1 – Mar 31)?; How should unused annual leave be handled at fiscal-year rollover — carry over fully, carry over with a cap, or expire?; Should emergency leave be drawn from the same annual/sick balance pools, or is it a separate entitlement with its own policy rules?; How are leave days counted from startDate and endDate? Is the range inclusive of both boundaries (days = endDate - startDate + 1), exclusive of endDate (days = endDate - startDate), or based on calendar business days excluding weekends/holidays?; For the minimumNoticeDays check, is "submission date" the date the request was created (createdAt) or the date it transitioned to SUBMITTED? And is the day count measured as calendar days or business days?; How are leave days counted — calendar days or business days? Are weekends and public holidays excluded from the day count?; What is the binding computation for available balance — entitled minus (used + pending), or entitled minus used only?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveRequest` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leaveTypeId: string
    - leavePolicyId: string
    - startDate: Date
    - endDate: Date
    - daysCount: number
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
- The concrete repository must extend BaseRepository and use its query<T> helper for all SQL execution, matching how PgEmployeeRepository, PgLeavePolicyRepository, and PgLeaveBalanceRepository delegate to an inner BaseRepository subclass. (see `src/shared/base-repository.ts`)
- The LeaveRequest entity's status field and the repository's status-related method parameters must use the LeaveRequestStatus enum exported from src/shared/types/index.ts, not a locally redefined union, matching how LeavePolicy imports LeaveType from the same source. (see `src/shared/types/index.ts`)
- The repository must follow the established implementation pattern: an inner class extending BaseRepository, a snake_case Row interface, an isXxxRow type guard using unknown, a rowToXxx mapper, randomUUID() for ids, dynamic SET clauses in update with updated_at always appended, and a fallback to findById when update receives no mutable fields. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- The unit test file must follow the established test pattern: jest.mock the shared db/connection pool, reset the mock in beforeEach, provide a makeXxxRow factory, and cover each method with success, not-found/null, type-guard-rejection, and error-propagation cases. (see `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`)
- The leave_requests table column names used in SQL must match the reconciled schema (id, employee_id, leave_type_id, leave_policy_id, start_date, end_date, days_count, reason, status, approved_by, approved_at, cancelled_by, cancelled_at, created_at, updated_at), and the entity-to-column mapping must be bijective with the LeaveRequest interface attributes. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest's status must always be one of the LeaveRequestStatus enum values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED); the repository must never persist or return a status outside this set, and the type guard must reject rows with an invalid status.
- Reuse or extend `LeaveRequest`: A LeaveRequest's date range must satisfy startDate <= endDate (the entity does not model reversed ranges); daysCount is a derived non-negative value computed from the range, and the repository must preserve whatever daysCount is supplied without recomputing it.
- Reuse or extend `LeaveRequest`: The approval metadata (approvedBy, approvedAt) and cancellation metadata (cancelledBy, cancelledAt) are nullable and mutually independent; the repository must round-trip null values faithfully and must not coerce null to undefined or vice versa for these fields.
- Reuse or extend `LeaveRequest`: createdAt and updatedAt are always present (non-null) timestamps set by the repository on create and updated on every mutating operation; the entity interface types them as Date (not Date | null).
### Interface contract — expose these operations (their shape is yours)
- ILeaveRequestRepository.findById(id) — Returns null when no row exists or the row fails the type guard; propagates database errors unchanged. Must not throw on a missing row.
- ILeaveRequestRepository.findByEmployeeId(employeeId) — Returns an empty array when no rows match; filters out rows failing the type guard; propagates database errors.
- ILeaveRequestRepository.findByEmployeeAndStatus(employeeId, status) — Returns an empty array when no rows match; filters out rows failing the type guard; propagates database errors.
- ILeaveRequestRepository.findOverlapping(employeeId, startDate, endDate) — Returns an empty array when no overlapping rows exist; uses inclusive overlap semantics (startA <= endB AND startB <= endA); propagates database errors.
- ILeaveRequestRepository.findPendingByManagerId(managerId) — Returns an empty array when no pending requests exist for the manager's direct reports; joins employees on manager_id; propagates database errors.
- ILeaveRequestRepository.findAll(filters) — Returns an empty array when no rows match the supplied filters; filters out rows failing the type guard; propagates database errors.
- ILeaveRequestRepository.create(request) — Throws a typed error when the insert returns no row or a row that fails the type guard; propagates database errors. Generates id and timestamps internally.
- ILeaveRequestRepository.update(id, request) — Returns null when the row is not found; falls back to returning the current entity when no mutable fields are supplied; propagates database errors.
- ILeaveRequestRepository.updateStatus(id, status, metadata) — Returns null when the row is not found; applies the status and associated metadata fields atomically in a single UPDATE; propagates database errors.
### Integration points — connect to these
- src/shared/types/index.ts — Imports LeaveRequestStatus for the LeaveRequest entity's status field and for status-typed method parameters.
- src/shared/base-repository.ts — The concrete repository extends BaseRepository and uses its query helper for all SQL execution.
- src/shared/db/connection.ts — BaseRepository internally uses the exported pool; the test file mocks this module's pool.query to isolate the repository from the database.
- employees table (src/modules/employee) — findPendingByManagerId must join leave_requests to employees on employee_id and filter by employees.manager_id = managerId to resolve the manager-direct-report relationship; the leave_requests.employee_id and approved_by columns are FKs to employees.id per the reconciled schema.
- src/modules/leave-request/leave-request.service.ts (Phase 9) — The ILeaveRequestRepository interface defined here is the contract the future LeaveRequestService will depend on for all leave-request data access; its method signatures must remain stable for Phase 9 to consume.

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