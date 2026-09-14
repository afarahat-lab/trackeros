# PLAN.md

## Phase 1: Phase 1 — Shared foundations: accrual date helpers + query param extension

Create `src/shared/date/accrual.ts` (new module `shared-date`) exporting three pure UTC helpers: `startOfUtcDay(date: Date): Date`, `addMonths(date: Date, months: number): Date`, and `periodContaining(anchor: Date, accrualMonths: number, date: Date): { start: Date; end: Date }`. These are pure UTC date arithmetic with NO balance-domain knowledge. `startOfUtcDay` returns `new Date(Date.UTC(y, m, d))`; `addMonths` clamps to the last day of the target month (setUTCDate(1), add months, clamp to last day); `periodContaining` steps `accrualMonths` at a time from `startOfUtcDay(anchor)` with a 10,000-iteration safety bound and throws `ConflictError` (import from `src/shared/errors`) when `date < anchor` or no period resolves. Copy the exact implementations currently private in `src/modules/leave/leave.service.ts` (startOfUtcDay/addMonths/periodContaining) and `src/modules/balance/balance.service.ts` (addMonths) — do NOT change their semantics.

Also extend `LeaveRequestQueryParams` in `src/shared/types/index.ts` (module `shared-types`) with `employeeIds?: string[]` (role-scoping filter). No other type changes.

Add Jest unit tests in `tests/unit/shared/accrual.test.ts` covering startOfUtcDay, addMonths (month-end clamping), and periodContaining, including a non-UTC case (e.g. `TZ=Asia/Riyadh`) asserting the helpers read UTC fields only. This phase does NOT refactor leave.service.ts or balance.service.ts to import the new helpers — that happens in later phases.

## Phase 2: Phase 2 — Employee: password_hash migration, findByManagerId, service methods

Add a knex migration (new file under `migrations/`, e.g. `migrations/<timestamp>_add_password_hash.js`) adding a nullable `password_hash` column to `employees` using `t.text('password_hash')` (NOT `t.json`), following the conventions in `migrations/20260913000000_initial_schema.js`. Provide `up` (alterTable add column) and `down` (drop column).

Extend the employee module (module `employee`, path `src/modules/employee/`):
- `employee.model.ts`: add `passwordHash: string | null` to the `Employee` interface (canonical field, never serialized into responses).
- `employee.repository.interface.ts`: add `findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>`.
- `employee.repository.ts`: implement `findByManagerId` (SELECT ... WHERE manager_id = $1, map rows via existing `mapRow`), and update `EmployeeRow`/`mapRow`/`create`/`findById`/`findByEmployeeNumber`/`findByEmail` to select and map the new `password_hash` column.
- `employee.service.interface.ts`: add `getEmployeeByEmail(email: string): Promise<Employee>` and `getEmployeesByManagerId(managerId: string): Promise<Employee[]>`.
- `employee.service.ts`: implement both — `getEmployeeByEmail` calls `repository.findByEmail` and throws `NotFoundError('Employee not found')` when null; `getEmployeesByManagerId` returns `repository.findByManagerId(managerId)`.

This phase depends on `src/modules/employee/employee.model.ts`, `employee.repository.interface.ts`, `employee.repository.ts`, `employee.service.interface.ts`, `employee.service.ts` (existing) — read them before generating. Do NOT add routes or the `/me` endpoint here (Phase 7).

## Phase 3: Phase 3 — Policy: getActivePolicies service exposure

Extend the policy module (module `policy`, path `src/modules/policy/`) to expose active-policy enumeration. `IPolicyRepository.findAll()` ALREADY EXISTS — do NOT add a repository method.

- `policy.service.interface.ts`: add `getActivePolicies(asOf: Date): Promise<LeavePolicy[]>` to `IPolicyService`.
- `policy.service.ts`: implement `getActivePolicies(asOf)` by calling `this.repository.findAll()` (unfiltered) and filtering in service code to AT MOST ONE policy per `leaveTypeCode`: keep rows with `status === LeavePolicyStatus.ACTIVE`, `effectiveFrom <= asOf`, and (`effectiveTo === null || effectiveTo >= asOf`); if more than one remains for a code, keep the one with the latest `effectiveFrom`. Return the resulting array (possibly empty). Import `LeavePolicyStatus` from `./policy.model`.
- `index.ts`: add a `createPolicyService()` factory that wires `new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))` — policy owns its leave-type dependency; the balance module must call this factory, never hand-wire policy internals. Export it.

This phase depends on `src/modules/policy/policy.service.interface.ts`, `policy.service.ts`, `policy.repository.interface.ts`, `policy.model.ts`, `index.ts`, and `src/modules/leave-type/index.ts` — read them before generating. Do NOT touch the balance module here (Phase 5).

## Phase 4: Phase 4 — Auth module: login service + POST /auth/login + public path

Create the auth module (module `auth`, path `src/modules/auth/`). Use `bcrypt` (^5.0.1) and `jsonwebtoken` (^8.5.1) — already dependencies, do NOT add another library.

- `auth.service.ts`: define `IAuthService` with `login(email: string, password: string): Promise<{ token: string; employee: Employee }>` and `AuthService` implementing it. Constructor injects `IEmployeeService`. `login` calls `employeeService.getEmployeeByEmail(email)`; on `NotFoundError` (or when `employee.passwordHash` is null) throw `UnauthorizedError('Invalid email or password')` — a wrong email and a wrong password MUST be indistinguishable (same status 401, same message). Compare with `bcrypt.compare(password, employee.passwordHash)`; on mismatch throw the same `UnauthorizedError`. On success, build the token payload EXACTLY as `src/shared/auth/index.ts` verifies: `sub` = employee id, `role` = employee.role, via `signToken({ id: employee.id, role: employee.role })` from `src/shared/auth`. Return `{ token, employee }` where `employee` is the profile WITHOUT `passwordHash` (strip it — never return `password_hash` in any response body).
- `auth.routes.ts`: register `POST /auth/login`. Parse/validate the body from the wire (do NOT use `request.body as SomeDto`): require `email` and `password` to be non-empty strings, else `ValidationError`. On success return 200 `{ token, employee }`; map `AppError` to `{ error, code }` with correct status (reuse the `sendError` pattern from `src/modules/leave/leave.routes.ts`). Resolve the service from `fastify.authService` if present, else a `createAuthService()` factory.
- `index.ts`: re-export `IAuthService`, `AuthService`, `createAuthService`, `authRoutes`.

Also update `src/shared/auth/index.ts` (module `shared-auth`): add `'/auth/login'` to the `PUBLIC_PATHS` set so the endpoint is reachable WITHOUT a token. Do NOT change the token contract (`sub`/`role`) or `signToken`/`verifyToken` semantics.

This phase depends on `src/shared/auth/index.ts`, `src/shared/errors/index.ts`, `src/modules/employee/index.ts` (for `IEmployeeService`/`Employee`), and `src/modules/leave/leave.routes.ts` (sendError pattern) — read them before generating. Do NOT mount `authRoutes` in `src/app.ts` here (Phase 7).

## Phase 5: Phase 5 — Balance: getBalancesForEmployee + GET /balances/me

Extend the balance module (module `balance`, path `src/modules/balance/`) to expose the caller's current balances.

- `balance.service.ts`: add a `BalanceSummary` value type `{ leaveTypeCode: LeaveTypeCode; periodStart: Date; periodEnd: Date; entitledDays: number; usedDays: number; pendingDays: number; available: number }` (available = entitledDays - usedDays - pendingDays). Add `getBalancesForEmployee(employeeId: string): Promise<BalanceSummary[]>` to `IBalanceService` and implement it in `BalanceService`. Implementation: fetch the employee via `employeeService.getEmployeeById(employeeId)`; fetch active policies via `policyService.getActivePolicies(new Date())` (from Phase 3); for EACH policy compute the accrual period containing `now` using the SHARED `periodContaining(employee.hireDate, policy.accrualPeriodMonths, new Date())` from `src/shared/date/accrual.ts` (Phase 1) — do NOT re-derive it; look up the balance via `repository.findByKey(employeeId, policy.leaveTypeCode, period.start, period.end)`. BINDING RULE: if NO balance row exists for a policy's current period, OMIT that leave type from the list (do NOT synthesize an entry, do NOT throw). An employee with no open periods returns `[]` (valid 200, not 404). One missing period must not fail the whole request. Return the list (possibly empty). Read-only — never open a transaction.
- `balance.routes.ts` (new): register `GET /balances/me`. Resolve the actor from `request.user` (never a client-supplied id) using the `resolveActor` pattern from `src/modules/leave/leave.routes.ts`; call `balanceService.getBalancesForEmployee(actor.id)`; return 200 with the array. Map `AppError` via `sendError`. Resolve the service from `fastify.balanceService` if present, else a `createBalanceService()` factory wiring `new BalanceService(new PgLeaveBalanceRepository(), new EmployeeService(new PgEmployeeRepository()), createPolicyService(), new PgUnitOfWork())` — use `createPolicyService()` from `../policy` (Phase 3), NEVER hand-wire policy internals.
- `index.ts`: export `BalanceSummary`, `getBalancesForEmployee` (via `IBalanceService`), `createBalanceService`, `balanceRoutes`.

This phase depends on `src/shared/date/accrual.ts` (Phase 1), `src/modules/policy/index.ts` (Phase 3), `src/modules/balance/balance.service.ts`, `balance.repository.ts`, `balance.model.ts`, `index.ts`, and `src/modules/leave/leave.routes.ts` (resolveActor/sendError pattern) — read them before generating. Do NOT mount `balanceRoutes` in `src/app.ts` here (Phase 7).

## Phase 6: Phase 6 — Leave reads: findByQuery employeeIds, list/getById, GET /leaves + /leaves/:id

Extend the leave module (module `leave`, path `src/modules/leave/`) with the read surface.

- `leave.repository.ts`: extend `findByQuery` to honour `params.employeeIds` (from Phase 1's `LeaveRequestQueryParams` extension) using `employee_id = ANY($n)` — push the array as a single parameter and add the condition. Do NOT write SQL in a service and do NOT fetch-all-and-filter in application code; the scope must be in the query. No other repository changes.
- `leave.service.ts`: add `list(actor: LeaveActor, query: LeaveRequestQueryParams): Promise<LeaveRequest[]>` and `getById(actor: LeaveActor, requestId: string): Promise<LeaveRequest>` to `ILeaveService` and implement in `LeaveService`. Role scoping (BINDING): EMPLOYEE → `employeeIds = [actor.id]`; MANAGER → `[actor.id, ...directReportIds]` where direct reports are `employeeService.getEmployeesByManagerId(actor.id)` mapped to their ids (one level, NOT transitive); ADMIN → no `employeeIds` filter (sees all). `list` merges the scoped `employeeIds` into the query and calls `repository.findByQuery`. `getById` loads via `repository.findById`; if null OR the caller may not see it (same visibility rule as `list`), throw `NotFoundError('Leave request not found')` — a caller who may not see it gets the SAME response as one that does not exist. Visibility is status-INDEPENDENT (a manager sees direct reports' requests in every status). Read-only — never open a transaction.
- `leave.routes.ts`: add `GET /leaves` and `GET /leaves/:id`. Parse query params from the wire (they arrive as strings): convert `status`/`leaveTypeCode` (validate enum membership), and the four date bounds (`startDateFrom`/`startDateTo`/`endDateFrom`/`endDateTo`) via a `toDate` helper like `parseCreateBody`; parse `limit`/`offset` as integers. Resolve the actor from `request.user` (never a client-supplied id). `GET /leaves` returns 200 with the array; `GET /leaves/:id` returns 200 with the single request. Map `AppError` via the existing `sendError`.

This phase depends on `src/shared/types/index.ts` (Phase 1), `src/modules/employee/index.ts` (Phase 2 `getEmployeesByManagerId`), `src/modules/leave/leave.repository.ts`, `leave.service.ts`, `leave.routes.ts`, `leave.model.ts` — read them before generating. Do NOT mount anything new in `src/app.ts` (leaveRoutes is already mounted).

## Phase 7: Phase 7 — Employee /me route + smoke check extension + unit tests

Wire the new routes and add verification.

- `src/modules/employee/employee.routes.ts` (new): register `GET /employees/me`. Resolve the actor from `request.user` (never a client-supplied id) using the `resolveActor` pattern from `src/modules/leave/leave.routes.ts`; call `employeeService.getEmployeeById(actor.id)`; return 200 with the profile but STRIP `passwordHash` (never serialize it). Map `AppError` via `sendError`. Resolve the service from `fastify.employeeService` if present, else `new EmployeeService(new PgEmployeeRepository())`.
- `src/modules/employee/index.ts`: export `employeeRoutes`.
- `src/app.ts`: mount `authRoutes` (Phase 4), `balanceRoutes` (Phase 5), and `employeeRoutes` (this phase) alongside the existing `uptimeRoutes`/`leaveRoutes`. `registerAuth(app)` is already registered before routes — keep it.
- `scripts/smoke.js`: EXTEND with new stages proving each endpoint works over real HTTP: log in (`POST /auth/login` with a seeded employee's credentials) and get a token, then use that token to fetch `GET /employees/me`, `GET /leaves`, `GET /leaves/:id`, and `GET /balances/me`. Assert REAL values, not just status codes (the list returns the seeded request; the balance numbers match the seeded row). Seed TWO leave types with effective policies but a balance row for only ONE, and assert `GET /balances/me` contains exactly the seeded one (pins the BINDING omission rule). The existing stages 1 through 3d must keep working EXACTLY as they do now — do NOT delete, skip, weaken, or loosen any existing assertion.
- Add Jest unit tests in the style of `tests/unit/modules/leave/leave.routes.test.ts`: `tests/unit/modules/auth/auth.service.test.ts` (login success, wrong email vs wrong password indistinguishable, null passwordHash, token payload sub/role, passwordHash stripped), `tests/unit/modules/balance/balance.service.test.ts` (getBalancesForEmployee: list shape, available computation, omission when no balance row, `[]` when no periods, one missing period does not fail the whole request), and `tests/unit/modules/leave/leave.service.test.ts` additions for `list`/`getById` (EMPLOYEE self, MANAGER self+direct reports one level, ADMIN all, status-independent visibility, getById NotFoundError for invisible/missing).

This phase depends on `src/modules/auth/index.ts` (Phase 4), `src/modules/balance/index.ts` (Phase 5), `src/modules/employee/index.ts`, `src/modules/leave/leave.routes.ts`, `src/app.ts`, `scripts/smoke.js`, and `tests/unit/modules/leave/leave.routes.test.ts` — read them before generating.
