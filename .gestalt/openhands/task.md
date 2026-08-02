# Implement this phase: Phase 8: Employee service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/8`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee service layer. This phase depends on `src/modules/employee/employee.model.ts` and `src/modules/employee/employee.repository.ts` from Phase 2 — read both before generating.

Files to create:

1. `src/modules/employee/employee.service.interface.ts` — Define and export `IEmployeeService` interface:
   - `getEmployeeById(id: string): Promise<Employee | null>`
   - `getEmployeeByNumber(employeeNumber: string): Promise<Employee | null>`
   - `getSubordinates(managerId: string): Promise<Employee[]>`
   - `getAllEmployees(): Promise<Employee[]>`
   - `createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>`
   - `updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null>`
   - `terminateEmployee(id: string): Promise<void>`

2. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Inject `IEmployeeRepository` via constructor. The `terminateEmployee` method sets `employmentStatus` to `'TERMINATED'`, sets `terminationDate` to now, and calls `softDelete`.

3. Update `src/modules/employee/index.ts` to also export the service interface and class.

Include Jest unit tests at `tests/unit/modules/employee/employee.service.spec.ts` with mocked repository.

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
- The service interface and class must import and operate on the exact Employee type defined in employee.model.ts — do not redefine or narrow the entity shape; the create input must omit precisely id, createdAt, updatedAt, and deletedAt. (see `src/modules/employee/employee.model.ts`)
- The service must delegate to the existing IEmployeeRepository method set (findById, findByEmployeeNumber, findByManagerId, findAll, create, update, softDelete) without adding or assuming repository methods; terminateEmployee must compose update then softDelete from this exact set. (see `src/modules/employee/employee.repository.ts`)
- The employee service interface file must follow the leave-policy service-interface pattern: import only the model type, export the service interface with async method signatures, no repository import. (see `src/modules/leave-policy/leave-policy.service.interface.ts`)
- The employee service class must follow the leave-policy service class pattern: constructor takes a private readonly repository typed as the repository interface, implements the service interface, and each method delegates directly to the repository. (see `src/modules/leave-policy/leave-policy.service.ts`)
- The employee barrel must add the service interface and class exports in the same ordering convention as the leave-policy barrel (model, repository, service interface, service class). (see `src/modules/leave-policy/index.ts`)
- The employee service test must mirror the leave-policy service test structure: a jest.Mocked<IEmployeeRepository> built in beforeEach, a makeEmployee() factory helper, delegation assertions (correct args + returned value), and error-propagation assertions (mockRejectedValueOnce → rejects.toThrow). (see `tests/unit/modules/leave-policy/leave-policy.service.spec.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Termination is a terminal lifecycle transition: terminateEmployee must move employmentStatus to 'TERMINATED' and set terminationDate to a non-null current timestamp before the record is soft-deleted; an employee cannot be terminated without both fields being persisted.
- Reuse or extend `Employee`: Soft-deletion (deletedAt set) must only occur after the termination status fields are written, because the repository's update path excludes rows where deleted_at IS NOT NULL — the ordering preserves the status/terminationDate write.
- Reuse or extend `IEmployeeService`: The service is a pure delegation layer over IEmployeeRepository for all read/create/update operations — it must not mutate, filter, or synthesize Employee data beyond the terminateEmployee status/terminationDate assignment.
### Interface contract — expose these operations (their shape is yours)
- getEmployeeById(id) — Delegates to repository.findById; returns Employee | null; propagates repository errors unchanged.
- getEmployeeByNumber(employeeNumber) — Delegates to repository.findByEmployeeNumber; returns Employee | null; propagates repository errors unchanged.
- getSubordinates(managerId) — Delegates to repository.findByManagerId; returns Employee[] (empty when none); propagates repository errors unchanged.
- getAllEmployees() — Delegates to repository.findAll; returns Employee[] (empty when none); propagates repository errors unchanged.
- createEmployee(data) — Delegates to repository.create with the provided data (omitting id/createdAt/updatedAt/deletedAt); returns the persisted Employee; propagates unique-constraint and other repository errors unchanged.
- updateEmployee(id, data) — Delegates to repository.update; returns the updated Employee or null when no non-deleted row matches; propagates repository errors unchanged.
- terminateEmployee(id) — Calls repository.update with employmentStatus 'TERMINATED' and terminationDate = now, then calls repository.softDelete; resolves void on success; propagates repository errors unchanged (an update failure must not trigger softDelete).
### Integration points — connect to these
- src/modules/employee/employee.repository.ts (IEmployeeRepository) — The service consumes the repository interface as its sole dependency; all persistence operations flow through it.
- src/modules/employee/index.ts (module barrel) — Downstream phases (Phase 10 leave-request orchestration) consume IEmployeeService and EmployeeService exclusively through the public barrel entry point per the module-boundary rule.
- src/modules/leave-policy/leave-policy.service.ts (established service-layer pattern) — The employee service must structurally match the leave-policy service precedent so the codebase has one consistent service-layer shape.

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