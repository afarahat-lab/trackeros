# Implement this phase: Phase 1 — Shared types & Audit foundation

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/5718a840-0b03-4112-91da-8c645c2fae86/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the foundational shared types and the audit module. This phase has no prior dependencies.

**Files to create (approximately 6):**

1. `src/shared/types/index.ts` — Define and export all shared enums and the BaseEntity interface:
   - `LeaveRequestStatus` enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
   - `LeaveType` enum: annual, sick, emergency, unpaid, maternity, paternity
   - `BalanceStatus` enum: ACTIVE, EXHAUSTED, CLOSED
   - `EmploymentStatus` enum: ACTIVE, INACTIVE, TERMINATED
   - `BaseEntity` interface: { id: string; createdAt: Date; updatedAt: Date }

2. `src/modules/audit/audit.model.ts` — Define the `AuditRecord` entity with the exact canonical fields: id: string, entityType: string, entityId: string, action: string, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, performedBy: string, performedAt: Date, ipAddress: string | undefined, userAgent: string | undefined, createdAt: Date. Import BaseEntity from `src/shared/types/index.ts`.

3. `src/modules/audit/audit.repository.interface.ts` — Define `IAuditRepository` interface with methods: `create(record: AuditRecord): Promise<AuditRecord>`, `findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>`. Import AuditRecord from `./audit.model`.

4. `src/modules/audit/audit.service.interface.ts` — Define `IAuditService` interface with method: `record(params: { entityType: string; entityId: string; action: string; oldValues?: Record<string, unknown> | null; newValues?: Record<string, unknown> | null; performedBy: string; ipAddress?: string; userAgent?: string }): Promise<AuditRecord>`.

5. `src/modules/audit/audit.service.ts` — Implement `AuditService` class implementing `IAuditService`. Constructor receives `IAuditRepository` (dependency injection). The `record` method constructs an AuditRecord (generating id with crypto.randomUUID(), setting performedAt to new Date(), createdAt to new Date()) and delegates to the repository's create method.

6. `src/modules/audit/index.ts` — Barrel export re-exporting AuditRecord, IAuditRepository, IAuditService, AuditService.

Include Jest unit tests in `tests/unit/modules/audit/audit.service.test.ts` — mock IAuditRepository, verify record() constructs the record correctly and calls repository.create.

The existing `src/shared/db/connection.ts` exports a pg Pool — the repository interface is defined here but the concrete Knex/Postgres repository implementation is deferred to a later phase.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision for all questions — keep everything MINIMAL, uniform, and self-consistent: (1 & 4) Day counting = inclusive calendar days for ALL leave types: daysRequested = (endDate - startDate) + 1. Weekends and public holidays ARE counted; do NOT introduce a holiday calendar and do NOT vary counting by leave type. This single formula is BINDING at every call site (balance deduction, sufficiency check, overlap detection, entitlement check, reporting). (2) Fiscal year = calendar year (Jan 1 to Dec 31), hardcoded — no per-company/tenant/jurisdiction configuration. (3) Emergency leave ALWAYS requires manager approval, exactly like every other leave type — no auto-approval, no separate emergency policy flag, no special SLA. The policy requiresManagerApproval flag governs uniformly. Balances are integers (full-day granularity only); remaining_days = total_entitlement - used_days exactly. [BINDING RULE — operator decision resolving: Should leave day counting use calendar days (inclusive: endDate - startDate + 1) or working/business days (excluding weekends and/or public holidays)?; What is the fiscal year boundary? (e.g. calendar year Jan 1–Dec 31, or April 6–April 5 for UK tax year, or company-specific); Should emergency leave bypass the manager-approval requirement even when the policy says requiresManagerApproval=true? Or should it always require approval but with a shorter SLA?; How are leave days counted — are start_date and end_date inclusive, and how are weekends/public-holidays handled?; What defines the fiscal_year boundary for leave balances — calendar year, a configurable company fiscal year, or a rolling 12-month window from the employee's hire date?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The `AuditRecord` entity must match the canonical field list in `.gestalt/architecture/reconciled.json` exactly: `id`, `entityType`, `entityId`, `action`, `oldValues`, `newValues`, `performedBy`, `performedAt`, `ipAddress`, `userAgent`, `createdAt`. No extra fields, no missing fields. (see `.gestalt/architecture/reconciled.json → domain_entities → audit module owns AuditRecord`)
- The four enums (`LeaveRequestStatus`, `LeaveType`, `BalanceStatus`, `EmploymentStatus`) must match the values declared in `.gestalt/architecture/reconciled.json` under the `shared-types` module. No extra enum members, no missing members. (see `.gestalt/architecture/reconciled.json → modules → shared-types`)
- Module structure must follow the existing pattern established by `src/modules/uptime/` and `src/modules/status/`: a model file, a service interface file, a service implementation file, and a barrel `index.ts`. The audit module adds a repository interface file (`audit.repository.interface.ts`) which is a new pattern for this project but required by GP-001. (see `src/modules/uptime/index.ts, src/modules/status/index.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditRecord`: AuditRecord is immutable after creation — it has no `updatedAt` field and does not extend `BaseEntity`. Once written, an audit record must never be modified or deleted.
- Reuse or extend `BaseEntity`: Every domain entity that supports updates (Employee, LeaveRequest, LeavePolicy, LeaveBalance) must extend `BaseEntity`, which guarantees `id: string`, `createdAt: Date`, and `updatedAt: Date`. AuditRecord is the sole exception — it is immutable and does not extend BaseEntity.
### Interface contract — expose these operations (their shape is yours)
- IAuditService.record — No auth enforcement at this layer — the caller (service or controller) is responsible for providing the correct `performedBy` identity. The audit service records whatever identity it receives.; Must propagate errors from the underlying repository (e.g. connection failures) without swallowing them. Must not throw for missing optional fields — `oldValues`, `newValues`, `ipAddress`, `userAgent` are all optional and may be `undefined` or `null`.
- IAuditRepository.create — No auth — repository is a pure data-access interface.; Must return the created `AuditRecord` (with any server-generated defaults applied). Must reject on persistence failure.
- IAuditRepository.findByEntity — No auth — repository is a pure data-access interface.; idempotent; Returns an array (empty if no records found — never null). Must reject on query failure.
### Integration points — connect to these
- src/shared/types/index.ts — All downstream modules (employee, leave-policy, leave-balance, leave-request) import enums and BaseEntity from here. The audit module's audit.model.ts imports BaseEntity from here.

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