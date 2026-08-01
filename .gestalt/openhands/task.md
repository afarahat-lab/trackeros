# Implement this phase: Phase 10: Leave controller, routes, and app registration

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/35df38af-c9d7-41ee-b412-79ee8d149189/10`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the HTTP layer for the leave module and register it in the Fastify app. This phase depends on ALL prior phases — read these files before generating:
- `src/modules/leave/leave.service.ts` and `src/modules/leave/leave.service.interface.ts` (Phase 9)
- `src/modules/leave/leave.repository.ts` (Phase 4)
- `src/modules/balance/balance.repository.ts` (Phase 5)
- `src/modules/employee/employee.repository.ts` (Phase 2)
- `src/modules/policy/policy.repository.ts` (Phase 3)
- `src/modules/notification/notification.repository.ts` (Phase 6)
- `src/modules/audit/audit.repository.ts` (Phase 7)
- `src/shared/utils/day-count.ts` (Phase 8)
- `src/app.ts` (existing — must be modified)

Files to create/modify (approximately 3 files):

- `src/modules/leave/leave.controller.ts` — **LeaveController** class that wraps ILeaveService. Methods:
  - `submit(request: FastifyRequest, reply: FastifyReply)` — parse body as CreateLeaveRequestDto, validate required fields (GP-003), call service.submitLeaveRequest, return 201.
  - `approve(request: FastifyRequest, reply: FastifyReply)` — extract requestId from params, approverId from auth context (request.user.id placeholder), call service.approveLeaveRequest, return 200.
  - `reject(request: FastifyRequest, reply: FastifyReply)` — extract requestId, approverId, reason from body, call service.rejectLeaveRequest, return 200.
  - `cancel(request: FastifyRequest, reply: FastifyReply)` — extract requestId from params, employeeId from auth context, call service.cancelLeaveRequest, return 200.
  - `getById(request: FastifyRequest, reply: FastifyReply)` — extract requestId, call service.getLeaveRequest, return 200 or 404.
  - `getByEmployee(request: FastifyRequest, reply: FastifyReply)` — extract employeeId from params, parse query as LeaveRequestQueryParams, call service.getEmployeeLeaveRequests, return 200.

- `src/modules/leave/leave.routes.ts` — Export an async function `leaveRoutes(fastify: FastifyInstance)` that registers routes:
  - `POST /api/leave/requests` → controller.submit
  - `GET /api/leave/requests/:requestId` → controller.getById
  - `GET /api/leave/employees/:employeeId/requests` → controller.getByEmployee
  - `POST /api/leave/requests/:requestId/approve` → controller.approve
  - `POST /api/leave/requests/:requestId/reject` → controller.reject
  - `POST /api/leave/requests/:requestId/cancel` → controller.cancel

  The routes function must instantiate all repositories and the LeaveService with proper wiring.

- `src/app.ts` — MODIFY the existing file to register `leaveRoutes` alongside the existing `uptimeRoutes`. Import `leaveRoutes` from `./modules/leave/leave.routes` and call `app.register(leaveRoutes)`.

Include Jest integration tests in `tests/integration/modules/leave/` using Fastify's inject method.

**GP-003**: Validate all inputs at API boundaries. **GP-005**: RBAC enforcement — at minimum, check that the authenticated user matches the employeeId for cancel operations, and that approvers have manager or hr_admin role.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Consolidated decision (answers all 6 questions; apply consistently across annual, sick, and emergency leave):

1. Fiscal/leave year = CALENDAR YEAR (Jan 1 – Dec 31). Derive fiscalYear = the calendar year of the request start_date. Not tenant-configurable for now.

2 & 5. Day counting = BUSINESS DAYS ONLY, excluding weekends AND public holidays, applied uniformly to ALL leave types. Introduce a `holidays` table (public-holiday calendar) used by a single shared day-count function so every call site (balance sufficiency check, deduction, restoration) computes identically. Whole days only — no half-day or partial-day leave.

3. Employee with no manager (managerId is null): ESCALATE to the HR admin role for approval. Do NOT auto-approve and do NOT block submission.

4. leave_balances.used_days = DENORMALIZED COUNTER and the source of truth (balance reads are O(1)). Deduct-on-submission: increment used_days atomically, in the same transaction, when a LeaveRequest is SUBMITTED (reserving the balance so an employee cannot over-book). Restore-on-reject/cancel: decrement used_days when that request is REJECTED or CANCELLED. Approval does NOT change used_days again (it was already deducted at submission). A submission must fail if it would drive remaining below zero.

6. remainingDays = COMPUTED/DERIVED, never stored: remainingDays = totalEntitlement - usedDays, calculated at query time. All consumers use this one formula; no code path writes remainingDays directly. This eliminates drift. [BINDING RULE — operator decision resolving: How is the fiscal year boundary defined — calendar year (Jan 1 – Dec 31) or a company-specific fiscal year (e.g., Apr 1 – Mar 31)?; Should the day-count calculation for leave consumption exclude weekends and/or public holidays (business days only), or count all calendar days?; When an employee has no manager (managerId is null), who approves their SUBMITTED LeaveRequest? Does it auto-approve, escalate to a department head, or require a different workflow?; How is `used_days` in `leave_balances` derived — is it a denormalized counter incremented atomically on leave approval, or is it computed on-the-fly by summing the day counts of all approved `leave_requests` for that employee/type/year?; Are leave day counts based on calendar days (inclusive start-to-end) or working/business days (excluding weekends and holidays)?; Should Balance.remainingDays be a stored column or a computed (derived) field?; apply everywhere these apply, not in one place only]

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