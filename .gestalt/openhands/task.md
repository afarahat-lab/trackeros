# Implement this phase: Phase 2: Employee model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/76d847b2-5905-40af-b702-36710232b1e4/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Files to create:
- `src/modules/employee/employee.model.ts` — Define the `Employee` entity interface with exact fields: id (string), employeeNumber (string), firstName (string), lastName (string), email (string), managerId (string | null), department (string), hireDate (Date), terminationDate (Date | null), employmentStatus (EmploymentStatus — import from `src/shared/types`), createdAt (Date), updatedAt (Date).
- `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findByManagerId(managerId: string): Promise<Employee[]>, findAll(): Promise<Employee[]>, create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>, update(id: string, data: Partial<Employee>): Promise<Employee | null>. Also provide a stub/empty implementation class `EmployeeRepository` that throws "not implemented" — the real DB-backed implementation comes in a later phase.

Include Jest unit tests in `tests/unit/modules/employee/employee.model.test.ts` and `tests/unit/modules/employee/employee.repository.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions: (1) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no configurable fiscalYearStart field. (2) Leave duration counts calendar days inclusive — weekends and public holidays ARE counted as leave days; do NOT introduce a holiday calendar entity. (3) Minimum granularity = full-day increments only — leave balances are integers, no half-days, no hours, no time-of-day on startDate/endDate. (4) Day counting from start_date to end_date is calendar days inclusive of both ends: daysRequested = (end_date - start_date) + 1. This single formula is BINDING at every call site (used_days deduction, overlap detection, remaining_days) — no weekend or holiday exclusion anywhere. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a configurable start month/day? This determines when LeaveBalance transitions from ACTIVE/EXHAUSTED to CLOSED and when new balance records are created.; Should leave duration count weekends and public holidays as leave days, or only business days? The current rule uses calendar days inclusive, but this may not match all organisational policies.; What is the minimum granularity of a leave request — full days, half days, or hours? This affects the daysRequested calculation and balance precision.; How are leave days counted from start_date to end_date — calendar days (inclusive of both ends, e.g. Mon–Fri = 5 days) or business/working days only? This is BINDING across all balance-deduction and overlap-detection call sites.; apply everywhere these apply, not in one place only]

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
- The `EmploymentStatus` enum used in `Employee.employmentStatus` must be the exact same enum exported from `src/shared/types/index.ts` — no local redefinition, no string literal union. (see `src/shared/types/index.ts`)
- The `Employee` entity field names and types must match the reconciled architecture in `.gestalt/architecture/reconciled.json` — specifically the `domain_entities[].attributes` for the Employee entity: id (string), employeeNumber (string), firstName (string), lastName (string), email (string), managerId (string | null), department (string), hireDate (Date), terminationDate (Date | null), employmentStatus (EmploymentStatus), createdAt (Date), updatedAt (Date). (see `.gestalt/architecture/reconciled.json`)
- The `IEmployeeRepository` method signatures must match the interface declared in the reconciled architecture's module boundaries: the `employee` module owns the `EmployeeRepository interface`. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Every Employee must have a unique `employeeNumber` and a unique `email`. The repository interface exposes `findByEmployeeNumber` to enforce this lookup contract; the uniqueness constraint itself is enforced at the database layer in a later phase.
- Reuse or extend `Employee`: `managerId` is a self-referencing foreign key: it must be either `null` (top-level employee) or a valid `id` of another Employee. The repository does not enforce this in the stub phase, but the interface must accept `string | null` to support the manager hierarchy.
- Reuse or extend `Employee`: `employmentStatus` must be one of the `EmploymentStatus` enum values: ACTIVE, INACTIVE, or TERMINATED. The type system enforces this via the import from `src/shared/types`.
- Reuse or extend `Employee`: `terminationDate` must be `null` when `employmentStatus` is ACTIVE, and must be set when `employmentStatus` is TERMINATED. This invariant is documented in the entity interface (via comments or type narrowing) but enforced at the service layer in a later phase.
### Interface contract — expose these operations (their shape is yours)
- IEmployeeRepository.findById — No auth rule at the repository layer — auth is enforced at the service/controller layer in later phases.; idempotent; Returns `null` when no employee exists with the given id — does not throw.
- IEmployeeRepository.create — No auth rule at the repository layer.; Must return the created Employee with `id`, `createdAt`, and `updatedAt` populated. The stub throws "not implemented"; the real implementation will throw on unique constraint violations (duplicate employeeNumber or email).
- IEmployeeRepository.update — No auth rule at the repository layer.; Returns the updated Employee on success, `null` if no employee with the given id exists. The `data` parameter is `Partial<Employee>` — only supplied fields are updated; `id`, `createdAt` are never overwritten.
### Integration points — connect to these
- src/shared/types/index.ts — The Employee entity imports `EmploymentStatus` enum. This is the only external dependency for this phase.

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