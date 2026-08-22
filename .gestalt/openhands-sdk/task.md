# Fix specific quality-gate violations: Sub-phase 2: Audit module implementation and shared types update

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/da3cebcf-aae0-446c-b943-05fc4169a665/3/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `AuditRecord` entity shape (fields: `id`, `entityType`, `entityId`, `action`, `performedBy`, `changes`, `createdAt`) must match the definition in `src/modules/audit/audit.model.ts` — no fields added, removed, or renamed. (see `src/modules/audit/audit.model.ts`)
- The `AuditAction` enum used in `AuditRecord.action` must be imported from `src/shared/types/index.ts` — the same source used by all other modules. No local redefinition. (see `src/shared/types/index.ts`)
- The SQL INSERT in `AuditService.record()` must use the same column names and parameterized query pattern as the existing `AuditRepository.insert()`: `INSERT INTO audit_records (id, entity_type, entity_id, action, performed_by, changes, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING ...` with the same column-to-property aliasing (`entity_type AS "entityType"`, etc.). (see `src/modules/audit/audit.repository.ts`)
- The shared pool import must use the same path and named export as every other module: `import { pool } from '../../shared/db/connection'`. (see `src/shared/db/connection.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditRecord`: Every `AuditRecord` is immutable after creation — it has no update or delete operations. Its `id` is generated server-side (via `gen_random_uuid()` in SQL) and `createdAt` is set to the insertion timestamp (via `NOW()`).
### Interface contract — expose these operations (their shape is yours)
- IAuditService.record — No auth enforcement at this layer — the audit service is a cross-cutting utility called by other services that have already performed authorization. The caller is responsible for populating `performedBy` with the authenticated user's ID.; If the INSERT fails (e.g., constraint violation, connection error), the error propagates to the caller. The service does not swallow or transform database errors.
### Integration points — connect to these
- src/shared/db/connection.ts — AuditService uses the shared PostgreSQL pool for its INSERT — the same pool every other module uses.

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — binding for every phase of this feature.

Q1 and Q5 are THE SAME QUESTION. Bind ONE definition and use it everywhere.

1 & 5 — LEAVE DAY COUNT = CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. Weekends and public holidays are NOT excluded; there is
no holiday calendar in scope for this feature.
Implement this EXACTLY ONCE as a single shared exported helper (e.g. countLeaveDays(startDate, endDate))
in the leave domain module, and call that helper from EVERY site needing a day count:
balance deduction on APPROVED, balance restoration on CANCELLED, the sufficiency check
before approval, entitlement comparison, and minimumNoticeDays enforcement. No call site
may re-derive the count inline — inline re-derivation is the BR-001 anti-pattern this
question exists to prevent.

2 — NO overlapping APPROVED leave for the same employee. Enforce at APPROVAL time, not at
submission. A submission-time check cannot account for other PENDING requests approved
later, so approval is the only authoritative gate. Run the overlap check and the balance
sufficiency check at the SAME point in the approval path so both invariants hold together.
Overlap = any intersection of the [startDate, endDate] range with an existing APPROVED
request for that employee, regardless of leave type.

3 — EMERGENCY LEAVE HAS ITS OWN ENTITLEMENT POOL, separate from annual. Default entitlement
5 days, resets per fiscal year, same cadence as the other types. Model all types uniformly:
annual, sick and emergency each get their own LeavePolicy entitlement and their own
LeaveBalance record. Do not special-case emergency anywhere in the balance logic.

4 — NO documentation requirement for sick leave. Do NOT add a PENDING_DOCUMENTATION state
and do NOT add any document-tracking entity. The LeaveRequest lifecycle is exactly:
PENDING -> APPROVED | REJECTED, and PENDING | APPROVED -> CANCELLED. This is a deliberate
scope decision, not an oversight. [BINDING RULE — operator decision resolving: How is the number of leave days derived from startDate and endDate? Is the range inclusive of both start and end (days = endDate - startDate + 1), exclusive of end (days = endDate - startDate), or measured in business/calendar days? This affects balance deduction, sufficiency checks, and entitlement comparisons across every LeaveRequest operation.; Can an employee have multiple APPROVED LeaveRequests with overlapping date ranges? If not, should the overlap check be enforced at submission time or at approval time?; Does emergency leave draw from the annual leave balance, or does it have a separate entitlement pool? If separate, what is the default entitlement and does it reset per fiscal year or per incident?; Should sick leave require documentation (e.g., doctor's note) after a certain number of consecutive days? If so, what is the threshold and how is it enforced?; How are leave days counted for balance deduction — are start_date and end_date inclusive (i.e. `end_date - start_date + 1`), or exclusive? Are weekends and public holidays excluded from the day count?; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Remove all repository-related code and files (IAuditRepository, AuditRepository, audit.repository.interface.ts, audit.repository.ts). Modify AuditService to accept pool and use it directly to execute INSERT INTO audit_records, returning the created AuditRecord. Update barrel index.ts to export only AuditRecord, IAuditService, AuditService. Ensure shared/types/index.ts re-exports AuditAction.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/audit/index.ts
Offending code: `export { IAuditRepository } from './audit.repository.interface';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/index.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Barrel exports IAuditRepository, violating phase spec success criterion: "barrel exports exactly three symbols: AuditRecord, IAuditService, AuditService. It does NOT export IAuditRepository or AuditRepository." The spec constraint states "the audit module has NO repository."

- Site 2
File: src/modules/audit/index.ts
Offending code: `export { AuditRepository } from './audit.repository';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/index.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Barrel exports AuditRepository, violating phase spec success criterion: "barrel exports exactly three symbols: AuditRecord, IAuditService, AuditService. It does NOT export IAuditRepository or AuditRepository." The spec constraint states "the audit module has NO repository."

- Site 3
File: src/modules/audit/audit.service.ts
Offending code: `this.auditRepository = new AuditRepository();`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/audit.service.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] AuditService instantiates AuditRepository internally and delegates to it, violating the phase spec constraint: "the audit module has NO repository. AuditService takes pool directly and performs its own SQL." The spec success criterion requires AuditService.record() to "execute INSERT INTO audit_records via the shared pool" — not via a repository.

- Site 4
File: src/modules/audit/audit.service.ts
Offending code: `import { IAuditRepository } from './audit.repository.interface';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/audit.service.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] AuditService imports IAuditRepository, violating the phase spec constraint that AuditService must NOT depend on any module other than src/shared/db/connection.ts, ./audit.service.interface, ./audit.model, and ../../shared/types. The spec states the audit module has NO repository.

- Site 5
File: src/modules/audit/audit.service.ts
Offending code: `constructor(private readonly pool: Pool = sharedPool) {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/audit.service.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] AuditService constructor accepts `pool` but never uses it — `this.pool` is never referenced. The `record()` method delegates to `auditRepository.insert()` instead of executing SQL via the pool. This means the pool parameter is dead code, and the spec requirement that "AuditService.record() executes INSERT INTO audit_records via the shared pool" is not met.

- Site 6
File: src/modules/audit/audit.repository.interface.ts
Offending code: `import { PoolClient } from 'pg';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/audit.repository.interface.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] File `audit.repository.interface.ts` was created/modified in this phase, violating the phase spec outOfScope constraint: "Creation or modification of IAuditRepository, AuditRepository, or audit.repository.interface.ts / audit.repository.ts — these are artifacts of a prior design being replaced. The audit module must NOT use a repository."

- Site 7
File: src/modules/audit/audit.repository.ts
Offending code: `import { PoolClient } from 'pg';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/audit/audit.repository.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] File `audit.repository.ts` was created/modified in this phase, violating the phase spec outOfScope constraint: "Creation or modification of IAuditRepository, AuditRepository, or audit.repository.interface.ts / audit.repository.ts — these are artifacts of a prior design being replaced. The audit module must NOT use a repository."

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