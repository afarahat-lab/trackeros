# Implement this phase: Phase 3: Leave Request & Notification (part 1/2)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/3350baf6-9bd5-4cac-b688-f263972317f9/7`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the LeaveRequest and Notification domain models with their repository/service interfaces. This is the models+interfaces slice only — NO concrete implementations.

Read these files before generating: `src/shared/types/index.ts` (for LeaveType, LeaveStatus, NotificationType, NotificationStatus enums), `src/modules/employee/employee.model.ts` (for Employee reference), `src/modules/leave-policy/leave-policy.model.ts` (for LeavePolicy reference), `src/modules/balance/balance.model.ts` (for Balance reference).

Files to create:

1. `src/modules/leave-request/leave-request.model.ts` — Define the `LeaveRequest` entity interface with canonical fields: id, employeeId, leaveType (LeaveType), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveStatus), approvedBy (string | null), approvedAt (Date | null), rejectionReason (string | undefined), createdAt (Date), updatedAt (Date). Define `ILeaveRequestRepository` interface with methods: findById(id: string), findByEmployeeId(employeeId: string), findByStatus(status: LeaveStatus), findByManagerId(managerId: string), create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>), update(id: string, data: Partial<LeaveRequest>), updateStatus(id: string, status: LeaveStatus, approvedBy?: string, rejectionReason?: string). Define `ILeaveRequestService` interface with methods: submit(request: CreateLeaveRequestDto), approve(id: string, approverId: string), reject(id: string, approverId: string, reason: string), cancel(id: string, employeeId: string), getById(id: string), getByEmployee(employeeId: string), getPendingForManager(managerId: string). Also define `CreateLeaveRequestDto` with fields: employeeId, leaveType, startDate, endDate, reason (optional). Also define the validation schemas (Zod): createLeaveRequestSchema, updateLeaveRequestSchema.

2. `src/modules/notification/notification.model.ts` — Define the `Notification` entity interface with canonical fields: id, recipientId, type (NotificationType), title, message, relatedEntityType (string | null), relatedEntityId (string | null), status (NotificationStatus), createdAt (Date), readAt (Date | null). Define `INotificationRepository` interface with methods: findByRecipientId(recipientId: string), findByRecipientIdAndStatus(recipientId: string, status: NotificationStatus), create(notification: Omit<Notification, 'id' | 'createdAt'>), updateStatus(id: string, status: NotificationStatus, readAt?: Date). Define `INotificationService` interface with methods: notifyLeaveSubmitted(leaveRequest: LeaveRequest), notifyLeaveApproved(leaveRequest: LeaveRequest), notifyLeaveRejected(leaveRequest: LeaveRequest), notifyLeaveCancelled(leaveRequest: LeaveRequest), getNotifications(recipientId: string), markAsRead(id: string).

No tests in this phase — tests come in part 2/2.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Calendar days inclusive: start_date through end_date, all days count toward used_days (weekends and public holidays included). end_date is inclusive. [BINDING RULE — operator decision resolving: How are leave days counted — are start_date and end_date inclusive, and do weekends/public holidays count toward the used-days total?; apply everywhere these apply, not in one place only]

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

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Entity invariants — enforce these
- Reuse or extend `LeaveRequest`: A LeaveRequest MUST always have a valid status from the LeaveStatus enum. The status lifecycle is: DRAFT → SUBMITTED → APPROVED | REJECTED; SUBMITTED | APPROVED → CANCELLED. REJECTED and CANCELLED are terminal states — no further transitions are permitted. The updateStatus repository method is the sole mutator of status and must enforce these transitions.

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