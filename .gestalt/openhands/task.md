# Implement this phase: Phase 4: Policy module

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/63ff1071-5533-4487-9cf5-cd66e5b8b64e/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Build the policy module at `src/modules/policy/`. Create these files:

1. `src/modules/policy/policy.model.ts` — Define the `LeavePolicy` interface with the canonical fields: `id: string`, `policyName: string`, `leaveType: LeaveType`, `entitlementDays: number`, `accrualRate: number | null`, `maxAccumulation: number | null`, `minimumNoticeDays: number | null`, `requiresManagerApproval: boolean`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`. Import `LeaveType` from `src/shared/types/index.ts` (Phase 1).

2. `src/modules/policy/policy.repository.ts` — Define `ILeavePolicyRepository` interface with methods: `findById(id: string): Promise<LeavePolicy | null>`, `findAll(): Promise<LeavePolicy[]>`, `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `findActive(): Promise<LeavePolicy[]>`, `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`, `update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`, `delete(id: string): Promise<boolean>`.

3. `src/modules/policy/policy.service.interface.ts` — Define `ILeavePolicyService` interface with: `getById(id: string): Promise<LeavePolicy | null>`, `getAll(): Promise<LeavePolicy[]>`, `getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>`, `getActive(): Promise<LeavePolicy[]>`, `create(data: CreateLeavePolicyDto): Promise<LeavePolicy>`, `update(id: string, data: UpdateLeavePolicyDto): Promise<LeavePolicy | null>`, `deactivate(id: string): Promise<boolean>`. Also define `CreateLeavePolicyDto` and `UpdateLeavePolicyDto` here.

4. `src/modules/policy/policy.service.ts` — Implement `LeavePolicyService` class implementing `ILeavePolicyService`. Constructor-injected `ILeavePolicyRepository`. Keep logic minimal: validate, delegate, return.

5. `src/modules/policy/index.ts` — Barrel export of all public symbols.

This phase depends on `src/shared/types/index.ts` from Phase 1 for the `LeaveType` enum. No other module dependencies.

Include Jest unit tests in `tests/unit/modules/policy/` covering the service with a mock repository.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions — keep everything MINIMAL, uniform, and self-consistent: (1) Day counting = inclusive calendar days for ALL leave types: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar and do NOT vary counting by leave type. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, entitlement check, reporting). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no per-company/tenant/jurisdiction configuration. (3) Emergency leave ALWAYS requires manager approval, exactly like every other leave type — no auto-approval, no separate emergency policy flag, no special SLA. The policy requiresManagerApproval flag governs uniformly. (4) Balances are integers (full-day granularity only); remaining_days = total_entitlement - used_days exactly; if a fractional value ever arises, floor it. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Specifically: (a) inclusive or exclusive of the end date, and (b) calendar days or business/working days? The answer affects balance deduction arithmetic, minimum-notice calculations, and sufficiency checks everywhere.; Can an APPROVED leave request be cancelled after its startDate has already passed (or partially passed)? If so, how is the balance restoration calculated — full days, only remaining future days, or prorated?; How is the fiscal year defined for LeaveBalance? Is it calendar year (Jan 1 – Dec 31), a configurable company fiscal year (e.g. Apr 1 – Mar 31), or per-employee based on hire date anniversary?; How are leave days counted — calendar days or business/working days? The count affects both the balance decrement on approval and the validation that sufficient balance exists before submission.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `LeaveType` enum MUST be imported from `src/shared/types/index.ts` — the single authoritative definition from Phase 1. The policy module MUST NOT redefine or duplicate `LeaveType`. (see `src/shared/types/index.ts`)
- The `ValidationError` class in the policy service MUST follow the same pattern as `EmployeeService.ValidationError` and `AuditService.ValidationError`: extend `Error`, set `this.name = 'ValidationError'` in the constructor. (see `src/modules/employee/employee.service.ts`)
- Unit tests MUST follow the established naming convention: `tests/unit/modules/policy/policy.service.test.ts` (matching `employee.service.test.ts` and `audit.service.test.ts`). Tests MUST use `jest.Mocked<>` for the mock repository and follow the same structure: `makeMockRepo()` factory, `beforeEach` setup, and `describe`/`it` blocks per service method. (see `tests/unit/modules/employee/employee.service.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: A LeavePolicy has a lifecycle of ACTIVE ↔ INACTIVE, governed by the `isActive` boolean. The `deactivate` service operation transitions a policy from active to inactive; there is no explicit `activate` operation in this phase (reactivation is done via `update` setting `isActive: true`). A policy that is inactive MUST still be returned by `findById`, `findAll`, and `findByLeaveType` — only `findActive` filters to `isActive: true`.
- Reuse or extend `LeavePolicy`: `entitlementDays` MUST be a positive integer (> 0). `accrualRate`, `maxAccumulation`, and `minimumNoticeDays` are nullable — when non-null they MUST be non-negative numbers. `requiresManagerApproval` defaults to `true` when creating a policy if not explicitly provided.
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyService.create — No auth rule at this layer — the service interface is auth-agnostic. RBAC enforcement belongs in the controller/route layer (Phase 6).; Throws ValidationError for missing/invalid policyName, invalid leaveType, or non-positive entitlementDays. Returns the created LeavePolicy on success.
- ILeavePolicyService.update — No auth rule at this layer.; Returns `null` when the policy does not exist. Throws ValidationError if `entitlementDays` is updated to a non-positive value. Partial update — only supplied fields are changed.
- ILeavePolicyService.deactivate — No auth rule at this layer.; idempotent; Returns `true` when the policy exists and is active (transition performed) or already inactive (no-op). Returns `false` when the policy does not exist. Never throws.
### Integration points — connect to these
- src/shared/types/index.ts — The `LeavePolicy` model imports `LeaveType` enum from the shared types module (Phase 1). This is the policy module's sole external dependency.

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