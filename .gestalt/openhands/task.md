# Implement this phase: Phase 1: Shared enums (LeaveType, LeaveRequestStatus)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/be068fd3-a1c9-4eb0-ae38-156852fec5c5/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the two shared enum files that every downstream module depends on.

Create `src/shared/types/leave-type.enum.ts` with:
- `LeaveType` enum: ANNUAL, SICK, EMERGENCY

Create `src/shared/types/leave-request-status.enum.ts` with:
- `LeaveRequestStatus` enum: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED

Include Jest unit tests in `tests/unit/shared/types/` verifying each enum has exactly the members listed above.

No dependencies on any existing module files.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decisions for all foundational questions:

1. Day counting (questions 1 and 3): Business days only — exclude weekends and public holidays from the count. days = number of business days between startDate and endDate inclusive. Apply this single rule everywhere a day count is derived from a date range: balance sufficiency validation, usedDays deduction, remainingDays computation, entitlement enforcement, and reporting.

2. Balance materialization: Materialized transactional. On each APPROVE, atomically increment leave_balances.used_days by the request's business-day count within the same transaction; on REJECT or CANCEL of a previously-approved request, atomically restore it. remaining_days = total_entitlement - used_days (computed, not stored). Deduction happens on approval (not on submission). Balances are never computed by live aggregate queries at read time.

Additional standing rules: whole days only (no partial/half days); leave year is the calendar year; when an employee has no assigned manager, escalate the approval to an HR admin; enforce RBAC on every endpoint (an employee sees/acts only on their own requests; a manager/HR acts on their reports); validate all inputs at API boundaries. [BINDING RULE — operator decision resolving: How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only?; How are leave_balances.used_days and remaining_days computed — are they derived live from approved leave_requests (sum of day counts) or are they materialized and updated transactionally on each approval/rejection?; How are leave days counted from startDate and endDate? Is it inclusive (endDate - startDate + 1), exclusive (endDate - startDate), or business-days-only? This affects balance sufficiency checks, balance deductions, entitlement comparisons, and reporting.; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The LeaveType enum members (ANNUAL, SICK, EMERGENCY) must exactly match the shared-types module's declared ownership in the reconciled architecture — no extra or missing members. (see `.gestalt/architecture/reconciled.json → modules[name=shared-types].owns`)
- The LeaveRequestStatus enum members (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED) must exactly match the LeaveRequest lifecycle states documented in the reconciled architecture entity table and the ARCHITECTURE.md reconciled section. (see `.gestalt/architecture/reconciled.json → domain_entities[name=LeaveRequest] + docs/ARCHITECTURE.md (Leave Management Module – Reconciled Architecture, Domain Entities table)`)
- File placement must follow the reconciled architecture's Module Boundaries: the shared-types module owns LeaveType and LeaveRequestStatus at path src/shared/types/ — the enum files must live under that exact directory, not under src/modules/. (see `.gestalt/architecture/reconciled.json → modules[name=shared-types].path`)
- Export style (named exports, no defaults) and per-module barrel re-export must match the existing module convention established by src/modules/uptime/index.ts and src/modules/status/index.ts. (see `src/modules/uptime/index.ts, src/modules/status/index.ts`)
- Test file naming and location must match jest.config.js's testMatch glob (**/tests/**/*.test.(ts|js)) — tests must be *.test.ts files under a tests/ directory, compiled by ts-jest (not tsc, which excludes tests/). (see `jest.config.js (testMatch, preset: ts-jest) + tsconfig.json (exclude: ["tests"])`)
### Entity invariants — enforce these
- Reuse or extend `LeaveType`: The enum's member set is exactly {ANNUAL, SICK, EMERGENCY}; each member maps to a distinct string value, and no additional members exist. This set is the canonical leave-type vocabulary consumed by LeavePolicy.leaveType and persisted to the leave_policies.leave_type column.
- Reuse or extend `LeaveRequestStatus`: The enum's member set is exactly {DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED}; each member maps to a distinct string value, and no additional members exist. This set is the canonical LeaveRequest lifecycle vocabulary (DRAFT → SUBMITTED → APPROVED / REJECTED / CANCELLED) consumed by LeaveRequest.status and persisted to the leave_requests.status column.
### Interface contract — expose these operations (their shape is yours)
- Public export of LeaveType and LeaveRequestStatus from the shared-types module's barrel (index.ts) — downstream modules import these enums solely through the module's public entry point, never from internal files, per the architecture's dependency rule (modules import only through declared public entry points). — N/A — pure type declarations with no runtime operations or access control.; idempotent; N/A — enum declarations have no runtime failure modes; import resolution failures surface as tsc --noEmit compile errors, not runtime errors.
### Integration points — connect to these
- leave-policy module (Phase 3) — LeavePolicy.leaveType is typed as LeaveType; the enum must be importable via the bare path resolved through moduleDirectories (node_modules, src) so downstream consumers can import from shared/types/. — LeavePolicy persists leaveType to the leave_policies.leave_type column; the enum is the canonical vocabulary for that field.
- leave-request module (Phase 5) — LeaveRequest.status is typed as LeaveRequestStatus; the enum must be importable via the bare path resolved through moduleDirectories (node_modules, src) so downstream consumers can import from shared/types/. — LeaveRequest persists status to the leave_requests.status column and drives the DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED lifecycle; the enum is the canonical vocabulary for that field.
- All domain modules (employee, leave-policy, leave-balance, leave-request, audit, notification) — per the reconciled dependency map, every module depends on shared-types; the barrel must re-export both enums as the single public entry point for cross-module consumption. — The architecture's dependency map declares shared-types as a dependency of all modules; the barrel is the sanctioned import surface per the "modules import only through declared public entry points" rule.

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