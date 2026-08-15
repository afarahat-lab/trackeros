# Implement this phase: Phase 3: LeavePolicy model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/cb89b522-6bc0-439f-8a0d-f905145254ee/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeavePolicy domain model and repository at the exact paths declared by the architecture's Module Boundaries for the policy module (`src/modules/policy/`).

Files to create:
- `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with the canonical fields: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/leave-type.enum.ts`.
- `src/modules/policy/policy.repository.ts` — Define `IPolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>`, `findAllActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`. Implement `PolicyRepository` class using the existing `pool` from `src/shared/db/connection.ts`.
- `src/modules/policy/index.ts` — Barrel export.

This phase depends on `src/shared/types/index.ts` from Phase 1 (read it before generating). Also depends on `src/shared/db/connection.ts` (existing).

Include Jest unit tests in `tests/unit/modules/policy/`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Business policy answers (scoped to what the codebase provisions — do NOT introduce new unplanned data sources):

1/5. Fiscal (leave) year: CALENDAR YEAR (Jan 1 to Dec 31), organisation-wide, keyed off the leave start_date. Not April, not a configurable period, not an employee anniversary.

2/7. Accrual: ANNUAL LUMP-SUM granted UPFRONT at the start of the fiscal year (Jan 1). accrualRate = the annual entitlement (whole days) allocated in full on Jan 1 — NOT monthly, daily, or continuous accrual. Mid-year hires: pro-rate the first year by the whole months remaining from the hire date (rounded down).

3. Carry-over + maxAccumulation: USE-IT-OR-LOSE-IT — no carry-over of unused days across fiscal years. maxAccumulation is a cap on the TOTAL balance (a safety ceiling); since there is no carry-over, the balance never exceeds the annual entitlement, so maxAccumulation simply bounds it.

4. Day counting: WEEKDAYS ONLY — count Monday through Friday, exclude Saturday and Sunday. Do NOT exclude public holidays: there is NO holiday table/repository/provider in scope and you must NOT introduce one. Both start_date and end_date are INCLUSIVE. WHOLE DAYS ONLY (no half-days). Keep this as a self-contained pure date helper with no external dependency.

6. Negative balance: NO — never allow the balance to go negative. Reject a leave request whose business-day count exceeds the employees remaining available balance (available = entitled - (used + pending)). Return a validation error.

Cross-cutting rules:
- Deduct on APPROVAL: on submission hold the days as PENDING (reservation); on approval move pending to used; on reject or cancel release the reservation.
- Prevent overlapping requests (reject a new SUBMITTED/APPROVED request overlapping an existing SUBMITTED/APPROVED one for the same employee).
- Emergency leave is a SEPARATE pool (distinct from annual/sick), bypasses the advance-notice requirement but still requires approval and deducts from its own balance.
- Employee data (managerId, employmentStatus, hireDate) comes from an injected IEmployeeRepository (same repository-interface pattern as other modules); the JWT provides ONLY the caller identity + role for RBAC. Approvals route to the target employee managerId; if null, escalate to HR (role hr_admin). Managers act only on direct reports.
- Every endpoint enforces RBAC + input validation. Balances auto-created for all leave types on employee creation. Only ACTIVE employees may submit. [BINDING RULE — operator decision resolving: What is the fiscal year start date? The LeaveBalance.fiscalYear field needs a concrete definition — e.g. does the fiscal year start on January 1, April 1, or a configurable date per organisation?; How does leave entitlement accrue over the fiscal year? The LeavePolicy.accrualRate field exists but its semantics are undefined — is it a monthly rate, a daily rate, or a lump sum at the start of the year?; What is the carry-over rule for unused leave at fiscal year end? LeavePolicy.maxAccumulation exists but its exact semantics (cap on carry-over? cap on total balance?) are not defined.; How are leave days counted from start_date and end_date? Are both dates inclusive? Are weekends and/or public holidays excluded from the count?; What defines the fiscal_year boundary for leave balances? Is it a calendar year, a company-configured fiscal year, or an employee-specific anniversary year?; Should leave balance be allowed to go negative when an employee submits a request exceeding their remaining balance?; How are leave balances accrued — annual lump-sum reset, monthly pro-rata, or continuous accrual?; apply everywhere these apply, not in one place only]

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveType: LeaveType
    - entitlementDays: number
    - accrualRate: number | null
    - maxAccumulation: number | null
    - minimumNoticeDays: number | null
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `LeavePolicy` model must import `LeaveType` from the exact path `../../shared/types/leave-type.enum` (or the equivalent barrel path `../../shared/types`), matching the import style used by the reconciled architecture's dependency map: `policy → shared-types`. (see `src/shared/types/leave-type.enum.ts`)
- The `update` method must follow the same dynamic-field-build pattern as `EmployeeRepository.update`: iterate a `fieldMap` of `{ key, column }` pairs, build `SET` clauses only for keys present in `data`, append `updated_at = NOW()`, and return the existing record unchanged when no updatable fields are present. (see `src/modules/employee/employee.repository.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A `LeavePolicy` has exactly one `leaveType` from the `LeaveType` union. The `leaveType` field is immutable after creation — it cannot be changed via `update`.
- Reuse or extend `LeavePolicy`: `entitlementDays` must be a positive integer. `accrualRate`, `maxAccumulation`, and `minimumNoticeDays` are nullable but when non-null must be non-negative numbers.
- Reuse or extend `LeavePolicy`: `isActive` governs whether the policy is available for new leave requests. Inactive policies (`isActive: false`) are excluded from `findAllActive` and `findByLeaveType` results.
### Interface contract — expose these operations (their shape is yours)
- IPolicyRepository.findById — idempotent; Returns `null` when no row matches — does not throw.
- IPolicyRepository.findByLeaveType — idempotent; Returns the single active policy for the given `LeaveType`, or `null` if none exists. Filters to `is_active = true`.
- IPolicyRepository.findAllActive — idempotent; Returns all policies where `is_active = true`, ordered by `policy_name`. Returns empty array when none exist — never null.
- IPolicyRepository.create — Accepts `Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>`. The database assigns `id` (UUID), `created_at`, and `updated_at`. Returns the fully populated `LeavePolicy`. Throws on constraint violations (e.g., duplicate `leave_type` + `is_active`).
- IPolicyRepository.update — Accepts `id` and `Partial<LeavePolicy>`. Returns the updated `LeavePolicy` on success, `null` if the policy does not exist. The `leaveType` field is excluded from the updatable field map — it is immutable after creation. Returns the existing policy unchanged when `data` contains no updatable fields.
### Integration points — connect to these
- src/shared/types/leave-type.enum.ts — `LeavePolicy.leaveType` is typed as `LeaveType` from this module. The policy module depends on shared-types per the reconciled architecture dependency map.
- src/shared/db/connection.ts — `PolicyRepository` imports the shared `pool` as its default database connection, matching the pattern in `EmployeeRepository`.

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