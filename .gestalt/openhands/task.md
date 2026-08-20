# Implement this phase: Sub-phase 3/3: Unit Tests for Repositories & Service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/3350baf6-9bd5-4cac-b688-f263972317f9/4`. Do not clone anything; work only in this directory.

## What to build
employee.repository.spec.ts mocks pg Pool and tests all 6 repository methods
findAll test verifies soft-deleted rows are excluded
softDelete test verifies deletedAt is set to a timestamp
leave-policy.repository.spec.ts mocks pg Pool and tests all 5 CRUD methods
findAllActive test verifies is_active = true filter
leave-policy.service.spec.ts mocks ILeavePolicyRepository
getPolicyForLeaveType test verifies delegation to repo.findByLeaveType
validateEntitlement test covers both true (requestedDays <= entitlementDays) and false (requestedDays > entitlementDays) scenarios
All 3 spec files compile and run with Jest without errors

## Success criteria
Write all unit tests. Depends on all implementation files from sub-phases 1/3 and 2/3, plus the model interfaces from part 1/2 — read those files before generating any code.

Files to create:

1. `tests/unit/modules/employee/employee.repository.spec.ts` — Jest unit tests for PgEmployeeRepository. Mock the pg Pool. Test findById returns employee, findByEmployeeNumber, findAll excludes soft-deleted, create inserts, update modifies, softDelete sets deletedAt.

2. `tests/unit/modules/leave-policy/leave-policy.repository.spec.ts` — Jest unit tests for PgLeavePolicyRepository. Mock the pg Pool. Test all CRUD methods.

3. `tests/unit/modules/leave-policy/leave-policy.service.spec.ts` — Jest unit tests for LeavePolicyService. Mock ILeavePolicyRepository. Test getPolicyForLeaveType delegates correctly, validateEntitlement returns true/false based on entitlementDays vs requestedDays.

## Owned by SIBLING sub-phases (OUT OF SCOPE for this sub-phase)
This is ONE sub-phase of a split phase. The deliverables below belong to sibling sub-phases — do NOT create them here, do NOT list them as success criteria, and this sub-phase MUST NOT be gated on their presence (they are produced by a sibling, not missing):
- "Sub-phase 1/3: Employee & LeavePolicy Repositories": src/modules/employee/employee.repository.ts, src/modules/leave-policy/leave-policy.repository.ts
- "Sub-phase 2/3: LeavePolicy Service": src/modules/leave-policy/leave-policy.service.ts

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Calendar days inclusive: start_date through end_date, all days count toward used_days (weekends and public holidays included). end_date is inclusive. [BINDING RULE — operator decision resolving: How are leave days counted — are start_date and end_date inclusive, and do weekends/public holidays count toward the used-days total?; apply everywhere these apply, not in one place only]

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
    - employmentStatus: string
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- Employee repository tests must mock the pg Pool and verify that PgEmployeeRepository satisfies the IEmployeeRepository interface contract defined in src/modules/employee/employee.model.ts — every method signature (findById, findByEmployeeNumber, findAll, create, update, softDelete) must be tested. (see `src/modules/employee/employee.model.ts`)
- LeavePolicyService tests must mock ILeavePolicyRepository and verify that LeavePolicyService satisfies the ILeavePolicyService interface contract defined in src/modules/leave-policy/leave-policy.model.ts — both methods (getPolicyForLeaveType, validateEntitlement) must be tested. (see `src/modules/leave-policy/leave-policy.model.ts`)
- LeavePolicy repository tests must mock the pg Pool and verify that PgLeavePolicyRepository satisfies the ILeavePolicyRepository interface contract defined in src/modules/leave-policy/leave-policy.model.ts — every method signature (findById, findByLeaveType, findAllActive, create, update) must be tested. (see `src/modules/leave-policy/leave-policy.model.ts`)
- All test files must use the same Jest configuration and conventions as the project (per HARNESS.json stack.testFramework = Jest). Test file naming must follow the pattern <name>.spec.ts under tests/unit/modules/<module>/. (see `HARNESS.json`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: Soft-delete semantics: findAll() and findById() must exclude rows where deleted_at IS NOT NULL. The softDelete() method sets deleted_at = NOW() without physically removing the row.
- Reuse or extend `LeavePolicy`: findAllActive() returns only policies where is_active = true. findByLeaveType() returns at most one policy per leave type (the active one).
### Interface contract — expose these operations (their shape is yours)
- PgEmployeeRepository.findById — Returns Employee when row exists; returns null when no matching non-deleted row found. Must filter deleted_at IS NULL.
- PgEmployeeRepository.findAll — Returns array of Employee (empty array when no non-deleted rows). Must filter deleted_at IS NULL.
- PgEmployeeRepository.softDelete — idempotent; Sets deleted_at = NOW() for the given id. Returns void. Does not throw if the id does not exist — it is a no-op in that case.
- LeavePolicyService.validateEntitlement — Returns boolean. Returns false when no policy exists for the given leaveType. Returns false when requestedDays > policy.entitlementDays. Returns true when requestedDays <= policy.entitlementDays. Never throws.
- LeavePolicyService.getPolicyForLeaveType — Delegates to repository.findByLeaveType(leaveType). Returns the LeavePolicy or null. Never throws.
### Integration points — connect to these
- src/shared/db/connection.ts (pg Pool) — Repository tests must mock the pg Pool exported from this module. The mock must intercept pool.query() calls and return synthetic pg QueryResult objects with rows shaped as the repository's internal Row interfaces.
- src/modules/leave-policy/leave-policy.model.ts (ILeavePolicyRepository interface) — LeavePolicyService tests must mock ILeavePolicyRepository — the service's only constructor dependency. The mock must implement findByLeaveType to return synthetic LeavePolicy objects or null.

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