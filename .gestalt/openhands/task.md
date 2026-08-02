# Implement this phase: Phase 2: Employee module — model, repository interface, and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c8e3d826-436d-4da1-aaf8-6a4bd895c61c/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the employee module. This phase depends on src/shared/types/base-entity.interface.ts from Phase 1 — read it before generating.

Files to create (3 source files):

1. **src/modules/employee/employee.model.ts** — Define `Employee` entity extending `BaseEntity` with exact fields: employeeNumber (string), firstName (string), lastName (string), email (string), managerId (string | null), department (string), hireDate (Date), terminationDate (Date | null), employmentStatus (string). Import BaseEntity from ../../shared/types/base-entity.interface.

2. **src/modules/employee/employee.repository.ts** — Define `IEmployeeRepository` interface with methods: findById(id: string): Promise<Employee | null>, findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>, findByEmail(email: string): Promise<Employee | null>, findByManagerId(managerId: string): Promise<Employee[]>, findAll(): Promise<Employee[]>, create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>, update(id: string, data: Partial<Employee>): Promise<Employee | null>. Also implement `PgEmployeeRepository` using the shared pg pool from src/shared/db/connection.ts. Import Employee from ./employee.model.

3. **src/modules/employee/index.ts** — Barrel export of Employee, IEmployeeRepository, PgEmployeeRepository.

Include Jest unit tests in **tests/unit/modules/employee/employee.repository.test.ts** (mock the pg pool, test CRUD operations).

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. No code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. The authenticated user identity/role comes from the request context (`request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin'), populated by the app's existing auth middleware — do NOT build auth in this feature; the controller only CONSUMES `request.user` (401 if absent). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid; e.g. startDate not in the past, startDate <= endDate, minimum notice). Do NOT add a role field to the Employee entity — role comes from `request.user`.

7. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`; do not change the Jest config. [BINDING RULE — operator decision resolving: Do unused leave days carry over to the next fiscal year, and if so, what is the cap?; What is the minimum granularity of leave — full days, half-days, or hours?; Do weekends and public holidays count as leave days consumed from the balance?; When a leave request spans two fiscal years, how are days allocated to each year's balance?; How is the fiscal year determined for leave balances? The domain model includes fiscalYear but the mapping rule (calendar year Jan–Dec, fiscal year Jul–Jun, or company-specific) is not specified in the feature description.; How is leave_balances.used_days computed — is it derived on-the-fly by aggregating approved leave_request days for that employee/policy/fiscal-year, or is it a stored counter that is incremented atomically when a leave request is approved (and decremented on cancellation)?; How are leave days counted — calendar days (inclusive start-to-end) or business/working days only? And when a leave request spans two fiscal years, how are days allocated to each year's balance?; How is remainingDays computed — stored as a derived column (totalDays - usedDays) in the DB, or computed at query time? If stored, what keeps it consistent with usedDays after every deduction/restore?; What is the fiscal-year boundary rule? Is it calendar year (Jan 1–Dec 31), a configurable start month, or per-company? Does a leave spanning the boundary consume days from the start-date fiscal year, the end-date fiscal year, or split proportionally?; apply everywhere these apply, not in one place only]

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
    - employmentStatus: string
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The Employee entity must extend the existing BaseEntity interface exactly as defined (id: string, createdAt: Date, updatedAt: Date) — do not redefine or widen those three fields. (see `src/shared/types/base-entity.interface.ts`)
- PgEmployeeRepository must obtain its database connection from the shared `pool` exported by src/shared/db/connection.ts rather than constructing its own pg.Pool. (see `src/shared/db/connection.ts`)
- The Employee entity shape must match the reconciled architecture's Employee domain entity (employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus plus BaseEntity fields); surface — do not silently diverge from — any difference between PLAN.md and the reconciled schema. (see `.gestalt/architecture/reconciled.json`)
- The repository unit test must be placed at a path matching testMatch '**/tests/**/*.test.(ts|js)' (i.e. tests/unit/modules/employee/employee.repository.test.ts) and run under the existing ts-jest preset without modifying jest.config.js. (see `jest.config.js`)
- If BaseEntity is imported via the shared barrel rather than the deep path, the barrel must already re-export BaseEntity (it does: `export type { BaseEntity } from './base-entity.interface'`); the chosen import path must resolve against this existing export. (see `src/shared/types/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Employee extends BaseEntity, so every Employee instance carries id (string), createdAt (Date), and updatedAt (Date) in addition to its own domain fields; the create operation must populate these three rather than accept them from the caller.
- Reuse or extend `Employee`: managerId is nullable (string | null): an employee with no manager is a valid state and must be representable; downstream leave-approval logic escalates managerless employees to HR admin rather than rejecting them.
- Reuse or extend `Employee`: terminationDate is nullable (Date | null): an actively employed employee has a null terminationDate; a non-null terminationDate indicates the employee is no longer active.
### Interface contract — expose these operations (their shape is yours)
- IEmployeeRepository.findById(id) — Returns null when no row matches; rejects the promise on a pool/query error (no unhandled rejection — GP-006).
- IEmployeeRepository.findByEmployeeNumber(employeeNumber) — Returns null when no row matches; rejects on query error.
- IEmployeeRepository.findByEmail(email) — Returns null when no row matches; rejects on query error.
- IEmployeeRepository.findByManagerId(managerId) — Returns an empty array (not null) when no direct reports exist; rejects on query error.
- IEmployeeRepository.findAll() — Returns an empty array when the table has no rows; rejects on query error.
- IEmployeeRepository.create(employee) — Accepts an Employee minus id/createdAt/updatedAt; returns a fully-populated Employee; rejects on a unique-constraint violation (duplicate employeeNumber or email) or query error.
- IEmployeeRepository.update(id, data) — Applies a partial update and returns the updated Employee, or returns null when no row matches the id; rejects on query error.
### Integration points — connect to these
- src/shared/types/base-entity.interface.ts (BaseEntity) — Employee extends BaseEntity; this is the declared Phase 1 dependency the phase explicitly depends on.
- src/shared/db/connection.ts (shared pg pool) — PgEmployeeRepository consumes the shared pool for all database access (GP-001 repository pattern; no direct Pool construction).
- src/modules/employee/index.ts (module public entry point) — Downstream phases (balance, leave) import Employee and IEmployeeRepository only through this barrel per the module-boundary rule; it must re-export all three symbols.
- Future leave module (LeaveRequestService) — The leave orchestration phase depends on IEmployeeRepository.findByManagerId and findById to resolve the submitter/approver manager hierarchy and the managerless-escalation rule; this phase establishes that contract.

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