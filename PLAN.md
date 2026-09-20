# PLAN.md

## Phase 1: Phase 1 — Extend IApiClient + ApiClient with write endpoints

Extend the API client transport layer with the five write endpoints the backend already serves.

Files (approximately 3):
1. web/src/shared/types/index.ts — add the `CreateLeaveRequestInput` DTO owned by shared-types: `{ leaveTypeCode: LeaveTypeCode; startDate: string; endDate: string }` where startDate/endDate are ISO 8601 strings (never Date objects). Reuse the existing `LeaveTypeCode` enum; do not add or rename any other type.
2. web/src/infrastructure/api/api-client.ts — extend the `IApiClient` interface with five methods and implement them in `ApiClient`:
   - `createLeave(input: CreateLeaveRequestInput): Promise<LeaveRequestView>` → `POST /leaves` with `JSON.stringify(input)` body.
   - `submitLeave(id: string): Promise<LeaveRequestView>` → `POST /leaves/${id}/submit`.
   - `approveLeave(id: string): Promise<LeaveRequestView>` → `POST /leaves/${id}/approve`.
   - `rejectLeave(id: string): Promise<LeaveRequestView>` → `POST /leaves/${id}/reject`.
   - `cancelLeave(id: string): Promise<LeaveRequestView>` → `POST /leaves/${id}/cancel`.
   All five use the existing private `request<T>()` pattern with `authenticated: true` (bearer token attachment + 401 token clear + `ApiError` mapping via `toApiError`). The action endpoints take NO body (matching the backend contract). Dates cross the wire as ISO strings only.
3. web/src/infrastructure/api/api-client.test.ts — add vitest coverage: each method issues the correct method/path/body (assert `fetch` called with `POST /leaves` and the JSON body for create; `POST /leaves/:id/submit|approve|reject|cancel` with no body for the actions), attaches the bearer token, and maps a non-2xx body to an `ApiError` carrying the backend's `error` message and `code` (cover a rejected create, e.g. insufficient balance, surfacing the API's own message).

This phase depends on the existing files web/src/infrastructure/api/api-client.ts, web/src/infrastructure/api/api-error.ts, web/src/infrastructure/api/token-storage.ts, and web/src/shared/types/index.ts — read them before generating.

## Phase 2: Phase 2 — Extend ILeaveService + LeaveService with write methods

Extend the leave domain service with the write workflow and add the two pure helpers the pages will consume.

Files (approximately 5, all under web/src/modules/leave/):
1. web/src/modules/leave/leave.service.ts — extend `ILeaveService` with `create(input: CreateLeaveRequestInput): Promise<LeaveRequestView>`, `submit(id: string)`, `approve(id: string)`, `reject(id: string)`, `cancel(id: string)` (all returning `Promise<LeaveRequestView>`). Implement each in `LeaveService` by delegating verbatim to the corresponding `IApiClient` method added in Phase 1 (`createLeave`, `submitLeave`, `approveLeave`, `rejectLeave`, `cancelLeave`). No lifecycle logic in the service — it returns the API client's value unchanged and propagates `ApiError` unchanged.
2. web/src/modules/leave/leave.actions.ts — add the pure helper `getAvailableLeaveActions(status: LeaveStatus, role: EmployeeRole, isOwner: boolean): string[]` implementing the status+role action matrix: owner may `submit` (DRAFT) and `cancel` (DRAFT or SUBMITTED); MANAGER/ADMIN may `approve`/`reject` (SUBMITTED). Return an empty array for any combination the user may not take. No I/O, no imports beyond the enums.
3. web/src/modules/leave/leave.validation.ts — add the pure helper `validateLeaveRequestInput(input: CreateLeaveRequestInput): string[]` enforcing ONLY the three spec rules: both dates required (non-empty), end date not before start date compared as calendar dates, and a leave type chosen. It must NOT mirror min-notice or max-duration (backend policy) and must fetch nothing. Return an array of human-readable error strings (empty when valid).
4. web/src/modules/leave/index.ts — re-export the new symbols (`getAvailableLeaveActions`, `validateLeaveRequestInput`) alongside the existing exports.
5. web/src/modules/leave/leave.service.test.ts — extend the existing vitest suite: each write method delegates to the matching apiClient method with the right argument and returns the value unchanged; each propagates an `ApiError` unchanged (cover a rejected create). Add tests for `getAvailableLeaveActions` (owner submit/cancel, manager approve/reject, forbidden combinations return empty) and `validateLeaveRequestInput` (missing dates, end-before-start, missing type, and the valid case returning empty).

This phase depends on web/src/infrastructure/api/api-client.ts (the extended `IApiClient` from Phase 1) and web/src/shared/types/index.ts (the `CreateLeaveRequestInput` DTO and enums) — read them before generating any code that references their types.

## Phase 3: Phase 3 — RequestLeavePage form + route wiring

Create the "Request leave" form page.

Files (approximately 2):
1. web/src/presentation/pages/RequestLeavePage.tsx — a new page component `RequestLeavePage({ leaveService }: { leaveService: ILeaveService })` that renders a form capturing leave type (select over the `LeaveTypeCode` enum values), start date, and end date (both as date inputs producing ISO strings). On submit it calls `validateLeaveRequestInput` (Phase 2) and, if errors are returned, shows them inline WITHOUT calling the network; if valid it calls `leaveService.create({ leaveTypeCode, startDate, endDate })`. On success it navigates to the new request's detail page via `useNavigate()` → `/leaves/${created.id}`. On failure it surfaces the API's own error message (e.g. insufficient balance) rather than a generic failure. No comment/reason input.
2. web/src/presentation/pages/RequestLeavePage.test.tsx — vitest coverage: a validation failure (e.g. end before start, missing type) renders the error and never calls `leaveService.create`; a successful create navigates to `/leaves/${id}`; a rejected create (apiClient rejects with `ApiError`) surfaces the API's message. Use the established `*.test.tsx` style beside the subject.

This phase depends on web/src/modules/leave/leave.service.ts (the extended `ILeaveService.create`), web/src/modules/leave/leave.validation.ts (`validateLeaveRequestInput`), and web/src/shared/types/index.ts (`LeaveTypeCode`, `CreateLeaveRequestInput`) from Phases 1–2 — read them before generating. Route registration in App.tsx is deferred to Phase 5.

## Phase 4: Phase 4 — LeaveDetailPage actions + role awareness

Add workflow actions and role awareness to the leave detail page.

Files (approximately 3):
1. web/src/presentation/pages/LeaveDetailPage.tsx — extend `LeaveDetailPage` to accept an additional `employeeService: IEmployeeService` prop. On mount (alongside the existing `getById`), fetch the signed-in profile via `employeeService.getMe()` to obtain `role` and `id` (role awareness comes from GET /employees/me — never decode the JWT). Compute `isOwner = profile.id === request.employeeId` and call `getAvailableLeaveActions(request.status, profile.role, isOwner)` (Phase 2). Render ONLY the returned actions as buttons (submit/cancel for the owner, approve/reject for a manager); an action the user may not take must not be rendered at all. Each button calls the matching `leaveService` method (`submit`/`approve`/`reject`/`cancel`) and, on success, updates local state with the returned `LeaveRequestView` so the page reflects the new status without a manual reload; on failure surface the API's error message. approve/reject take NO comment input (backend takes no body). Per the binding rule, OMIT the approval-comment row entirely when `approvalComment` is null (do not render a dash/empty value).
2. web/src/presentation/pages/LeaveDetailPage.test.tsx — vitest coverage: owner sees submit/cancel for a DRAFT and no approve/reject; a manager sees approve/reject for a SUBMITTED request and no submit/cancel; an action the role forbids is not rendered; a successful action updates the displayed status without reload; a failed action surfaces the API error; the approval-comment row is absent when null.
3. web/src/presentation/App.tsx — pass the already-available `employeeService` prop into `<LeaveDetailPage leaveService={leaveService} employeeService={employeeService} />` so the page compiles and is deployable.

This phase depends on web/src/modules/leave/leave.service.ts and web/src/modules/leave/leave.actions.ts (Phase 2), web/src/modules/employee/employee.service.ts (`IEmployeeService.getMe`), and web/src/shared/types/index.ts (`LeaveStatus`, `EmployeeRole`) — read them before generating.

## Phase 5: Phase 5 — LeaveListPage link + composition root wiring

Wire the request-leave entry point and finish composition-root wiring.

Files (approximately 3):
1. web/src/presentation/pages/LeaveListPage.tsx — add a "Request leave" link (using `Link` from react-router-dom) to `/leaves/new` so the form is reachable from the leave list. Keep the existing list rendering intact.
2. web/src/presentation/App.tsx — register the new route: `<Route path="/leaves/new" element={<RequireAuth><RequestLeavePage leaveService={leaveService} /></RequireAuth>} />` (import `RequestLeavePage`). Confirm the `/leaves/:id` route already passes `employeeService` (from Phase 4).
3. web/src/presentation/index.ts — re-export `RequestLeavePage` and `RequestLeavePageProps` alongside the existing page exports.

This phase depends on web/src/presentation/pages/RequestLeavePage.tsx (Phase 3), web/src/presentation/pages/LeaveDetailPage.tsx (Phase 4), and the existing web/src/presentation/App.tsx / web/src/presentation/index.ts — read them before generating. No change to web/src/main.tsx is required (it already injects `employeeService` and `leaveService`).
