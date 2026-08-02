# Implement this phase: Phase 7: LeavePolicy service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/7`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the leave-policy service layer. This phase depends on `src/modules/leave-policy/leave-policy.model.ts` and `src/modules/leave-policy/leave-policy.repository.ts` from Phase 3 — read both before generating.

Files to create:

1. `src/modules/leave-policy/leave-policy.service.interface.ts` — Define and export `ILeavePolicyService` interface:
   - `getActivePolicy(leaveTypeId: string): Promise<LeavePolicy | null>`
   - `getPolicyById(id: string): Promise<LeavePolicy | null>`
   - `getAllPolicies(): Promise<LeavePolicy[]>`
   - `createPolicy(data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>`
   - `updatePolicy(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>`

2. `src/modules/leave-policy/leave-policy.service.ts` — Implement `LeavePolicyService` class implementing `ILeavePolicyService`. Inject `ILeavePolicyRepository` via constructor. Each method delegates to the repository. The `getActivePolicy` method filters for `isActive: true` and returns the first match.

3. Update `src/modules/leave-policy/index.ts` to also export the service interface and class.

Include Jest unit tests at `tests/unit/modules/leave-policy/leave-policy.service.spec.ts` with mocked repository.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. Validate all inputs at the API boundary (GP-003) before calling the service. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g., Apr 1 – Mar 31)?; Should leave day counting use calendar days or business days (excluding weekends and/or public holidays)?; Should the system support half-day leave requests?; Should leave balances be pre-seeded at the start of each fiscal year, or lazily initialized on first request?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; When does the fiscal year start, and should it be configurable per organization?; apply everywhere these apply, not in one place only]

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
- The ILeavePolicyService method signatures must align one-to-one with ILeavePolicyRepository: getActivePolicy→findActiveByLeaveTypeId(leaveTypeId): Promise<LeavePolicy | null>, getPolicyById→findById(id): Promise<LeavePolicy | null>, getAllPolicies→findAll(): Promise<LeavePolicy[]>, createPolicy→create(policy: Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'>): Promise<LeavePolicy>, updatePolicy→update(id, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>. The createPolicy input type must be exactly Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'> so it passes through to repo.create with no transformation. (see `src/modules/leave-policy/leave-policy.repository.ts`)
- The service interface and implementation must import and use the canonical LeavePolicy interface from leave-policy.model.ts (id, policyName, leaveTypeId, entitlementDays, accrualRate, maxAccumulation, minimumNoticeDays, requiresManagerApproval, isActive, createdAt, updatedAt) — no redefinition or drift of the entity shape. (see `src/modules/leave-policy/leave-policy.model.ts`)
- The barrel must continue to export the existing model and repository symbols (LeaveType, LeavePolicy, ILeavePolicyRepository, LeavePolicyRepository) and additionally export ILeavePolicyService and LeavePolicyService, matching the re-export pattern used by src/modules/status/index.ts and src/modules/uptime/index.ts (model, service interface, service class). (see `src/modules/leave-policy/index.ts`)
- The service interface file must follow the established convention: the interface file imports the model type and exports an I<Name>Service interface, and the implementation file imports the interface plus the model and declares a class that implements it — mirroring status.service.interface.ts / status.service.ts and uptime.service.interface.ts / uptime.service.ts. (see `src/modules/status/status.service.interface.ts`)
- The service spec must mirror the existing leave-policy.repository.spec.ts structure and location (tests/unit/modules/leave-policy/, .spec.ts extension, ts-jest preset) and use the same makeRow-style fixture pattern adapted for LeavePolicy objects, so the two leave-policy test files are stylistically consistent. (see `tests/unit/modules/leave-policy/leave-policy.repository.spec.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeavePolicy`: At most one active policy exists per leaveTypeId (ARCHITECTURE.md / reconciled.json key rule). The service's getActivePolicy must surface this constraint by returning a single active policy or null — it must never return an array or silently pick among multiple active rows; the repository's findActiveByLeaveTypeId (which filters WHERE is_active = true and returns the first row) is the authoritative source.
- Reuse or extend `LeavePolicy`: id, createdAt, and updatedAt are system-managed and never supplied by callers: createPolicy's input is Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'>, and updatePolicy must not allow callers to overwrite id or createdAt (the repository already strips read-only fields; the service must not re-introduce them).
- Reuse or extend `ILeavePolicyService`: The service contract is a pure delegation layer over ILeavePolicyRepository: each method maps one-to-one to a repository method with no additional persistence, no cross-module calls, and no business-rule side effects — it must remain substitutable by any ILeavePolicyRepository-backed implementation.
### Interface contract — expose these operations (their shape is yours)
- getActivePolicy(leaveTypeId: string): Promise<LeavePolicy | null> — No auth enforcement at the service layer (RBAC is deferred to the controller/middleware phase); the service performs no role checks.; idempotent; Read-only and idempotent; returns null when no active policy exists for the leave type; propagates repository errors unchanged without catching or wrapping.
- getPolicyById(id: string): Promise<LeavePolicy | null> — No auth enforcement at the service layer.; idempotent; Read-only and idempotent; returns null when no policy matches the id; propagates repository errors unchanged.
- getAllPolicies(): Promise<LeavePolicy[]> — No auth enforcement at the service layer.; idempotent; Read-only and idempotent; returns an empty array (never null) when no policies exist; propagates repository errors unchanged.
- createPolicy(data: Omit<LeavePolicy,'id'|'createdAt'|'updatedAt'>): Promise<LeavePolicy> — No auth enforcement at the service layer; GP-002 audit recording is deferred to orchestration phases, so this method does not itself write an audit record.; Not idempotent (each call persists a new row); propagates repository errors — including unique-constraint violations on (leave_type_id, is_active) — unchanged without catching or wrapping; returns the persisted LeavePolicy.
- updatePolicy(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> — No auth enforcement at the service layer; GP-002 audit recording is deferred to orchestration phases.; idempotent; Idempotent for no-op updates (returns the existing row when no mutable fields are supplied); returns null when no row matches the id (the null is propagated, not converted to a thrown error); propagates repository errors unchanged.
### Integration points — connect to these
- ILeavePolicyRepository (src/modules/leave-policy/leave-policy.repository.ts) — The service's sole dependency: constructor-injected and the only path to persistence. Every service method delegates to a repository method; the service has no other data source.
- src/modules/leave-policy/index.ts (module public entry point) — Downstream phases (Phase 9 LeaveBalanceService.initializeBalance looks up the active policy via ILeavePolicyService, and Phase 10 LeaveRequestService uses ILeavePolicyService) must import the service through the barrel, per the module-boundary import rule.
- Jest test runner (jest.config.js, ts-jest preset) — The new leave-policy.service.spec.ts must be discovered by the existing testMatch glob (**/tests/**/*.spec.(ts|js)) and compile under ts-jest with strict TypeScript.

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