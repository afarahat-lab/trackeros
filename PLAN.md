# PLAN.md

## Phase 1: Phase 1 — shared-types + employee read support

Add the employee filter to the leave query params and the employee manager-listing read support that later phases consume. Approximately 5 files.

1. `src/shared/types/index.ts` — add `employeeIds?: string[]` to the existing `LeaveRequestQueryParams` interface (do NOT add any other field). This is the role-scoping hook that `findByQuery` will honour in Phase 4.

2. `src/modules/employee/employee.repository.interface.ts` — add `findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>` to `IEmployeeRepository`.

3. `src/modules/employee/employee.repository.ts` — implement `findByManagerId` with `SELECT id, employee_number, first_name, last_name, email, role, manager_id, department, hire_date, termination_date, employment_status FROM employees WHERE manager_id = $1`, reusing the existing `mapRow`. Do NOT touch `password_hash` here (that column does not exist yet — it arrives with the Phase 2 migration).

4. `src/modules/employee/employee.service.interface.ts` — add `getEmployeesByManagerId(managerId: string): Promise<Employee[]>` to `IEmployeeService`.

5. `src/modules/employee/employee.service.ts` — implement `getEmployeesByManagerId` by delegating to `this.repository.findByManagerId(managerId)`.

This phase depends on the existing files `src/modules/employee/employee.model.ts`, `employee.repository.ts`, `employee.repository.interface.ts`, `employee.service.ts`, `employee.service.interface.ts`, and `src/shared/types/index.ts` — read them before generating. Do not add routes, services beyond the above, or tests in this phase.

## Phase 2: Phase 2 — auth module + migration

Add the nullable `password_hash` credential column and the `POST /auth/login` endpoint. Approximately 7 files.

1. `migrations/<new timestamp>_add_password_hash.js` — a knex migration adding a nullable `password_hash` column to `employees` using `t.text('password_hash')` (nullable, no default), following the conventions in `migrations/20260913000000_initial_schema.js`. Provide a matching `down` that drops the column.

2. `src/modules/employee/employee.model.ts` — add `passwordHash: string | null` to the `Employee` interface (canonical entity field).

3. `src/modules/employee/employee.repository.ts` — add `password_hash` to every SELECT column list and to `mapRow` (map to `passwordHash`). The `EmployeeRow` interface gains `password_hash: string | null`.

4. `src/modules/auth/auth.service.ts` — declare `LoginInput { email: string; password: string }`, `LoginResult { token: string; employee: Employee }`, `IAuthService { login(input: LoginInput): Promise<LoginResult> }`, and `AuthService`. `login` looks up the account via `IEmployeeRepository.findByEmail` (already exists — do NOT add a new lookup), compares with `bcrypt.compare` against `employee.passwordHash`, and mints a token via `signToken({ id: employee.id, role: employee.role })` from `src/shared/auth`. A wrong email and a wrong password MUST be indistinguishable (same status/message — throw `UnauthorizedError`). Never return `passwordHash` in any response.

5. `src/modules/auth/auth.routes.ts` — `authRoutes(fastify)` registering `POST /auth/login` (200). Parse/validate the body (reject missing/non-string email/password with `ValidationError`), call the service, and map errors via a `sendError` helper matching `src/modules/leave/leave.routes.ts`. Resolve the service from `fastify.authService` if present, else construct it.

6. `src/modules/auth/index.ts` — re-export `LoginInput`, `LoginResult`, `IAuthService`, `AuthService`, `authRoutes`.

7. `src/shared/auth/index.ts` — add `'/auth/login'` to the `PUBLIC_PATHS` set so the endpoint is reachable without a token. Do NOT change the token payload contract (`sub` = employee id, `role` = EmployeeRole).

8. `src/app.ts` — register `authRoutes` (import from `./modules/auth`).

This phase depends on Phase 1 (`src/modules/employee/employee.repository.ts`, `employee.model.ts`) and the existing `src/shared/auth/index.ts` (`signToken`), `src/shared/errors/index.ts`, and `src/shared/types/index.ts` (`EmployeeRole`). Read them before generating. `bcrypt` and `jsonwebtoken` are already dependencies — use them, do not add libraries.

## Phase 3: Phase 3 — balance read endpoint

Extract the accrual-period UTC helpers into a shared module and add `GET /balances/me`. Approximately 6 files.

1. `src/shared/date/accrual.ts` — NEW file exporting `startOfUtcDay(date: Date): Date`, `addMonths(date: Date, months: number): Date`, and `periodContaining(anchor: Date, accrualMonths: number, date: Date): { start: Date; end: Date }`. Copy the exact UTC arithmetic currently in `LeaveService` (private `startOfUtcDay`/`addMonths`/`periodContaining`), including the 10,000-iteration safety bound and the ConflictError on a date preceding the anchor. This is the single source of truth for accrual-period derivation.

2. `src/modules/leave/leave.service.ts` — delete the private `startOfUtcDay`, `addMonths`, and `periodContaining` methods and import the three helpers from `src/shared/date/accrual.ts` instead. `resolveBalance` must call the shared `periodContaining`. No behaviour change.

3. `src/modules/balance/balance.service.ts` — add `getBalanceForEmployee(employeeId: string): Promise<...>` to `IBalanceService` and implement it in `BalanceService`. It returns ALL leave-type balances for the caller's CURRENT period as a LIST (never a single object, even when one element). For each leave type, resolve the policy's `accrualPeriodMonths`, compute the current period via the shared `periodContaining(employee.hireDate, accrualMonths, new Date())`, and look the balance up with `findByKey`. Each returned entry includes `leaveTypeCode`, `periodStart`, `periodEnd`, `entitledDays`, `usedDays`, `pendingDays`, and a computed `available = entitledDays - usedDays - pendingDays`. Read-only — no transaction, no writes.

4. `src/modules/balance/balance.routes.ts` — NEW file: `balanceRoutes(fastify)` registering `GET /balances/me` (200). Resolve the actor from `request.user` (never a client-supplied id) with a `resolveActor` helper matching `leave.routes.ts`, call `getBalanceForEmployee(actor.id)`, and map errors via `sendError`.

5. `src/modules/balance/index.ts` — export `balanceRoutes`.

6. `src/app.ts` — register `balanceRoutes`.

This phase depends on Phase 1 (`src/modules/employee` service for `getEmployeeById`), the existing `src/modules/balance/balance.service.ts` / `balance.repository.ts` / `balance.model.ts`, `src/modules/policy` (`getPolicyByLeaveTypeCode`), and `src/modules/leave/leave.service.ts`. Read them before generating. Do not add unit tests here (they land in Phase 5).

## Phase 4: Phase 4 — leave read endpoints

Add `GET /leaves` and `GET /leaves/:id` with role-scoped visibility. Approximately 3 files.

1. `src/modules/leave/leave.repository.ts` — extend `findByQuery` to honour `params.employeeIds` (added in Phase 1): when present and non-empty, add `employee_id = ANY($n)` with the array as a single parameter. Keep the existing inclusive date-range operators (`>=`/`<=`) and all other filters unchanged. Do NOT write SQL in the service or filter in application code.

2. `src/modules/leave/leave.service.ts` — add `list(actor: LeaveActor, params: LeaveRequestQueryParams): Promise<LeaveRequest[]>` and `getById(actor: LeaveActor, id: string): Promise<LeaveRequest>` to `ILeaveService` and implement them. Role scoping (identical for both): EMPLOYEE → `employeeIds = [actor.id]`; MANAGER → `employeeIds = [actor.id, ...(await employeeService.getEmployeesByManagerId(actor.id)).map(e => e.id)]` (direct reports plus self, one level only); ADMIN → omit `employeeIds` (sees all). `getById` fetches via `findById` and, when the request is missing OR the caller may not see it, throws `NotFoundError` (the SAME response as a non-existent id). Reuse the existing `assertAuthenticated` guard.

3. `src/modules/leave/leave.routes.ts` — add `GET /leaves` and `GET /leaves/:id` (both 200). Parse query parameters from the wire (they arrive as strings): convert `status`/`leaveTypeCode` to their enum values, convert the four date bounds (`startDateFrom`/`startDateTo`/`endDateFrom`/`endDateTo`) to `Date` via a guarded parser (throw `ValidationError` on invalid), and parse `limit`/`offset` as integers — mirroring `parseCreateBody`'s string-to-Date discipline. Resolve the actor via the existing `resolveActor` and map errors via `sendError`.

This phase depends on Phase 1 (`employeeIds` on `LeaveRequestQueryParams`, `getEmployeesByManagerId`) and the existing `src/modules/leave/leave.repository.ts`, `leave.service.ts`, `leave.routes.ts`, and `src/shared/types/index.ts`. Read them before generating. Do not add tests here.

## Phase 5: Phase 5 — employee/me route + smoke + unit tests

Add `GET /employees/me`, extend the smoke check with real-value assertions for every new endpoint, and add unit tests. Approximately 6-8 files.

1. `src/modules/employee/employee.routes.ts` — NEW file: `employeeRoutes(fastify)` registering `GET /employees/me` (200). Resolve the actor from `request.user` (never a client-supplied id) via a `resolveActor` helper matching `leave.routes.ts`, call `employeeService.getEmployeeById(actor.id)` (already exists), and map errors via `sendError`. Resolve the service from `fastify.employeeService` if present, else `new EmployeeService(new PgEmployeeRepository())`.

2. `src/modules/employee/index.ts` — export `employeeRoutes`.

3. `src/app.ts` — register `employeeRoutes`.

4. `scripts/smoke.js` — EXTEND (do not weaken) the existing stages 1 through 3d. Add new stages that: (a) `POST /auth/login` with a seeded employee's credentials and assert a token + profile come back (seed a `password_hash` via `bcrypt.hashSync` in the Postgres branch); (b) use that token to `GET /employees/me` and assert the returned profile matches the seeded employee; (c) `GET /leaves` and assert the seeded request is present; (d) `GET /leaves/:id` and assert the seeded request's fields; (e) `GET /balances/me` and assert the balance numbers match the seeded row (including `available`). Assert real values, not just status codes. Keep stages 1-3d byte-for-byte equivalent in behaviour.

5. Unit tests (Jest, in the style of `tests/unit/modules/leave/leave.routes.test.ts`): `tests/unit/modules/auth/auth.routes.test.ts` (login success, wrong email/password indistinguishable, missing fields), `tests/unit/modules/balance/balance.routes.test.ts` (list shape, available computation), `tests/unit/modules/employee/employee.routes.test.ts` (GET /employees/me), extend `tests/unit/modules/leave/leave.routes.test.ts` for the GET endpoints (role scoping, invisible id → 404), and `tests/unit/shared/date/accrual.test.ts` for the extracted helpers including a non-UTC case (run with `TZ=Asia/Riyadh`).

This phase depends on Phases 1-4 and the existing `scripts/smoke.js`, `src/app.ts`, `src/modules/employee/employee.service.ts`, and `tests/unit/modules/leave/leave.routes.test.ts`. Read them before generating.
