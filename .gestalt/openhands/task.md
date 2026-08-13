# Implement this phase: Phase 3: LeavePolicy model + repository (leave-policy module)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/32ad270f-dfe8-4e32-be27-804897fcc970/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeavePolicy domain model and its repository in the leave-policy module.

Files to create:
1. `src/modules/leave-policy/leave-policy.model.ts` — Define and export the LeavePolicy interface with EXACT fields: id: string, policyName: string, leaveTypeId: string, entitlementDays: number, accrualRate: number | undefined, maxAccumulation: number | undefined, minimumNoticeDays: number | undefined, requiresManagerApproval: boolean, isActive: boolean, createdAt: Date, updatedAt: Date.

2. `src/modules/leave-policy/leave-policy.repository.interface.ts` — Define and export ILeavePolicyRepository interface with methods: findAll(), findById(id: string), findByLeaveTypeId(leaveTypeId: string), findActiveByLeaveTypeId(leaveTypeId: string), create(dto: CreateLeavePolicyDto), update(id: string, dto: UpdateLeavePolicyDto), delete(id: string). Also define CreateLeavePolicyDto and UpdateLeavePolicyDto.

3. `src/modules/leave-policy/leave-policy.repository.ts` — Implement LeavePolicyRepository class implementing ILeavePolicyRepository. Use the existing pg Pool from `src/shared/db/connection.ts`. Write parameterized SQL queries.

4. Update `src/modules/leave-policy/index.ts` — Add re-exports for LeavePolicy, ILeavePolicyRepository, LeavePolicyRepository, and the DTOs alongside the Phase 2 exports.

Include Jest unit tests in `tests/unit/modules/leave-policy/` for the LeavePolicy repository.

This phase depends on `src/modules/leave-policy/leave-type.model.ts` and `src/modules/leave-policy/index.ts` from Phase 2 — read them before generating any code.

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

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveTypeId: string
    - entitlementDays: number
    - accrualRate: number | undefined
    - maxAccumulation: number | undefined
    - minimumNoticeDays: number | undefined
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeavePolicyRepository implementation must mirror the structural conventions established by the Phase 2 LeaveTypeRepository: Queryable type (Pick<Pool, 'query'>), constructor(client?: Queryable) defaulting to the shared pool, a private snake_case *Row interface, a rowTo* mapper converting snake_case→camelCase with `?? undefined` for nullable optionals, parameterized SQL with explicit column lists (no SELECT *), INSERT … RETURNING for create, dynamic SET-clause builder with a paramIndex counter plus updated_at = NOW() and findById fallback for update, and boolean rowCount-based return for delete. (see `src/modules/leave-policy/leave-type.repository.ts`)
- The ILeavePolicyRepository interface and its co-located CreateLeavePolicyDto/UpdateLeavePolicyDto must follow the same DTO convention as the Phase 2 leave-type interface file: Create DTO marks optional fields with `?` and required fields plain; Update DTO makes every field optional with `?`; the repository interface declares async methods returning the model, model | null, model[], or boolean as appropriate. (see `src/modules/leave-policy/leave-type.repository.interface.ts`)
- The leave-policy barrel must be extended (not replaced) so that the existing Phase 2 re-exports (LeaveType, ILeaveTypeRepository, CreateLeaveTypeDto, UpdateLeaveTypeDto, LeaveTypeRepository) remain intact and the new Phase 3 symbols (LeavePolicy, ILeavePolicyRepository, CreateLeavePolicyDto, UpdateLeavePolicyDto, LeavePolicyRepository) are added alongside them. (see `src/modules/leave-policy/index.ts`)
- The LeavePolicyRepository unit tests must follow the Phase 2 leave-type repository test conventions: jest.mock the shared db connection before importing pool, a makeRow(overrides) helper returning a full snake_case row with defaults, beforeEach resetting the mock and constructing the repository, assertions on exact SQL strings and exact parameter arrays via toHaveBeenCalledWith, and a custom-client constructor test verifying the injected client is used instead of the default pool. (see `tests/unit/modules/leave-policy/leave-type.repository.test.ts`)
- The LeavePolicy model attributes and the leave_policies table column set must match the reconciled architecture exactly: model fields id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt; table columns id, policy_name, leave_type_id (FK→leave_types.id), entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A LeavePolicy is always associated with exactly one LeaveType via leaveTypeId, which must reference an existing row in leave_types (FK constraint); a policy cannot exist without a parent leave type.
- Reuse or extend `LeavePolicy`: A LeavePolicy has an ACTIVE/INACTIVE lifecycle governed by the isActive flag; only policies with isActive = true may be used for request validation and balance initialization (binding business rule 8). The repository's findActiveByLeaveTypeId must surface only active policies.
- Reuse or extend `LeavePolicy`: entitlementDays is a non-negative quantity representing the annual lump-sum allocation; accrualRate, maxAccumulation, and minimumNoticeDays are optional policy modifiers that, when present, constrain accrual caps and advance-notice requirements respectively. The repository must preserve optionality (undefined when the DB column is null).
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyRepository.findAll — idempotent; Returns all LeavePolicy rows (mapped to the model); returns an empty array when none exist. Rejects on database error.
- ILeavePolicyRepository.findById — idempotent; Returns the matching LeavePolicy or null when no row has the given id. Rejects on database error.
- ILeavePolicyRepository.findByLeaveTypeId — idempotent; Returns all LeavePolicy rows for the given leaveTypeId (any active state); returns an empty array when none match. Rejects on database error.
- ILeavePolicyRepository.findActiveByLeaveTypeId — idempotent; Returns only LeavePolicy rows where is_active = true for the given leaveTypeId; returns an empty array when none match. Rejects on database error.
- ILeavePolicyRepository.create — Inserts a new leave_policies row and returns the created LeavePolicy (via INSERT … RETURNING). Applies defaults for omitted optional fields. Rejects on constraint violation (e.g. invalid leave_type_id FK).
- ILeavePolicyRepository.update — idempotent; Updates only the provided fields (dynamic SET), sets updated_at = NOW(), and returns the updated LeavePolicy or null if no row matches the id; when no fields are provided, returns the current row (or null if absent) without mutation. Rejects on database error.
- ILeavePolicyRepository.delete — idempotent; Deletes the row with the given id and returns true if a row was removed, false if no row matched. Rejects on database error.
### Integration points — connect to these
- src/shared/db/connection.ts (pg Pool) — The LeavePolicyRepository obtains the shared PostgreSQL pool from this module (defaulting to it when no client is injected), consistent with GP-001 and the Phase 2 repository pattern.
- leave_types table / LeaveType model (Phase 2) — LeavePolicy.leaveTypeId is a foreign key to leave_types.id; the repository reads/writes this relationship. Phase 3 depends on the Phase 2 leave-type model and barrel being present and importable.
- leave-balance module (Phase 4) and leave-policy service (Phase 8) — downstream consumers — LeaveBalance.policyId will reference leave_policies.id, and LeavePolicyService will consume ILeavePolicyRepository to look up active policies and compute entitlements; this phase establishes the repository contract those later phases depend on.

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