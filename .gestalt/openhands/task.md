# Implement this phase: Phase 2: Employee model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e3db0103-c684-4a1d-bb0c-c812564d6aa7/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee module at `src/modules/employee/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating.

Files:
- `src/modules/employee/employee.model.ts` — Define the Employee interface with exact canonical fields: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string | null, hireDate: Date, terminationDate: Date | null, employmentStatus: EmploymentStatus (import from src/shared/types), createdAt: Date, updatedAt: Date, deletedAt: Date | null.
- `src/modules/employee/employee.repository.ts` — Define IEmployeeRepository interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findAll(): Promise<Employee[]>, create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>, update(id: string, data: Partial<Employee>): Promise<Employee | null>, softDelete(id: string): Promise<void>. Implement EmployeeRepository class using the shared db pool from `src/shared/db/connection.ts` and Knex. The repository must use parameterized queries.
- `src/modules/employee/index.ts` — barrel export of model and repository.

Include Jest unit tests at `tests/unit/modules/employee/employee.repository.spec.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers (scoped to what the codebase provisions — do NOT introduce new unplanned data sources):

1. Fiscal (leave) year: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off leave startDate.

2. Cross-fiscal-year request: deduct the WHOLE request entirely from the fiscal year of startDate. Do NOT split across two LeaveBalance records.

3. Sick leave notice: NO minimum notice period for sick leave (like emergency — it is unplanned). Do not enforce any advance-notice rule for sick or emergency leave. If a LeavePolicy defines minimumNoticeDays, apply it ONLY to annual leave; sick and emergency are exempt.

4. Day counting: WEEKDAYS ONLY — count Monday–Friday, exclude Saturday and Sunday. Do NOT exclude public holidays: there is NO holiday table, repository, or provider in scope, and you must NOT introduce one. Both startDate and endDate inclusive. Keep the counting as a self-contained pure date helper with no external dependency.

5. Rounding / fractional days: WHOLE DAYS ONLY — there is no fractional accrual. Annual entitlement is a whole-number lump sum granted at fiscal-year start, and day counts are whole business days, so remaining_days is always an integer and NO rounding is needed. (If a fractional value ever arises, floor it for enforcement — but the design should not produce fractions.)

6. Deduction timing: deduct on APPROVAL. On submission the days are held as PENDING (a reservation); on approval move pending to used; on reject or cancel release the reservation. available = entitled - (used + pending). Not on the leave start date.

7. Overlap: YES — prevent overlapping leave requests. Reject a new SUBMITTED/APPROVED request whose date range overlaps (inclusive) an existing SUBMITTED/APPROVED request for the same employee.

Employee/manager data: the LeaveRequest service obtains employee data (managerId, employmentStatus, hireDate) via an injected IEmployeeRepository backed by an employees table (same repository-interface pattern as other modules). The JWT provides ONLY the caller identity (employeeId) and role for RBAC; manager relationship, hire date, and employment status come from IEmployeeRepository. Approvals route to the target employee managerId; if null, escalate to HR (role hr_admin). Managers act only on direct reports. Every endpoint enforces RBAC + input validation. Balances auto-created for all leave types on employee creation. Emergency leave is a separate pool. Only ACTIVE employees may submit. [BINDING RULE — operator decision resolving: What is the fiscal year definition for leave balances? Calendar year (Jan 1 – Dec 31) or a custom period (e.g., Apr 1 – Mar 31)?; When a LeaveRequest spans two fiscal years (e.g., Dec 28 – Jan 3), should the day count be split across two LeaveBalance records or deducted entirely from the startDate's fiscal year?; Should sick leave require a minimum notice period? Currently the rule says emergency bypasses notice, but sick leave is ambiguous.; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; When leave balance remaining_days is fractional (e.g. from accrual), what rounding direction applies when displaying or enforcing the balance?; When should leave balance be deducted — at approval time or on the leave start date?; Should the system prevent overlapping leave requests for the same employee?; apply everywhere these apply, not in one place only]

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
- Employee.employmentStatus must use the EmploymentStatus enum imported from `src/shared/types/index.ts` — the model must not redefine or duplicate the enum (see `src/shared/types/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Every Employee has a unique employeeNumber; employmentStatus must be one of the EmploymentStatus enum values; deletedAt is null for active records and non-null for soft-deleted records; managerId is either null (no manager) or references another Employee's id
### Interface contract — expose these operations (their shape is yours)
- findById — idempotent; Returns null when the employee does not exist or is soft-deleted; never throws for missing records
- findByEmployeeNumber — idempotent; Returns null when no employee matches the given employeeNumber or the matched employee is soft-deleted
- update — idempotent; Returns null when the employee does not exist or is soft-deleted; returns the existing employee unchanged when the data payload contains no updatable fields
### Integration points — connect to these
- src/shared/types/index.ts — Employee model imports EmploymentStatus enum; all downstream consumers of the employee module depend on this enum being canonical
- src/shared/db/connection.ts — EmployeeRepository uses the shared pg.Pool instance for all database operations

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