# Implement this phase: Phase 2 — Employee module

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/5718a840-0b03-4112-91da-8c645c2fae86/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the Employee module. This phase depends on Phase 1 for `EmploymentStatus` and `BaseEntity` from `src/shared/types/index.ts` — read that file before generating any code.

**Files to create (approximately 6):**

1. `src/modules/employee/employee.model.ts` — Define the `Employee` entity with the exact canonical fields: id: string, employeeNumber: string, firstName: string, lastName: string, email: string, managerId: string | null, department: string, hireDate: Date, terminationDate: Date | null, employmentStatus: EmploymentStatus, createdAt: Date, updatedAt: Date, deletedAt: Date | null. Import `EmploymentStatus` from `src/shared/types/index.ts`.

2. `src/modules/employee/employee.repository.interface.ts` — Define `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findAll(): Promise<Employee[]>`, `create(employee: Employee): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `softDelete(id: string): Promise<boolean>`. Import Employee from `./employee.model`.

3. `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` interface with methods: `getById(id: string): Promise<Employee | null>`, `getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `getSubordinates(managerId: string): Promise<Employee[]>`, `create(data: CreateEmployeeDto): Promise<Employee>`, `update(id: string, data: Partial<Employee>): Promise<Employee | null>`, `terminate(id: string): Promise<Employee | null>`. Also define `CreateEmployeeDto` here: { employeeNumber: string; firstName: string; lastName: string; email: string; managerId?: string | null; department: string; hireDate: Date }.

4. `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Constructor receives `IEmployeeRepository`. Methods: `getById` delegates to repo.findById; `getByEmployeeNumber` delegates to repo.findByEmployeeNumber; `getSubordinates` delegates to repo.findByManagerId; `create` constructs an Employee (generates id via crypto.randomUUID(), sets employmentStatus to ACTIVE, createdAt/updatedAt to new Date(), deletedAt to null) and delegates to repo.create; `update` delegates to repo.update; `terminate` sets employmentStatus to TERMINATED, terminationDate to new Date(), and delegates to repo.update.

5. `src/modules/employee/employee.controller.ts` — Fastify route handler functions (not route registration). Export functions: `getEmployeeById`, `getEmployeeByNumber`, `getSubordinates`, `createEmployee`, `updateEmployee`, `terminateEmployee`. Each receives request/reply, extracts params/body, calls EmployeeService, returns appropriate status codes (200, 201, 404).

6. `src/modules/employee/employee.routes.ts` — Export `employeeRoutes` async function registering all employee endpoints on a FastifyInstance with prefix `/employees`. Wire the controller functions.

7. `src/modules/employee/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/employee/employee.service.test.ts` — mock IEmployeeRepository, test create, getById, getSubordinates, terminate flows.

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
- The `Employee` entity must import and use `EmploymentStatus` from `src/shared/types/index.ts` — the exact enum defined in Phase 1 with values ACTIVE, INACTIVE, TERMINATED. No local redefinition. (see `src/shared/types/index.ts`)
- The `Employee` entity must structurally conform to `BaseEntity` from `src/shared/types/index.ts` — it carries `id: string`, `createdAt: Date`, `updatedAt: Date` with the same semantics (id is a UUID string, timestamps are set at creation and updated on mutation). (see `src/shared/types/index.ts`)
- The `Employee` entity's `deletedAt: Date | null` field follows the soft-delete pattern: null means active, a Date value means soft-deleted. The `softDelete` repository method sets `deletedAt` to the current timestamp rather than physically removing the row. All repository lookup methods (findById, findByEmployeeNumber, findByEmail, findByManagerId, findAll) must exclude soft-deleted records (deletedAt IS NOT NULL filter). (see `src/modules/employee/employee.repository.interface.ts`)
- The module's public surface (`index.ts` barrel export) must re-export Employee, IEmployeeRepository, IEmployeeService, EmployeeService, and the route registration function — matching the pattern established by the audit module's barrel export at `src/modules/audit/index.ts`. (see `src/modules/audit/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Every Employee must have a unique `employeeNumber` and a unique `email` across all non-soft-deleted records. `employmentStatus` must be one of ACTIVE, INACTIVE, or TERMINATED. `hireDate` must be set at creation and must not be in the future. `terminationDate` must be null unless `employmentStatus` is TERMINATED, in which case it must be set. `deletedAt` is null for active records; soft-delete sets it to the current timestamp.
- Reuse or extend `Employee`: An Employee with `employmentStatus` TERMINATED cannot be the target of new leave-request submissions or balance initializations (enforced by downstream modules, but the status value is the authoritative signal). The `terminate` service method is the sole path to transition an Employee to TERMINATED status.
### Interface contract — expose these operations (their shape is yours)
- EmployeeService.create — Caller must be authenticated; RBAC enforcement (e.g. HR admin or manager role required to create employees) is applied at the route level, not inside the service.; Must reject with a typed error if employeeNumber or email already exists. Must validate that all required fields in CreateEmployeeDto are present and non-empty before constructing the entity.
- EmployeeService.terminate — Caller must be authenticated; RBAC enforcement (HR admin or manager role) is applied at the route level.; idempotent; Returns null if the employee does not exist (caller returns 404). If the employee is already TERMINATED, the operation is idempotent — it sets the same values again and succeeds.
- EmployeeService.getById / getByEmployeeNumber / getSubordinates — Caller must be authenticated; RBAC enforcement is applied at the route level.; idempotent; Read operations return null (single-lookup) or empty array (multi-result) when no records match — they do not throw.
### Integration points — connect to these
- src/shared/types/index.ts — Imports `EmploymentStatus` enum and conforms to `BaseEntity` shape — the sole external dependency of the Employee module.

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