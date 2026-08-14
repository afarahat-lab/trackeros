# Implement this phase: Phase 7: EmployeeService + LeavePolicyService

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/73542714-9897-4d99-9509-1a7bb9190c33/7`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/employee/employee.service.interface.ts with IEmployeeService interface (findById, findByManagerId, isActive, getManagerId). Create src/modules/employee/employee.service.ts with EmployeeService implementing IEmployeeService — injects IEmployeeRepository, looks up employee data. Create src/modules/leave-policy/leave-policy.service.interface.ts with ILeavePolicyService interface (findByLeaveType, getEntitlement, requiresManagerApproval, getMinimumNoticeDays). Create src/modules/leave-policy/leave-policy.service.ts with LeavePolicyService implementing ILeavePolicyService — injects ILeavePolicyRepository. This phase depends on employee.model.ts, employee.repository.ts, leave-policy.model.ts, leave-policy.repository.ts from Phases 2-3 — read them before generating. Include Jest unit tests in tests/unit/modules/employee/employee.service.test.ts and tests/unit/modules/leave-policy/leave-policy.service.test.ts.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers for the leave management module:

1/7. Fiscal (leave) year: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave startDate. Not a configurable fiscal year, not hire-date anniversary.

2. Cross-fiscal-year request (e.g. Dec to Jan): deduct the WHOLE request from a single fiscal year — the fiscal year of startDate. Do not split across years.

3. Accrual: full entitlement granted UPFRONT at the start of the fiscal year (annual lump-sum), not accrued over time. Mid-year hires: pro-rate the first year by the whole months remaining from the hire date (rounded down).

4/8. Carryover + balance: USE-IT-OR-LOSE-IT — unused days do NOT carry over across fiscal years (no carryover limit needed). Balance: available = entitled - (used + pending). Deduct on APPROVAL (on submission the days are held as PENDING/reservation; on approval pending -> used; on reject/cancel release the reservation).

5/9. Manager resolution + employee data: the LeaveRequest service obtains employee data (managerId, employmentStatus, hireDate) via an IEmployeeRepository interface (dependency-injected), backed by an employees table — the SAME repository-interface pattern the other modules use. The JWT / request context provides ONLY the caller identity (employeeId) and role for RBAC; the manager relationship, hire date, and employment status are looked up via IEmployeeRepository (do NOT read them from the JWT). Approvals/notifications route to the target employees managerId; if managerId is null, escalate to HR (a user with role hr_admin). Managers may act only on their direct reports.

6. Day counting: BUSINESS/WORKING DAYS only — exclude weekends (Sat/Sun) and public holidays. Both startDate and endDate are INCLUSIVE. WHOLE DAYS ONLY — no half-days (a half-day request is not supported; minimum 1 day).

Cross-cutting rules throughout:
- Overlapping leave requests are prevented (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- Balances auto-created for all leave types on employee creation.
- Emergency leave is a SEPARATE pool (distinct from annual/sick) and bypasses the advance-notice requirement, but still requires approval and deducts from its own balance.
- Every endpoint enforces RBAC (employees on their own records; managers approve/reject direct reports) plus input validation.
- Only ACTIVE employees may submit leave. [BINDING RULE — operator decision resolving: How is the fiscal year determined for LeaveBalance assignment? Is it calendar year (Jan 1 – Dec 31), a company-specific fiscal year (e.g., Apr 1 – Mar 31), or configurable per policy?; What happens when a LeaveRequest spans two fiscal years (e.g., startDate in December, endDate in January)?; How does accrual work for annual leave? Is the full entitlement granted upfront at the start of the fiscal year, or does it accrue over time?; Do unused leave days carry over to the next fiscal year, and if so, up to what limit?; How is an employee's manager resolved for routing approvals and notifications?; How are leave days counted for balance deduction — calendar days (inclusive start..end) or working/business days? Does a half-day leave consume 0.5 or 1 day?; What defines the fiscal_year boundary for leave balances — calendar year, a configurable fiscal year (e.g. Apr–Mar), or employee hire-date anniversary?; How is leave balance computed — simple remaining = allocated - used, or does it involve accrual rules (e.g. pro-rata monthly accrual, carry-over from prior year)?; How is an employee's manager resolved? The LeaveRequest service needs a managerId for routing approvals and notifications.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- EmployeeService must consume the Employee entity shape exactly as defined (employmentStatus: EmploymentStatus, managerId: string | null) — do not redefine or widen the Employee type. (see `src/modules/employee/employee.model.ts`)
- EmployeeService must call only the findById and findByManagerId signatures declared on IEmployeeRepository (with optional PoolClient omitted); it must not depend on findAll/create/update/softDelete. (see `src/modules/employee/employee.repository.ts`)
- LeavePolicyService must consume the LeavePolicy entity shape exactly as defined (entitlementDays: number, requiresManagerApproval: boolean, minimumNoticeDays: number | null, isActive: boolean) — do not redefine or widen the LeavePolicy type. (see `src/modules/leave-policy/leave-policy.model.ts`)
- LeavePolicyService must call only the findByLeaveType signature declared on ILeavePolicyRepository (with optional PoolClient omitted); it must not depend on findById or findAllActive. (see `src/modules/leave-policy/leave-policy.repository.ts`)
- isActive must compare against EmploymentStatus.ACTIVE from the shared enum, not a hardcoded string literal, to stay aligned with the canonical enum values. (see `src/shared/types/leave.types.ts`)
- Service interface + implementation file naming and the `implements` pattern must match the established convention in the status and uptime modules. (see `src/modules/status/status.service.interface.ts`)
- Service unit tests must follow the existing repository test conventions: jest.mock of the dependency, jest.fn() mocks reset in beforeEach, makeX(overrides) factory helpers, describe/it structure, and relative import paths. (see `tests/unit/modules/employee/employee.repository.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: An employee's active eligibility is determined solely by employmentStatus === EmploymentStatus.ACTIVE; INACTIVE and TERMINATED employees are not active. The service must not infer active status from any other field (e.g. terminationDate, deletedAt).
- Reuse or extend `Employee`: managerId is the authoritative approval-routing reference: it is either a string referencing another employee's id or null (top-level / no manager). The service exposes it verbatim without defaulting or synthesizing a value.
- Reuse or extend `LeavePolicy`: Only policies with isActive === true are considered the governing policy for a leave type; inactive policies returned by the repository must be filtered out before resolving entitlement, approval requirement, or notice days.
- Reuse or extend `LeavePolicy`: minimumNoticeDays is nullable (number | null); a null value means no advance-notice constraint applies. The service must preserve null rather than coercing it to 0 or throwing.
### Interface contract — expose these operations (their shape is yours)
- IEmployeeService.findById — Returns the Employee or null when not found; must not throw on a missing id. Delegates to IEmployeeRepository.findById without a PoolClient.
- IEmployeeService.findByManagerId — Returns the array of direct-report Employees (possibly empty) for the given manager id; delegates to IEmployeeRepository.findByManagerId without a PoolClient.
- IEmployeeService.isActive — Returns a boolean: true iff the resolved employee's employmentStatus === EmploymentStatus.ACTIVE; false when the employee is not found or is INACTIVE/TERMINATED. Must not throw on a missing id.
- IEmployeeService.getManagerId — Returns the managerId (string | null) of the resolved employee, or null when the employee is not found. Must not throw on a missing id.
- ILeavePolicyService.findByLeaveType — Returns the array of LeavePolicy entries for the given LeaveType (delegates to ILeavePolicyRepository.findByLeaveType without a PoolClient); may be empty.
- ILeavePolicyService.getEntitlement — Resolves the active policy for the leave type and returns its entitlementDays, or a typed null/absent result when no active policy exists; must not throw on missing policy.
- ILeavePolicyService.requiresManagerApproval — Resolves the active policy for the leave type and returns its requiresManagerApproval boolean, or a typed null/absent result when no active policy exists; must not throw on missing policy.
- ILeavePolicyService.getMinimumNoticeDays — Resolves the active policy for the leave type and returns its minimumNoticeDays (number | null), or a typed null/absent result when no active policy exists; must not throw on missing policy and must preserve a null minimumNoticeDays.
### Integration points — connect to these
- IEmployeeRepository (src/modules/employee/employee.repository.ts) — EmployeeService injects this repository interface to resolve employees by id and by manager id; it is the sole data-access dependency for the employee service.
- ILeavePolicyRepository (src/modules/leave-policy/leave-policy.repository.ts) — LeavePolicyService injects this repository interface to look up policies by leave type; it is the sole data-access dependency for the leave-policy service.
- SharedTypes — EmploymentStatus, LeaveType (src/shared/types/leave.types.ts) — isActive compares against EmploymentStatus.ACTIVE; findByLeaveType/getEntitlement/etc. accept a LeaveType argument; both enums are imported from the shared types module.
- LeaveRequestService (Phase 9, not yet built) — IEmployeeService (manager resolution, active-status gate) and ILeavePolicyService (entitlement, approval requirement, minimum notice) are consumed by the future LeaveRequestService orchestrator per the reconciled dependency map (LeaveRequest → Employee, LeavePolicy).

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