# Implement this phase: Phase 1: Shared types — enums, DTOs, and base interfaces

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/35df38af-c9d7-41ee-b412-79ee8d149189/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create `src/shared/types/index.ts` with ALL of the following, using the EXACT names from the architecture's shared-types module:

- **LeaveType enum**: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
- **LeaveStatus enum** (named LeaveRequestStatus for clarity in code but exported as both): `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
- **EmploymentStatus enum**: `'ACTIVE' | 'INACTIVE' | 'TERMINATED'`
- **AuditAction enum**: `'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'`
- **BaseEntity interface**: `{ id: string; createdAt: Date; updatedAt: Date }`
- **CreateLeaveRequestDto**: `{ employeeId: string; policyId: string; startDate: Date; endDate: Date; reason?: string }`
- **UpdateLeaveRequestDto**: `{ startDate?: Date; endDate?: Date; reason?: string }`
- **LeaveRequestQueryParams**: `{ status?: LeaveStatus; policyId?: string; startDateFrom?: Date; startDateTo?: Date; endDateFrom?: Date; endDateTo?: Date; limit?: number; offset?: number }`
- **ValidationResult interface**: `{ isValid: boolean; errors: string[] }`

Also create `src/shared/types/` directory if it does not exist. Include Jest unit tests in `tests/unit/shared/types/` verifying enum values and DTO shapes.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (answers all 6 questions; apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2 & 5. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again (it was already deducted at submission). A submission must fail if it would drive remaining below zero.

6. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly. This eliminates drift. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a company-specific fiscal year (e.g., Apr 1 – Mar 31)?; Should the day-count calculation for leave consumption exclude weekends and/or public holidays (business days only), or count all calendar days?; When an employee has no manager (managerId is null), who approves their SUBMITTED LeaveRequest? Does it auto-approve, escalate to a department head, or require a different workflow?; How is `used_days` in `leave_balances` derived — is it a denormalized counter incremented atomically on leave approval, or is it computed on-the-fly by summing the day counts of all approved `leave_requests` for that employee/type/year?; Are leave day counts based on calendar days (inclusive start-to-end) or working/business days (excluding weekends and holidays)?; Should Balance.remainingDays be a stored column or a computed (derived) field?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The enum value sets and DTO field shapes must match the reconciled architecture's domain_entities and modules declarations exactly — LeaveType values are lowercase string literals, LeaveStatus/EmploymentStatus/AuditAction are uppercase string literals, and the shared-types module path is src/shared/types/ owning exactly the nine named symbols. The reconciled architecture is authoritative over the stale root ARCHITECTURE.md. (see `.gestalt/architecture/reconciled.json`)
- The DTO field shapes (CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams, BaseEntity, ValidationResult) must match the field-level definitions in PLAN.md Phase 1 so that later phases (2–10) which import these types compile against the exact shapes they were planned around — e.g. CreateLeaveRequestDto requires employeeId, policyId, startDate, endDate with optional reason; UpdateLeaveRequestDto makes all three optional. (see `PLAN.md`)
- The shared-types source must compile under the project's tsconfig (strict: true, baseUrl: ./src, module: commonjs, rootDir: ./src, include: ["src"]) — meaning the file lives under src/, uses no implicit any, and is importable via the baseUrl-relative path `shared/types`. (see `tsconfig.json`)
- Unit tests for the shared-types module must match the Jest config's testMatch glob (`**/tests/**/*.test.(ts|js)`) and use the ts-jest transform — test files must end in `.test.ts` and reside under tests/unit/shared/types/, not use the `.spec.ts` suffix. (see `jest.config.js`)
### Entity invariants — enforce these
- Reuse or extend `LeaveType`: The set of allowed leave-category values is closed and fixed at exactly six members (annual, sick, emergency, unpaid, maternity, paternity); no consumer may introduce a seventh value without extending this shared definition, and every LeavePolicy in later phases binds to exactly one of these values.
- Reuse or extend `LeaveRequestStatus (a.k.a. LeaveStatus)`: The leave-request lifecycle state space is exactly five states (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED); both exported names (LeaveRequestStatus and LeaveStatus) MUST resolve to the identical type so that no downstream consumer can observe a structural difference between them.
- Reuse or extend `EmploymentStatus`: The employment-status value set is closed at exactly three members (ACTIVE, INACTIVE, TERMINATED); this is the sole source of truth for employee employment state referenced by the leave-submission business rule (employee must be ACTIVE to submit).
- Reuse or extend `AuditAction`: The audit-action value set is closed at exactly five members (CREATE, UPDATE, DELETE, APPROVE, REJECT); every state-changing operation recorded by the audit module in a later phase must use one of these values — no ad-hoc action strings are permitted.
- Reuse or extend `BaseEntity`: BaseEntity is the structural contract every persisted domain entity extends — it carries identity (id: string) and temporal audit fields (createdAt, updatedAt); any entity that is persisted to PostgreSQL in later phases must be structurally compatible with this interface so repository create/update signatures can rely on it.
- Reuse or extend `ValidationResult`: ValidationResult is a pure result shape (isValid boolean + errors string array) with no validation logic owned here; when isValid is false the errors array must be non-empty, and when isValid is true the errors array must be empty — this invariant is a contract later validation functions must uphold.
### Interface contract — expose these operations (their shape is yours)
- The shared-types module must export all nine declared symbols (LeaveType, LeaveRequestStatus, LeaveStatus, EmploymentStatus, AuditAction, BaseEntity, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams, ValidationResult) from its public entry point so that every downstream module can import each symbol from the single declared module path `shared/types`. — A missing or misnamed export is a compile-time failure caught by tsc --noEmit; no runtime error semantics apply to a pure type module.
- Importing any shared type from a downstream module must go through the shared-types module's declared public entry point (its index/barrel), never from an internal file — per the architecture rule that modules import only through declared public entry points. — Importing from an internal path rather than the barrel is an architectural violation (CONSTRAINT_VIOLATION), not a runtime error.
### Integration points — connect to these
- All downstream domain modules (employee, policy, leave, balance, notification, audit) — Phases 2–10 — The shared-types module is the zero-dependency foundation every other module imports from; EmploymentStatus is consumed by the employee module, LeaveType by policy, LeaveStatus/CreateLeaveRequestDto/UpdateLeaveRequestDto/LeaveRequestQueryParams by leave, AuditAction by audit. This phase must complete and export correctly before any of those phases can compile.
- HARNESS.json verification pipeline (npm run build && npx jest --passWithNoTests) — The shared-types source is the first non-trivial src/ TypeScript the mechanical compile gate will typecheck; it must pass tsc --noEmit under strict mode and its tests must be discovered and pass under the configured Jest testMatch.

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