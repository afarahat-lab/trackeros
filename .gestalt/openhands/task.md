# Implement this phase: Phase 2: Employee module (model + repository)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/8177937e-ec7c-4649-b943-9d9104b82731/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the Employee domain model and repository. This phase depends on no prior phase files (Employee has no dependency on the enums from Phase 1).

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` interface with exact fields: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string, hireDate: Date, terminationDate: Date | null, employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED', createdAt: Date, updatedAt: Date.
- `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findAll(): Promise<Employee[]>. Implement `EmployeeRepository` class using the existing `pool` from `src/shared/db/connection.ts`. Use parameterized SQL queries via `pg` Pool.
- `src/modules/employee/index.ts` — Barrel export of model and repository.

Include Jest unit tests in `tests/unit/modules/employee/employee.repository.test.ts` — mock the pg Pool, test findById returns Employee or null, findByEmployeeNumber, and findAll.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. A single shared countBusinessDays function + a `holidays` table (public-holiday calendar) is used by every call site (balance sufficiency check, deduction, restoration). Whole days only — no half-day/partial-day leave. Compare dates by CALENDAR-DATE equality in UTC (normalize each day/holiday/weekend check to UTC midnight; compare the YYYY-MM-DD triple), never by raw timestamp — so a holiday matches regardless of time-of-day/timezone.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth here; the controller only CONSUMES request.user (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid: startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole) and reject(..., approverRole). The controller reads request.user and passes id + role; the service enforces the business rule (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state read inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: How is used_days on leave_balances computed — derived live from approved leave_requests or stored counter incremented/decremented on state changes?; Are leave days always whole days, or does the system need to support half-day or hourly leave requests?; When should leave balance be deducted — at application time or at approval time?; How is used_days on leave_balances computed — is it derived live from approved leave_requests (SUM of day counts where status=APPROVED) or is it a stored counter incremented/decremented on approval/rejection/cancellation?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - managerId: string | null
    - department: string
    - hireDate: Date
    - terminationDate: Date | null
    - employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The EmployeeRepository must obtain its database connection from the existing shared pg Pool exported as `pool` from src/shared/db/connection.ts — it must not instantiate a new Pool or read DATABASE_URL independently. This is the sanctioned shared-infrastructure import per AGENTS.md and the agents.yaml shared-infrastructure rule. (see `src/shared/db/connection.ts`)
- The Employee interface field names and types must match the reconciled architecture's Employee entity definition exactly (id, employeeNumber, firstName, lastName, email, managerId: string|null, department, hireDate: Date, terminationDate: Date|null, employmentStatus: 'ACTIVE'|'INACTIVE'|'TERMINATED', createdAt: Date, updatedAt: Date). The conceptual SQL schema for the employees table (snake_case columns: id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at; unique indexes on employee_number and email; FK manager_id -> employees.id) must be the mapping target the repository queries against. (see `.gestalt/architecture/reconciled.json`)
- The employee module must be placed at src/modules/employee/ with files employee.model.ts, employee.repository.ts, and index.ts — matching the module structure declared in ARCHITECTURE.md (src/modules/<name>/<name>.{model,repository,...}.ts) and the reconciled architecture's module boundary (path: src/modules/employee/, owns: Employee model, IEmployeeRepository interface, EmployeeRepository implementation). (see `docs/ARCHITECTURE.md`)
- The unit test file must be placed at tests/unit/modules/employee/employee.repository.test.ts to match the jest.config.js testMatch pattern ('**/tests/**/*.test.(ts|js)') and the phase's declared test path. The test must use the project's ts-jest preset and mock the pg Pool so no live database connection is required. (see `jest.config.js`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: managerId is a self-referential foreign key to employees.id (or null for an employee with no manager). An employee with managerId === null represents a top-level employee whose leave requests escalate to hr_admin rather than auto-approving — this null-manager semantics is a binding business rule that downstream phases rely on, so the model must preserve nullability faithfully (never coerce null to an empty string or undefined).
- Reuse or extend `Employee`: employmentStatus is constrained to exactly three lifecycle states: 'ACTIVE', 'INACTIVE', 'TERMINATED'. The model must express this as a closed union type (not an open string) so that no other status value can be assigned; downstream leave logic treats only ACTIVE employees as eligible to submit leave.
- Reuse or extend `Employee`: employeeNumber and email are business-unique identifiers (the conceptual schema declares both as unique indexes). The repository's findByEmployeeNumber lookup relies on this uniqueness — it returns at most one Employee. The model must not weaken these to non-unique fields.
### Interface contract — expose these operations (their shape is yours)
- findById(id: string): Promise<Employee | null> — idempotent; Returns null when no row matches the given id (not an error). Errors from the underlying pg Pool query (connection failure, etc.) must be caught and handled — no unhandled rejection (GP-006). The id must be passed as a parameterized query value, never interpolated into SQL.
- findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> — idempotent; Returns null when no row matches the given employeeNumber (not an error). Errors from the underlying pg Pool query must be caught and handled (GP-006). The employeeNumber must be passed as a parameterized query value to prevent SQL injection.
- findAll(): Promise<Employee[]> — idempotent; Returns an empty array when no rows exist (not null, not an error). Errors from the underlying pg Pool query must be caught and handled (GP-006).
### Integration points — connect to these
- src/shared/db/connection.ts (shared pg Pool) — The EmployeeRepository executes SQL through the shared pg Pool — this is the sole external dependency of the employee module in this phase. The repository delegates all connection management to this shared infrastructure rather than owning its own connection.
- Downstream phases: leave-balance (Phase 5), leave-request (Phase 6/7), notification (Phase 9) — The Employee model and repository are consumed by downstream modules via the employee module's public barrel (index.ts). leave-balance references employeeId; leave-request needs managerId to determine approval routing (escalate to hr_admin when null); notification targets recipientId (an employee). These phases import Employee from the employee module's index.ts, so the barrel must export both the model and the repository interface/implementation.

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