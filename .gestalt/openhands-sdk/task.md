# Fix specific quality-gate violations: Phase 2 — Leaf modules: employee, policy, audit (part 2/3)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/b07feb33-7931-41ca-b4f7-c3dc02411147/3/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- Participating methods must follow the AGENTS.md §5 rule: reuse an already-supplied client and never open a second transaction; the canonical `await this.auditService.record(entry, client);` call shape must remain valid. (see `AGENTS.md`)
- The withTransaction contract and its single BEGIN/COMMIT/ROLLBACK implementation must remain unchanged and be the only transaction-control source. (see `src/shared/db/unit-of-work.impl.ts`)
- Repository method signatures (optional client last, pool fallback) must remain as-is so the refactored service call sites continue to compile against them. (see `src/modules/audit/audit.repository.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditLog`: record always persists exactly one AuditLog row with generated id/createdAt/updatedAt; the transaction fix must not change the persisted contents or the single-row guarantee.
- Reuse or extend `Employee`: terminate/reactivate enforce the ACTIVE/INACTIVE/TERMINATED lifecycle and throw InvalidEmployeeTransitionError on illegal transitions; the refactor must not weaken or bypass these guards.
- Reuse or extend `LeavePolicy`: activate/deactivate toggle isActive and return null when the policy is not found; this behavior is unchanged by the transaction fix.
### Interface contract — expose these operations (their shape is yours)
- AuditService.record — Errors from the repository propagate unchanged; no new error types introduced.
- EmployeeService.terminate / reactivate — Illegal transitions throw InvalidEmployeeTransitionError; not-found returns null.
- PolicyService.activate / deactivate — Not-found returns null; no error on a valid toggle.
### Integration points — connect to these
- src/shared/db/unit-of-work.ts (IUnitOfWork) — Services depend on withTransaction to open the unit of work when no client is supplied.
- src/modules/audit/audit.repository.ts, src/modules/employee/employee.repository.ts, src/modules/policy/policy.repository.ts — Repositories accept the optional client as the last parameter and fall back to the shared pool; the refactored services pass the resolved client through.

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
    - employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — binding for every phase of this feature.

FIRST, THE AUTHORITY RULE (this settles questions 4-7):
THE DISK IS THE TRUTH. Where PLAN.md, docs/DOMAIN.md or docs/ARCHITECTURE.md disagree with
what actually exists under src/, the code on disk wins and the documents are stale. Those
documents accumulated from earlier runs whose code never merged. Do NOT "reconcile" them by
writing code to match a document, and do NOT skip work because a document says it is done.

4 — PLAN.md's [deployed] markers on phases 1-6 are STALE. Verified: PLAN.md marks six phases
deployed, and NONE of src/modules/{leave,balance,employee,policy,notification,audit} exists —
only src/modules/status, src/modules/uptime and src/shared/db are present. Treat all six as
NOT BUILT and build them. Do not trust a [deployed] marker as evidence that anything exists;
check the filesystem. Do not edit PLAN.md to fix this — the platform owns that file.

5 — LeaveBalance is canonical. Delete/ignore the "Balance" definition in docs/DOMAIN.md as a
near-duplicate. One entity, named LeaveBalance, with the three integer counters below.

6 — LeaveRequestStatus is canonical. Ignore "LeaveStatus". The type is named for the entity it
belongs to, consistent with LeaveRequest.

7 — AuditLog is canonical for the ENTITY, and its persisted table is audit_logs.
"Audit" and "AuditRecord" are duplicates — ignore them. "AuditServiceInterface" is not an
entity at all; it is the service contract and keeps that name.
NAMING CONVENTION, binding everywhere: TypeScript identifiers are camelCase, database columns
are snake_case, and the repository is the ONLY layer that maps between them. No snake_case in
TypeScript field names; no camelCase in SQL.

3 — src/shared/types/ contains ONLY types used by TWO OR MORE modules: the cross-module enums
(LeaveType, LeaveRequestStatus, UserRole, AuditAction) and any DTO/contract shape genuinely
shared across module boundaries. A type used by exactly one module lives IN that module.
src/shared/types is not a dumping ground for every interface — if you cannot name the second
consumer, it does not belong there.

1 & 8 — WHOLE DAYS ONLY, CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. No half-day or partial-day granularity: no fractional field, no
AM/PM period, no rounding rules — every day counter is an INTEGER, so there is nothing to round.
Do NOT exclude weekends. Do NOT exclude public holidays. There is no holiday calendar in scope.
Implement the count EXACTLY ONCE as a shared exported helper (e.g. countLeaveDays(start, end))
and call it from every site that needs a day count. No call site may re-derive it inline.

2 — remaining/available days is DERIVED, never stored, and MAY go negative:
    availableDays = entitlementDays - usedDays - pendingDays
If a data correction or a policy change lowers entitlementDays below what is already used, the
derived value goes negative and that is CORRECT — it says the employee is over-drawn, which is
information the business needs. Do NOT clamp it to zero: clamping hides the overdraw and makes
the number lie. Consequences of a negative balance follow automatically and need no special
case: the approval sufficiency check is `n <= availableDays`, which simply fails, so no new
leave can be approved until the balance recovers.
Separately, and unchanged: the three stored counters are NON-NEGATIVE. A transition that would
take usedDays or pendingDays below zero is an ERROR, not a clamp. Lowering entitlementDays is
allowed even when it makes availableDays negative — it is a correction, not a transition.

STANDING DECISIONS carried forward (unchanged):
- Separate balance per leave type: annual, sick and emergency each get their own LeavePolicy
  entitlement and their own LeaveBalance. Emergency does not draw from annual (default 5 days).
  All types use the same approval lifecycle: PENDING -> APPROVED | REJECTED, and
  PENDING | APPROVED -> CANCELLED. No documentation requirement for sick leave.
- Leave year = CALENDAR year (1 Jan - 31 Dec). No carry-over, no accrual, no proration. A
  request crossing 31 December is charged IN FULL to its startDate's year, never split.
- No overlapping APPROVED leave per employee, enforced at APPROVAL time alongside the
  sufficiency check, regardless of leave type.
- Transactions: the SERVICE owns the unit of work; the DATA-ACCESS layer opens it via an
  injected IUnitOfWork.withTransaction(fn). Services never touch the pool. Participating
  methods take the client as an optional LAST parameter. See AGENTS.md Architecture rules 5. [BINDING RULE — operator decision resolving: Does leave duration support partial/half-day granularity, or only whole inclusive calendar days?; How should remaining_days be bounded if used_days exceeds entitlement due to data correction or policy change?; What exact contents should src/shared/types/ contain beyond the cross-module enums?; How should the PLAN.md drift be reconciled — phases 1-6 are marked [deployed] but none of the leave/balance/employee/policy/notification/audit files exist on disk?; Which balance entity is canonical: Balance or LeaveBalance (near-duplicate definitions in docs/DOMAIN.md)?; Is LeaveRequest.status typed as LeaveRequestStatus or LeaveStatus?; Which audit entity shape and field naming convention is canonical among Audit, AuditLog, AuditRecord, and AuditServiceInterface (camelCase vs snake_case)?; How are leave days counted (inclusive vs exclusive of end date) and rounded for partial days?; How is remaining_days bounded (floor at zero vs allow negative) when used_days exceeds entitlement?; Which LeaveStatus enum values are authoritative — DOMAIN.md (DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED) or root ARCHITECTURE.md (PENDING/APPROVED/REJECTED/CANCELLED)?; What exact contents should src/shared/types/ contain beyond leave.types.ts (e.g. index.ts barrel, other shared DTOs)?; apply everywhere these apply, not in one place only]

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

### Edit 1
File: src/modules/audit/audit.service.ts
Line: 17
Offending code: `const db = client ?? tx;`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/audit.service.ts` at line 17 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `record` method always opens a transaction via `this.uow.withTransaction`, but when a `client` is passed (to join a caller's transaction) it writes to that outer `client` instead of the `tx` the unit-of-work just opened. The result is an empty BEGIN/COMMIT on a freshly acquired connection while the actual INSERT runs on the caller's connection, outside the withTransaction boundary. This is a broken hybrid of the two clean options the spec's ambiguity offered (single-step write joining via client, OR always self-wrapping). It wastes a pool connection per call and, once the leave orchestration composes this inside its own transaction, can deadlock under pool exhaustion (the inner `pool.connect()` blocks while the outer transaction holds the last connection). The same `client ?? tx` pattern appears in EmployeeService.update/terminate/reactivate and PolicyService.update/activate/deactivate.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.