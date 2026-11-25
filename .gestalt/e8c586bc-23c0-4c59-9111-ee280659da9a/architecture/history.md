# Architecture history — feature e8c586bc-23c0-4c59-9111-ee280659da9a

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 360-653 of the pre-consolidation
file, 44,858 bytes.

---

<!-- gestalt:architecture feature=e8c586bc-23c0-4c59-9111-ee280659da9a START -->
## Authentication and read endpoints (v3) — Reconciled Architecture

### Stack compliance
TypeScript 20, Fastify, PostgreSQL, modular monolith, Jest. No controller layer is introduced; routes call services directly (open question Q1).

### Domain entities and lifecycle states
- **Employee**: id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, passwordHash. Lifecycle: ACTIVE, TERMINATED, ON_LEAVE.
- **AuthToken**: sub, role, expiresIn. Lifecycle: ISSUED, EXPIRED.
- **LeaveRequest**: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt. Lifecycle: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED.
- **LeaveBalance**: id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available (computed). Lifecycle: OPEN, CLOSED.
- **LeavePolicy**: id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status. Lifecycle: DRAFT, ACTIVE, SUPERSEDED.
- **LeaveType**: code, name, requiresApproval, maxConsecutiveDays, isPaid. Lifecycle: none (static catalog).

### Binding business rules
- requestedDays = endDate - startDate + 1 (inclusive calendar days, whole-day UTC, no weekend/holiday exclusion) is the single canonical day-count derivation.
- Date-range filtering is inclusive on both edges: startDateFrom <= startDate <= startDateTo and endDateFrom <= endDate <= endDateTo.
- Leave visibility is role-scoped: EMPLOYEE sees only their own requests; MANAGER sees their own plus direct reports (employee.managerId === actor.id), one level only, not transitive; ADMIN sees all. Same rule for list and single-read.
- Manager visibility is status-unrestricted; visibility and decide authority are separate (decide stays SUBMITTED-only).
- Unauthorized single-read returns the same 404 as a nonexistent id (no id probing).
- Login: wrong email vs wrong password indistinguishable; passwordHash never in any response.
- Accrual-period derivation shared (startOfUtcDay/addMonths/periodContaining, pure UTC, anchored on hireDate) — one implementation reused by leave and balance paths.
- Effective policy selection: at most one per leaveTypeCode (ACTIVE, effectiveFrom <= asOf, effectiveTo null or >= asOf; tie-break latest effectiveFrom).
- No balance row for a policy's current period → omit that leave type; no open periods → empty list (200), never an error.
- available = entitledDays - usedDays - pendingDays.
- Actor always resolved from the verified token, never a client-supplied id.

### Conceptual tables
- **employees**: fields id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: email unique, employee_number unique, manager_id.
- **leave_requests**: fields id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id, status, (leave_type_code, start_date).
- **leave_balances**: fields id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Indexes: (employee_id, leave_type_code, period_start, period_end) unique, employee_id.
- **leave_policies**: fields id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months, carry_forward_days, min_notice_days, max_request_days, requires_manager_approval, effective_from, effective_to, status. PK id. FK leave_type_code -> leave_types.code. Index: leave_type_code.
- **leave_types**: fields code, name, requires_approval, max_consecutive_days, is_paid. PK code. Index: code natural key.

Migration note: add nullable `password_hash` to `employees` using `t.text(...)` per initial-schema convention; date columns are UTC-parsed by `src/shared/db/connection.ts`.

### Repositories
- **IEmployeeRepository / PgEmployeeRepository**: create, findById, findByEmployeeNumber, findByEmail, findByManagerId.
- **ILeaveRepository / PgLeaveRequestRepository**: create, findById, update, findByQuery.
- **IPolicyRepository / PgLeavePolicyRepository**: create, findById, findByLeaveTypeCode, findAll.
- **IBalanceRepository / PgLeaveBalanceRepository**: create, findById, findByKey, update.
- **ILeaveTypeRepository / PgLeaveTypeRepository** (existing, referenced by policy): findById/findByCode.

### Modules and boundaries
- **shared-date** (`src/shared/date/`): startOfUtcDay, addMonths, periodContaining, index.ts.
- **shared-types** (`src/shared/types/`): EmployeeProfile, LeaveRequestQueryParams.employeeIds, canonical enums, requestedDays.
- **shared-auth** (`src/shared/auth/`): registerAuth, signToken, verifyToken, public path set.
- **shared-errors** (`src/shared/errors/`): AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError.
- **shared-db** (`src/shared/db/`): connection.ts, pg Pool, IUnitOfWork.
- **validation** (`src/shared/validation/`): validation helpers.
- **audit** (`src/modules/audit/`): audit logging.
- **notification** (`src/modules/notification/`): notification dispatch.
- **leave-type** (`src/modules/leave-type/`): LeaveType, ILeaveTypeRepository, PgLeaveTypeRepository, LeaveTypeService.
- **auth** (`src/modules/auth/`): IAuthService, AuthService, authRoutes (POST /auth/login), login flow (bcrypt compare + signToken).
- **employee** (`src/modules/employee/`): Employee (incl passwordHash), IEmployeeRepository (+findByManagerId), PgEmployeeRepository, IEmployeeService (+getEmployeeByEmail, getEmployeesByManagerId, getEmployeeProfileById), EmployeeService, employeeRoutes (GET /employees/me), toEmployeeProfile mapping.
- **policy** (`src/modules/policy/`): LeavePolicy, IPolicyRepository, PgLeavePolicyRepository, IPolicyService (+getAllPolicies), PolicyService.
- **balance** (`src/modules/balance/`): LeaveBalance, IBalanceRepository, PgLeaveBalanceRepository, IBalanceService (+getCurrentBalances), BalanceService, balanceRoutes (GET /balances/me).
- **leave** (`src/modules/leave/`): LeaveRequest, ILeaveRepository, PgLeaveRequestRepository, ILeaveService (+list, getById), LeaveService, leaveRoutes (+GET /leaves, GET /leaves/:id).

### Dependency map
- auth -> employee, shared-auth, shared-types, shared-errors
`shared-auth` is here for the `AuthUser` type employee.routes.ts reads off the request.
- employee -> shared-auth, shared-types, shared-errors, shared-db
- policy -> leave-type, shared-types, shared-errors
- balance -> employee, policy, shared-date, shared-types, shared-errors, shared-db
- leave -> balance, validation, policy, employee, audit, notification, leave-type, shared-date, shared-types, shared-errors, shared-db
`shared-errors` is here because accrual.ts throws ConflictError on an out-of-range date.
- shared-date -> shared-errors, shared-types
- shared-auth -> shared-types, shared-errors

#### The web build (`web/src/`)

This repository holds TWO builds. The service above lives under `src/`; the React app lives
under `web/src/` with its own `package.json` and its own module boundaries. They are declared
as separate application roots in `HARNESS.json` (`qualityGate.applicationRoots`), and the web
root carries the `web-` prefix — without it the two builds' `leave` modules would collide in
this one flat map, which is how a frontend came to be checked against the backend's
allow-list and had every import reported as a violation (run `ecef04ad`).

Module names are DERIVED from the path, not chosen: `<prefix><name>` under the `modules`
container, `<prefix><container>-<name>` under any other. A name that does not derive this way
is not merely odd — the dependency check resolves the file, finds no entry, and stays silent.
This map previously carried `api-client` and `presentation-pages`, which matched nothing, so
the entire frontend was checked by nothing at all.

The direction is: presentation -> modules -> infrastructure -> shared. `web-approvals`
deliberately does NOT reach `web-infrastructure-api` directly; it goes through the
`web-leave` and `web-employee` services, and that is the layering this map exists to hold.

- web-infrastructure-api -> web-shared-types
- web-auth -> web-infrastructure-api, web-shared-types
- web-employee -> web-infrastructure-api, web-shared-types
- web-leave -> web-infrastructure-api, web-shared-types
- web-approvals -> web-employee, web-leave, web-shared-types
- web-presentation-components -> web-auth
`web-leave` is here for ONE import: `canApproveLeave`. A route guard asking the module
that owns the authorization rule is the point — the guard used to carry its own inverted
copy (`role === EMPLOYEE -> deny`), which fails OPEN the day a fourth role exists.
- web-presentation-guards -> web-auth, web-leave, web-shared-types
- web-presentation-pages -> web-approvals, web-auth, web-employee, web-leave, web-presentation-components, web-shared-date, web-shared-types

### Recommended phases
1. **Shared foundations: date helpers + shared types** — extract accrual helpers and add shared types. (3 files)
2. **Employee: password_hash, findByManagerId, profile mapping** — migration, repository/service extensions, toEmployeeProfile. (6 files)
3. **Policy: getAllPolicies exposure** — add IPolicyService.getAllPolicies() calling existing findAll(). (2 files)
4. **Auth module: POST /auth/login** — bcrypt.compare + signToken, indistinguishable error, public path. (4 files)
5. **Balance: getCurrentBalances + GET /balances/me** — iterate active policies, derive period, omit missing rows. (3 files)
6. **Leave reads: list/getById + GET /leaves, GET /leaves/:id** — extend findByQuery with employeeIds, role scoping, 404-equivalence. (4 files)
7. **GET /employees/me route + smoke/unit tests** — wire profile route, extend smoke.js, add unit tests. (5 files)

### Cross-cutting contracts
- **Auth**: `request.user: { id: string; role: EmployeeRole }` where `EmployeeRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`. Identity/role obtained from a JWT bearer token verified by the existing `registerAuth` preHandler (`src/shared/auth/index.ts`), which populates `request.user` from `payload.sub` (id) and `payload.role`. RBAC enforced at the API boundary by `resolveActor` and in services (role-scoped visibility), never inline in routes. `POST /auth/login` is added to the public path set; all other new endpoints require a valid token.
- **Error**: errors return `{ error: string; code: string }`. Validation failure -> HTTP 400 (ValidationError); authentication failure -> 401 (UnauthorizedError); authorization failure -> 403 (ForbiddenError); not found -> 404 (NotFoundError); invalid state transition -> 409 (ConflictError); other -> 500. `POST /auth/login` returns the SAME status and message for wrong email and wrong password (401 UnauthorizedError). `GET /leaves/:id` returns the SAME 404 NotFoundError for a request the caller may not see as for one that does not exist.
- **Transaction**: none required — this feature is read-only plus a single non-persistent login write; read endpoints must not open a transaction.

### Phase 1 delivered (shared date helpers + shared types)

This phase delivered only the shared foundations (recommended phase 1); the employee/policy/auth/balance/leave-read work (phases 2–7) is not yet implemented.

- `src/shared/date/accrual.ts` — three pure UTC helpers copied verbatim from the private implementations in `src/modules/leave/leave.service.ts` (`startOfUtcDay`, `addMonths`, `periodContaining`) and `src/modules/balance/balance.service.ts` (`addMonths`), with unchanged arithmetic, error messages, and the 10,000-iteration safety bound. `startOfUtcDay` returns `Date.UTC(y,m,d)` of the input's UTC components; `addMonths` clones, sets UTC date to 1, adds months via `setUTCMonth`, and clamps the day to the last day of the target month; `periodContaining` steps `accrualMonths` periods from the anchor's UTC day start and throws `ConflictError` when `date < anchor` ('Requested date precedes the accrual anchor') or when no period resolves within the bound ('Unable to resolve accrual period'). `ConflictError` is imported from `src/shared/errors`.
- `src/shared/date/index.ts` — public entry point re-exporting `startOfUtcDay`, `addMonths`, `periodContaining`.
- `src/shared/types/index.ts` — added `EmployeeProfile` (id, employeeNumber, firstName, lastName, email, role: EmployeeRole, managerId: string | null, department, hireDate: Date, employmentStatus: EmploymentStatus — **no** passwordHash or terminationDate, reusing the existing enums) and added `employeeIds?: string[]` to `LeaveRequestQueryParams`. No other enum or DTO changed.
- `tests/unit/shared/date.test.ts` — Jest coverage for `startOfUtcDay` (UTC midnight, no input mutation), `addMonths` (advance, month-end clamping incl. leap-year February, negative offsets, no mutation), `periodContaining` (period containment, anchor-day start, multi-month periods, month-end clamp, ConflictError on date-before-anchor), plus a describe block setting `process.env.TZ = 'Asia/Riyadh'` proving the helpers are unaffected by the host timezone.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 1 and the phase spec exactly. The three helpers are behaviorally identical to their private sources, `EmployeeProfile` omits `passwordHash`/`terminationDate`, and `leave.service.ts`/`balance.service.ts` were **not** refactored to import the shared helpers (deferred to a later phase, per the spec's out-of-scope constraint).

### Phase 2 delivered (employee password_hash, findByManagerId, profile mapping)

This phase delivers the employee credential column and read surface (recommended phase 2); the policy/auth/balance/leave-read work (phases 3–7) is not yet implemented.

- `migrations/20260913000001_add_password_hash_to_employees.js` — `exports.up` runs `knex.schema.alterTable('employees', (t) => { t.text('password_hash'); })` (nullable, `t.text` not `t.json`); `exports.down` drops the column. The migration comment documents that `password_hash` is nullable (null = no credential issued) and never synthesized/defaulted by the repository or service.
- `src/modules/employee/employee.model.ts` — `Employee` gained `passwordHash: string | null` (canonical field, appended last). `CreateEmployeeInput` is unchanged in shape (still `Omit<Employee, 'id'>`), so `create` now supplies `passwordHash` from input.
- `src/modules/employee/employee.repository.interface.ts` — `IEmployeeRepository` gained `findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>`.
- `src/modules/employee/employee.repository.ts` — `EmployeeRow`/`mapRow` gained `password_hash`; every SELECT list and the INSERT column/value list now carry `password_hash` (create persists `input.passwordHash`); `findByManagerId` implemented with `WHERE manager_id = $1` returning `result.rows.map(mapRow)`.
- `src/modules/employee/employee.service.interface.ts` — `IEmployeeService` gained `getEmployeeByEmail(email: string): Promise<Employee>`, `getEmployeesByManagerId(managerId: string): Promise<Employee[]>`, and `getEmployeeProfileById(id: string): Promise<EmployeeProfile>`.
- `src/modules/employee/employee.service.ts` — implemented the three methods plus a module-local `toEmployeeProfile(employee)` helper that maps an `Employee` to `EmployeeProfile`, **omitting `passwordHash` and `terminationDate`**. `getEmployeeByEmail` throws NotFoundError(404) on unknown email; `getEmployeeProfileById` throws NotFoundError(404) on unknown id; `getEmployeesByManagerId` delegates to `repository.findByManagerId` (returns `[]` for an unknown manager).
- `tests/unit/modules/employee.service.test.ts` — new `getEmployeeByEmail`, `getEmployeesByManagerId`, and `getEmployeeProfileById` describe blocks (plus the existing create/getById coverage): `getEmployeeByEmail` happy path + NotFoundError; `getEmployeesByManagerId` returns direct reports and `[]` for an unknown manager; `getEmployeeProfileById` asserts the profile equals the expected shape and `not.toHaveProperty('passwordHash')` / `not.toHaveProperty('terminationDate')`, plus NotFoundError. The `FakeEmployeeRepository` gained `findByManagerId` and `makeInput` gained `passwordHash: null`.

**Divergences from the plan worth noting:**
- PLAN.md Phase 2 item (7) prescribed editing `src/modules/employee/index.ts` to "re-export nothing new (types already exported) but confirm `EmployeeProfile` is imported from shared-types, not re-declared." No change was needed: `index.ts` already re-exports the model/repository/service types, and `EmployeeProfile` is imported from `src/shared/types` in `employee.service.ts` (not re-declared), so `index.ts` was left untouched.
- The plan's file count (~6) did not account for the two existing test fakes that implement `IEmployeeService` — `tests/unit/modules/balance/balance.service.test.ts` and `tests/unit/modules/leave/leave.service.test.ts` — which had to gain the three new methods (`getEmployeeByEmail`, `getEmployeesByManagerId`, `getEmployeeProfileById`) to keep satisfying the expanded interface. Those fakes were updated in this phase (the balance/leave fakes now implement the new methods, with `getEmployeeProfileById` throwing `Not implemented`).

### Phase 3 delivered (policy getAllPolicies exposure)

This phase delivers the policy read-through (recommended phase 3); the auth/balance/leave-read work (phases 4–7) is not yet implemented.

- `src/modules/policy/policy.service.interface.ts` — `IPolicyService` gained `getAllPolicies(): Promise<LeavePolicy[]>`.
- `src/modules/policy/policy.service.ts` — `PolicyService.getAllPolicies()` delegates verbatim to `this.repository.findAll()` with no filtering, sorting, transformation, or validation; it returns the repository's rows unchanged (any status, repository ordering) and returns `[]` when empty (never throws). No repository method was added or modified, and no new files, imports, or barrel changes were made.
- `tests/unit/modules/balance/balance.service.test.ts` and `tests/unit/modules/leave/leave.service.test.ts` — the `FakePolicyService` fakes gained `getAllPolicies(): Promise<LeavePolicy[]>` (returning `this.rows`) to keep satisfying the expanded `IPolicyService` interface. No new test file was added; the method is a plain read-through with no behavior of its own to assert beyond the existing fakes.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 3 and the phase spec exactly: a two-file service-layer change (interface + implementation) delegating to the existing `IPolicyRepository.findAll()`, with no filtering (the ACTIVE/effective-date/latest-effectiveFrom selection remains deferred to Phase 5) and no balance -> leave-type dependency.

### Phase 4 delivered (auth module: POST /auth/login)

This phase delivers the auth module and login endpoint (recommended phase 4); the balance/leave-read/employee-route work (phases 5–7) is not yet implemented.

- `src/modules/auth/auth.service.ts` — `IAuthService` with `login(email, password): Promise<{ token: string; profile: EmployeeProfile }>` and `AuthService`. The constructor injects `IEmployeeService` (from `../employee`). `login` calls `employeeService.getEmployeeByEmail(email)` inside a try/catch that maps `NotFoundError` to `UnauthorizedError('Invalid email or password')` (indistinguishable from a failed compare), then `bcrypt.compare(password, employee.passwordHash ?? '')` — a failed compare throws the SAME `UnauthorizedError('Invalid email or password')`. On success it builds the `EmployeeProfile` inline (an object literal, NOT the employee module's `toEmployeeProfile` helper — omitting `passwordHash` and `terminationDate`) and returns `{ token: signToken({ id: employee.id, role: employee.role }), profile }`. A `createAuthService()` factory wires `new AuthService(new EmployeeService(new PgEmployeeRepository()))`.
- `src/modules/auth/auth.routes.ts` — `authRoutes(fastify)` registers `POST /auth/login` (200). `parseLoginBody` rejects a non-string `email`/`password` with `ValidationError` (400). The handler calls `authService.login` and returns `{ token, profile }`; a local `sendError` maps `AppError` to `{ error, code }` with the correct status and any other throw to 500 (the same shape as `leave.routes.ts`, but a local copy — no `resolveActor` is used since login is public). The service instance is resolved from `fastify.authService` if present, else `createAuthService()`.
- `src/modules/auth/index.ts` — re-exports `IAuthService`, `AuthService`, `createAuthService`, and `authRoutes`.
- `src/shared/auth/index.ts` — added `'/auth/login'` to the `PUBLIC_PATHS` set so the endpoint is reachable WITHOUT a bearer token.
- `src/app.ts` — `app.register(authRoutes)` (after `leaveRoutes`, and after `registerAuth` so the public-path exemption applies).

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 4 and the phase spec exactly: bcrypt.compare + signToken, indistinguishable wrong-email/wrong-password (both `UnauthorizedError('Invalid email or password')`), no controller file, no transaction/audit/repository access in the auth module, and the profile mapper is defined inline in the service (not the employee module's `toEmployeeProfile`).

### Phase 5 delivered (balance getCurrentBalances + GET /balances/me)

This phase delivers the balance read service and route (recommended phase 5); the leave-read and employee-route work (phases 6–7) is not yet implemented.

- `src/modules/balance/balance.service.ts` — `IBalanceService` gained `getCurrentBalances(employeeId: string): Promise<Array<LeaveBalance & { available: number }>>` and `BalanceService` implements it. The service now imports `periodContaining` from `../../shared/date` (Phase 1) and `LeavePolicyStatus` from `../policy` (the public entry point, never a bare `'ACTIVE'` string). `getCurrentBalances` is **read-only** — it never opens a transaction and never forwards a client:
  - Fetches the employee via `employeeService.getEmployeeById` (surfacing NotFoundError(404) for an unknown employee).
  - Fetches ALL policies via `policyService.getAllPolicies()` (Phase 3).
  - Selects at most one effective policy per `leaveTypeCode` into a `Map<LeaveTypeCode, LeavePolicy>`: `status === LeavePolicyStatus.ACTIVE`, `effectiveFrom <= asOf`, `effectiveTo === null || effectiveTo >= asOf`, tie-broken by the latest `effectiveFrom` (a later policy overwrites an earlier one in the map).
  - For each selected policy, computes the current accrual period via `periodContaining(employee.hireDate, policy.accrualPeriodMonths, asOf)` and looks the balance up with `repository.findByKey(employeeId, policy.leaveTypeCode, period.start, period.end)`.
  - Omits any leave type whose current period has no balance row (never throws, never synthesizes); when none match, returns `[]`.
  - Each returned entry spreads the stored balance and adds the computed `available = entitledDays - usedDays - pendingDays` (never persisted, never mutates the stored row).
- `src/modules/balance/balance.routes.ts` — NEW file. `balanceRoutes(fastify)` registers `GET /balances/me` (200). It carries **local copies** of `resolveActor` (extracts `request.user`, enforces `id` presence and `EmployeeRole` membership, throwing UnauthorizedError on a missing/invalid actor) and `sendError` (maps `AppError` to `{ error, code }` with its status, any other throw to 500) — the same shape as `leave.routes.ts`/`auth.routes.ts`, but not imported from them. The handler resolves the actor, calls `balanceService.getCurrentBalances(actor.id)`, and returns the list. The service instance is resolved from `fastify.balanceService` if present, else `createBalanceService()`.
- `src/modules/balance/index.ts` — re-exports `balanceRoutes`.
- `src/app.ts` — `app.register(balanceRoutes)` (after `leaveRoutes`, before `authRoutes`).

**Divergences from the plan worth noting:**
- The spec's consistency requirement said to "reuse the resolveActor/sendError helper shape ... exactly as implemented in the leave routes." The implementation uses local copies of both helpers (matching the `auth.routes.ts` precedent) rather than importing them from `leave.routes.ts` — the shape is identical, but there is no shared helper module.
- The private `addMonths` helper remains in `balance.service.ts` (still used by `carryForward`) and was **not** refactored to import the shared `addMonths` from `src/shared/date` — consistent with the spec's out-of-scope constraint deferring that refactor. Only `periodContaining` is imported from the shared entry point (the new read path needs it; `carryForward`'s private `addMonths` is untouched).

### Phase 6 delivered (leave reads: list/getById + GET /leaves, GET /leaves/:id)

This phase delivers the leave read surface (recommended phase 6); the employee-route and smoke/unit-test work (phase 7) is not yet implemented.

**repository** — `PgLeaveRequestRepository.findByQuery` gained the `employeeIds` filter: when `params.employeeIds` is present and non-empty it pushes `employee_id = ANY($n)` with the array bound as a single parameter; when absent/empty it applies no employee filter (ADMIN sees all). No other repository method changed.

**service** — `ILeaveService` gained `list(actor, params)` and `getById(actor, requestId)`; `LeaveService` implements both. Both are read-only (no `uow.withTransaction`, no client forwarding, no writes/audit/notifications).

- `list` copies `params`, then scopes `employeeIds` by role: EMPLOYEE → `[actor.id]`; MANAGER → `[actor.id, ...(await employeeService.getEmployeesByManagerId(actor.id)).map(e => e.id)]` (direct reports plus self, one level only); ADMIN → no `employeeIds` filter (sees all). It then delegates to `repository.findByQuery(query)` — no SQL in the service.
- `getById` loads via `repository.findById` (NotFoundError on a nonexistent id), returns immediately for ADMIN, and otherwise builds `visibleIds = [actor.id]` (plus direct reports for MANAGER) and throws `NotFoundError('Leave request not found')` when `request.employeeId` is not in the set — byte-identical to the nonexistent-id case, so the endpoint cannot probe ids. Reads are status-unrestricted (no status filter or rejection).

**routes** — `leaveRoutes(fastify)` gained `GET /leaves` (200) and `GET /leaves/:id` (200), following the existing conventions (no controller, `resolveActor` at the API boundary, `sendError` mapping). A new `parseQuery` helper converts wire query params to `LeaveRequestQueryParams`: `status`/`leaveTypeCode` validated against their enums (invalid → ValidationError), `startDateFrom`/`startDateTo`/`endDateFrom`/`endDateTo` converted from strings to `Date` via the same `new Date(value)` + `Number.isNaN(parsed.getTime())` pattern as `parseCreateBody` (invalid → ValidationError), and `limit`/`offset` parsed as integers (non-integer → ValidationError). The handlers resolve the actor, call `leaveService.list`/`leaveService.getById`, and return the result.

**Divergences from the plan worth noting:**
- The spec's out-of-scope constraint said state-changing operations (create/submit/approve/reject/cancel) are untouched this phase. The implementation also made `create` transactional: the DRAFT insert and its CREATE audit entry now run inside a single `uow.withTransaction` (with the client forwarded to both `repository.create` and `auditService.record`), closing the previously-documented gap where a failed audit insert left a committed DRAFT row with no audit trail. This is a deliberate fix beyond the read-only scope, not a regression.
- No tests were delivered this phase — the plan's Phase 6 prescribed only the repository/service/routes edits (tests belong to Phase 7), and the committed diff contains exactly those three files (`leave.repository.ts`, `leave.service.ts`, `leave.routes.ts`); `leave/index.ts` was correctly left untouched (no new exports needed).

### Phase 7 delivered (GET /employees/me route + leave read-route tests)

This phase delivers the employee profile route and the leave read-route unit tests (recommended phase 7). The `scripts/smoke.js` extension and the `auth.service.test.ts` unit tests prescribed by PLAN.md Phase 7 items (4) and (5) were **not** delivered this phase.

- `src/modules/employee/employee.routes.ts` — NEW file. `employeeRoutes(fastify)` registers `GET /employees/me` (200). It carries **local copies** of `resolveActor` (extracts `request.user`, enforces `id` presence and `EmployeeRole` membership, throwing UnauthorizedError on a missing/invalid actor) and `sendError` (maps `AppError` to `{ error, code }` with its status, any other throw to 500) — the same shape as `leave.routes.ts`/`balance.routes.ts`/`auth.routes.ts`, but not imported from them. The handler resolves the actor, calls `employeeService.getEmployeeProfileById(actor.id)`, and returns the profile (which never contains `passwordHash`). The service instance is resolved from `fastify.employeeService` if present, else `new EmployeeService(new PgEmployeeRepository())` — there is no `createEmployeeService()` factory (unlike `createLeaveService`/`createBalanceService`/`createAuthService`).
- `src/modules/employee/index.ts` — re-exports `employeeRoutes`.
- `src/app.ts` — `app.register(employeeRoutes)` (after `authRoutes`).
- `tests/unit/modules/leave/leave.routes.test.ts` — added a `GET /leaves and GET /leaves/:id role scoping` describe block exercising the Phase 6 read endpoints at the HTTP boundary with an in-memory `ILeaveService` fake (decorated on the Fastify instance via the existing `leaveService` seam): `GET /leaves` scopes visible requests per role (EMPLOYEE → 1, MANAGER → 2, ADMIN → 3); `GET /leaves/:id` returns a visible request for its owner; and `GET /leaves/:id` returns a byte-identical 404 (`code: 'NOT_FOUND'`) for both a not-visible id and a nonexistent id (asserting `invisible.json()` equals `missing.json()`).

**Divergences from the plan worth noting:**
- PLAN.md Phase 7 item (4) — extending `scripts/smoke.js` with login + authenticated read probes — was **not** delivered in this phase; it was delivered in a later sub-phase (see "Phase 9 delivered" below).
- PLAN.md Phase 7 item (5) — the `tests/unit/modules/auth/auth.service.test.ts` unit tests (login success/failure, indistinguishable wrong-email vs wrong-password) were **not** delivered in this phase; they were delivered in a later sub-phase (see "Phase 11 delivered" below).
- The plan prescribed "reuse resolveActor/sendError shape from `src/modules/leave/leave.routes.ts`"; the implementation uses local copies (matching the `balance.routes.ts`/`auth.routes.ts` precedent) rather than importing from `leave.routes.ts` — the shape is identical, but there is no shared helper module.
- The plan's Phase 7 item (5) also prescribed a profile-route unit test; the profile route (`GET /employees/me`) had no dedicated route test in this phase — it was delivered in a later sub-phase (see "Phase 11 delivered" below).

### Phase 8 delivered (leave read-route test fix)

This phase is a test-only fix confined to `tests/unit/modules/leave/leave.routes.test.ts`; no production source changed.

- The `getById` mock in `buildApp` was corrected to enforce the same role-based visibility as the real `LeaveService.getById`: ADMIN sees any request; MANAGER sees `actor.id` plus direct reports; EMPLOYEE sees only `actor.id`; any other request throws `NotFoundError`. Previously the mock was a naive find-by-id that returned any found request regardless of visibility, so the "not visible" test failed (the invisible request was returned with 200 instead of 404).
- The invisible-request and nonexistent-id responses are now byte-identical (404, `{ code: 'NOT_FOUND' }`), preserving the information-hiding contract the test asserts.

**Divergences from the plan worth noting:**
- None — this phase matches the spec exactly (test-only, no production changes).

### Phase 9 delivered (smoke.js e2e extension)

This phase delivers the `scripts/smoke.js` extension prescribed by PLAN.md Phase 7 item (4) — the login + authenticated read probes previously documented as not delivered. No production source changed; the only project file touched is `scripts/smoke.js`.

**Seed block (stage 3d, Postgres mode only)** — the seed now mints the seeded employee's `password_hash` via `bcrypt.hashSync(SMOKE_PASSWORD, 10)` (plaintext from `process.env.SMOKE_PASSWORD`, defaulting to `'smoke-check-password'` — no credential string hardcoded, per no-hardcoded-secrets), and seeds a second leave type (`LeaveTypeCode.SICK`) with an effective ACTIVE policy (`pol-2`) but **no** `leave_balances` row — the fixture that proves `getCurrentBalances` omits an effective policy lacking a balance.

**New stages (4–8, Postgres mode only; skipped with the existing caveat in sqlite mode):**
- **Stage 4 — login**: `POST /auth/login` with the seeded email + `SMOKE_PASSWORD`; asserts 200, a non-empty `token`, and a `profile` whose `id`/`email` match the seeded employee (the full 10-field profile assertion was added in Phase 10). The returned token is a genuine login token (minted under the same `JWT_SECRET` `registerAuth` verifies), not the hand-minted `signToken` used by stages 3b/3c.
- **Stage 5 — profile**: `GET /employees/me` with the login token; asserts the exact 10-field `EmployeeProfile` (id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate serialized as UTC midnight, employmentStatus) and that `passwordHash`/`terminationDate` are absent.
- **Stage 6 — list**: `GET /leaves` with the login token; asserts the request created in stage 3d is present (EMPLOYEE role scoping to `employeeIds=[actor.id]`).
- **Stage 7 — getById**: `GET /leaves/:id` using the id captured from the stage 3d `POST /leaves` response body (not predicted — the repository generates it via `randomUUID()`); asserts the seeded request is returned.
- **Stage 8 — balances**: re-keys the seeded `bal-1` balance to the CURRENT accrual period via `periodContaining(hireDate, 12, new Date())` (imported from `src/shared/date`, the same helper `getCurrentBalances` uses — never a hand-written date), then `GET /balances/me`; asserts exactly one balance (the ANNUAL one), with `leaveTypeCode === ANNUAL`, the current-period `periodStart`/`periodEnd`, and `available === 25` (a new request reserves nothing, so pendingDays stays 0). The SICK leave type (effective policy, no balance row) is omitted.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 7 item (4) and the phase spec's six success criteria exactly: the second leave type + password_hash seeding, the login/profile/list/getById/balances stages, real-value assertions (not just status codes), Postgres-only gating, and the `periodContaining`-derived current-period re-key.

### Phase 10 delivered (smoke.js stage 4 login assertion strengthening)

This phase is a test-only change confined to `scripts/smoke.js`; no production source changed. It strengthens the stage 4 login assertion (previously only a non-empty token + `id`/`email` match) to verify the full 10-field `EmployeeProfile` returned by `POST /auth/login`.

- The stage 4 login assertion now builds an `expectedLoginProfile` object literal with all 10 `EmployeeProfile` fields (id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, employmentStatus) and asserts each field equals the seeded employee's value: id `'smoke-employee'`, employeeNumber `'E-0001'`, firstName `'Smoke'`, lastName `'Test'`, email `'smoke@example.com'`, role `EmployeeRole.EMPLOYEE`, managerId `null`, department `'Engineering'`, hireDate `'2020-01-01T00:00:00.000Z'` (the JSON wire form of the Date, not the raw seed string `'2020-01-01'`), employmentStatus `EmploymentStatus.ACTIVE`.
- It asserts `passwordHash` and `terminationDate` are absent from the login profile (`'passwordHash' in loginProfile || 'terminationDate' in loginProfile` throws).
- The existing token assertion (non-empty string) and the 200 status check remain intact — the change extends, not weakens, the login stage. Stages 1–3d and 5–8 are untouched.
- `EmployeeRole` and `EmploymentStatus` are reused from the existing stage 3 import line (not re-imported or hardcoded as bare strings).

**Divergences from the plan worth noting:**
- The phase spec's success criterion #4 described the login profile's `department` as `null`; the implementation asserts `department: 'Engineering'` — the value the stage 3d seed actually inserts (and the same value stage 5's `/employees/me` assertion checks). `managerId` remains `null` as the seed leaves it unset. This is a divergence from the spec's stated value, not a regression: the assertion matches the seeded row and the stage 5 profile assertion.

### Phase 11 delivered (auth + employee route unit tests)

This phase is a test-only phase confined to two NEW test files; no production source changed. It delivers the `auth.service.test.ts` and profile-route unit tests that PLAN.md Phase 7 item (5) prescribed and that the Phase 7 delivered section documented as not yet delivered.

- `tests/unit/modules/auth/auth.service.test.ts` — NEW. Jest coverage for `AuthService.login` using the real `bcrypt` and `signToken` dependencies (not mocks): a `makeEmployee` fixture seeds `passwordHash` via `bcrypt.hashSync(CORRECT_PASSWORD, 4)` (low cost, test-only); `beforeAll` sets `process.env.JWT_SECRET = 'unit-test-jwt-secret'`. Four tests: (1) correct credentials return `{ token, profile }` with a non-empty string token and a profile carrying id/employeeNumber/email/role/managerId but `not.toHaveProperty('passwordHash')` / `not.toHaveProperty('terminationDate')`; (2) unknown email → `UnauthorizedError` (the fake `getEmployeeByEmail` throws `NotFoundError`, which `login` maps); (3) wrong password → `UnauthorizedError`; (4) wrong-email and wrong-password failures are indistinguishable (both `UnauthorizedError` with the identical message `'Invalid email or password'`).
- `tests/unit/modules/employee/employee.routes.test.ts` — NEW. Route-level tests for `GET /employees/me` using the established route-test seam (build a Fastify instance, decorate the `employeeService` seam with a `jest.fn` fake cast `as unknown as IEmployeeService`, `decorateRequest('user', undefined)`, a `preHandler` hook setting `request.user = actor`, register `employeeRoutes`, `app.ready()`, then `app.inject`). Four tests: (1) 200 returns the profile and asserts `receivedId === actor.id` plus `not.toHaveProperty('passwordHash')` / `not.toHaveProperty('terminationDate')`; (2) 401 (`{ code: 'UNAUTHORIZED' }`) when there is no authenticated user; (3) 401 when the actor has an invalid role (`'SUPERUSER'`); (4) 404 (`{ code: 'NOT_FOUND' }`) when the actor has no employee profile (the stubbed `getEmployeeProfileById` throws `NotFoundError`).

**Divergences from the plan worth noting (superseded by Phase 12):**
- The phase spec's constraint that "a fake IEmployeeService must implement all five methods" was initially **not** followed: the auth test's fake provided only `getEmployeeByEmail` (cast `as unknown as IEmployeeService`), and the employee route test's fake provided only `getEmployeeProfileById`. A follow-up phase (Phase 12) expanded the auth test's fake to the full five-method interface; the employee route test still uses the partial `as IEmployeeService` seam.
- The phase spec's constraint that the success-path test "set process.env.JWT_SECRET before the test and restore it afterward" was initially **partially** followed (`beforeAll` set it but nothing restored it). A follow-up phase (Phase 12) added the `afterAll` restore.

### Phase 12 delivered (follow-up hardening: type swap + test corrections)

This phase is a set of small follow-up fixes and test-strengthening changes delivered after Phase 11; no new production behavior was introduced.

- `src/modules/employee/employee.routes.ts` — **AuthUser type swap**: the local `interface AuthUser { id: string; role: EmployeeRole }` declaration was removed and replaced with an import of the canonical `AuthUser` from `../../shared/auth`. `resolveActor`'s return type and the `EmployeeAuthRequest` alias now resolve to the shared type (no behavioral change). `leave.routes.ts` and `balance.routes.ts` still declare their own local `AuthUser` interfaces — this swap was scoped to the employee module only.
- `tests/unit/modules/auth/auth.service.test.ts` — **JWT_SECRET restore + full fake**: the suite now captures `process.env.JWT_SECRET` before `beforeAll` sets `'unit-test-jwt-secret'` and restores it in `afterAll`, so the test secret no longer leaks into sibling suites. The `IEmployeeService` fake was expanded from a partial `as unknown as IEmployeeService` object to a full five-method implementation (the four methods `login` does not call are throwing stubs), removing the `as unknown as` cast.
- `tests/unit/modules/leave/leave.routes.test.ts` — **explicit nonexistent-id test**: added a `GET /leaves/:id` test asserting a genuinely nonexistent id returns 404 `{ code: 'NOT_FOUND' }` for an ADMIN actor (distinct from the existing not-visible case), so the information-hiding contract is asserted from both directions.
- `tests/unit/shared/date.test.ts` — **additional coverage**: added `addMonths` 31→30-day clamping cases (Jan 31 + 3 → Apr 30; Mar 31 + 1 → Apr 30), a `periodContaining` loop-exhaustion case (`accrualMonths = 0` → `ConflictError('Unable to resolve accrual period')`), and a `ConflictError` statusCode/code assertion (409 / `CONFLICT`) for the date-before-anchor path.

**Divergences from the plan worth noting:**
- None of these changes were prescribed by PLAN.md Phase 7; they are follow-up hardening fixes that correct the two divergences documented in Phase 11 (the missing JWT_SECRET restore and the partial fake) and add the explicit nonexistent-id/date-clamp coverage the review flagged.

### Phase 13 delivered (employee route test full-fake hardening)

This phase is a test-only hardening change confined to `tests/unit/modules/employee/employee.routes.test.ts`; no production source changed. It resolves the divergence documented in Phase 11/12 — the employee route test's `IEmployeeService` fake was a partial object behind an `as IEmployeeService` cast.

- `tests/unit/modules/employee/employee.routes.test.ts` — the `IEmployeeService` fake passed to the `employeeService` decoration seam is now a complete five-method object (`createEmployee`, `getEmployeeById`, `getEmployeeByEmail`, `getEmployeesByManagerId`, `getEmployeeProfileById`) with the exact signatures from `src/modules/employee/employee.service.interface.ts`. The four methods the route does not call are throwing stubs (each throws an `Error` naming the method), so any accidental invocation fails loudly rather than silently returning `undefined`. The `as IEmployeeService` partial-object cast is removed. The route under test, the `employeeService` seam, the `decorateRequest('user', undefined)` + preHandler actor hook, the `EmployeeProfile` fixture, and all four existing tests (200 profile, 401 no user, 401 invalid role, 404 no profile) and their assertions are unchanged.
- `tests/unit/modules/auth/auth.service.test.ts` — verified already compliant (full five-method `IEmployeeService` fake with throwing stubs, and `JWT_SECRET` captured before `beforeAll` and restored in `afterAll`); no modification required per the spec.

**Divergences from the plan worth noting:**
- None — this phase matches the spec exactly: test-only, single file in scope, the fake satisfies `IEmployeeService` structurally with throwing stubs for the unused methods, and no existing assertion or seam was altered.

### Open questions
- Q1: Should a controller layer be introduced, or continue with routes calling services directly? (candidates: continue routes-call-services; introduce controllers)
- Q2: Should LeavePolicyStatus be promoted into src/shared/types as a canonical enum? (candidates: promote to shared/types; keep module-local and import via policy index.ts)
<!-- gestalt:architecture feature=e8c586bc-23c0-4c59-9111-ee280659da9a END -->

