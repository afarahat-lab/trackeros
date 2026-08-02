# Implement this phase: Phase 2: Employee model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files to create:

1. `src/modules/employee/employee.model.ts` — Define and export the `Employee` entity interface with the canonical fields:
   - `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`

2. `src/modules/employee/employee.repository.ts` — Define and export:
   - `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `softDelete(id: string): Promise<void>`
   - `EmployeeRepository` class implementing `IEmployeeRepository` using the pg pool from `src/shared/db/connection.ts`. Use parameterized SQL queries.

3. `src/modules/employee/index.ts` — barrel re-export.

Include Jest unit tests at `tests/unit/modules/employee/employee.repository.spec.ts` with mocked pg pool.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. Validate all inputs at the API boundary (GP-003) before calling the service. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g., Apr 1 – Mar 31)?; Should leave day counting use calendar days or business days (excluding weekends and/or public holidays)?; Should the system support half-day leave requests?; Should leave balances be pre-seeded at the start of each fiscal year, or lazily initialized on first request?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; When does the fiscal year start, and should it be configurable per organization?; apply everywhere these apply, not in one place only]

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
    - employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The repository must obtain its database connection by importing the singleton `pool` exported from src/shared/db/connection.ts and calling pool.query(...). It must not instantiate its own pg.Pool or read process.env.DATABASE_URL directly. (see `src/shared/db/connection.ts`)
- The Employee entity interface field names and types must exactly match the canonical attributes declared in the reconciled architecture (id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt) with the specified nullability and the 'ACTIVE' | 'INACTIVE' | 'TERMINATED' union. (see `.gestalt/architecture/reconciled.json`)
- The employees table column mapping must follow the snake_case schema documented in ARCHITECTURE.md (employee_number, first_name, last_name, manager_id, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at), with the repository translating between snake_case columns and the camelCase TS interface. (see `docs/ARCHITECTURE.md`)
- The Employee model must follow the existing module convention of a plain `export interface` declaration with no decorators or runtime metadata, matching the style of uptime.model.ts and status.model.ts. (see `src/modules/uptime/uptime.model.ts`)
- The employee barrel index.ts must re-export all public symbols (Employee, IEmployeeRepository, EmployeeRepository) following the same pattern as the uptime and status module barrels. (see `src/modules/uptime/index.ts`)
- The IEmployeeRepository method signatures must exactly match those specified in PLAN.md Phase 2, including the Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> parameter type for create and the Promise<Employee | null> / Promise<Employee[]> / Promise<void> return types. (see `PLAN.md`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Lifecycle is constrained to three states: ACTIVE, INACTIVE, TERMINATED. The repository does not enforce transitions between these states (that is a service-layer concern); it only persists and reads the value as the union type.
- Reuse or extend `Employee`: Soft-delete is the only deletion mechanism: a deleted employee is identified by deleted_at being non-null. Read methods must never return a row whose deleted_at is set; the row itself is never physically removed.
- Reuse or extend `Employee`: managerId is a self-referential foreign key to employees.id; it may be null (no manager / top of hierarchy) but when present must reference an existing employee. The repository does not validate referential integrity (the database FK enforces it), but the interface must preserve the null-or-string shape.
- Reuse or extend `Employee`: Identity and audit timestamps (id, createdAt, updatedAt, deletedAt) are system-generated, not caller-supplied: create accepts an input omitting these four fields, and the database supplies id and timestamps.
### Interface contract — expose these operations (their shape is yours)
- IEmployeeRepository.findById — Returns the Employee with matching id where deleted_at IS NULL, or null if no such non-deleted row exists. Database errors propagate as rejected promises (GP-006).
- IEmployeeRepository.findByEmployeeNumber — Returns the single non-deleted Employee matching the employee_number, or null if not found. Relies on the unique index on employee_number. Database errors propagate as rejected promises.
- IEmployeeRepository.findByManagerId — Returns an array of non-deleted Employees whose manager_id matches the given value; returns an empty array when no subordinates exist. Database errors propagate as rejected promises.
- IEmployeeRepository.findAll — Returns an array of all non-deleted Employees (deleted_at IS NULL); returns an empty array when the table has no active rows. Database errors propagate as rejected promises.
- IEmployeeRepository.create — Persists a new row from the caller-supplied fields (omitting id, createdAt, updatedAt, deletedAt) and returns the fully-populated Employee with database-generated id and timestamps. Unique-constraint violations (employee_number, email) propagate as rejected promises.
- IEmployeeRepository.update — Applies only the fields present in the Partial<Employee> input, sets updated_at to NOW(), and returns the updated non-deleted Employee or null if no matching non-deleted row exists. Must not allow updating id, createdAt, or deletedAt via the partial input. Database errors propagate as rejected promises.
- IEmployeeRepository.softDelete — idempotent; Sets deleted_at to NOW() for the row matching the given id and resolves void. Does not alter employmentStatus or terminationDate. If no row matches, it still resolves void (idempotent soft-delete). Database errors propagate as rejected promises.
### Integration points — connect to these
- src/shared/db/connection.ts — The EmployeeRepository imports the singleton pg `pool` from this module to execute all SQL queries; this is the sole database access point per the established pattern and GP-001.
- src/modules/employee/index.ts — Downstream phases (Phase 4 leave-balance, Phase 5 leave-request, Phase 8 employee service, Phase 9 notification) depend on the Employee entity and repository and must import them only through this public barrel entry point per the module boundary rule.
- src/shared/types/index.ts — Phase 1 dependency: the employee module's declared architecture edge is employee → shared-types. Although the Employee interface itself needs no shared-types symbols, the module must compile against the Phase 1 foundation that PLAN.md declares as a prerequisite.

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