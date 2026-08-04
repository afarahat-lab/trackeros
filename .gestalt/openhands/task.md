# Implement this phase: Phase 1: Shared types and business-day utility

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/4fbbfee4-4feb-4a2b-8127-85025f82af24/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create `src/shared/types/index.ts` with all canonical enums and interfaces: LeaveType (annual, sick, emergency, unpaid, maternity, paternity), LeaveStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), EmploymentStatus (ACTIVE, INACTIVE, TERMINATED), AuditAction (CREATE, UPDATE, DELETE, APPROVE, REJECT), BaseEntity (id: string, created_at: Date, updated_at: Date), and AuthenticatedUser ({ id: string; role: 'employee'|'manager'|'hr_admin' }). Also create `src/shared/utils/business-days.ts` exporting `countBusinessDays(start: Date, end: Date, holidays: Date[]): number` — counts business days (Mon–Fri) excluding weekends and the supplied holiday dates, normalising all dates to UTC midnight for calendar-date comparison. Include Jest unit tests in `tests/unit/shared/business-days.test.ts`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). fiscalYear = the calendar year of the request start_date. Not tenant-configurable.

2. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, uniform across ALL leave types. One shared countBusinessDays function + a `holidays` table used by every call site (balance check, deduction, restoration). Whole days only. Compare dates by CALENDAR-DATE equality in UTC (normalize to UTC midnight; compare YYYY-MM-DD), never by raw timestamp.

3. Employee with no manager (managerId null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER, source of truth (O(1) reads). Deduct-on-submission: increment used_days atomically in the same transaction when a LeaveRequest is SUBMITTED. Restore-on-reject/cancel: decrement when REJECTED or CANCELLED. Approval does NOT change used_days again. Submission fails if it would drive remaining below zero.

5. remainingDays = COMPUTED/DERIVED, never stored: totalEntitlement - usedDays, at query time. No code writes remainingDays directly.

6. RBAC (GP-005): every endpoint enforces role-based access control (employee acts only on own requests; managers/HR admins on those they oversee). The authenticated identity/role comes from `request.user` = { id, role }, role ∈ 'employee'|'manager'|'hr_admin', populated by the application's EXISTING auth middleware — do NOT build/mock auth in this feature; the controller only CONSUMES request.user (401 if absent). Declare a concrete `AuthenticatedUser { id: string; role: 'employee'|'manager'|'hr_admin' }` TYPE (no runtime middleware). Validate all inputs at the API boundary (GP-003) before calling the service (400 on invalid). Do NOT add a role field to the Employee entity.

7. Service authorization: thread the actor's role INTO the service — approve(leaveRequestId, approverId, approverRole), reject(..., approverRole). The controller reads request.user, passes id + role; the service enforces (approver must be the employee's manager, or hr_admin when no manager, else throw ApproverNotAuthorizedError). Role is an explicit parameter, never ambient state inside the service.

8. Test files use the project's Jest convention — `*.test.ts` under `tests/` (matching the configured testMatch), NOT `.spec.ts`. Do not change the Jest config. [BINDING RULE — operator decision resolving: How is the fiscal year defined for leave balances — calendar year (Jan 1 – Dec 31), a configurable start month, or company-specific fiscal calendar?; How is totalEntitlement determined for an employee hired mid-year — full annual entitlement or pro-rated?; Who is authorised to cancel a LeaveRequest? Can a manager or HR admin cancel an approved leave on behalf of the employee?; Does emergency leave have special domain behaviour (e.g. bypassing minimum notice, auto-approval) or does it follow the same rules as other leave types governed by their LeavePolicy?; How should partial-day leave deductions be rounded?; How are leave days counted — calendar days or business/working days?; What is the fiscal-year boundary for leave balances?; How are leave requests spanning two fiscal years handled for balance deduction?; What are the valid values for LeaveBalance.status?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The shared-types module's owned symbols (LeaveType, LeaveStatus, EmploymentStatus, AuditAction, BaseEntity) must match exactly the names and value sets declared in the reconciled architecture's modules array — the shared-types module at path src/shared/types/ owns these five symbols. (see `.gestalt/architecture/reconciled.json`)
- The business-day counting rule must match the binding business rule: day counting = BUSINESS DAYS ONLY (Mon–Fri), excluding weekends AND public holidays, with calendar-date comparison via UTC-midnight normalization (never raw timestamp comparison). countBusinessDays is the single shared function every call site (balance check, deduction, restoration) must use. (see `.gestalt/architecture/reconciled.json`)
- The new shared utility and types modules must follow the same placement convention as the existing shared infrastructure: src/shared/db/connection.ts exports a bare named export (pool) with no barrel indirection — the new src/shared/types/index.ts and src/shared/utils/business-days.ts must use named exports consistent with this project's existing shared-module style. (see `src/shared/db/connection.ts`)
- Test file placement must match the configured testMatch glob ('**/tests/**/*.test.(ts|js)') and moduleDirectories (['node_modules', 'src']) — the business-days test at tests/unit/shared/business-days.test.ts must resolve imports via the src baseUrl so that 'shared/utils/business-days' style imports work without relative path drift. (see `jest.config.js`)
- All new source must compile under the existing tsconfig (strict: true, target ES2022, module commonjs, baseUrl ./src, rootDir ./src) — the shared types and utility must not require tsconfig changes and must not introduce any type that relies on permissive compiler defaults. (see `tsconfig.json`)
### Entity invariants — enforce these
- Reuse or extend `LeaveType`: The enum's value set is closed and exactly {annual, sick, emergency, unpaid, maternity, paternity} — no additional leave types may be added without an architecture change, since LeavePolicy.leaveType and leave request creation depend on this fixed set.
- Reuse or extend `LeaveStatus`: The enum's value set is closed and exactly {DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED} — these correspond to the binding LeaveRequest lifecycle (DRAFT → SUBMITTED → APPROVED/REJECTED; APPROVED → CANCELLED; SUBMITTED → CANCELLED) and must not be extended independently of that lifecycle.
- Reuse or extend `EmploymentStatus`: The enum's value set is closed and exactly {ACTIVE, INACTIVE, TERMINATED} — only ACTIVE employees may submit leave (binding business rule), so the ACTIVE value must be distinguishable and stable.
- Reuse or extend `AuditAction`: The enum's value set is closed and exactly {CREATE, UPDATE, DELETE, APPROVE, REJECT} — these map to the audit_logs.action column and the audit records written by every state-changing operation (GP-002); no other action values are permitted.
- Reuse or extend `AuthenticatedUser`: The role field is a closed union of exactly 'employee' | 'manager' | 'hr_admin' — these are the only three roles the system recognizes for RBAC (GP-005); the type must not accept any other string, and no role field is added to the Employee entity (binding decision).
- Reuse or extend `BaseEntity`: BaseEntity is a pure data shape (no owned behavior) used by more than one module, so it must reside under src/shared/types/ — not in a single-purpose module directory — per the shared value-type placement rule.
### Interface contract — expose these operations (their shape is yours)
- countBusinessDays(start: Date, end: Date, holidays: Date[]): number — N/A — pure function with no authentication; callable from any layer (shared utility); idempotent; Must not perform I/O or throw on valid date inputs; behavior on inverted ranges (start > end) is unspecified by the intent — see ambiguity. All date comparison is done after UTC-midnight normalization so timezone construction differences do not cause errors.
### Integration points — connect to these
- src/modules/employee/employee.model.ts (Phase 2) — Employee entity imports EmploymentStatus from src/shared/types/index.ts — the enum must be exported and stable before the employee module is built.
- src/modules/policy/policy.model.ts (Phase 3) — LeavePolicy entity imports LeaveType from src/shared/types/index.ts — the enum must be exported and stable before the policy module is built.
- src/modules/audit/audit.model.ts (Phase 5) — AuditRecord entity imports AuditAction from src/shared/types/index.ts — the enum must be exported and stable before the audit module is built.
- src/modules/leave/leave.service.ts (Phase 8) — LeaveService imports AuthenticatedUser from src/shared/types/index.ts and calls countBusinessDays from src/shared/utils/business-days.ts to compute business days for balance sufficiency checks and deduction — both must be exported and correct before the leave service is built.
- src/modules/leave/leave.controller.ts (Phase 9) — LeaveController consumes request.user typed as AuthenticatedUser from src/shared/types/index.ts — the type must be exported and match the { id: string; role: 'employee'|'manager'|'hr_admin' } shape the existing auth middleware populates.

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