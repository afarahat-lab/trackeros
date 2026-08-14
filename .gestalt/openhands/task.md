# Implement this phase: Phase 8: LeavePolicyService (leave-policy module)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/32ad270f-dfe8-4e32-be27-804897fcc970/8`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeavePolicyService in the leave-policy module.

Files to create:
1. `src/modules/leave-policy/leave-policy.service.interface.ts` — Define and export ILeavePolicyService interface with methods: getPolicyForLeaveType(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy>, getActivePolicies(): Promise<LeavePolicy[]>, calculateEntitlement(policy: LeavePolicy, hireDate: Date, fiscalYear: number): number (implements the BINDING rule: annual lump-sum allocation at fiscal year start; mid-year hires pro-rated by whole months remaining, rounded down), validatePolicy(policy: LeavePolicy): boolean.

2. `src/modules/leave-policy/leave-policy.service.ts` — Implement LeavePolicyService class implementing ILeavePolicyService. Inject ILeavePolicyRepository and ILeaveTypeRepository (from Phase 2 and Phase 3). The calculateEntitlement method must: determine fiscal year start (Jan 1), if hireDate is before Jan 1 of fiscalYear → full entitlementDays; if hireDate is within fiscalYear → pro-rate: entitlementDays * (whole months remaining / 12), rounded down. maxAccumulation caps the result.

3. Update `src/modules/leave-policy/index.ts` — Add re-exports for ILeavePolicyService and LeavePolicyService.

Include Jest unit tests in `tests/unit/modules/leave-policy/` for the service, testing pro-ration edge cases (hire Jan 15 → 11 months, hire Dec 1 → 0 months, hire before fiscal year → full).

This phase depends on `src/modules/leave-policy/leave-type.model.ts`, `src/modules/leave-policy/leave-type.repository.interface.ts` from Phase 2, and `src/modules/leave-policy/leave-policy.model.ts`, `src/modules/leave-policy/leave-policy.repository.interface.ts` from Phase 3 — read all before generating.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers for the leave management module:

1/5/8/10. Fiscal (leave) year boundary: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave start_date. Not hire-date anniversary, not configurable.

2/9. Accrual: ANNUAL LUMP-SUM allocation at the start of the fiscal year (Jan 1) — each employee is granted the full entitlement for that leave type up front (not monthly pro-rata). Mid-year hires: pro-rate the first year by the number of whole months remaining in the year from the hire date (rounded down). maxAccumulation caps the balance; accrualRate is the annual entitlement. Carryover: USE-IT-OR-LOSE-IT — unused balance does NOT carry across fiscal years.

3/6. Emergency leave: it is a SEPARATE pool with its own entitlement, distinct from annual and sick. Emergency leave bypasses the normal advance-notice requirement (it can be applied for same-day / retroactively), but still goes through manager approval and still deducts from its own balance. It does not draw from annual or sick.

4. Deduction timing: deduct on APPROVAL (finalize). On submission the requested days are held as PENDING (a reservation); on approval the pending days move to used; on reject or cancel the reservation is released. Available balance = entitled - (used + pending). Deduct at approval time, not at the start of the leave period.

7. Day counting: BUSINESS/WORKING DAYS only — exclude weekends (Saturday, Sunday) and public holidays. Both start_date and end_date are inclusive. Whole days only (no half-days).

Cross-cutting rules that apply throughout:
- Overlapping leave requests are prevented (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- A request spanning two fiscal years deducts wholly from the fiscal year of start_date (no split).
- Balances are auto-created for all leave types on employee creation.
- Every endpoint enforces RBAC (employees act on their own records; managers approve/reject their direct reports) plus input validation.
- When an employee has no manager, approval escalates to HR. [BINDING RULE — operator decision resolving: How is the fiscal year boundary determined for LeaveBalance?; How does leave accrual work? LeavePolicy defines accrualRate and maxAccumulation, but the accrual mechanics (frequency, proration for mid-year hires, carryover rules) are not specified.; Does emergency leave have special rules that distinguish it from annual and sick leave?; When a leave request is approved, should the balance be deducted immediately at approval time or at the start of the leave period?; How is the fiscal year boundary determined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), the employee's hire-date anniversary, or a configurable organisation-wide fiscal year start?; Does emergency leave have special rules that distinguish it from annual and sick leave? The feature description lists all three but does not specify whether emergency leave bypasses notice periods, approval requirements, or balance checks.; How are leave days counted — calendar days or business/working days?; What are the fiscal year boundaries for balance scoping?; How does leave balance accrual work — annual lump-sum allocation at fiscal-year start vs. monthly pro-rata accrual?; What is the fiscal year boundary — calendar year (Jan 1 – Dec 31) or a configurable company fiscal year?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The service interface and implementation must consume the LeavePolicy shape exactly as defined (id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt) — do not redefine or alter the model; import it from this file. (see `src/modules/leave-policy/leave-policy.model.ts`)
- The service must depend on ILeavePolicyRepository as declared here (findAll, findById, findByLeaveTypeId, findActiveByLeaveTypeId, create, update, delete) — specifically use findActiveByLeaveTypeId for getPolicyForLeaveType and findAll (filtered to active) for getActivePolicies. Do not invent new repository methods. (see `src/modules/leave-policy/leave-policy.repository.interface.ts`)
- The service must depend on ILeaveTypeRepository as declared here (findAll, findById, findByCode, create, update, delete) — specifically use findByCode to resolve a LeaveType by its LeaveTypeCode in getPolicyForLeaveType. Do not invent new repository methods. (see `src/modules/leave-policy/leave-type.repository.interface.ts`)
- The getPolicyForLeaveType parameter type must be the LeaveTypeCode enum from this file (annual/sick/emergency/unpaid/maternity/paternity) — import via the shared-types barrel, never redefine the enum. (see `src/shared/types/leave-type-code.enum.ts`)
- The barrel must be extended (not replaced) to re-export ILeavePolicyService and LeavePolicyService alongside the existing Phase 2/3 exports (LeaveType, ILeaveTypeRepository, LeaveTypeRepository, DTOs, LeavePolicy, ILeavePolicyRepository, LeavePolicyRepository, DTOs) — preserving all current re-exports. (see `src/modules/leave-policy/index.ts`)
- Error codes thrown by getPolicyForLeaveType must match the Error Response Contract in ARCHITECTURE.md: NOT_FOUND (404) for missing entity, POLICY_VIOLATION (400) for inactive type or zero/multiple active policies — consistent with the standard { error, code } shape. (see `docs/ARCHITECTURE.md`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: Only an active LeavePolicy (isActive=true) may be returned by getPolicyForLeaveType and getActivePolicies; an inactive policy is never surfaced as a usable policy for leave operations (binding business rule 8: only active LeaveType and LeavePolicy may be used).
- Reuse or extend `LeavePolicy`: The computed entitlement for a policy never exceeds its maxAccumulation when that field is defined: calculateEntitlement caps the pro-rated/full result at maxAccumulation, preserving the accumulation ceiling invariant.
- Reuse or extend `LeavePolicy`: A LeavePolicy is associated with exactly one LeaveType via leaveTypeId; getPolicyForLeaveType resolves a LeaveType by code first, then locates the active policy for that type's id — the policy-to-type linkage is always traversed type-first, never policy-first.
### Interface contract — expose these operations (their shape is yours)
- getPolicyForLeaveType(leaveTypeCode): Promise<LeavePolicy> — idempotent; Throws an error with code NOT_FOUND (404) when no LeaveType matches the code; throws an error with code POLICY_VIOLATION (400) when the LeaveType is inactive or when zero or multiple active policies exist for that type. Never returns null — the non-null Promise<LeavePolicy> signature is honored.
- getActivePolicies(): Promise<LeavePolicy[]> — idempotent; Returns only active LeavePolicy rows; returns an empty array when none exist rather than throwing. Errors from the underlying repository propagate as thrown errors (GP-006).
- calculateEntitlement(policy: LeavePolicy, hireDate: Date, fiscalYear: number): number — idempotent; Pure synchronous function — does not throw under normal inputs; returns a non-negative integer (floored). The result is capped at policy.maxAccumulation when defined. No I/O, no side effects.
- validatePolicy(policy: LeavePolicy): boolean — idempotent; Returns true for a valid policy and false for an invalid one; must not throw for malformed input — invalid data yields false rather than an exception.
### Integration points — connect to these
- ILeavePolicyRepository (Phase 3, src/modules/leave-policy/leave-policy.repository.interface.ts) — The service injects this repository to fetch active policies (findActiveByLeaveTypeId for getPolicyForLeaveType, findAll filtered to active for getActivePolicies). This is the sole data source for LeavePolicy rows — no direct DB access.
- ILeaveTypeRepository (Phase 2, src/modules/leave-policy/leave-type.repository.interface.ts) — The service injects this repository to resolve a LeaveType by code (findByCode) before locating its active policy — getPolicyForLeaveType traverses type-first, then policy.
- ILeavePolicyService (this phase, consumed by Phase 9 LeaveBalanceService) — Phase 9's LeaveBalanceService.initializeBalancesForEmployee depends on getActivePolicies and calculateEntitlement from this interface to auto-create LeaveBalance rows with pro-rated entitlements. The interface contract established here is the integration seam for Phase 9.

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