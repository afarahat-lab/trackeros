# Implement this phase: Sub-phase 2.2 — Employee service, controller, routes, and barrel export

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/5718a840-0b03-4112-91da-8c645c2fae86/3`. Do not clone anything; work only in this directory.

## What to build
employee.service.ts compiles, EmployeeService correctly implements IEmployeeService, create() generates UUID and sets ACTIVE status / timestamps, terminate() sets TERMINATED status and terminationDate
employee.controller.ts compiles and exports 6 handler functions, each extracting params/body and delegating to the service with correct HTTP status codes
employee.routes.ts compiles and registers all 6 endpoints on /employees prefix with correct HTTP methods (GET /:id, GET /number/:employeeNumber, GET /:managerId/subordinates, POST /, PUT /:id, POST /:id/terminate)
index.ts barrel export re-exports all public symbols from the module
All imports resolve to files created in Sub-phase 2.1

## Success criteria
Implement the EmployeeService, controller functions, route registration, and barrel export. Depends on Sub-phase 2.1 for the model and interfaces.

**Files to create (4):**

1. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Constructor receives `IEmployeeRepository`. Methods:
   - `getById(id)` → delegates to `repo.findById`
   - `getByEmployeeNumber(employeeNumber)` → delegates to `repo.findByEmployeeNumber`
   - `getSubordinates(managerId)` → delegates to `repo.findByManagerId`
   - `create(data: CreateEmployeeDto)` → constructs an Employee: generates `id` via `crypto.randomUUID()`, sets `employmentStatus` to `EmploymentStatus.ACTIVE`, `createdAt`/`updatedAt` to `new Date()`, `deletedAt` to `null`, `terminationDate` to `null`; delegates to `repo.create`
   - `update(id, data)` → delegates to `repo.update`
   - `terminate(id)` → sets `employmentStatus` to `EmploymentStatus.TERMINATED`, `terminationDate` to `new Date()`, delegates to `repo.update`

2. `src/modules/employee/employee.controller.ts` — Fastify route handler functions (not route registration). Export functions: `getEmployeeById`, `getEmployeeByNumber`, `getSubordinates`, `createEmployee`, `updateEmployee`, `terminateEmployee`. Each receives `(request, reply)`, extracts params/body, calls `EmployeeService`, returns appropriate status codes (200 for success, 201 for create, 404 for not found). The controller receives the service instance via a factory/closure pattern (e.g., export a function `makeEmployeeController(service: IEmployeeService)` returning the handler object).

3. `src/modules/employee/employee.routes.ts` — Export `employeeRoutes` as an async function receiving a `FastifyInstance`. Register all employee endpoints under prefix `/employees`, wiring each route to the corresponding controller function. The function should instantiate the service (accepting a repository parameter or creating one inline — use a simple factory pattern).

4. `src/modules/employee/index.ts` — Barrel export re-exporting everything from the module: model, interfaces, service, controller, routes.

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Sub-phase 2.1 — Employee model and interfaces": src/modules/employee/employee.model.ts, src/modules/employee/employee.repository.interface.ts, src/modules/employee/employee.service.interface.ts
- "Sub-phase 2.3 — Employee service unit tests": tests/unit/modules/employee/employee.service.test.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Sub-phase 2.3 — Employee service unit tests. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions — keep everything MINIMAL, uniform, and self-consistent: (1 & 4) Day counting = inclusive calendar days for ALL leave types: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar and do NOT vary counting by leave type. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, entitlement check, reporting). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no per-company/tenant/jurisdiction configuration. (3) Emergency leave ALWAYS requires manager approval, exactly like every other leave type — no auto-approval, no separate emergency policy flag, no special SLA. The policy requiresManagerApproval flag governs uniformly. Balances are integers (full-day granularity only); remaining_days = total_entitlement - used_days exactly. [BINDING RULE — operator decision resolving: Should leave day counting use calendar days (inclusive: endDate - startDate + 1) or working/business days (excluding weekends and/or public holidays)?; What is the fiscal year boundary? (e.g. calendar year Jan 1–Dec 31, or April 6–April 5 for UK tax year, or company-specific); Should emergency leave bypass the manager-approval requirement even when the policy says requiresManagerApproval=true? Or should it always require approval but with a shorter SLA?; How are leave days counted — are start_date and end_date inclusive, and how are weekends/public-holidays handled?; What defines the fiscal_year boundary for leave balances — calendar year, a configurable company fiscal year, or a rolling 12-month window from the employee's hire date?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; apply everywhere these apply, not in one place only]

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
    - employmentStatus: EmploymentStatus
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- Employee model must match the canonical fields defined in src/modules/employee/employee.model.ts — id, employeeNumber, firstName, lastName, email, managerId, department, hireDate, terminationDate, employmentStatus, createdAt, updatedAt, deletedAt (see `src/modules/employee/employee.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: A newly created Employee always has employmentStatus=ACTIVE, terminationDate=null, and deletedAt=null — these fields are set by the service, not accepted from the caller's DTO
- Reuse or extend `Employee`: A terminated Employee must have employmentStatus=TERMINATED and terminationDate set to the time of termination; terminationDate must not be null when status is TERMINATED
- Reuse or extend `Employee`: Employee id is always a UUID generated via crypto.randomUUID() at creation time — never supplied by the caller
### Interface contract — expose these operations (their shape is yours)
- EmployeeService.create — Must return the created Employee; repository failures propagate as-is (no try/catch masking in the service)
- EmployeeService.update — Only the allowlisted fields (firstName, lastName, email, managerId, department, hireDate) are forwarded to repo.update; all other keys in the input are silently dropped. Returns null when the employee does not exist.
- EmployeeService.terminate — idempotent; Returns null when the employee does not exist (idempotent for already-terminated employees — still sets the fields again). Must fetch before mutating to distinguish not-found from update failure.

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