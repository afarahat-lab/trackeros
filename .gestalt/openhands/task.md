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
- The LeaveType enum values must match the controlled vocabulary declared in the reconciled architecture (annual, sick, emergency, unpaid, maternity, paternity) and the leave_types.code column casing. (see `.gestalt/architecture/reconciled.json`)
- The LeaveStatus enum must match the LeaveRequest lifecycle states declared in the reconciled architecture (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) and the leave_requests.status column casing. (see `.gestalt/architecture/reconciled.json`)
- The LeaveBalanceDTO.status union ('ACTIVE' | 'EXHAUSTED' | 'FROZEN') must match the LeaveBalance lifecycle declared in the reconciled architecture and the leave_balances.status column values. (see `.gestalt/architecture/reconciled.json`)
- The module boundary for shared-types (src/shared/types/) and its ownership of the three enums and two DTOs must match the Module Boundaries section of ARCHITECTURE.md; do not relocate or duplicate these symbols in another module. (see `docs/ARCHITECTURE.md`)
- The test file naming and location must follow the AGENTS.md convention (.test.ts under tests/ mirroring src/), not the .spec.ts path mentioned in PLAN.md's prose — the clarification and AGENTS.md override the plan's filename. (see `AGENTS.md`)
### Entity invariants — enforce these
- Reuse or extend `LeaveType enum`: The enum is a closed controlled vocabulary of exactly six leave categories; no member may be added or removed without an architecture change. Values are lowercase to match the leave_types.code database column.
- Reuse or extend `LeaveStatus enum`: The enum enumerates the complete LeaveRequest lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED | CANCELLED), with DRAFT → CANCELLED also permitted. APPROVED, REJECTED, and CANCELLED are terminal states. No intermediate status may exist outside this set.
- Reuse or extend `AuditAction enum`: The enum covers every state-changing action that must produce an audit record per GP-002: request lifecycle transitions (CREATED, SUBMITTED, APPROVED, REJECTED, CANCELLED) plus balance mutations (BALANCE_DEDUCTED, BALANCE_RESTORED). No state-changing operation may use an action outside this set.
- Reuse or extend `LeaveRequestDTO`: The status field is constrained to the LeaveStatus enum (not a free string), so every DTO instance can only carry a valid lifecycle state; the DTO is a transport shape with ISO-string dates, distinct from the Date-typed LeaveRequest domain entity.
- Reuse or extend `LeaveBalanceDTO`: The status field is constrained to the literal union 'ACTIVE' | 'EXHAUSTED' | 'FROZEN', matching the LeaveBalance lifecycle; the DTO is a transport shape with ISO-string dates, distinct from the Date-typed LeaveBalance domain entity.
### Interface contract — expose these operations (their shape is yours)
- Import all shared-types symbols from the barrel entry point src/shared/types/index.ts — N/A — pure type module, no auth surface.; idempotent; A missing or misnamed export must surface as a TypeScript compile error at the import site, not a runtime failure.
- Use LeaveStatus as the type of LeaveRequestDTO.status (DTO references the enum, not a duplicate string literal) — N/A; idempotent; Assigning a status outside the LeaveStatus set must be a compile-time type error.
- Run the enums unit test via the configured Jest runner (npx jest) — N/A — no auth in unit tests.; idempotent; A missing enum member or wrong casing must fail the test with a clear assertion message; the test must not pass silently on an incomplete enum.
### Integration points — connect to these
- leave-request module (later phase) — Imports LeaveStatus and LeaveRequestDTO from src/shared/types/index.ts to type the request lifecycle and transport shape.
- leave-balance module (later phase) — Imports LeaveType and LeaveBalanceDTO from src/shared/types/index.ts to type balance scoping and transport shape.
- audit module (later phase) — Imports AuditAction from src/shared/types/index.ts to type audit record actions per GP-002.
- employee, leave-policy, notification modules (later phases) — All depend on shared-types per the reconciled dependency map; they import enums/DTOs exclusively through the barrel index.ts.

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