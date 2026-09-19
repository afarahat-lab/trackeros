# PLAN.md

## Phase 1: Phase 1 — web/ scaffold + shared foundations

Create the web/ frontend scaffold and the shared foundation modules. This is a NEW top-level `web/` directory (NOT under src/), a separate Vite build with its own package.json/tsconfig.

Files (approximately 8):
- `web/package.json` — React + TypeScript + Vite + Vitest + Testing Library + React Router only (no UI component library, no state-management library). Scripts: `dev`, `build` (tsc --noEmit + vite build), `test` (vitest).
- `web/tsconfig.json` and `web/tsconfig.node.json` — strict TypeScript (noImplicitAny, strictNullChecks), JSX react-jsx, moduleResolution bundler.
- `web/vite.config.ts` — React plugin, Vitest config (jsdom environment, setup file), dev proxy for `/auth`, `/employees`, `/leaves`, `/balances` to the local API.
- `web/index.html` and `web/src/main.tsx` — entry point mounting the React root (router wiring comes in Phase 5; main.tsx may mount a placeholder until then).
- `web/src/shared/types/index.ts` — the shared-types module. Define EXACTLY these canonical types with the EXACT field shapes from the architecture: `EmployeeRole` ('EMPLOYEE' | 'MANAGER' | 'ADMIN'), `LeaveTypeCode` ('annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'), `LeaveStatus` ('DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'), `EmploymentStatus` ('ACTIVE' | 'TERMINATED' | 'ON_LEAVE'), `AuthSessionStatus` ('ANONYMOUS' | 'AUTHENTICATED' | 'EXPIRED'), `EmployeeProfile` (id, employeeNumber, firstName, lastName, email, role: EmployeeRole, managerId: string | null, department, hireDate: Date, employmentStatus: EmploymentStatus), `LeaveBalanceView` (id, employeeId, leaveTypeCode, periodStart: Date, periodEnd: Date, entitledDays, usedDays, pendingDays, available), `LeaveRequestView` (id, employeeId, leaveTypeCode, startDate: Date, endDate: Date, requestedDays, reason: string | null, status: LeaveStatus, approverId: string | null, approvalComment: string | null, submittedAt: Date | null, decidedAt: Date | null, cancelledBy: string | null, cancelledAt: Date | null), and `LoginResponse` ({ token: string; profile: EmployeeProfile }). Do NOT rename, split, add, or omit any field.
- `web/src/shared/date/index.ts` — the shared-date module. Implement `formatUtcDate(value: Date | string): string` using `Intl.DateTimeFormat` with `timeZone: 'UTC'` (BINDING rule 3 — the single shared formatter every view imports; never bare `new Date(...)` local getters, never string-slice the ISO date), and `parseUtcDate(value: string): Date` parsing an ISO string as UTC.

Include Vitest unit tests for the shared types (enum member sets) and the date formatter (a UTC date string renders the same day regardless of host timezone — set TZ to a non-UTC zone in the test and assert the day does not shift).

## Phase 2: Phase 2 — infrastructure API client + token storage

Build the infrastructure API client and token storage. This phase depends on `web/src/shared/types/index.ts` from Phase 1 — read it before generating any code that references its types.

Files (approximately 4), all under `web/src/infrastructure/api/`:
- `web/src/infrastructure/api/token-storage.ts` — `ITokenStorage` interface and `TokenStorage` implementation. BINDING rule (questions 1 & 4): persist the bearer token in **sessionStorage** (cleared on tab close, survives reload). Do NOT use localStorage and do NOT use in-memory only. Methods: `getToken(): string | null`, `setToken(token: string): void`, `clear(): void`.
- `web/src/infrastructure/api/api-error.ts` — `ApiError` class (message, status: number, code?: string) for typed HTTP errors.
- `web/src/infrastructure/api/api-client.ts` — `IApiClient` interface and `ApiClient` implementation. Constructor takes an `ITokenStorage`. Every request attaches `Authorization: Bearer <token>` when a token is present. On a **401 response**, clear the token via the storage and surface a typed signal (throw `ApiError` with status 401) so callers can route to login — BINDING rule (question 2): rely solely on the server's 401; do NOT decode JWT exp client-side. Provide typed methods for the endpoints this feature uses: `login(email, password): Promise<LoginResponse>` (POST /auth/login, public, no token), `getMe(): Promise<EmployeeProfile>` (GET /employees/me), `getLeaves(): Promise<LeaveRequestView[]>` (GET /leaves), `getLeave(id): Promise<LeaveRequestView>` (GET /leaves/:id), `getBalances(): Promise<LeaveBalanceView[]>` (GET /balances/me). Import `LoginResponse`, `EmployeeProfile`, `LeaveRequestView`, `LeaveBalanceView` from `web/src/shared/types/index.ts`.
- `web/src/infrastructure/api/index.ts` — barrel re-exporting `IApiClient`, `ApiClient`, `ITokenStorage`, `TokenStorage`, `ApiError`.

Include Vitest unit tests asserting the Authorization header is sent on authenticated calls and that a 401 clears the token from sessionStorage.

## Phase 3: Phase 3 — auth module

Build the auth module. This phase depends on `web/src/shared/types/index.ts` (Phase 1) and `web/src/infrastructure/api/index.ts` (Phase 2) — read both before generating code that references their types.

Files (approximately 4), all under `web/src/modules/auth/`:
- `web/src/modules/auth/auth-session.ts` — `AuthSession` type with the EXACT canonical shape: `{ token: string; profile: EmployeeProfile; status: AuthSessionStatus }`. Import `EmployeeProfile` and `AuthSessionStatus` from `web/src/shared/types/index.ts`.
- `web/src/modules/auth/auth.service.ts` — `IAuthService` interface and `AuthService` implementation. Constructor takes an `IApiClient` and `ITokenStorage` (from `web/src/infrastructure/api/index.ts`). `login(email, password): Promise<AuthSession>` calls `apiClient.login`, stores the token via `tokenStorage.setToken`, and returns an `AuthSession` with `status: 'AUTHENTICATED'`. `logout(): void` clears the token and returns to an anonymous state. On login failure, surface the server's error message WITHOUT revealing whether the email exists (the API is enumeration-safe; do not add any email-existence hint).
- `web/src/modules/auth/auth-context.tsx` — `AuthProvider` React context provider and `useAuth()` hook. Holds the current `AuthSession` in React state (no state-management library). Exposes `login`, `logout`, and the current session. On mount, if a token exists in storage, initialize an authenticated session (profile may be re-fetched via `getMe`).
- `web/src/modules/auth/index.ts` — barrel re-exporting `IAuthService`, `AuthService`, `AuthProvider`, `useAuth`, `AuthSession`.

Include Vitest unit tests for `AuthService.login` (success stores the token and returns an authenticated session; failure surfaces the server message without email-existence hints) and `logout` (clears the token).

## Phase 4: Phase 4 — employee + leave + balance services

Build the employee, leave, and balance service modules. This phase depends on `web/src/shared/types/index.ts` (Phase 1) and `web/src/infrastructure/api/index.ts` (Phase 2) — read both before generating code that references their types.

Files (approximately 6):
- `web/src/modules/employee/employee.service.ts` — `IEmployeeService` interface and `EmployeeService` implementation. Constructor takes an `IApiClient`. `getMe(): Promise<EmployeeProfile>` delegates to `apiClient.getMe()`. Import `EmployeeProfile` from `web/src/shared/types/index.ts`.
- `web/src/modules/employee/index.ts` — barrel re-exporting `IEmployeeService`, `EmployeeService`.
- `web/src/modules/leave/leave.service.ts` — `ILeaveService` interface and `LeaveService` implementation. Constructor takes an `IApiClient`. `list(): Promise<LeaveRequestView[]>` delegates to `apiClient.getLeaves()`; `getById(id): Promise<LeaveRequestView>` delegates to `apiClient.getLeave(id)`. Import `LeaveRequestView` from `web/src/shared/types/index.ts`.
- `web/src/modules/leave/balance.service.ts` — `IBalanceService` interface and `BalanceService` implementation. Constructor takes an `IApiClient`. `getBalances(): Promise<LeaveBalanceView[]>` delegates to `apiClient.getBalances()`. Import `LeaveBalanceView` from `web/src/shared/types/index.ts`.
- `web/src/modules/leave/index.ts` — barrel re-exporting `ILeaveService`, `LeaveService`, `IBalanceService`, `BalanceService`.

These are thin read-only delegating services (no create/submit/approve/reject/cancel — explicitly out of scope). Include Vitest unit tests asserting each service delegates to the correct API client method and returns the typed result.

## Phase 5: Phase 5 — presentation: router, pages, guards

Build the presentation layer: router, pages, and route guards. This phase depends on the auth module (Phase 3) and the employee/leave/balance services (Phase 4) — read `web/src/modules/auth/index.ts`, `web/src/modules/employee/index.ts`, and `web/src/modules/leave/index.ts` before generating code that references their types.

Files (approximately 8), all under `web/src/presentation/`:
- `web/src/presentation/App.tsx` — the App router using React Router. Wrap routes in `AuthProvider`. Define routes: `/login` (public), `/` (dashboard, guarded), `/leaves` (list, guarded), `/leaves/:id` (detail, guarded). A guarded route redirects to `/login` when there is no authenticated session.
- `web/src/presentation/guards/RequireAuth.tsx` — a route guard component using `useAuth()`: if the session is not authenticated, `<Navigate to="/login" replace />`; otherwise render children. This is the single place that handles the 401/redirect-to-login behaviour (BINDING rule — one code path).
- `web/src/presentation/pages/LoginPage.tsx` — the login screen. On success, route to the dashboard. On failure, show the server's error message; do NOT reveal whether the email exists.
- `web/src/presentation/pages/DashboardPage.tsx` — shows the signed-in employee (`EmployeeService.getMe`) and their leave balance (`BalanceService.getBalances`).
- `web/src/presentation/pages/LeaveListPage.tsx` — lists the employee's leave requests (`LeaveService.list`), each row showing type, dates, and status.
- `web/src/presentation/pages/LeaveDetailPage.tsx` — detail view for one request (`LeaveService.getById`), using the `:id` route param.
- `web/src/presentation/components/` — shared UI components (e.g. a `LogoutButton` that calls `logout()` and returns to login, and any small presentational components the pages share). No UI component library.
- `web/src/presentation/index.ts` — barrel re-exporting the App router and pages.

BINDING rule 3: every view that renders a date MUST import `formatUtcDate` from `web/src/shared/date/index.ts` (Phase 1) — the list and detail views must not each implement their own formatting. Include Vitest component tests for the login flow (success and failure) and the 401-redirect behaviour.

## Phase 6: Phase 6 — component tests + README

Finalize component tests and documentation. This phase depends on all prior phases — read `web/src/presentation/index.ts`, `web/src/modules/auth/index.ts`, `web/src/infrastructure/api/index.ts`, and `web/src/shared/date/index.ts` before generating tests that reference their types.

Files (approximately 6):
- Component tests (Vitest + Testing Library) covering the DONE-WHEN criteria: the login flow (success routes to dashboard and stores the token; failure shows the server's error message without revealing email existence), the 401-redirect behaviour (an authenticated call returning 401 clears the token and routes to login rather than rendering an empty page), and that the bearer token is sent on authenticated calls. Place tests under `web/src/**/*.test.tsx` alongside the modules they cover (e.g. `web/src/presentation/pages/LoginPage.test.tsx`, `web/src/presentation/guards/RequireAuth.test.tsx`, `web/src/infrastructure/api/api-client.test.ts`).
- `web/README.md` — document how to run the frontend against a local API: install (`npm install`), run the dev server (`npm run dev`) with the Vite proxy pointing at the local Fastify API, run the production build (`npm run build`), and run tests (`npm test`). Note the sessionStorage token behaviour and the 401-redirect flow.

DONE-WHEN: `npm run build` in web/ produces a production bundle with zero TypeScript errors; component tests cover login (success/failure), 401-redirect, and token-on-authenticated-calls; the existing backend build and its 181 tests remain untouched (no files under src/ are modified).
