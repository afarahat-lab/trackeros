# Implement this phase: Phase 5: LeaveRequest model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/be068fd3-a1c9-4eb0-ae38-156852fec5c5/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveRequest domain model and repository. This phase depends on Phase 1 (LeaveType, LeaveRequestStatus enums), Phase 2 (Employee), and Phase 3 (LeavePolicy).

Create `src/modules/leave-request/leave-request.model.ts` with the LeaveRequest entity using the exact canonical fields: id, employeeId, leavePolicyId, startDate, endDate, reason, status (LeaveRequestStatus from Phase 1), approvedBy, approvedAt, cancelledBy, cancelledAt, createdAt, updatedAt. Import LeaveRequestStatus from `src/shared/types/leave-request-status.enum.ts`.

Create `src/modules/leave-request/leave-request.repository.ts` with:
- `ILeaveRequestRepository` interface declaring: findById(id), findByEmployeeId(employeeId), findByStatus(status), findByEmployeeAndStatus(employeeId, status), findPendingForManager(managerId), save(request), update(id, partial), updateStatus(id, status, metadata)
- `PgLeaveRequestRepository` class implementing ILeaveRequestRepository using `src/shared/db/connection.ts`

Include Jest unit tests in `tests/unit/modules/leave-request/`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all foundational questions:

1. Day counting (questions 1 and 3): Business days only — exclude weekends and public holidays from the count. days = number of business days between startDate and endDate inclusive. Apply this single rule everywhere a day count is derived from a date range: balance sufficiency validation, usedDays deduction, remainingDays computation, entitlement enforcement, and reporting.

2. Balance materialization: Materialized transactional. On each APPROVE, atomically increment leave_balances.used_days by the request's business-day count within the same transaction; on REJECT or CANCEL of a previously-approved request, atomically restore it. remaining_days = total_entitlement - used_days (computed, not stored). Deduction happens on approval (not on submission). Balances are never computed by live aggregate queries at read time.

Additional standing rules: whole days only (no partial/half days); leave year is the calendar year; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (an employee sees/acts only on their own requests; a manager/HR acts on their reports); validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only?; How are leave_balances.used_days and remaining_days computed — are they derived live from approved leave_requests (sum of day counts) or are they materialized and updated transactionally on each approval/rejection?; How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only? This affects balance sufficiency checks, balance deductions, entitlement comparisons, and reporting.; apply everywhere these apply, not in one place only]

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
- The LeaveRequest entity's status field must be typed as LeaveRequestStatus imported from this exact file (not a re-declared string union); the enum members DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED are the only valid status values. (see `src/shared/types/leave-request-status.enum.ts`)
- The PgLeaveRequestRepository must follow the same structural pattern as PgEmployeeRepository: import pool from the shared db connection, use a private mapRow(row: Record<string, unknown>) helper to convert snake_case DB columns to camelCase entity fields, use parameterized queries ($1, $2, ...) with a values array, and have update perform a read-then-write merge that sets updatedAt to new Date(). (see `src/modules/employee/employee.repository.ts`)
- The optional-client transaction pattern (const db = client ?? pool; optional PoolClient as last parameter) established by PgLeaveBalanceRepository.incrementUsedDays must be applied to updateStatus (and any method that Phase 9 will call inside the approval transaction) so the status transition and balance deduction can share one unit of work. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- The LeaveRequest model must follow the same module-structure convention as LeaveBalance: an exported interface for the entity, reference types (Pick<Employee,'id'> / Pick<LeavePolicy,'id'>) imported via the sibling module index.ts for foreign-key documentation, and the status enum imported from the shared types path — not redeclared locally. (see `src/modules/leave-balance/leave-balance.model.ts`)
- The leave-request repository tests must match the established test pattern: jest.mock('shared/db/connection') with a mocked pool.query, a makeRequest() factory and makeRow() snake_case mapper, beforeEach mockReset, and per-method describe blocks covering found / not-found branches — using the moduleDirectories:['node_modules','src'] import paths (e.g. 'modules/leave-request', 'shared/db/connection'). (see `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`)
- The LeaveRequest entity attributes must match the reconciled architecture exactly: id, employeeId, leavePolicyId, startDate (Date), endDate (Date), reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt (Date), updatedAt (Date) — including the nullable unions for reason and the actor/timestamp fields. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: The status field must always be one of the LeaveRequestStatus enum values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED); the entity's status lifecycle follows DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED, though the repository itself does not enforce transition legality (that is the service's job in Phase 9) — it only persists whatever status it is given.
- Reuse or extend `LeaveRequest`: The actor/timestamp fields are coupled to the terminal status: approvedBy and approvedAt are non-null only when status is APPROVED; cancelledBy and cancelledAt are non-null only when status is CANCELLED; when status is DRAFT or SUBMITTED these four fields are null. The repository's updateStatus must stamp the correct pair for the target status and leave the others null.
- Reuse or extend `LeaveRequest`: startDate must not be after endDate (a leave request spans a non-negative date range); while the repository does not validate this (validation is an API-boundary concern), the entity shape must allow the dates to be compared and the persisted row must preserve both endpoints exactly.
- Reuse or extend `LeaveRequest`: employeeId and leavePolicyId are non-nullable foreign keys referencing employees.id and leave_policies.id respectively (per the reconciled SQL schema); a LeaveRequest cannot exist without an owning employee and a governing policy. The repository persists these as required columns.
### Interface contract — expose these operations (their shape is yours)
- ILeaveRequestRepository.findById(id) — idempotent; Returns the LeaveRequest with the given id, or null when no row matches; never throws on not-found. Errors from the database propagate as rejected promises (GP-006).
- ILeaveRequestRepository.findByEmployeeId(employeeId) — idempotent; Returns an array of all leave requests for the employee (possibly empty); never returns null. Database errors propagate as rejected promises.
- ILeaveRequestRepository.findByStatus(status) — idempotent; Returns an array of leave requests matching the given LeaveRequestStatus (possibly empty); never null. Database errors propagate as rejected promises.
- ILeaveRequestRepository.findByEmployeeAndStatus(employeeId, status) — idempotent; Returns an array of leave requests for the employee filtered by status (possibly empty); never null. Database errors propagate as rejected promises.
- ILeaveRequestRepository.findPendingForManager(managerId) — idempotent; Returns an array of pending leave requests submitted by the manager's direct reports (possibly empty); never null. Database errors propagate as rejected promises.
- ILeaveRequestRepository.save(request) — Inserts the request and returns the persisted entity (with any database-generated values); a unique-constraint violation or other DB error propagates as a rejected promise. Not idempotent — calling twice with the same id attempts a duplicate insert.
- ILeaveRequestRepository.update(id, partial) — Merges the partial onto the existing row (read-then-write, matching the sibling repositories), sets updatedAt to the current time, and returns the updated entity or null when the id does not exist. Database errors propagate as rejected promises.
- ILeaveRequestRepository.updateStatus(id, status, metadata) — Atomically sets the status and stamps the corresponding actor/timestamp fields from metadata in a single UPDATE, returning the updated entity or null when the id does not exist. Must accept an optional PoolClient so Phase 9 can run it inside the same transaction as the balance deduction. Database errors propagate as rejected promises.
### Integration points — connect to these
- src/shared/types/leave-request-status.enum.ts (Phase 1) — LeaveRequest.status is typed as LeaveRequestStatus from this enum; the repository's findByStatus and updateStatus operations consume its values.
- src/modules/employee (Phase 2) — LeaveRequest.employeeId, approvedBy, and cancelledBy reference employees.id; findPendingForManager must resolve the manager→direct-reports relationship through the employee module's data (managerId field). The model imports Employee reference types via the employee module index.
- src/modules/leave-policy (Phase 3) — LeaveRequest.leavePolicyId references leave_policies.id; the model imports LeavePolicy reference types via the leave-policy module index for foreign-key type documentation.

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
- Modules import from each other ONLY through their declared public entry point (`index.ts`)
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