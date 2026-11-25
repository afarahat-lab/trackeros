# Architecture history — feature 7d61f09d-b7fc-45d9-8704-fa055d377b19

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 927-993 of the pre-consolidation
file, 6,615 bytes.

---

<!-- gestalt:architecture feature=7d61f09d-b7fc-45d9-8704-fa055d377b19 START -->
## Feature: Leave workflow in web app (request, submit, approve, reject, cancel)

### Scope
Client-side only under `web/`. No changes to backend or `src/`. Consumes existing backend endpoints: POST /leaves, POST /leaves/:id/submit, POST /leaves/:id/approve, POST /leaves/:id/reject, POST /leaves/:id/cancel.

### Domain entities
- **LeaveRequest** — lifecycle: DRAFT → SUBMITTED → APPROVED | REJECTED, plus CANCELLED. Attributes: id, employeeId, leaveTypeCode, startDate (ISO string), endDate (ISO string), requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt.
- **Employee** — role awareness only; lifecycle: ACTIVE, TERMINATED, ON_LEAVE. Attributes: id, role (EMPLOYEE | MANAGER | ADMIN), managerId.
- **LeaveType** — static catalog; no lifecycle. Attributes: code, name.

### Conceptual table specifications
None. No new persistence in `web/`; existing backend tables (`leave_requests`, `leave_balances`, `audit_logs`, `notifications`, `employees`, `leave_types`, `leave_policies`) are unchanged and out of scope.

### Repository interfaces and concrete implementations
None in `web/`. Transport is `IApiClient`/`ApiClient`; no database repositories are introduced.

### Module boundaries
- `shared-types` — `web/src/shared/types/` — CreateLeaveRequestInput DTO, LeaveTypeCode, LeaveStatus, EmployeeRole, LeaveRequestView, EmployeeProfile.
- `api-client` — `web/src/infrastructure/api/` — IApiClient (extended with createLeave/submitLeave/approveLeave/rejectLeave/cancelLeave), ApiClient, ApiError, ITokenStorage/TokenStorage.
- `leave` — `web/src/modules/leave/` — ILeaveService (extended with create/submit/approve/reject/cancel), LeaveService, getAvailableLeaveActions, validateLeaveRequestInput, IBalanceService/BalanceService.
- `employee` — `web/src/modules/employee/` — IEmployeeService.getMe(), EmployeeService.
- `presentation-pages` — `web/src/presentation/pages/` — RequestLeavePage, LeaveDetailPage, LeaveListPage, DashboardPage.
- `presentation-guards` — `web/src/presentation/guards/` — RequireAuth.

### Dependency map
- leave → api-client, shared-types
- employee → api-client, shared-types
- api-client → shared-types
- presentation-pages → leave, employee, shared-types, presentation-guards

### Cross-cutting contracts
- **Auth**: Existing session contract reused; no new API surface. AuthSession { token, profile: EmployeeProfile, status } held in AuthContext. Identity/role come from profile.role (EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN') fetched via GET /employees/me; JWT is never decoded in the browser. ApiClient attaches bearer token from ITokenStorage and clears it on 401. Route-level access enforced by RequireAuth; action-level visibility enforced by getAvailableLeaveActions(status, role, isOwner) in pages — forbidden actions are never rendered.
- **Error/response**: ApiError { error: string; code: string } mapped from non-2xx bodies. Validation failure → 400; authentication → 401; authorization → 403; not found → 404; conflict → 409. RequestLeavePage and LeaveDetailPage display ApiError.message (the backend's own error text, e.g. insufficient balance) rather than a generic failure. Client-side validation failures (missing dates, end < start, no type) are caught before any network call and shown inline.
- **Transaction**: None. Each write action is a single HTTP call to an existing backend endpoint; atomicity is owned by the backend's IUnitOfWork/PgUnitOfWork contract, out of scope for this web/ change.

### Lifecycle states
- LeaveRequest: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- Employee: ACTIVE, TERMINATED, ON_LEAVE
- LeaveType: static (no lifecycle)

### Business rules
- Dates cross the wire as ISO strings, never Date objects; the web client serializes startDate/endDate as ISO strings and parses server responses back to strings for display.
- requestedDays = endDate - startDate + 1 inclusive calendar days, whole-day UTC, no weekend/holiday exclusion; never re-derived client-side.
- A leave request may be created only when endDate is not before startDate, both dates are present, and a leave type is chosen; validated client-side before any network call.
- Action availability is a pure function of (request.status, actor.role, actor.id vs request.employeeId):
  - Owner (request.employeeId === profile.id): submit available when status DRAFT; cancel available when status DRAFT or SUBMITTED.
  - Manager/Admin (profile.role === 'MANAGER' || 'ADMIN'): approve/reject available when status SUBMITTED. The backend enforces the direct-manager rule; the client renders based on role+status and surfaces any 403 as an error.
  - Forbidden actions are never rendered.
- Role awareness comes exclusively from GET /employees/me; the JWT is never decoded in the browser.
- When the backend rejects a create/action, the API's own error message is surfaced verbatim (e.g. insufficient balance), never replaced by a generic failure.
- After a successful action, the leave detail page re-fetches the request and reflects the new status without a manual reload.

### Recommended phases
1. **Phase 1 — Extend IApiClient + ApiClient with write endpoints** (2 files): Add createLeave/submitLeave/approveLeave/rejectLeave/cancelLeave using existing request<T> pattern (bearer token, ApiError mapping, ISO-string dates).
2. **Phase 2 — Extend ILeaveService + LeaveService with write methods** (2 files): Add create/submit/approve/reject/cancel plus pure getAvailableLeaveActions and validateLeaveRequestInput helpers.
3. **Phase 3 — RequestLeavePage form + route wiring** (3 files): New form capturing leave type, start/end dates; client-side validation; surfaces API error on rejection; navigates to detail on success.
4. **Phase 4 — LeaveDetailPage actions + role awareness** (2 files): Render submit/cancel (owner) and approve/reject (manager) only when available; refresh status after action without reload; forbidden actions never rendered.
5. **Phase 5 — LeaveListPage link + composition root wiring** (3 files): Add 'Request leave' link; wire new page into App routes and main.tsx.

### Stack compliance note
Web tests use Vitest (existing web test runner; required by feature done criteria `vitest run`). The declared project stack lists Jest for backend tests; this web-only feature does not alter backend test tooling.

### Open questions
See openQuestions field.
<!-- gestalt:architecture feature=7d61f09d-b7fc-45d9-8704-fa055d377b19 END -->

