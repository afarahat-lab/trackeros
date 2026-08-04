# Implement this phase: Phase 4: Notification module (model + repository + service)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/4fbbfee4-4feb-4a2b-8127-85025f82af24/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the notification module at `src/modules/notification/`. This phase depends on `src/shared/types/index.ts` from Phase 1 — read it before generating any code.

Create `src/modules/notification/notification.model.ts` with the Notification entity: id, recipientId, type, title, message, relatedEntityType (string|null), relatedEntityId (string|null), status ('PENDING'|'SENT'|'READ'|'ARCHIVED'), createdAt, readAt (Date|null).

Create `src/modules/notification/notification.repository.ts` with INotificationRepository interface and NotificationRepository class using `src/shared/db/connection.ts`. Methods: create(notification), findByRecipient(recipientId), markSent(id), markRead(id).

Create `src/modules/notification/notification.service.ts` with INotificationService interface and NotificationService class. The service wraps the repository and exposes: notify(recipientId, type, title, message, relatedEntityType?, relatedEntityId?): Promise<Notification> — creates and returns the notification.

Create `src/modules/notification/index.ts` barrel.

Include Jest unit tests in `tests/unit/modules/notification/notification.service.test.ts`.

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
- The NotificationRepository must follow the established repository pattern: import pool from shared/db/connection, define a standalone INotificationRepository interface, use a private snake_case row interface with a mapRowToNotification mapper, use parameterised queries with NOW() and RETURNING *, and return Notification | null from update-style methods (markSent/markRead) — matching the employee repository's create/update/softDelete conventions. (see `src/modules/employee/employee.repository.ts`)
- The Notification model interface must be a standalone camelCase interface (not extending BaseEntity), matching the employee and policy model convention; NotificationStatus is defined locally in notification.model.ts as a string-literal union, not imported from shared types. (see `src/modules/employee/employee.model.ts`)
- The notification barrel (index.ts) must re-export the model, repository interface + class, and service interface + class from their respective files, matching the employee/policy barrel export pattern. (see `src/modules/employee/index.ts`)
- The NotificationService must follow the established service pattern: a standalone INotificationService interface and a NotificationService class implementing it in a single service file, receiving its dependency (INotificationRepository) via constructor injection — matching the status service interface+class split and the constructor-injection convention. (see `src/modules/status/status.service.ts`)
- The notification service test must follow the established Jest test conventions: file named *.test.ts under tests/unit/modules/notification/, bare module paths (e.g. modules/notification/...) enabled by jest.config moduleDirectories ['node_modules','src'], and mocking the injected repository (INotificationRepository) rather than the pool — matching how the employee test mocks its dependency. (see `tests/unit/modules/employee/employee.repository.test.ts`)
- The notification module's dependency direction must match the reconciled architecture: notification depends only on src/shared/types/ and src/shared/db/ — it must not import employee, policy, balance, audit, or leave modules (notification is an independent mid-layer module). (see `.gestalt/architecture/reconciled.json`)
### Entity invariants — enforce these
- Reuse or extend `Notification`: A newly created Notification always starts in the PENDING status with readAt null; status may only advance through the defined sequence PENDING → SENT → READ, with ARCHIVED as a terminal disposition.
- Reuse or extend `Notification`: readAt is null until the notification is marked READ; marking read sets both status to READ and readAt to the current timestamp.
- Reuse or extend `Notification`: A Notification is always scoped to exactly one recipient (recipientId is non-null); relatedEntityType and relatedEntityId are either both null or both set, linking the notification to an optional domain entity.
### Interface contract — expose these operations (their shape is yours)
- notificationRepository.create(notification) — Rejects the promise on DB errors (e.g. constraint violations); never swallows. createdAt is DB-assigned via NOW(), not caller-supplied.
- notificationRepository.findByRecipient(recipientId) — Returns an empty array (not null) when no notifications exist for the recipient; rejects the promise on DB errors.
- notificationRepository.markSent(id) — Returns the updated Notification with status SENT, or null when no row matches the id; rejects the promise on DB errors.
- notificationRepository.markRead(id) — Returns the updated Notification with status READ and readAt set, or null when no row matches the id; rejects the promise on DB errors.
- notificationService.notify(recipientId, type, title, message, relatedEntityType?, relatedEntityId?) — Generates a unique id, sets status PENDING, defaults omitted related-entity params to null, delegates to repository.create, and returns the persisted Notification; propagates repository errors as rejected promises.
### Integration points — connect to these
- src/modules/leave/ (LeaveService, Phase 8) — The leave orchestrator will inject INotificationService to send notifications to a manager on submission and to the employee on approve/reject; this phase must expose a stable notify(...) service interface and barrel export for that downstream consumption.
- src/shared/db/connection.ts — The NotificationRepository imports the pg Pool from the shared DB connection to execute parameterised queries against the notifications table.
- src/shared/types/index.ts — The notification module depends on Phase 1 shared types; NotificationStatus is defined locally but the module must not duplicate or contradict the canonical shared enums.

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