# Implement this phase: Phase 1: Shared types and enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e207b7c2-5967-4897-aeeb-2fac2e370ce3/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the shared-types module at src/shared/types/. Produce three files:

1. `src/shared/types/enums.ts` — Define and export:
   - `LeaveType` enum: `annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`
   - `LeaveStatus` enum: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
   - `AuditAction` enum: `CREATED`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`, `BALANCE_DEDUCTED`, `BALANCE_RESTORED`

2. `src/shared/types/dtos.ts` — Define and export:
   - `LeaveRequestDTO`: `{ id: string; employeeId: string; leaveTypeId: string; startDate: string; endDate: string; reason?: string; rejectionReason?: string; status: LeaveStatus; approvedBy: string | null; approvedAt: string | null; cancelledAt: string | null; createdAt: string; updatedAt: string }`
   - `LeaveBalanceDTO`: `{ id: string; employeeId: string; leaveTypeId: string; policyId: string; totalEntitlement: number; usedDays: number; pendingDays: number; remainingDays: number; fiscalYear: number; status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN'; createdAt: string; updatedAt: string }`

3. `src/shared/types/index.ts` — barrel re-export of all symbols from enums.ts and dtos.ts.

Include a Jest unit test at `tests/unit/shared/types/enums.spec.ts` verifying all enum values are present. No external dependencies — this phase stands alone.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again. A submission must fail if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control — an employee may act only on their own requests; managers/HR admins on those they oversee. Validate all inputs at the API boundary (GP-003) before calling the service. [BINDING RULE — operator decision resolving: What is the fiscal year definition — calendar year (Jan 1 – Dec 31) or a custom fiscal year (e.g., Apr 1 – Mar 31)?; Should leave day counting use calendar days or business days (excluding weekends and/or public holidays)?; Should the system support half-day leave requests?; Should leave balances be pre-seeded at the start of each fiscal year, or lazily initialized on first request?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; When does the fiscal year start, and should it be configurable per organization?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveType enum member values must match the controlled vocabulary listed in the reconciled architecture's LeaveType entity description and the leave_types.code column: annual, sick, emergency, unpaid, maternity, paternity. (see `.gestalt/architecture/reconciled.json`)
- The LeaveStatus enum members must match the LeaveRequest lifecycle states documented in the architecture: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, corresponding to the leave_requests.status column values. (see `docs/ARCHITECTURE.md`)
- The LeaveBalanceDTO.status string literal union ('ACTIVE' | 'EXHAUSTED' | 'FROZEN') must match the LeaveBalance lifecycle states documented in the architecture, which are distinct from LeaveStatus values. (see `docs/ARCHITECTURE.md`)
- The DTO field shapes must match the reconciled architecture's domain entity attribute lists, with the type adaptation that DTOs use string for dates (ISO serialization) where entities use Date, and LeaveBalanceDTO.status uses a string literal union rather than an enum. (see `.gestalt/architecture/reconciled.json`)
- The module path src/shared/types/ and its ownership of LeaveType, LeaveStatus, AuditAction enums and LeaveRequestDTO, LeaveBalanceDTO must match the shared-types module boundary declared in the reconciled architecture's modules list. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveType enum`: The set of members is closed and exhaustive: exactly annual, sick, emergency, unpaid, maternity, paternity. No additional members may be added without updating the reconciled architecture and all downstream consumers. Member values must be lowercase strings matching the leave_types.code column values.
- Reuse or extend `LeaveStatus enum`: The set of members is closed: exactly DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. These correspond to the LeaveRequest lifecycle states (DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED). Member values must be uppercase strings matching the leave_requests.status column values.
- Reuse or extend `AuditAction enum`: The set of members is closed: exactly CREATED, SUBMITTED, APPROVED, REJECTED, CANCELLED, BALANCE_DEDUCTED, BALANCE_RESTORED. These are the only valid values for the audit_logs.action column. Member values must be uppercase strings.
- Reuse or extend `LeaveRequestDTO`: The status field must be typed as the LeaveStatus enum (not a bare string), ensuring compile-time exhaustiveness against the controlled vocabulary. Date fields (startDate, endDate, createdAt, updatedAt) are string (ISO-serialized), distinct from the LeaveRequest entity which uses Date. Nullable fields (approvedBy, approvedAt, cancelledAt) are string | null, not string | undefined.
- Reuse or extend `LeaveBalanceDTO`: The status field must be typed as the string literal union 'ACTIVE' | 'EXHAUSTED' | 'FROZEN' — NOT the LeaveStatus enum — because balance status is a distinct vocabulary from request status. Numeric fields (totalEntitlement, usedDays, pendingDays, remainingDays, fiscalYear) are number, not string. Date fields are string (ISO-serialized).
### Interface contract — expose these operations (their shape is yours)
- Barrel re-export from src/shared/types/index.ts — the module's public entry point per the architecture rule that modules import only through their declared index.ts — N/A — this is a pure type/enum module with no runtime operations or auth surface; idempotent; No runtime errors; import failures surface as TypeScript compile errors only. A missing or misnamed export causes a compile-time error, not a runtime exception.
### Integration points — connect to these
- All downstream domain modules (audit, employee, leave-policy, leave-balance, leave-request, notification) import LeaveType, LeaveStatus, AuditAction, LeaveRequestDTO, and LeaveBalanceDTO from src/shared/types/index.ts as their sole source of these controlled vocabularies and DTO shapes. — The reconciled architecture's dependency map shows every domain module depends on shared-types. This phase establishes the canonical types that all later phases (2–10) import; any divergence here propagates errors downstream.
- Jest test runner configuration (jest.config.js testMatch) — the enums test must be placed and named to be discovered. — The verification gate runs npx jest --passWithNoTests; a .spec.ts file or a file outside tests/ would not be discovered by testMatch '**/tests/**/*.test.(ts|js)', causing the test to silently not run and potentially masking regressions.

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