# Fix specific quality-gate violations: Phase 6b — leave service + routes + public index

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/babd3932-368b-46a5-a4dc-6dccaafd84ba/7/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- UpdateLeaveRequestDto must extend the existing DTO in src/shared/types/index.ts (add approverId/decidedAt) rather than define a parallel type; the repository's UpdateField/FIELD_COLUMNS typing must remain keyed off UpdateLeaveRequestDto. (see `src/shared/types/index.ts`)
- FIELD_COLUMNS additions must map to the exact snake_case columns approver_id and decided_at already present in the COLUMNS constant and LeaveRequestRow/mapRow in leave.repository.ts, so update() and mapRow stay in sync. (see `src/modules/leave/leave.repository.ts`)
- The approve/reject transaction must continue to satisfy the reconciled transaction_contract: status change + approver_id/decided_at + balance counters + audit insert + notification insert all inside one IUnitOfWork.withTransaction, with the client forwarded to each participating call. (see `.gestalt/architecture/reconciled.json`)
- The LeaveRequest model's approverId/decidedAt nullability (string | null / Date | null) must remain unchanged; this phase only populates them, matching the canonical 12-field shape in leave.model.ts. (see `src/modules/leave/leave.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest in APPROVED or REJECTED state must have a non-null approverId (the deciding actor's id) and a non-null decidedAt timestamp; a DRAFT or SUBMITTED request keeps both null.
- Reuse or extend `LeaveRequest`: approverId must equal the authenticated deciding actor's id (never the requester, per the no-self-approval rule already enforced by assertCanDecide).
### Interface contract — expose these operations (their shape is yours)
- approve — MANAGER or ADMIN only; no self-approval; a MANAGER must be the requester's direct manager (unchanged — this phase does not alter authorization).; ConflictError on non-SUBMITTED status; ForbiddenError on unauthorized actor; NotFoundError on unknown request/balance — unchanged from current behavior.
- reject — MANAGER or ADMIN only; no self-rejection; a MANAGER must be the requester's direct manager (unchanged).; ConflictError on non-SUBMITTED status; ForbiddenError on unauthorized actor; NotFoundError on unknown request/balance — unchanged.
### Integration points — connect to these
- src/modules/leave/leave.repository.ts (PgLeaveRequestRepository.update + FIELD_COLUMNS) — The dynamic SET clause must be able to persist approver_id/decided_at; the service's update call depends on this mapping.
- src/shared/types/index.ts (UpdateLeaveRequestDto) — The DTO is the shared contract the service passes to repository.update; it must carry approverId/decidedAt for the decision write.
- src/modules/audit (AuditService.record) — afterState of the APPROVE/REJECT audit entry — The audit afterState must now reflect the populated approverId/decidedAt, closing the divergence noted in ARCHITECTURE.md.

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Notification` — the entity MUST have exactly these fields:
    - id
    - recipientId
    - type
    - title
    - message
    - relatedEntityType
    - relatedEntityId
    - status
    - createdAt
    - readAt

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — all 12 questions. Guiding principles: follow the EXISTING codebase convention where one exists; prefer the simplest rule that is consistent across every consumer; add no new runtime dependency unless required; treat DOMAIN.md as canonical for domain vocabulary.

1. DAY COUNT: Count ALL CALENDAR DAYS, inclusive. requestedDays = endDate - startDate + 1. Do NOT exclude weekends or public holidays. This single derivation is canonical and MUST be used identically by sufficiency checks, balance deduction, and policy max-duration enforcement — implement it ONCE as a shared helper and call it from every consumer; do not re-derive it per module.

2. ACCRUAL: Grant the FULL entitlement at the start of each accrual period. No pro-rata, no monthly installments. entitledDays is the policy's full allowance for the period regardless of how much of the period has elapsed.

3. CARRY FORWARD: Carry forward unused entitled days up to the fixed cap in carryForwardDays (a HARD CAP, not a fixed allowance). Days above the cap are forfeited. When a balance period is CLOSED, min(unused, carryForwardDays) rolls into the next OPEN period.

4. MIGRATIONS: Adopt knex migrations. knex is already in package.json — use it rather than adding a new tool. Create the knexfile and a migrations directory as part of the persistence work.

5. CONTROLLER LAYER: Routes call services DIRECTLY, matching the existing uptime module pattern. Do NOT introduce controller files for any new module. Consistency with the existing codebase wins, and it keeps per-phase file counts smaller.

6. NOTIFICATIONS: Keep notifications SYNCHRONOUS (direct insert). Do NOT add BullMQ. Do not defer notifications entirely — implement them synchronously inside the existing transaction boundary.

7. ENUM NAMING: Adopt the DOMAIN.md scheme as canonical. LeaveStatus = DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED. LeaveType = lowercase annual, sick, emergency, unpaid, maternity, paternity. These are the persisted string values in leave_requests.status and leave_policies.leave_type. Where root ARCHITECTURE.md disagrees, DOMAIN.md wins and ARCHITECTURE.md should be updated to match.

8. PERSISTENCE INFRASTRUCTURE: YES — create the concrete PgUnitOfWork implementation of IUnitOfWork, plus the shared base repository and shared error types, IN THIS persistence slice. Do NOT defer them to a separate shared-infrastructure phase and do not reference them by interface only. The approve/reject transaction contract (status change + balance update + audit + notification) cannot be implemented without a concrete withTransaction, so it must exist before any consumer phase. Follow the established convention: the SERVICE owns the unit of work, the DATA-ACCESS layer opens it.

9. DUPLICATE of question 4 — same decision: adopt knex migrations, create knexfile + migrations directory.

10. DUPLICATE/REFINEMENT of question 1 — same decision: INCLUSIVE, days = endDate - startDate + 1. No half-day handling: leave is whole-day only. Half-days are out of scope.

11. DUPLICATE of question 5 — same decision: routes call services directly, no controller layer, match the existing uptime pattern.

12. DUPLICATE of question 6 — same decision: do NOT add BullMQ to package.json; notifications are synchronous direct inserts. [BINDING RULE — operator decision resolving: Should the inclusive calendar-day count (requestedDays = endDate - startDate + 1) exclude weekends and/or public holidays, or count all calendar days?; Should leave balances accrue pro-rata over the accrual period, or be granted in full at the start of each period?; Should unused entitled days carry forward to the next accrual period, and if so up to what cap?; What migration mechanism should be established for PostgreSQL schema changes?; Should a controller layer be introduced for all new modules, or should routes call services directly?; Should BullMQ be added for notification fanout/accrual jobs, or keep notifications synchronous?; Which naming scheme is canonical for LeaveStatus and LeaveType enums: DOMAIN.md (DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED; annual/sick/emergency/unpaid/maternity/paternity) or root ARCHITECTURE.md (PENDING/APPROVED/REJECTED/CANCELLED; ANNUAL/SICK/MATERNITY/PATERNITY/UNPAID/OTHER)?; Should the persistence layer define the missing IUnitOfWork concrete implementation (PgUnitOfWork) and the shared base repository / error types, given none exist in the codebase?; What migration mechanism should be established, given no migrations or knexfile currently exist?; How should leave days be counted for a date range (inclusive vs exclusive end date, and half-day handling)?; Should a controller layer be introduced for new modules, or should routes call services directly (as the existing uptime module does)?; Should BullMQ be added to package.json before implementing notification fanout/accrual jobs?; apply everywhere these apply, not in one place only]

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
Before making the edits below, read the referenced files (those present in the working directory) to learn the project's architecture, conventions, and the cross-cutting rules your fix must still satisfy — then keep the edits consistent with them:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Add approverId and decidedAt to the leave update path (repository UpdateLeaveRequestDto and FIELD_COLUMNS) and set them in approve/reject transitions.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.service.ts
Line: 172
Offending code: `{ status: LeaveStatus.APPROVED },`
Rule violated: approve-reject-approver-fields
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 172 in place to fix the `approve-reject-approver-fields` violation.
What the quality gate found — apply this: [approve-reject-approver-fields] The spec success criteria and entity invariant require approve to transition status → APPROVED "with approverId/decidedAt". The service only sets `status`, omitting approverId and decidedAt, so the approval decision is not recorded with who/when. The same omission occurs in reject (line 233).

- Site 2
File: src/modules/leave/leave.service.ts
Line: 233
Offending code: `{ status: LeaveStatus.REJECTED },`
Rule violated: approve-reject-approver-fields
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 233 in place to fix the `approve-reject-approver-fields` violation.
What the quality gate found — apply this: [approve-reject-approver-fields] The spec success criteria and entity invariant require reject to transition status → REJECTED "with approverId/decidedAt". The service only sets `status`, omitting approverId and decidedAt, so the rejection decision is not recorded with who/when.

- Site 3
File: src/modules/leave/leave.service.ts
Line: 190
Offending code: `{ status: LeaveStatus.APPROVED },`
Rule violated: review/spec-compliance
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 190 in place to fix the `review/spec-compliance` violation.
What the quality gate found — apply this: [review/spec-compliance] Success criterion #4 requires approve to set "status → APPROVED (with approverId/decidedAt)", but the service only updates `status`. The approver identity and decision timestamp are never persisted, so `approverId`/`decidedAt` remain null after approval. The repository's `UpdateLeaveRequestDto` (startDate/endDate/reason/status only) and `FIELD_COLUMNS` map do not even support these fields, so the service cannot populate them.

- Site 4
File: src/modules/leave/leave.service.ts
Line: 235
Offending code: `{ status: LeaveStatus.REJECTED },`
Rule violated: review/spec-compliance
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 235 in place to fix the `review/spec-compliance` violation.
What the quality gate found — apply this: [review/spec-compliance] Success criterion #5 requires reject to set "status → REJECTED (with approverId/decidedAt)", but the service only updates `status`. The approver identity and decision timestamp are never persisted, so `approverId`/`decidedAt` remain null after rejection.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.