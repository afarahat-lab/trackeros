# Implement this phase: Phase 6: Notification module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/35df38af-c9d7-41ee-b412-79ee8d149189/6`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the notification module at `src/modules/notification/`. This phase depends on `src/shared/types/index.ts` from Phase 1.

Files to create:
- `src/modules/notification/notification.model.ts` — Define the **Notification** entity with EXACT fields: `id: string`, `recipientId: string`, `type: string`, `title: string`, `message: string`, `relatedEntityType: string | null`, `relatedEntityId: string | null`, `status: NotificationStatus` (define as `'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'`), `createdAt: Date`, `readAt: Date | null`.

  Also define **INotificationRepository** interface with methods:
  - `findByRecipientId(recipientId: string): Promise<Notification[]>`
  - `create(data: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification>`
  - `markAsRead(id: string): Promise<Notification | null>`
  - `updateStatus(id: string, status: NotificationStatus): Promise<Notification | null>`

- `src/modules/notification/notification.repository.ts` — Implement **NotificationRepository** class implementing INotificationRepository using the pg pool from `src/shared/db/connection.ts`.
- `src/modules/notification/index.ts` — Barrel export.

Include Jest unit tests in `tests/unit/modules/notification/`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (answers all 6 questions; apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2 & 5. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again (it was already deducted at submission). A submission must fail if it would drive remaining below zero.

6. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly. This eliminates drift. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a company-specific fiscal year (e.g., Apr 1 – Mar 31)?; Should the day-count calculation for leave consumption exclude weekends and/or public holidays (business days only), or count all calendar days?; When an employee has no manager (managerId is null), who approves their SUBMITTED LeaveRequest? Does it auto-approve, escalate to a department head, or require a different workflow?; How is `used_days` in `leave_balances` derived — is it a denormalized counter incremented atomically on leave approval, or is it computed on-the-fly by summing the day counts of all approved `leave_requests` for that employee/type/year?; Are leave day counts based on calendar days (inclusive start-to-end) or working/business days (excluding weekends and holidays)?; Should Balance.remainingDays be a stored column or a computed (derived) field?; apply everywhere these apply, not in one place only]

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
    - status: NotificationStatus
    - createdAt: Date
    - readAt: Date | null

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- NotificationStatus must be defined as a local type alias in the notification model file, mirroring how BalanceStatus is defined locally in balance.model.ts rather than imported from shared types. (see `src/modules/balance/balance.model.ts`)
- The NotificationRepository must follow the same repository implementation pattern as BalanceRepository: import pool from the shared db connection, use parameterized INSERT/UPDATE ... RETURNING * queries, and implement a private mapRow helper typed as Record<string, unknown> that converts snake_case columns to camelCase entity fields. (see `src/modules/balance/balance.repository.ts`)
- The notification barrel export must follow the same structure as the balance barrel: re-export the entity interface, the locally-defined status type, the repository interface, and the concrete repository class from their respective files. (see `src/modules/balance/index.ts`)
- Unit tests must follow the established test pattern: jest.mock the shared db connection module, assert exact SQL strings and exact parameter arrays via expect(mockQuery).toHaveBeenCalledWith(sql, params), and use a snake_case makeRow helper for mock row construction. (see `tests/unit/modules/balance/balance.repository.test.ts`)
- The repository must import the pool from the shared db connection module (which exports a pg.Pool instance named pool), matching how all existing repositories obtain their database connection. (see `src/shared/db/connection.ts`)
- The Notification entity shape must match the reconciled architecture's Notification domain entity attributes exactly — notably omitting updatedAt (the notifications table has no updated_at column) and including readAt as a nullable Date, distinguishing it from Employee/Policy/Leave/Balance which all carry updatedAt. (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `Notification`: The Notification lifecycle progresses PENDING → SENT → READ → ARCHIVED; markAsRead is the dedicated transition to READ that simultaneously sets readAt, while updateStatus handles all other status transitions generically.
- Reuse or extend `Notification`: readAt is null until the notification is marked as read; once set it holds a timestamp and is never reset to null by any operation in this phase.
- Reuse or extend `Notification`: A Notification is always associated with a recipient (recipientId is non-null) and may optionally reference a related entity via relatedEntityType/relatedEntityId, both of which are nullable together.
- Reuse or extend `NotificationStatus`: NotificationStatus is a closed type alias with exactly four values — PENDING, SENT, READ, ARCHIVED — defined locally in the notification model file and not imported from shared types.
### Interface contract — expose these operations (their shape is yours)
- findByRecipientId(recipientId: string): Promise<Notification[]> — Returns an empty array when no notifications exist for the recipient; never returns null. Results are ordered by creation time descending.
- create(data: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification> — Always returns the newly created entity; the caller-provided data excludes id, createdAt, and readAt which are database-generated or default to null. A database failure propagates as a rejected promise.
- markAsRead(id: string): Promise<Notification | null> — Atomically sets read_at to NOW() and status to READ in a single UPDATE; returns the updated entity on success or null when no row matches the given id.
- updateStatus(id: string, status: NotificationStatus): Promise<Notification | null> — Performs a generic status transition to any NotificationStatus value; returns the updated entity on success or null when no row matches the given id.
### Integration points — connect to these
- src/shared/db/connection.ts — The NotificationRepository depends on the exported pg Pool instance for all database access, matching the established pattern across employee/policy/leave/balance repositories.
- src/shared/types/index.ts — The notification module depends on the shared types foundation from Phase 1; NotificationStatus is defined locally (not exported from shared types) following the BalanceStatus precedent, but the module's barrel must be consumable alongside other modules that import from shared types.
- src/modules/leave/ (Phase 9 leave service) — The leave service will depend on INotificationRepository to create notifications for managers and employees on leave lifecycle events (submission, approval, rejection, cancellation); this phase provides the repository interface and implementation that the leave service will consume.

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