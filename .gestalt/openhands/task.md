# Implement this phase: Phase 5: LeaveRequest model + repository (leave-request module)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/32ad270f-dfe8-4e32-be27-804897fcc970/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveRequest domain model and its repository in the leave-request module.

Files to create:
1. `src/modules/leave-request/leave-request.model.ts` — Define and export the LeaveRequest interface with EXACT fields: id: string, employeeId: string, leaveTypeId: string, startDate: Date, endDate: Date, reason: string | undefined, status: LeaveStatus (import from `src/shared/types/leave-status.enum.ts` from Phase 1), approvedBy: string | null, approvedAt: Date | null, rejectedBy: string | null, rejectedAt: Date | null, rejectionReason: string | undefined, createdAt: Date, updatedAt: Date.

2. `src/modules/leave-request/leave-request.repository.interface.ts` — Define and export ILeaveRequestRepository interface with methods: findById(id: string), findByEmployeeId(employeeId: string), findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeStatuses: LeaveStatus[]), create(dto: CreateLeaveRequestDto), updateStatus(id: string, status: LeaveStatus, metadata: StatusUpdateMetadata), findByStatus(status: LeaveStatus). Also define CreateLeaveRequestDto, StatusUpdateMetadata, and UpdateLeaveRequestDto.

3. `src/modules/leave-request/leave-request.repository.ts` — Implement LeaveRequestRepository class implementing ILeaveRequestRepository. Use the existing pg Pool. The findOverlapping method must query for SUBMITTED/APPROVED requests where date ranges intersect for the same employee.

4. `src/modules/leave-request/index.ts` — Barrel file re-exporting LeaveRequest, ILeaveRequestRepository, LeaveRequestRepository, and DTOs.

Include Jest unit tests in `tests/unit/modules/leave-request/` for the repository.

This phase depends on `src/shared/types/leave-status.enum.ts` from Phase 1 and `src/modules/leave-policy/leave-type.model.ts` from Phase 2 — read both before generating.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers for the leave management module:

1/5/8/10. Fiscal (leave) year boundary: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave start_date. Not hire-date anniversary, not configurable.

2/9. Accrual: ANNUAL LUMP-SUM allocation at the start of the fiscal year (Jan 1) — each employee is granted the full entitlement for that leave type up front (not monthly pro-rata). Mid-year hires: pro-rate the first year by the number of whole months remaining in the year from the hire date (rounded down). maxAccumulation caps the balance; accrualRate is the annual entitlement. Carryover: USE-IT-OR-LOSE-IT — unused balance does NOT carry across fiscal years.

3/6. Emergency leave: it is a SEPARATE pool with its own entitlement, distinct from annual and sick. Emergency leave bypasses the normal advance-notice requirement (it can be applied for same-day / retroactively), but still goes through manager approval and still deducts from its own balance. It does not draw from annual or sick.

4. Deduction timing: deduct on APPROVAL (finalize). On submission the requested days are held as PENDING (a reservation); on approval the pending days move to used; on reject or cancel the reservation is released. Available balance = entitled - (used + pending). Deduct at approval time, not at the start of the leave period.

7. Day counting: BUSINESS/WORKING DAYS only — exclude weekends (Saturday, Sunday) and public holidays. Both start_date and end_date are inclusive. Whole days only (no half-days).

Cross-cutting rules that apply throughout:
- Overlapping leave requests are prevented (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- A request spanning two fiscal years deducts wholly from the fiscal year of start_date (no split).
- Balances are auto-created for all leave types on employee creation.
- Every endpoint enforces RBAC (employees act on their own records; managers approve/reject their direct reports) plus input validation.
- When an employee has no manager, approval escalates to HR. [BINDING RULE — operator decision resolving: How is the fiscal year boundary determined for LeaveBalance?; How does leave accrual work? LeavePolicy defines accrualRate and maxAccumulation, but the accrual mechanics (frequency, proration for mid-year hires, carryover rules) are not specified.; Does emergency leave have special rules that distinguish it from annual and sick leave?; When a leave request is approved, should the balance be deducted immediately at approval time or at the start of the leave period?; How is the fiscal year boundary determined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), the employee's hire-date anniversary, or a configurable organisation-wide fiscal year start?; Does emergency leave have special rules that distinguish it from annual and sick leave? The feature description lists all three but does not specify whether emergency leave bypasses notice periods, approval requirements, or balance checks.; How are leave days counted — calendar days or business/working days?; What are the fiscal year boundaries for balance scoping?; How does leave balance accrual work — annual lump-sum allocation at fiscal-year start vs. monthly pro-rata accrual?; What is the fiscal year boundary — calendar year (Jan 1 – Dec 31) or a configurable company fiscal year?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeaveRequest` — the entity MUST have exactly these fields:
    - id: string
    - employeeId: string
    - leaveTypeId: string
    - startDate: Date
    - endDate: Date
    - reason: string | undefined
    - status: LeaveRequestStatus
    - approvedBy: string | null
    - approvedAt: Date | null
    - rejectedBy: string | null
    - rejectedAt: Date | null
    - rejectionReason: string | undefined
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveRequest model's status field and the repository's status parameters must use the LeaveStatus enum exported here (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) — imported via the shared-types barrel, not re-declared. (see `src/shared/types/leave-status.enum.ts`)
- The LeaveRequestRepository must follow the same repository pattern this file establishes: a `Queryable = Pick<Pool,'query'>` type, a constructor accepting an optional client defaulting to the shared pool, a private snake-case row interface, a `rowToXxx` mapper (using `?? undefined` for nullable-optional strings and passthrough for `| null` fields), parameterized SQL via `this.db.query`, INSERT … RETURNING with NOW(), dynamic SET clauses with a running paramIndex plus `updated_at = NOW()`, and null returns for missing single-row lookups. (see `src/modules/leave-balance/leave-balance.repository.ts`)
- DTOs (CreateLeaveRequestDto, StatusUpdateMetadata, UpdateLeaveRequestDto) must be co-located in the repository interface file alongside ILeaveRequestRepository and exported together — matching how CreateLeaveBalanceDto/UpdateLeaveBalanceDto live in this interface file. (see `src/modules/leave-balance/leave-balance.repository.interface.ts`)
- The leave-request barrel must re-export the model interface, the repository interface + DTOs (grouped), and the repository class in the same structure this barrel uses — so the module's public surface is consistent across modules. (see `src/modules/leave-balance/index.ts`)
- Repository unit tests must follow this test pattern: jest.mock the shared db connection exposing pool.query, a snake-case makeRow(overrides) helper, beforeEach resetting the mock and constructing the repo, per-method describe blocks asserting both mapped output and SQL/params via expect.stringContaining, and a custom-client constructor test confirming the injected client is used instead of the shared pool. (see `tests/unit/modules/leave-balance/leave-balance.repository.test.ts`)
- The leave_requests table schema this repository targets must match the reconciled architecture: columns id, employee_id (FK employees), leave_type_id (FK leave_types), start_date, end_date, reason, status, approved_by (FK employees), approved_at, rejected_by (FK employees), rejected_at, rejection_reason, created_at, updated_at — the repository's row interface and column lists must align with these names. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest's status is always one of the LeaveStatus enum values (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED); the repository must never persist or return a status outside this set.
- Reuse or extend `LeaveRequest`: Approval metadata (approvedBy, approvedAt) and rejection metadata (rejectedBy, rejectedAt, rejectionReason) are mutually exclusive in practice — a request is either approved or rejected, never both — and the repository's updateStatus must set the metadata corresponding to the target status while leaving the opposing fields null/undefined.
- Reuse or extend `LeaveRequest`: No two persisted LeaveRequests for the same employee with a status in {SUBMITTED, APPROVED} may have overlapping [startDate, endDate] ranges (binding rule #9); findOverlapping is the mechanism that lets the service detect violations before persisting a new/updated request.
- Reuse or extend `LeaveRequest`: A LeaveRequest always references an existing employee (employee_id FK) and an existing leave type (leave_type_id FK); the repository relies on the database FK constraints and does not synthesize orphan rows.
### Interface contract — expose these operations (their shape is yours)
- findById(id) — Returns the LeaveRequest when exactly one row matches, null when no row matches; does not throw on missing rows.
- findByEmployeeId(employeeId) — Returns an array (possibly empty) of all LeaveRequests for the employee; never null.
- findOverlapping(employeeId, startDate, endDate, excludeStatuses) — Returns an array (possibly empty) of LeaveRequests for the employee whose date range intersects [startDate, endDate] and whose status is not in excludeStatuses; empty result means no overlap. The caller (service) decides whether a non-empty result blocks submission.
- create(dto) — Persists a new row via INSERT … RETURNING and returns the mapped LeaveRequest; relies on DB FK/NOT NULL constraints to reject invalid references — a constraint violation surfaces as a thrown pg error (not swallowed).
- updateStatus(id, status, metadata) — Updates the status and applies metadata via UPDATE … RETURNING; returns the updated LeaveRequest or null when no row matches the id. Does not validate transition legality (that is the service's job).
- findByStatus(status) — Returns an array (possibly empty) of all LeaveRequests in the given status; never null.
### Integration points — connect to these
- src/shared/types (LeaveStatus enum) — The LeaveRequest model and repository import LeaveStatus from the shared-types barrel; this is a hard dependency from Phase 1.
- src/shared/db/connection (pg Pool) — The repository defaults to the shared pool for DB access and accepts an optional Queryable client for transaction participation per the Transaction Contract.
- src/modules/leave-policy (LeaveType model) — Phase 5 declares a dependency on the leave-type model from Phase 2; LeaveRequest.leaveTypeId references a LeaveType, and the module-boundary rule requires importing through the leave-policy barrel.
- src/modules/leave-request (future LeaveRequestService, Phase 10) — The repository interface and DTOs defined here are the contract the Phase 10 service will consume (findOverlapping for overlap prevention, updateStatus for lifecycle transitions, create for draft creation); the interface shape must remain stable for that integration.

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