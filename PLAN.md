# PLAN.md

## Phase 1: Phase 1 — Approvals service module

Create the approvals service module under web/src/modules/approvals/ (the exact directory the architecture's Module Boundaries declare for this module).

Files to create (approximately 2–3):
- web/src/modules/approvals/approvals.service.ts — define the canonical `ApprovalsQueueItem` read-model type (requestId: string, employeeId: string, employeeName: string | null, leaveTypeCode: LeaveTypeCode, startDate: Date, endDate: Date, status: LeaveStatus) AND the `IApprovalsService` interface AND the `ApprovalsService` class in this one file. Import `LeaveTypeCode`, `LeaveStatus`, `LeaveRequestView`, `EmployeeProfile` from web/src/shared/types/index.ts (the existing shared types module — do NOT redeclare these enums/types).
- web/src/modules/approvals/index.ts — public entry point re-exporting `IApprovalsService`, `ApprovalsService`, and the `ApprovalsQueueItem` type.

`IApprovalsService` exposes: `getQueue(): Promise<ApprovalsQueueItem[]>` and `decide(requestId: string, action: 'approve' | 'reject'): Promise<LeaveRequestView>`.

`ApprovalsService` constructor injects `ILeaveService` (from web/src/modules/leave/index.ts) and `IEmployeeService` (from web/src/modules/employee/index.ts). It must NOT import the api-client directly.

`getQueue()` implementation (BINDING rules):
1. Call `employeeService.getMe()` to obtain the signed-in profile (role comes from the profile, never decoded from the JWT).
2. Call `leaveService.list()` to fetch all visible requests.
3. Filter defensively in the service: keep only rows where `status === LeaveStatus.SUBMITTED` AND `employeeId !== profile.id` (do NOT rely on backend role scoping, and do NOT add a status query param — the API contract is unchanged).
4. Map each surviving `LeaveRequestView` to an `ApprovalsQueueItem` with `requestId = view.id`, `employeeId = view.employeeId`, `employeeName = null` (there is no endpoint returning another employee's name — do NOT attempt name resolution), `leaveTypeCode`, `startDate`, `endDate`, and `status` (always SUBMITTED while in queue).

`decide(requestId, action)` implementation (BINDING rule): delegate to the existing api-client methods via `leaveService.approve(requestId)` or `leaveService.reject(requestId)` (reuse the existing methods — do NOT add new api-client methods). Return the `LeaveRequestView` the call returns unchanged (the caller replaces the decided row with it; do NOT re-fetch the list).

This phase depends on existing files — read them before generating: web/src/modules/leave/leave.service.ts (for `ILeaveService.list/approve/reject`), web/src/modules/employee/employee.service.ts (for `IEmployeeService.getMe`), web/src/shared/types/index.ts (for `LeaveRequestView`, `EmployeeProfile`, `LeaveStatus`, `LeaveTypeCode`), and web/src/modules/leave/index.ts / web/src/modules/employee/index.ts (public entry points).

## Phase 2: Phase 2 — Approvals service unit tests

Create the vitest unit test suite for the approvals service, beside its subject (established web style — tests live next to the subject, not under a separate tests/ dir).

File to create (1):
- web/src/modules/approvals/approvals.service.test.ts

This phase depends on web/src/modules/approvals/approvals.service.ts and web/src/modules/approvals/index.ts from Phase 1 — read them before writing any test that references `ApprovalsService`, `IApprovalsService`, or `ApprovalsQueueItem`.

Use in-memory fakes for `ILeaveService` and `IEmployeeService` (cast to the interface types imported from web/src/modules/leave/index.ts and web/src/modules/employee/index.ts). Cover:
- `getQueue()` happy path: a MANAGER/ADMIN profile receives only SUBMITTED requests whose `employeeId !== profile.id`; DRAFT/APPROVED/REJECTED/CANCELLED rows and the viewer's own SUBMITTED rows are excluded; each returned item has `employeeName === null` and `status === LeaveStatus.SUBMITTED`.
- `getQueue()` empty result: no SUBMITTED non-own rows → returns `[]` (the empty state is a normal condition, not an error).
- `getQueue()` failure path: `getMe()` or `list()` rejects → the rejection propagates (assert the promise rejects).
- `decide(requestId, 'approve')` delegates to `leaveService.approve(requestId)` and returns its `LeaveRequestView` unchanged.
- `decide(requestId, 'reject')` delegates to `leaveService.reject(requestId)` and returns its `LeaveRequestView` unchanged.
- `decide()` failure path: the underlying approve/reject rejects → the rejection propagates.

Use `vi.fn()` for the fake methods and assert call arguments. Follow the existing web test conventions (see web/src/modules/leave/leave.service.test.ts and web/src/modules/employee/employee.service.test.ts for the fake/assertion style).

## Phase 3: Phase 3 — RequireApprover route guard

Create the route-level role guard under web/src/presentation/guards/ (the exact directory the architecture's Module Boundaries declare for the presentation-guards module).

Files to create (approximately 2):
- web/src/presentation/guards/RequireApprover.tsx — a `RequireApprover` component (route-level role guard) that wraps children and only renders them when the signed-in user's role is MANAGER or ADMIN. It must read the role from the auth session's profile (via `useAuth()` from web/src/modules/auth/index.ts), never decode the JWT. When the session is null, delegate to the existing `RequireAuth` behavior (redirect to /login) or render `<Navigate to="/" replace />`; when the session exists but `profile.role === EmployeeRole.EMPLOYEE`, redirect away (e.g. `<Navigate to="/" replace />`) so an EMPLOYEE visiting the route directly sees no other employee's data. Import `EmployeeRole` from web/src/shared/types/index.ts.
- web/src/presentation/guards/RequireApprover.test.tsx — vitest coverage beside the subject.

This phase depends on existing files — read them before generating: web/src/presentation/guards/RequireAuth.tsx (the existing guard pattern to mirror), web/src/modules/auth/index.ts (for `useAuth`), web/src/shared/types/index.ts (for `EmployeeRole`), and web/src/presentation/guards/RequireAuth.test.tsx (for the established guard-test style).

Test coverage: a MANAGER session renders children; an ADMIN session renders children; an EMPLOYEE session does NOT render children (redirects); a null session redirects to login (or does not render children).

## Phase 4: Phase 4 — ApprovalsPage + route wiring

Create the approvals queue page and wire its route.

Files to create/modify (approximately 2):
- web/src/presentation/pages/ApprovalsPage.tsx — the `ApprovalsPage` component (owned by the presentation-pages module). It receives an `IApprovalsService` prop (imported from web/src/modules/approvals/index.ts). On mount it calls `approvalsService.getQueue()` and renders the queue. Render a table with columns: "Employee" (render `employeeId` truncated to its first 8 characters in a monospace style — do NOT attempt name resolution), "Leave type" (`leaveTypeCode`), "Start" and "End" (`formatUtcDate` from web/src/shared/date/index.ts), and a link to the request's detail page (`/leaves/:requestId`). Include a short visible note near the Employee column, e.g. "employee names require an API change" (BINDING rule — a user-facing note, NOT a TODO comment in code). Each row shows Approve and Reject buttons that call `approvalsService.decide(requestId, 'approve'|'reject')`; on success, replace that row's data with the returned `LeaveRequestView` (render its new status and remove the approve/reject controls for that row) — do NOT remove the row and do NOT re-fetch the whole list (BINDING rule). Render an explicit empty state ("nothing waiting on you") when the queue is empty — distinct from the loading state and the error state. Show a loading state while the fetch is in flight and an error state (`role="alert"`) on failure.
- web/src/presentation/App.tsx — add the `/approvals` route, wrapped in `<RequireAuth>` and `<RequireApprover>`, rendering `<ApprovalsPage approvalsService={approvalsService} />`. Add `approvalsService: IApprovalsService` to `AppProps` and destructure it.

This phase depends on existing files — read them before generating: web/src/presentation/App.tsx (current route wiring and AppProps), web/src/presentation/guards/RequireApprover.tsx (Phase 3), web/src/modules/approvals/index.ts (Phase 1), web/src/presentation/pages/LeaveDetailPage.tsx (for the decide/row-replacement and action-button pattern), web/src/shared/date/index.ts (for `formatUtcDate`), and web/src/shared/types/index.ts (for `LeaveRequestView`/`LeaveStatus`).

Note: the composition root web/src/main.tsx must be updated to construct and pass `approvalsService` — if main.tsx is not already in scope, note it as a required follow-up wiring edit in the same phase (the architecture agent will confirm the authoritative file list).

## Phase 5: Phase 5 — ApprovalsPage tests + dashboard link

Add the ApprovalsPage test suite and the role-gated dashboard link.

Files to create/modify (approximately 3):
- web/src/presentation/pages/ApprovalsPage.test.tsx — vitest coverage beside the subject. Use an in-memory fake `IApprovalsService` (cast to the interface from web/src/modules/approvals/index.ts). Cover: the queue renders rows with the truncated 8-character monospace employeeId, leave type, dates, and a detail link; the "employee names require an API change" note is visible; the explicit empty state ("nothing waiting on you") renders when `getQueue()` returns `[]` (and is distinct from loading/error); the loading state renders before the fetch resolves; the error state (`role="alert"`) renders when `getQueue()` rejects; clicking Approve calls `decide(requestId, 'approve')` and replaces the row with the returned `LeaveRequestView` (new status visible, controls gone) without re-fetching; clicking Reject calls `decide(requestId, 'reject')`; a rejected `decide` surfaces the error state.
- web/src/presentation/pages/DashboardPage.tsx — add a link to `/approvals` that appears ONLY when the signed-in user's role is MANAGER or ADMIN (read role from the profile already fetched via `employeeService.getMe()`, or from `useAuth()` — do NOT decode the JWT). An EMPLOYEE must not see the link. Import `EmployeeRole` from web/src/shared/types/index.ts.
- web/src/presentation/pages/DashboardPage.test.tsx — extend/add coverage asserting the approvals link is present for MANAGER/ADMIN and absent for EMPLOYEE.

This phase depends on existing files — read them before generating: web/src/presentation/pages/ApprovalsPage.tsx (Phase 4), web/src/modules/approvals/index.ts (Phase 1), web/src/presentation/pages/DashboardPage.tsx (current dashboard), web/src/shared/types/index.ts (for `EmployeeRole`), and web/src/presentation/pages/LeaveDetailPage.test.tsx / LeaveListPage.test.tsx (for the established page-test style).
