# Implement this phase: Phase 2: Employee module (model + repository)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/4fbbfee4-4feb-4a2b-8127-85025f82af24/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Create `src/modules/employee/employee.model.ts` with the Employee entity (id, employeeNumber, firstName, lastName, email, managerId: string|null, department: string|null, hireDate: Date, terminationDate: Date|null, employmentStatus: EmploymentStatus, createdAt: Date, updatedAt: Date, deletedAt: Date|null) — importing EmploymentStatus from `src/shared/types/index.ts`.

Create `src/modules/employee/employee.repository.ts` with IEmployeeRepository interface and EmployeeRepository class. The repository must use the existing `src/shared/db/connection.ts` pool. Methods: findById(id), findByEmail(email), findByManagerId(managerId), findAll(filters?), create(employee), update(id, partial), softDelete(id). Use parameterised queries only.

Create `src/modules/employee/index.ts` barrel exporting the model and repository.

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). fiscalYear = the calendar year of the request start_date. Not tenant-configurable.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, uniform across ALL leave types. One shared countBusinessDays function + a `holidays` table used by every call site (balance check, deduction, restoration). Whole days only. Compare dates by CALENDAR-DATE equality in UTC (normalize to UTC midnight; compare YYYY-MM-DD), never by raw timestamp.

3. Employee with no manager (managerId null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER, source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically in the same transaction when a LeaveRequest is SUBMITTED. Restore-on-reject/cancel: decrement when REJECTED or CANCELLED. Approval does NOT change used_days again. Submission fails if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: totalEntitlement - usedDays, at query time. No code writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control (employee acts only on own requests; managers/HR admins on those they oversee). The authenticated identity/role comes from `request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin', populated by the application's EXISTING auth middleware — do NOT build/mock auth in this feature; the controller only CONSUMES request.user (401 if absent). Declare a concrete `AuthenticatedUser { id: string; role: 'employee'|'manager'|'hr_admin' }` TYPE (no runtime middleware). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole), reject(..., approverRole). The controller reads request.user, passes id + role; the service enforces (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`. Do not change the Jest config. [BINDING RULE — operator decision resolving: How is the fiscal year defined for leave balances — calendar year (Jan 1 – Dec 31), a configurable start month, or company-specific fiscal calendar?; How is totalEntitlement determined for an employee hired mid-year — full annual entitlement or pro-rated?; Who is authorised to cancel a LeaveRequest? Can a manager or HR admin cancel an approved leave on behalf of the employee?; Does emergency leave have special domain behaviour (e.g. bypassing minimum notice, auto-approval) or does it follow the same rules as other leave types governed by their LeavePolicy?; How should partial-day leave deductions be rounded?; How are leave days counted — calendar days or business/working days?; What is the fiscal-year boundary for leave balances?; How are leave requests spanning two fiscal years handled for balance deduction?; What are the valid values for LeaveBalance.status?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - managerId: string | null
    - department: string | null
    - hireDate: Date
    - terminationDate: Date | null
    - employmentStatus: EmploymentStatus
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The EmploymentStatus enum must be imported from and match the canonical definition in src/shared/types/index.ts (values ACTIVE, INACTIVE, TERMINATED); the employee module must not declare a competing enum. (see `src/shared/types/index.ts`)
- The repository must obtain its database connection by importing the existing `pool` export from src/shared/db/connection.ts; it must not create a new Pool or duplicate connection logic. (see `src/shared/db/connection.ts`)
- The repository's SQL must target the employees table using the snake_case column names documented in the reconciled architecture (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at); the row-to-entity mapper converts these to the camelCase Employee fields. (see `.gestalt/architecture/reconciled.json`)
- The employee module's barrel (src/modules/employee/index.ts) must follow the established barrel-export convention demonstrated by src/modules/status/index.ts and src/modules/uptime/index.ts — re-exporting the model, interface, and implementation from index.ts as the module's sole public surface. (see `src/modules/status/index.ts`)
- The IEmployeeRepository interface naming must follow the existing I<Name>Service pattern (e.g. IStatusService in src/modules/status/status.service.interface.ts) — interface prefixed with I, implementation class unprefixed — to keep repository/interface naming consistent with the codebase convention. (see `src/modules/status/status.service.interface.ts`)
- The repository test file must follow the existing test conventions shown in tests/unit/shared/business-days.test.ts: Jest *.test.ts under tests/, bare-path imports relative to src (e.g. 'modules/employee', 'shared/db/connection') leveraging the moduleDirectories config, not relative file paths. (see `tests/unit/shared/business-days.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: An Employee's employmentStatus must be one of the canonical EmploymentStatus enum values (ACTIVE, INACTIVE, TERMINATED) imported from shared types; the entity never carries a free-form status string.
- Reuse or extend `Employee`: A soft-deleted Employee (deletedAt set) is excluded from all read operations and cannot be soft-deleted again; the deletedAt timestamp, once set, is immutable via the repository's update path (update excludes deletedAt from the mutable field set).
- Reuse or extend `Employee`: The Employee entity is a standalone interface that does not extend BaseEntity; its audit fields are camelCase (createdAt, updatedAt) plus a deletedAt field, which is structurally incompatible with BaseEntity's snake_case shape.
- Reuse or extend `Employee`: The identity and audit fields (id, createdAt) are immutable through the repository's update operation; only mutable, non-identity, non-audit fields may be changed via the partial update payload.
### Interface contract — expose these operations (their shape is yours)
- findById(id) — Returns the Employee with the given id if it exists and is not soft-deleted, or null if no live row matches; database errors propagate as rejected promises (GP-006).
- findByEmail(email) — Returns the Employee matching the given email among non-deleted rows, or null if none; database errors propagate as rejected promises.
- findByManagerId(managerId) — Returns all non-deleted Employees whose managerId equals the given value; returns an empty array when no reports exist; database errors propagate as rejected promises.
- findAll(filters?) — Returns all non-deleted Employees, optionally narrowed by the supplied filter dimensions (employmentStatus, department, managerId); omitted filter fields must not constrain the result; database errors propagate as rejected promises.
- create(employee) — Persists a new Employee row and returns the created Employee mapped from the inserted row; database errors (e.g. unique constraint violations on email/employee_number) propagate as rejected promises.
- update(id, partial) — Applies only the supplied mutable fields to the live row matching id (deleted_at IS NULL) and returns the updated Employee, or null if no live row matches; identity/audit fields (id, createdAt, deletedAt) are excluded from the mutable set; database errors propagate as rejected promises.
- softDelete(id) — Sets deleted_at to the current timestamp for the row matching id where deleted_at IS NULL and returns true if a row was affected, false if no live row matched (already deleted or not found); database errors propagate as rejected promises.
### Integration points — connect to these
- src/shared/types/index.ts — The Employee entity imports the canonical EmploymentStatus enum from shared types; this is the employee module's only shared-types dependency and must remain the single source of truth for employment status values.
- src/shared/db/connection.ts — The EmployeeRepository consumes the shared pg.Pool instance for all database access, satisfying GP-001 (repository pattern) and the no-direct-db-outside-repository constraint; no other connection source is permitted.
- src/modules/employee/index.ts (public barrel) — Downstream modules (balance, leave) depend on the employee module solely through its index.ts barrel per the acyclic dependency map in the reconciled architecture; the barrel must expose the Employee model and IEmployeeRepository so later phases can consume them without reaching into internal files.

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