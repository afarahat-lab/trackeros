# PLAN.md

## Phase 1: Phase 1: Database migrations for leave tables

Create the Knex configuration and database migrations for the leave management domain.

Files to create:
- `knexfile.ts` at project root — configure Knex to use the existing DATABASE_URL from `src/shared/db/connection.ts`. Use the pg client, TypeScript migrations, and point at a `migrations/` directory.
- `migrations/001_create_leave_policies.ts` — create the `leave_policies` table with columns: id (uuid PK), policy_name (varchar, not null), leave_type (varchar, not null, check constraint for 'annual','sick','emergency','unpaid','maternity','paternity'), entitlement_days (integer, not null), accrual_rate (decimal, nullable), max_accumulation (decimal, nullable), minimum_notice_days (integer, nullable), requires_manager_approval (boolean, not null, default true), is_active (boolean, not null, default true), created_at (timestamptz, not null), updated_at (timestamptz, not null).
- `migrations/002_create_leave_requests.ts` — create the `leave_requests` table with columns: id (uuid PK), employee_id (uuid, not null), leave_type_id (uuid, not null, FK to leave_policies), start_date (date, not null), end_date (date, not null), reason (text, nullable), status (varchar, not null, default 'DRAFT', check constraint for 'DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'), approved_by (uuid, nullable), approved_at (timestamptz, nullable), rejected_by (uuid, nullable), rejected_at (timestamptz, nullable), rejection_reason (text, nullable), cancelled_by (uuid, nullable), cancelled_at (timestamptz, nullable), created_at (timestamptz, not null), updated_at (timestamptz, not null).
- `migrations/003_create_leave_balances.ts` — create the `leave_balances` table with columns: id (uuid PK), employee_id (uuid, not null), leave_type_id (uuid, not null, FK to leave_policies), entitlement_days (decimal, not null), used_days (decimal, not null, default 0), accrued_days (decimal, not null, default 0), year (integer, not null), created_at (timestamptz, not null), updated_at (timestamptz, not null). Add unique constraint on (employee_id, leave_type_id, year).

All migrations must have both `up` and `down` functions. Use `knex.schema.createTable` / `dropTableIfExists`. Use `knex.fn.uuid()` for UUID PK defaults.

## Phase 2: Phase 2: Leave domain model types

Create the leave module domain model types. This phase has no dependencies on prior phases — it defines pure TypeScript types.

Files to create:
- `src/modules/leave/leave.model.ts` — define all domain types:
  - `LeaveType` as a string literal union: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
  - `LeaveRequestStatus` as a string literal union: `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
  - `LeavePolicy` interface with fields: id (string), policyName (string), leaveType (LeaveType), entitlementDays (number), accrualRate (number | null), maxAccumulation (number | null), minimumNoticeDays (number | null), requiresManagerApproval (boolean), isActive (boolean), createdAt (Date), updatedAt (Date)
  - `LeaveRequest` interface with fields: id (string), employeeId (string), leaveTypeId (string), startDate (Date), endDate (Date), reason (string | undefined), status (LeaveRequestStatus), approvedBy (string | null), approvedAt (Date | null), rejectedBy (string | null), rejectedAt (Date | null), rejectionReason (string | null), cancelledBy (string | null), cancelledAt (Date | null), createdAt (Date), updatedAt (Date)
  - `LeaveBalance` interface with fields: id (string), employeeId (string), leaveTypeId (string), entitlementDays (number), usedDays (number), accruedDays (number), year (number), createdAt (Date), updatedAt (Date)
  - `CreateLeaveRequestDto` interface with fields: employeeId (string), leaveTypeId (string), startDate (Date), endDate (Date), reason (string | undefined)
  - `UpdateLeaveRequestStatusDto` interface with fields: status (LeaveRequestStatus), reviewerId (string), rejectionReason (string | undefined)
- `src/modules/leave/index.ts` — barrel export of all types from leave.model.ts

Include Jest unit tests in `tests/unit/modules/leave/leave.model.test.ts` that verify the type definitions compile and that the literal union values are correct.

## Phase 3: Phase 3: Leave repository

Create the leave repository implementing data access for leave requests and balances. This phase depends on `src/modules/leave/leave.model.ts` from Phase 2 — read it before generating any code that references its types.

Files to create:
- `src/modules/leave/leave.repository.ts` — implement `ILeaveRepository` interface and `LeaveRepository` class using the pg Pool from `src/shared/db/connection.ts`. Methods:
  - `findById(id: string): Promise<LeaveRequest | null>` — SELECT by id
  - `findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>` — SELECT all requests for an employee, ordered by created_at DESC
  - `findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>` — SELECT by status
  - `create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — INSERT a new leave request with status 'DRAFT', return the created row
  - `updateStatus(id: string, dto: UpdateLeaveRequestStatusDto): Promise<LeaveRequest | null>` — UPDATE status and reviewer fields based on the new status (APPROVED sets approved_by/approved_at, REJECTED sets rejected_by/rejected_at/rejection_reason, CANCELLED sets cancelled_by/cancelled_at), return updated row or null
  - `getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>` — SELECT balance row
  - `upsertBalance(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>` — INSERT ON CONFLICT UPDATE balance
  - `decrementBalance(employeeId: string, leaveTypeId: string, year: number, days: number): Promise<LeaveBalance | null>` — decrement used_days by the given amount
- Update `src/modules/leave/index.ts` — add exports for `ILeaveRepository` and `LeaveRepository`

Include Jest unit tests in `tests/unit/modules/leave/leave.repository.test.ts` that mock the pg Pool and test each repository method.

## Phase 4: Phase 4: Shared error types

Create shared error type classes used across modules. No dependencies on prior phases.

Files to create:
- `src/shared/errorTypes.ts` — define typed error classes:
  - `NotFoundError` extending Error with a `resourceName: string` and `resourceId: string` properties
  - `ValidationError` extending Error with a `details: string[]` property for validation messages
  - `ConflictError` extending Error with a `resourceName: string` property (for duplicate/state conflict scenarios)
  - `UnauthorizedError` extending Error (for auth failures)
  - `ForbiddenError` extending Error (for RBAC failures)
  Each class should set `this.name` to the class name and capture the stack trace properly.

Include Jest unit tests in `tests/unit/shared/errorTypes.test.ts` verifying each error class instantiates correctly and preserves its message and custom properties.

## Phase 5: Phase 5: Auth middleware and JWT utilities

Create shared authentication middleware and JWT utilities. No dependencies on prior leave phases.

Files to create:
- `src/shared/auth/jwt.ts` — JWT utility functions: `verifyToken(token: string): Promise<{ userId: string; role: string }>` using jsonwebtoken, `extractTokenFromHeader(authHeader: string | undefined): string | null` to parse Bearer token. Read JWT_SECRET from process.env.
- `src/shared/auth/middleware.ts` — Fastify preHandler middleware: `authenticate` that extracts and verifies JWT, attaches `request.user = { userId, role }` to the request. Export a Fastify `preHandler` hook. Also export `requireRole(...roles: string[])` that returns a preHandler checking the user's role.
- `src/shared/auth/types.ts` — augment Fastify's request type: declare module 'fastify' to add `user?: { userId: string; role: string }` to FastifyRequest.
- `src/shared/auth/index.ts` — barrel export of jwt.ts, middleware.ts, and types.ts.

Include Jest unit tests in `tests/unit/shared/auth/jwt.test.ts` and `tests/unit/shared/auth/middleware.test.ts`.

## Phase 6: Phase 6: Leave service — business logic

Create the leave service with business logic for the leave lifecycle. This phase depends on `src/modules/leave/leave.model.ts` from Phase 2, `src/modules/leave/leave.repository.ts` from Phase 3, and `src/shared/errorTypes.ts` from Phase 4 — read all three before generating any code.

Files to create:
- `src/modules/leave/leave.service.interface.ts` — define `ILeaveService` interface with methods:
  - `apply(dto: CreateLeaveRequestDto): Promise<LeaveRequest>` — creates a new DRAFT leave request
  - `submit(id: string, employeeId: string): Promise<LeaveRequest>` — transitions DRAFT → SUBMITTED (only the owning employee)
  - `approve(id: string, reviewerId: string): Promise<LeaveRequest>` — transitions SUBMITTED → APPROVED, sets approvedBy/approvedAt, decrements leave balance
  - `reject(id: string, reviewerId: string, reason: string): Promise<LeaveRequest>` — transitions SUBMITTED → REJECTED, sets rejectedBy/rejectedAt/rejectionReason
  - `cancel(id: string, employeeId: string): Promise<LeaveRequest>` — transitions SUBMITTED or APPROVED → CANCELLED
  - `getById(id: string): Promise<LeaveRequest | null>`
  - `getByEmployee(employeeId: string): Promise<LeaveRequest[]>`
  - `getPendingApprovals(): Promise<LeaveRequest[]>` — all SUBMITTED requests
  - `getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>`
- `src/modules/leave/leave.service.ts` — implement `LeaveService` class implementing `ILeaveService`. Constructor takes `ILeaveRepository`. Business rules:
  - State machine guards: only valid transitions allowed (DRAFT→SUBMITTED, SUBMITTED→APPROVED/REJECTED, SUBMITTED/APPROVED→CANCELLED). Throw `ConflictError` for invalid transitions.
  - On approve: call `repository.updateStatus()` then `repository.decrementBalance()`.
  - On submit: verify the employeeId matches the request's employeeId, throw `ForbiddenError` otherwise.
  - Throw `NotFoundError` when a request is not found.
- Update `src/modules/leave/index.ts` — add exports for `ILeaveService` and `LeaveService`.

Include Jest unit tests in `tests/unit/modules/leave/leave.service.test.ts` that mock `ILeaveRepository` and test all state transitions, error cases, and the approve-balance-decrement flow.

## Phase 7: Phase 7: Leave controller

Create the leave controller that bridges HTTP requests to the service layer. This phase depends on `src/modules/leave/leave.model.ts` from Phase 2 and `src/modules/leave/leave.service.interface.ts` from Phase 6 — read both before generating any code.

Files to create:
- `src/modules/leave/leave.controller.ts` — implement `LeaveController` class. Constructor takes `ILeaveService`. Methods (each returns a Fastify route handler function):
  - `apply()` — parse body as `CreateLeaveRequestDto`, call `service.apply()`, return 201 with the created request
  - `submit()` — parse `:id` from params, get `employeeId` from `request.user.userId`, call `service.submit()`, return 200
  - `approve()` — parse `:id` from params, get `reviewerId` from `request.user.userId`, parse `{ rejectionReason? }` from body, call `service.approve()`, return 200
  - `reject()` — parse `:id` from params, get `reviewerId` from `request.user.userId`, parse `{ reason }` from body, call `service.reject()`, return 200
  - `cancel()` — parse `:id` from params, get `employeeId` from `request.user.userId`, call `service.cancel()`, return 200
  - `getById()` — parse `:id` from params, call `service.getById()`, return 200 or 404
  - `getMyRequests()` — get `employeeId` from `request.user.userId`, call `service.getByEmployee()`, return 200
  - `getPendingApprovals()` — call `service.getPendingApprovals()`, return 200
  - `getMyBalance()` — parse `leaveTypeId` and `year` from query string, get `employeeId` from `request.user.userId`, call `service.getBalance()`, return 200
  Each method wraps calls in try/catch, mapping `NotFoundError` → 404, `ValidationError` → 400, `ConflictError` → 409, `ForbiddenError` → 403, and unknown errors → 500.
- Update `src/modules/leave/index.ts` — add export for `LeaveController`.

Include Jest unit tests in `tests/unit/modules/leave/leave.controller.test.ts` that mock `ILeaveService` and test each controller method's request handling and error mapping.

## Phase 8: Phase 8: Leave routes and app registration

Create the leave routes plugin and register it in the Fastify app. This phase depends on `src/shared/auth/middleware.ts` from Phase 5 and `src/modules/leave/leave.controller.ts` from Phase 7 — read both before generating any code.

Files to create:
- `src/modules/leave/leave.routes.ts` — export an async function `leaveRoutes(fastify: FastifyInstance)` that:
  - Instantiates `LeaveRepository` (using the pg pool from `src/shared/db/connection.ts`), `LeaveService` (with the repository), and `LeaveController` (with the service)
  - Registers routes under prefix `/api/leave`:
    - `POST /requests` — authenticated, calls `controller.apply()`
    - `POST /requests/:id/submit` — authenticated, calls `controller.submit()`
    - `POST /requests/:id/approve` — authenticated + requireRole('manager','admin'), calls `controller.approve()`
    - `POST /requests/:id/reject` — authenticated + requireRole('manager','admin'), calls `controller.reject()`
    - `POST /requests/:id/cancel` — authenticated, calls `controller.cancel()`
    - `GET /requests/:id` — authenticated, calls `controller.getById()`
    - `GET /requests/mine` — authenticated, calls `controller.getMyRequests()`
    - `GET /requests/pending` — authenticated + requireRole('manager','admin'), calls `controller.getPendingApprovals()`
    - `GET /balances` — authenticated, calls `controller.getMyBalance()`
- Update `src/app.ts` — import and register `leaveRoutes` alongside the existing `uptimeRoutes`
- Update `src/modules/leave/index.ts` — add export for `leaveRoutes`

Include Jest integration tests in `tests/integration/modules/leave/leave.routes.test.ts` that build a Fastify instance with the leave routes registered, mock the repository layer, and test each endpoint's HTTP behavior.

## Phase 9: Phase 9: Policy repository and seed data

Create the policy repository for leave policy lookups and a seed migration for default policies. This phase depends on `src/modules/leave/leave.model.ts` from Phase 2 (for `LeavePolicy` type) and the migrations from Phase 1 — read the model file before generating any code.

Files to create:
- `src/modules/leave/policy.repository.ts` — implement `IPolicyRepository` interface and `PolicyRepository` class using the pg Pool from `src/shared/db/connection.ts`. Methods:
  - `findById(id: string): Promise<LeavePolicy | null>` — SELECT by id
  - `findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>` — SELECT active policy for a given leave type
  - `findAllActive(): Promise<LeavePolicy[]>` — SELECT all policies where is_active = true
  - `create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>` — INSERT a new policy
  - `update(id: string, updates: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>` — UPDATE and return
- `migrations/004_seed_default_policies.ts` — insert default leave policies: annual (20 days, requires approval), sick (10 days, requires approval), emergency (5 days, no approval required). Use INSERT ON CONFLICT DO NOTHING for idempotency.
- Update `src/modules/leave/index.ts` — add exports for `IPolicyRepository` and `PolicyRepository`.

Include Jest unit tests in `tests/unit/modules/leave/policy.repository.test.ts` that mock the pg Pool and test each method.

## Phase 10: Phase 10: Integrate policy checks into leave service

Enhance the leave service to enforce policy rules during the leave application and approval workflow. This phase depends on `src/modules/leave/leave.service.ts` from Phase 6 and `src/modules/leave/policy.repository.ts` from Phase 9 — read both before generating any code.

Files to modify:
- `src/modules/leave/leave.service.ts` — update `LeaveService`:
  - Add `IPolicyRepository` as a second constructor parameter (alongside `ILeaveRepository`)
  - In `apply()`: look up the policy via `policyRepository.findByLeaveType()` using the leaveTypeId. If no active policy exists, throw `ValidationError`. Validate that startDate is before endDate. If `policy.minimumNoticeDays` is set, verify the gap between now and startDate meets the minimum.
  - In `approve()`: look up the policy. If `policy.requiresManagerApproval` is false, throw `ConflictError` (auto-approved leave types should not go through manager approval).
  - In `submit()`: if the policy has `requiresManagerApproval` as false, auto-approve the request instead of setting it to SUBMITTED.
  - Add a new method `getPolicyForLeaveType(leaveTypeId: string): Promise<LeavePolicy | null>` that delegates to the policy repository.
- Update `src/modules/leave/leave.service.interface.ts` — add `getPolicyForLeaveType` to `ILeaveService`
- Update `src/modules/leave/index.ts` — ensure all exports remain correct

Update existing Jest unit tests in `tests/unit/modules/leave/leave.service.test.ts` to mock `IPolicyRepository` alongside `ILeaveRepository`, and add new test cases for: policy-not-found during apply, minimum-notice-days enforcement, auto-approval for non-manager-approval policies, and rejection of manager approval for auto-approved leave types.
