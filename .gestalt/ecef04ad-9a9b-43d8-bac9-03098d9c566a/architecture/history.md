# Architecture history — feature ecef04ad-9a9b-43d8-bac9-03098d9c566a

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 804-861 of the pre-consolidation
file, 4,485 bytes.

---

<!-- gestalt:architecture feature=ecef04ad-9a9b-43d8-bac9-03098d9c566a START -->
## Web Frontend (React + Vite) — Login and Read-Only Employee Leave View

### Scope
New top-level `web/` directory, separate from the `src/` Fastify backend. React + TypeScript + Vite SPA. Dependencies: React, React DOM, React Router, Vite, TypeScript, Vitest, Testing Library. No UI component library, no state-management library.

### Domain entities (client-side)
- **AuthSession** — token, profile, status. Lifecycle: `LOGGED_OUT` → `LOGGED_IN` → `EXPIRED` → `LOGGED_OUT`. Created on login, cleared on logout or any 401.
- **EmployeeProfile** — read-only signed-in employee; never carries `passwordHash` or `terminationDate`.
- **LeaveBalanceView** — read-only balance; `available = entitledDays - usedDays - pendingDays` (display only, never persisted). Lifecycle: `OPEN`, `CLOSED`.
- **LeaveRequestView** — read-only leave request. Lifecycle displayed only: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`. Carries `reversesRequestId: string | null` (the GP-008 reversal linkage): `null` on an original row, the original's id on a CANCELLED reversal row. Read-only projection — no lifecycle transitions and no client-side reversal behaviour.
### Module boundaries
- `shared-types` — `web/src/shared/types/` — `EmployeeProfile`, `LeaveBalanceView`, `LeaveRequestView`, `LoginResponse`, enums (`EmployeeRole`, `LeaveTypeCode`, `LeaveStatus`, `EmploymentStatus`, `AuthSessionStatus`).
- `shared-date` — `web/src/shared/date/` — `formatUtcDate`, `parseUtcDate`.
- `api-client` — `web/src/infrastructure/api/` — `IApiClient`/`ApiClient`, `ITokenStorage`/`TokenStorage`, `ApiError`.
- `auth` — `web/src/modules/auth/` — `IAuthService`/`AuthService`, `AuthProvider`/`useAuth`, `AuthSession`.
- `employee` — `web/src/modules/employee/` — `IEmployeeService`/`EmployeeService`.
- `leave` — `web/src/modules/leave/` — `ILeaveService`/`LeaveService`, `IBalanceService`/`BalanceService`.
- `presentation` — `web/src/presentation/` — App router, `LoginPage`, `DashboardPage`, `LeaveListPage`, `LeaveDetailPage`, shared UI components.

### Dependency map
`presentation` → `auth`, `employee`, `leave`, `shared-types`, `shared-date`; `auth` → `api-client`, `shared-types`; `employee` → `api-client`, `shared-types`; `leave` → `api-client`, `shared-types`; `api-client` → `shared-types`; `shared-date` → `shared-types`. No circular edges.

### Cross-cutting contracts
- **Auth**: consumes backend contract; `request.user = { id: string; role: EmployeeRole }`, `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`; JWT bearer verified server-side; frontend sends `Authorization: Bearer <token>`, stores token, redirects to login on any 401.
- **Error**: `{ error: string; code: string }`; 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 other. Login failure shows server message verbatim; no email enumeration.
- **Transaction**: none — read-only; login is a single non-persistent write.

### Data
No new SQL schemas, tables, or repositories. Existing backend tables (`employees`, `leave_requests`, `leave_balances`, `leave_types`, `leave_policies`) are consumed via HTTP and remain unchanged.

### Binding rules
- All API dates render in UTC; never shift by browser local timezone.
- Every authenticated call sends bearer token; any 401 clears token and returns to login.
- Login failure must not reveal whether email exists.
- `available` is display-only, never persisted or mutated.
- Frontend is read-only for leave requests: no create/submit/approve/reject/cancel.

### Phases
1. `web/` scaffold + shared foundations
2. Infrastructure API client + token storage
3. Auth module
4. Employee + leave + balance services
5. Presentation: router, pages, guards
6. Component tests + README

### Open questions
- Token storage mechanism (localStorage/sessionStorage/in-memory)
- Proactive JWT expiry detection vs server 401 only
- UTC date rendering implementation (Date.UTC/getUTC*, Intl timeZone UTC, raw YYYY-MM-DD substring)

### Done when
- `npm run build` in `web/` produces a production bundle with zero TypeScript errors.
- Component tests cover login success/failure, 401 redirect, and bearer-token sending.
- Existing backend build and its 181 tests still pass, untouched.
- README documents how to run the frontend against a local API.
<!-- gestalt:architecture feature=ecef04ad-9a9b-43d8-bac9-03098d9c566a END -->

