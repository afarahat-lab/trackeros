# Implement this phase: Phase 8: EmployeeService + LeavePolicyService

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/219727ae-a952-461a-b605-c6d40c0c1e42/8`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the Employee and LeavePolicy service layers.

Files to create:
- `src/modules/employee/employee.service.interface.ts` — Define `IEmployeeService` interface with methods: findById(id), findByEmployeeNumber(employeeNumber), findByEmail(email), getDirectReports(managerId), isManagerOf(managerId, employeeId), createEmployee(data), updateEmployee(id, data), terminateEmployee(id).
- `src/modules/employee/employee.service.ts` — Implement `EmployeeService` class implementing IEmployeeService. Inject IEmployeeRepository. Delegate to repository with input validation.
- `src/modules/leave-policy/leave-policy.service.interface.ts` — Define `ILeavePolicyService` interface with methods: findById(id), findByLeaveType(leaveType), getAllActive(), getEntitlementDays(policyId), requiresManagerApproval(policyId), getMinimumNoticeDays(policyId), createPolicy(data), updatePolicy(id, data), deactivatePolicy(id).
- `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class implementing ILeavePolicyService. Inject ILeavePolicyRepository. Delegate to repository with validation.

This phase depends on:
- `src/modules/employee/employee.model.ts`, `src/modules/employee/employee.repository.interface.ts`, `src/modules/employee/employee.repository.ts` from Phase 2
- `src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.interface.ts`, `src/modules/leave-policy/leave-policy.repository.ts` from Phase 3
- `src/shared/types/index.ts` from Phase 1

Read all dependency files before generating.

Include Jest unit test in `tests/unit/modules/employee/employee.service.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all questions:
1/7/9 (day counting — the single binding rule everywhere a day count is derived): BUSINESS DAYS ONLY — exclude weekends and public holidays. days = number of business days between startDate and endDate inclusive. Apply this ONE rule to balance sufficiency, deductions/reversals (used_days), notice-period checks, overlap detection, and reporting.
2/8 (minimumNoticeDays): submission date = the date the request transitioned to SUBMITTED (not createdAt); measure the notice as BUSINESS days between the submission date and startDate.
3 (overlap): INCLUSIVE overlap — two ranges overlap iff startA <= endB AND startB <= endA. Adjacent dates (A ends Fri, B starts Sat) do NOT overlap.
4 (fiscal year): CALENDAR year, Jan 1 - Dec 31.
5 (carryover): USE-IT-OR-LOSE-IT — unused entitled days expire at fiscal-year end; no carryover, no maxCarryover field.
6 (emergency leave): SEPARATE pool — annual, sick, and emergency each have their own entitlement and balance row; no cross-pool debiting.
10 (available balance): entitled - (used + pending) — pending requests consume balance immediately to prevent double-booking.
Standing rules: whole days only (no partial/half days); used_days is deducted on APPROVAL and restored on reject/cancel of a previously-approved request; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (employee acts on own requests; manager acts on direct reports; HR admin acts on all) and validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is the range inclusive of both boundaries, exclusive of endDate, or based on calendar business days excluding weekends/holidays?; For the minimumNoticeDays check, is 'submission date' the date the request was created (createdAt) or the date it transitioned to SUBMITTED? And is the day count measured as calendar days or business days?; For the overlapping-leave check, are adjacent date ranges (e.g., request A ends Friday, request B starts Saturday) considered overlapping?; How is the fiscal year defined — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g. Apr 1 – Mar 31)?; How should unused annual leave be handled at fiscal-year rollover — carry over fully, carry over with a cap, or expire?; Should emergency leave be drawn from the same annual/sick balance pools, or is it a separate entitlement with its own policy rules?; How are leave days counted from startDate and endDate? Is the range inclusive of both boundaries (days = endDate - startDate + 1), exclusive of endDate (days = endDate - startDate), or based on calendar business days excluding weekends/holidays?; For the minimumNoticeDays check, is "submission date" the date the request was created (createdAt) or the date it transitioned to SUBMITTED? And is the day count measured as calendar days or business days?; How are leave days counted — calendar days or business days? Are weekends and public holidays excluded from the day count?; What is the binding computation for available balance — entitled minus (used + pending), or entitled minus used only?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The EmployeeService must delegate to IEmployeeRepository exactly as declared: findById→findById, findByEmployeeNumber→findByEmployeeNumber, findByEmail→findByEmail, getDirectReports→findByManagerId, createEmployee→create, updateEmployee→update, terminateEmployee→update (with TERMINATED status + terminationDate). The service must not invent repository methods or bypass the interface. (see `src/modules/employee/employee.repository.interface.ts`)
- The LeavePolicyService must delegate to ILeavePolicyRepository exactly as declared: findById→findById, findByLeaveType→findByLeaveType, getAllActive→findAllActive, getEntitlementDays/requiresManagerApproval/getMinimumNoticeDays→findById (then read the field), createPolicy→create, updatePolicy→update, deactivatePolicy→deactivate. The service must not invent repository methods or bypass the interface. (see `src/modules/leave-policy/leave-policy.repository.interface.ts`)
- The EmployeeService must use the Employee interface as the entity type for all return values and create/update payloads, matching the field names and the employmentStatus union ('ACTIVE' | 'INACTIVE' | 'TERMINATED') exactly. The create payload type must align with the repository's Omit<Employee,'id'|'createdAt'|'updatedAt'|'deletedAt'>. (see `src/modules/employee/employee.model.ts`)
- The LeavePolicyService must use the LeavePolicy interface as the entity type for all return values and create/update payloads, matching the field names and the optional numeric fields (accrualRate, maxAccumulation, minimumNoticeDays as number | undefined) exactly. The create payload type must align with the repository's Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'>. (see `src/modules/leave-policy/leave-policy.model.ts`)
- The LeavePolicyService must validate leaveType against the LeaveType enum exported from src/shared/types/index.ts (ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY) and reject any value not in that set. The service must import LeaveType from this shared location, not redefine it. (see `src/shared/types/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: An Employee's employmentStatus may only be ACTIVE, INACTIVE, or TERMINATED. terminateEmployee is the only service operation that transitions an employee to TERMINATED, and it must simultaneously set a non-null terminationDate. The service must reject any attempt to set employmentStatus to an out-of-set value.
- Reuse or extend `Employee`: The manager-employee relationship is expressed by Employee.managerId pointing to another Employee's id (or null). isManagerOf(managerId, employeeId) must resolve to true iff the employee identified by employeeId has managerId equal to the supplied managerId; a missing employee makes the check fail with a not-found error rather than a false positive.
- Reuse or extend `LeavePolicy`: A LeavePolicy's leaveType must be a member of the LeaveType enum (annual, sick, emergency, unpaid, maternity, paternity) and its entitlementDays must be a positive number. The service must reject createPolicy/updatePolicy payloads that violate either constraint before persisting.
- Reuse or extend `LeavePolicy`: A LeavePolicy has an ACTIVE/INACTIVE lifecycle. deactivatePolicy transitions a policy to inactive and is the designated service operation for that transition; getEntitlementDays, requiresManagerApproval, and getMinimumNoticeDays must operate on the policy identified by id regardless of active state (the repository findById does not filter by is_active), returning the stored value or rejecting with not-found when the policy is absent.
### Interface contract — expose these operations (their shape is yours)
- IEmployeeService.findById — Rejects empty/whitespace id with a typed VALIDATION_ERROR before any repository call. Returns the Employee or null when not found — a missing record is a normal null result, not an error.
- IEmployeeService.isManagerOf — Rejects empty managerId or employeeId with a typed VALIDATION_ERROR. Rejects with a typed NOT_FOUND error when the employee identified by employeeId does not exist. Returns a boolean (true only when the loaded employee's managerId equals the supplied managerId).
- IEmployeeService.createEmployee — Validates all required fields (non-empty employeeNumber, firstName, lastName, email; valid employmentStatus) before delegating to the repository. Rejects invalid input with a typed VALIDATION_ERROR. Propagates repository errors as typed errors (GP-006). Returns the persisted Employee.
- IEmployeeService.terminateEmployee — Rejects empty id with a typed VALIDATION_ERROR. Delegates to the repository update path setting employmentStatus=TERMINATED and a terminationDate. Returns the updated Employee or rejects with a typed NOT_FOUND when the employee does not exist.
- ILeavePolicyService.getEntitlementDays — Rejects empty policyId with a typed VALIDATION_ERROR. Resolves the policy by id; rejects with a typed NOT_FOUND when the policy is absent. Returns the policy's entitlementDays (a positive number).
- ILeavePolicyService.requiresManagerApproval — Rejects empty policyId with a typed VALIDATION_ERROR. Resolves the policy by id; rejects with a typed NOT_FOUND when absent. Returns the policy's requiresManagerApproval boolean.
- ILeavePolicyService.getMinimumNoticeDays — Rejects empty policyId with a typed VALIDATION_ERROR. Resolves the policy by id; rejects with a typed NOT_FOUND when absent. Returns the policy's minimumNoticeDays (may be undefined when the policy does not specify one).
- ILeavePolicyService.createPolicy — Validates policyName (non-empty), leaveType (valid LeaveType enum member), entitlementDays (positive) before delegating. Rejects invalid input with a typed VALIDATION_ERROR. Returns the persisted LeavePolicy.
- ILeavePolicyService.deactivatePolicy — Rejects empty policyId with a typed VALIDATION_ERROR. Delegates to the repository deactivate method. Returns a boolean indicating whether a policy was deactivated (false when no matching policy existed is a normal result, not an error).
### Integration points — connect to these
- IEmployeeRepository (src/modules/employee/employee.repository.interface.ts) — EmployeeService is constructed with an IEmployeeRepository instance and delegates all persistence to it; this is the primary integration surface and the seam unit tests mock.
- ILeavePolicyRepository (src/modules/leave-policy/leave-policy.repository.interface.ts) — LeavePolicyService is constructed with an ILeavePolicyRepository instance and delegates all persistence to it; this is the primary integration surface and the seam unit tests mock.
- LeaveRequestService and LeaveBalanceService (Phase 9) — Phase 9 consumes IEmployeeService (isManagerOf, getDirectReports, findById) and ILeavePolicyService (getEntitlementDays, requiresManagerApproval, getMinimumNoticeDays, findByLeaveType) as injected dependencies. The interface contracts defined in this phase are the binding integration surface for the request/balance orchestration.
- AuditService (Phase 10) — The state-changing operations in both services (createEmployee, updateEmployee, terminateEmployee, createPolicy, updatePolicy, deactivatePolicy) are GP-002 audit candidates; Phase 10 will retrofit audit logging around these service operations once IAuditService exists.

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