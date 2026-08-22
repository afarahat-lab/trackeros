# Implement this phase: Sub-phase 1: Employee module implementation

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/da3cebcf-aae0-446c-b943-05fc4169a665/2`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
All three files compile without errors via `tsc --noEmit`
EmployeeRepository correctly implements IEmployeeRepository with findById, findByEmail, findByDepartment methods using the shared pg pool
EmployeeService correctly implements IEmployeeService and delegates all calls to IEmployeeRepository
Barrel index.ts re-exports all five symbols: Employee, IEmployeeRepository, EmployeeRepository, IEmployeeService, EmployeeService

## Success criteria
Create the concrete EmployeeRepository, EmployeeService, and barrel export for the employee module. Depends on interfaces and models from part 1 (already present).

Files to create:
- `src/modules/employee/employee.repository.ts` — Implement `EmployeeRepository` class implementing `IEmployeeRepository`. Uses the shared `pool` from `src/shared/db/connection.ts` for PostgreSQL queries. Methods: `findById`, `findByEmail`, `findByDepartment`. Import `IEmployeeRepository` from `./employee.repository.interface` and `Employee` from `./employee.model`.
- `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing `IEmployeeService`. Constructor takes `IEmployeeRepository`. Methods delegate to repository. Import `IEmployeeService` from `./employee.service.interface`, `IEmployeeRepository` from `./employee.repository.interface`, `Employee` from `./employee.model`.
- `src/modules/employee/index.ts` — Barrel export re-exporting: `Employee`, `IEmployeeRepository`, `EmployeeRepository`, `IEmployeeService`, `EmployeeService`.

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Sub-phase 2: Audit module implementation and shared types update": src/modules/audit/audit.service.ts, src/modules/audit/index.ts, src/shared/types/index.ts
- "Sub-phase 3: Unit tests for employee and audit modules": tests/unit/modules/employee/employee.repository.test.ts, tests/unit/modules/audit/audit.service.test.ts

In particular, UNIT/INTEGRATION TESTS are OUT OF SCOPE for this sub-phase — they are produced in: Sub-phase 3: Unit tests for employee and audit modules. Do not create test files here, do not require test existence or coverage as a success criterion, and do not fail the gate for missing tests.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — binding for every phase of this feature.

Q1 and Q5 are THE SAME QUESTION. Bind ONE definition and use it everywhere.

1 & 5 — LEAVE DAY COUNT = CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. Weekends and public holidays are NOT excluded; there is
no holiday calendar in scope for this feature.
Implement this EXACTLY ONCE as a single shared exported helper (e.g. countLeaveDays(startDate, endDate))
in the leave domain module, and call that helper from EVERY site needing a day count:
balance deduction on APPROVED, balance restoration on CANCELLED, the sufficiency check
before approval, entitlement comparison, and minimumNoticeDays enforcement. No call site
may re-derive the count inline — inline re-derivation is the BR-001 anti-pattern this
question exists to prevent.

2 — NO overlapping APPROVED leave for the same employee. Enforce at APPROVAL time, not at
submission. A submission-time check cannot account for other PENDING requests approved
later, so approval is the only authoritative gate. Run the overlap check and the balance
sufficiency check at the SAME point in the approval path so both invariants hold together.
Overlap = any intersection of the [startDate, endDate] range with an existing APPROVED
request for that employee, regardless of leave type.

3 — EMERGENCY LEAVE HAS ITS OWN ENTITLEMENT POOL, separate from annual. Default entitlement
5 days, resets per fiscal year, same cadence as the other types. Model all types uniformly:
annual, sick and emergency each get their own LeavePolicy entitlement and their own
LeaveBalance record. Do not special-case emergency anywhere in the balance logic.

4 — NO documentation requirement for sick leave. Do NOT add a PENDING_DOCUMENTATION state
and do NOT add any document-tracking entity. The LeaveRequest lifecycle is exactly:
PENDING -> APPROVED | REJECTED, and PENDING | APPROVED -> CANCELLED. This is a deliberate
scope decision, not an oversight. [BINDING RULE — operator decision resolving: How is the number of leave days derived from startDate and endDate? Is the range inclusive of both start and end (days = endDate - startDate + 1), exclusive of end (days = endDate - startDate), or measured in business/calendar days? This affects balance deduction, sufficiency checks, and entitlement comparisons across every LeaveRequest operation.; Can an employee have multiple APPROVED LeaveRequests with overlapping date ranges? If not, should the overlap check be enforced at submission time or at approval time?; Does emergency leave draw from the annual leave balance, or does it have a separate entitlement pool? If separate, what is the default entitlement and does it reset per fiscal year or per incident?; Should sick leave require documentation (e.g., doctor's note) after a certain number of consecutive days? If so, what is the threshold and how is it enforced?; How are leave days counted for balance deduction — are start_date and end_date inclusive (i.e. `end_date - start_date + 1`), or exclusive? Are weekends and public holidays excluded from the day count?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- EmployeeRepository must implement IEmployeeRepository from employee.repository.interface.ts — all method signatures must match exactly (see `src/modules/employee/employee.repository.interface.ts`)
- EmployeeRepository query result mapping must produce objects matching the Employee interface shape (id, fullName, email, department, managerId, createdAt, updatedAt) with correct types (see `src/modules/employee/employee.model.ts`)
- EmployeeRepository must import and use the exported `pool` from src/shared/db/connection.ts — no other pool or client creation (see `src/shared/db/connection.ts`)
- Barrel index at src/modules/employee/index.ts must follow the same re-export pattern as src/modules/uptime/index.ts: named re-exports using `export { Thing } from './thing.file'` syntax (see `src/modules/uptime/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `EmployeeRepository`: Must implement IEmployeeRepository exactly — all three methods (findById, findByEmail, findByDepartment) must be present with signatures matching the interface. The class must be the default or named export usable as a constructor.
- Reuse or extend `EmployeeService`: Must implement IEmployeeService exactly — both methods (getEmployeeById, getEmployeeByEmail) must be present with signatures matching the interface. Constructor must accept IEmployeeRepository. Methods must delegate to the injected repository, not contain business logic.
### Interface contract — expose these operations (their shape is yours)
- EmployeeRepository.findById — idempotent; Returns null when no row matches the given id — does not throw
- EmployeeRepository.findByEmail — idempotent; Returns null when no row matches the given email — does not throw
- EmployeeRepository.findByDepartment — idempotent; Returns empty array when no employees match the department — does not throw
### Integration points — connect to these
- src/shared/db/connection.ts (shared pool) — EmployeeRepository requires the PostgreSQL pool for all database queries

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