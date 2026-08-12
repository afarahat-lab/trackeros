# Implement this phase: Phase 2: Employee module — model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/7f3a8cc3-b777-42b1-b2e3-a0c62205ede1/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 (read it before generating).

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` interface with the canonical fields: id, employeeNumber, firstName, lastName, email, role ('employee' | 'manager' | 'hr_admin'), managerId (string | null), department (string | null), hireDate (Date), terminationDate (Date | null), employmentStatus ('ACTIVE' | 'INACTIVE' | 'TERMINATED'), createdAt, updatedAt, deletedAt (Date | null).
- `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(): Promise<Employee[]>`, `create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`. Implement `EmployeeRepository` class using the pg pool from `src/shared/db/connection.ts` via Knex (import knex from 'knex' configured with the pool). Use parameterized queries.
- `src/modules/employee/index.ts` — Barrel export of Employee, IEmployeeRepository, EmployeeRepository.
- `tests/unit/modules/employee/employee.repository.test.ts` — Jest unit tests mocking the db layer, testing findById returns Employee or null.

Approximately 4 files.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers:
1. Fiscal/leave year: calendar year (Jan 1 to Dec 31), keyed off the leave startDate.
2. Overlapping leave requests: PREVENTED. Reject a new SUBMITTED or APPROVED request whose date range overlaps (inclusive) any existing SUBMITTED or APPROVED request for the same employee. Adjacent non-overlapping ranges are allowed.
3. Cross-fiscal-year request: deduct the whole request from a single fiscal year (the fiscal year of startDate). Do not split across years.
4. Balance initialization: auto-create balances for ALL leave types on employee creation (not lazily).
5 & 6. Balance deduction timing: deduct on APPROVAL (finalize). On submission the days are counted as PENDING (a reservation, not a deduction); on approval move pending to used; on reject or cancel release the reservation. Available balance = entitled - (used + pending).

Standard rules that apply throughout:
- Count business days only (exclude weekends); whole days only.
- Separate emergency leave pool from annual/sick.
- Every endpoint enforces RBAC (employees act on their own records; managers approve/reject their reports) plus input validation.
- When an employee has no manager, approval escalates to HR.
- Use-it-or-lose-it: no carryover of unused balance across leave years. [BINDING RULE — operator decision resolving: Should the fiscal year be calendar year (Jan 1 – Dec 31) or a configurable period (e.g., Apr 1 – Mar 31)? The current domain rule uses calendar year of startDate.; Should overlapping leave requests be prevented? E.g., an employee with an existing APPROVED or SUBMITTED request for Jan 5–10 should not be allowed to submit another for Jan 8–12.; When a leave request spans two fiscal years (e.g., Dec 28 – Jan 3), should the balance be deducted from a single fiscal year (the year of startDate) or split across both years?; How are leave balances initialized for new employees — auto-created for all leave types on employee creation, or created lazily on first leave application?; When should leave balance be deducted — on submission (reserve/hold) or on approval (finalize)? The domain rule already specifies deduction on approval, but the application architect raised this as an open question.; When should leave balance be deducted — on submission (reserve/hold) or on approval (finalize)?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - role: 'employee' | 'manager' | 'hr_admin'
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
- The Employee interface field set and type unions must match the Employee entity definition in the reconciled architecture (id, employeeNumber, firstName, lastName, email, role 'employee'|'manager'|'hr_admin', managerId string|null, department string|null, hireDate Date, terminationDate Date|null, employmentStatus 'ACTIVE'|'INACTIVE'|'TERMINATED', createdAt, updatedAt, deletedAt Date|null) — do not add, remove, or rename fields. (see `.gestalt/architecture/reconciled.json`)
- Repository queries must target the employees table using the snake_case column names declared in the reconciled architecture's sql_schemas (employee_number, first_name, last_name, email, role, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at) and map them to the camelCase Employee interface fields — the column-to-field mapping must be consistent across all four repository methods. (see `.gestalt/architecture/reconciled.json`)
- The repository's database configuration must derive from the existing `pool` exported by src/shared/db/connection.ts (a pg.Pool constructed from DATABASE_URL) — the Knex config must reuse this connection's settings rather than defining a divergent connection string or instantiating a new Pool. (see `src/shared/db/connection.ts`)
- The unit test must follow the existing test conventions established in tests/unit/shared/types.test.ts: Jest describe/it/expect structure, ts-jest preset, relative imports from the test file to source, and testMatch '**/tests/**/*.test.(ts|js)' — the new test file at tests/unit/modules/employee/employee.repository.test.ts must be discovered and pass under the existing jest.config.js. (see `tests/unit/shared/types.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Soft-delete is governed by deletedAt: a non-null deletedAt marks the employee as logically deleted, and read operations (findById, findByManagerId, findAll) must exclude rows where deletedAt is not null — a soft-deleted employee is never returned by repository reads.
- Reuse or extend `Employee`: managerId is a self-referential foreign key to employees.id; a null managerId indicates no direct manager (top of hierarchy / HR-escalation case), and a non-null managerId must reference an existing, non-deleted employee — the repository must not return manager relationships to soft-deleted employees.
- Reuse or extend `Employee`: On create, the repository generates id, createdAt, and updatedAt server-side and sets deletedAt to null; the caller-supplied payload (Omit<Employee,'id'|'createdAt'|'updatedAt'|'deletedAt'>) must never allow the caller to set these four fields — they are system-managed.
### Interface contract — expose these operations (their shape is yours)
- IEmployeeRepository.findById(id: string): Promise<Employee | null> — Returns null when no non-deleted row matches the id (not-found is a normal result, not an error); throws on database/connection failure. Must exclude soft-deleted rows (deletedAt IS NULL).
- IEmployeeRepository.findByManagerId(managerId: string): Promise<Employee[]> — Returns an empty array (not null) when the manager has no direct reports or the managerId matches no employee; throws on database/connection failure. Results must exclude soft-deleted employees.
- IEmployeeRepository.findAll(): Promise<Employee[]> — Returns an empty array (not null) when no employees exist; throws on database/connection failure. Results must exclude soft-deleted employees (deletedAt IS NULL).
- IEmployeeRepository.create(employee: Omit<Employee,'id'|'createdAt'|'updatedAt'|'deletedAt'>): Promise<Employee> — Persists a new row and returns the fully-formed Employee with system-generated id, createdAt, updatedAt, and null deletedAt; throws on database failure or unique-constraint violation (e.g., duplicate email). Not idempotent — repeated calls with the same payload create distinct rows.
### Integration points — connect to these
- src/shared/db/connection.ts (pg.Pool export) — EmployeeRepository configures its Knex instance from the shared pool's connection settings — this is the sanctioned shared-infrastructure import that satisfies GP-001 while reusing the single connection source.
- src/shared/types/index.ts (LeaveType, LeaveStatus enums) — The reconciled dependency map declares employee → shared-types; while the Employee interface uses string-literal unions (not the enums directly), the module's architectural dependency on shared-types is declared and the barrel/module must not contradict this dependency edge.
- Future leave and balance modules (Phases 4, 5, 7, 10) — The employee module's public barrel (index.ts) is the sole import surface for downstream modules that need Employee lookups and manager-subordinate validation (leave service approve/reject, balance initialization) — the barrel must export Employee, IEmployeeRepository, and EmployeeRepository so later phases import only through it.

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