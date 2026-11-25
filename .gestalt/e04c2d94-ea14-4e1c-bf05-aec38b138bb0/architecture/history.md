# Architecture history — feature e04c2d94-ea14-4e1c-bf05-aec38b138bb0

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 994-1042 of the pre-consolidation
file, 4,454 bytes.

---

<!-- gestalt:architecture feature=e04c2d94-ea14-4e1c-bf05-aec38b138bb0 START -->
## Feature: Manager approvals queue (web only)

### Domain entities
- **ApprovalsQueueItem** — derived read-model projection of a LeaveRequest awaiting decision. Attributes: requestId, employeeId, employeeName (nullable), leaveTypeCode, startDate, endDate, status (always SUBMITTED while in queue). Lifecycle: AWAITING_DECISION -> RESOLVED.
- **LeaveRequest** — existing source-of-truth entity. Attributes: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, status, approverId, decidedAt. Lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **EmployeeProfile** — signed-in viewer identity/role from GET /employees/me. Attributes: id, role (EMPLOYEE | MANAGER | ADMIN), firstName, lastName. No lifecycle.

### Business rules
- Queue membership: status === SUBMITTED AND employeeId !== viewer.id AND viewer.role ∈ {MANAGER, ADMIN}. Backend GET /leaves already scopes by role; queue applies SUBMITTED + not-self client-side.
- Visibility role-gated at route boundary: only MANAGER/ADMIN; EMPLOYEE neither sees dashboard link nor can reach /approvals.
- Decision authority reuses getAvailableLeaveActions(status, role, isOwner) — no second copy.
- Decision transitions request out of SUBMITTED, removing it from queue without manual reload.
- Empty queue is explicit normal state, distinct from loading/error.
- Role derived only from EmployeeProfile; JWT never decoded in browser.

### Conceptual tables (pre-existing, unchanged)
- **leave_requests**: id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: status (queue filter), employee_id (direct reports), (leave_type_code, start_date) (list/date-range).
- **employees**: id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: manager_id (direct reports), email (unique login), employee_number (unique lookup).

No new tables, columns, or repositories.

### Repository interfaces / data access
No new repository interfaces. Existing web data-access boundary is IApiClient/ApiClient (HTTP fetch), with LeaveService/EmployeeService delegating to it. ApprovalsService reuses getLeaves(), approveLeave(), rejectLeave(), and getAvailableLeaveActions(); no new transport methods.

### Module boundaries
- `web/src/modules/approvals/` — IApprovalsService, ApprovalsService, index.ts. Methods: listPending(profile), approve(id), reject(id).
- `web/src/presentation/guards/` — RequireApprover (MANAGER|ADMIN only, else redirect).
- `web/src/presentation/pages/` — ApprovalsPage (list, approve/reject, empty state, drill-in link), DashboardPage (role-gated approvals link).
- `web/src/presentation/App.tsx` — /approvals route wrapped in RequireAuth + RequireApprover.

Dependencies flow inward: presentation -> modules -> infrastructure. Approvals depends on leave, employee, shared-types. No circular edges.

### Cross-cutting contracts
- **Auth**: Identity/role from EmployeeProfile (GET /employees/me) held in auth session; EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'. /approvals wrapped in RequireAuth + RequireApprover; non-MANAGER/ADMIN redirected.
- **Error**: No new API endpoints; page surfaces existing ApiError failures (message + optional code) from reused api-client methods. Rejected decision rendered inline without manual reload; empty queue distinct non-error state.
- **Transaction**: EMPTY — read-only queue plus single existing API writes; atomicity owned by backend.

### Recommended phases
1. Phase 1 — Approvals service module (3 files)
2. Phase 2 — Approvals service unit tests (1 file)
3. Phase 3 — RequireApprover route guard (2 files)
4. Phase 4 — ApprovalsPage + route wiring (2 files)
5. Phase 5 — ApprovalsPage tests + dashboard link (3 files)

### Open question
- Employee column rendering: API exposes employeeId but no employee name; web employee service only getMe(). Options: render employeeId as-is, omit column, or resolve from existing list (none exists).
<!-- gestalt:architecture feature=e04c2d94-ea14-4e1c-bf05-aec38b138bb0 END -->

