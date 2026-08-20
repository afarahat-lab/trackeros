# Fix specific quality-gate violations: Phase 3: Leave Request & Notification (part 1/2)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/3350baf6-9bd5-4cac-b688-f263972317f9/7/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## This is fix attempt 2, but you are starting from a CLEAN branch
No earlier fix attempt's changes are present in this working tree — this branch was created from the phase's own state, not from a previous attempt. Do NOT look for a prior attempt's edits; they are not here. Work from the code that IS present, and if a file named below does not exist yet, CREATE it with the required content rather than reporting that there is nothing to change.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The Notification entity's `type` field type must match the `NotificationType` enum already used by `INotificationRepository.findByRecipientIdAndStatus` (parameter `status: NotificationStatus`) and `INotificationService` method doc-comments (which reference `NotificationType.leave_submitted`, etc.) in the same file (see `src/modules/notification/notification.model.ts`)
- The Notification entity must follow the same pattern as the sibling LeaveRequest entity, which already uses enum types (`LeaveType`, `LeaveStatus`) for its `leaveType` and `status` fields rather than plain `string` (see `src/modules/leave-request/leave-request.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `Notification`: The `type` field must always be one of the `NotificationType` enum values: `leave_submitted`, `leave_approved`, `leave_rejected`, `leave_cancelled`
- Reuse or extend `Notification`: The `status` field must always be one of the `NotificationStatus` enum values: `pending`, `sent`, `read`, `archived`
### Integration points — connect to these
- src/modules/leave-request/leave-request.model.ts (type-only import of Notification via LeaveRequest) — The `INotificationService` interface in notification.model.ts imports `LeaveRequest` as a type-only import. The LeaveRequest entity already uses enum types correctly, so no change is needed there — but the type-check must verify that the cross-module type dependency remains sound after the Notification entity fields are corrected

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `Notification` — the entity MUST have exactly these fields:
    - id: string
    - recipientId: string
    - type: string
    - title: string
    - message: string
    - relatedEntityType: string | null
    - relatedEntityId: string | null
    - status: string
    - createdAt: Date
    - readAt: Date | null

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Calendar days inclusive: start_date through end_date, all days count toward used_days (weekends and public holidays included). end_date is inclusive. [BINDING RULE — operator decision resolving: How are leave days counted — are start_date and end_date inclusive, and do weekends/public holidays count toward the used-days total?; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Change the `type` field from `string` to `NotificationType` and the `status` field from `string` to `NotificationStatus` in the Notification entity interface.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/notification/notification.model.ts
Line: 10
Offending code: `type: string;`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/notification/notification.model.ts` at line 10 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] The `Notification` entity's `type` field is typed as `string` but the spec requires `NotificationType`. The `NotificationType` enum is imported on line 2 but not applied to the entity field.

- Site 2
File: src/modules/notification/notification.model.ts
Line: 15
Offending code: `status: string;`
Rule violated: review/spec-violation
Action (do this now): Edit `src/modules/notification/notification.model.ts` at line 15 in place to fix the `review/spec-violation` violation.
What the quality gate found — apply this: [review/spec-violation] The `Notification` entity's `status` field is typed as `string` but the spec requires `NotificationStatus`. The `NotificationStatus` enum is imported on line 2 but not applied to the entity field.

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