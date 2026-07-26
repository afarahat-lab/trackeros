# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest
- Backend: Fastify
- Frontend: React Native
- Database: PostgreSQL

## Module structure

```
src/modules/uptime/uptime.{model,service.interface,service,routes}.ts
src/modules/status/status.{model,service.interface,service}.ts
src/modules/leave/index.ts
src/modules/leave/leave.model.ts
src/modules/leave/leave.repository.ts
src/shared/auth/{index,jwt,middleware,types}.ts
src/shared/db/connection.ts
src/shared/errorTypes.ts
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Shared error types

`src/shared/errorTypes.ts` provides typed error classes used across all modules for consistent error handling at API boundaries:

| Class | Properties | HTTP mapping |
|-------|-----------|--------------|
| `NotFoundError` | `resourceName: string`, `resourceId: string` | 404 |
| `ValidationError` | `details: string[]` | 400 |
| `ConflictError` | `resourceName: string` | 409 |
| `UnauthorizedError` | (none beyond message) | 401 |
| `ForbiddenError` | (none beyond message) | 403 |

All classes extend `Error`, set `this.name` to the class name, and capture stack traces via `Error.captureStackTrace`. Controllers catch these errors and map them to the appropriate HTTP status codes.

## Auth middleware

`src/shared/auth/` provides JWT-based authentication and role-based authorization as Fastify `preHandler` hooks. It depends on `src/shared/errorTypes.ts` for `UnauthorizedError` and `ForbiddenError`.

### JWT utilities (`jwt.ts`)

| Export | Signature | Description |
|--------|-----------|-------------|
| `TokenPayload` | `{ userId: string; role: string }` | Shape of the decoded JWT payload |
| `extractTokenFromHeader` | `(authHeader: string \| undefined) => string \| null` | Parses `Bearer <token>` from the Authorization header; returns `null` for missing, non-Bearer, or malformed headers |
| `verifyToken` | `(token: string) => Promise<TokenPayload>` | Verifies the JWT using `jsonwebtoken` and `JWT_SECRET` from `process.env`; throws if the secret is missing, the token is invalid, or the payload lacks `userId`/`role` |

### Middleware (`middleware.ts`)

| Export | Signature | Description |
|--------|-----------|-------------|
| `authenticate` | `(request: FastifyRequest, _reply: FastifyReply) => Promise<void>` | Extracts and verifies the JWT, then attaches `request.user = { userId, role }`. Throws `UnauthorizedError` on any failure. |
| `requireRole` | `(...roles: string[]) => (request: FastifyRequest, _reply: FastifyReply) => Promise<void>` | Returns a `preHandler` that checks `request.user.role` is in the allowed set. Throws `UnauthorizedError` if no user is attached, `ForbiddenError` if the role is insufficient. |

### Type augmentation (`types.ts`)

Augments `FastifyRequest` via `declare module 'fastify'` to add the optional `user` property:

```ts
request.user?: { userId: string; role: string }
```

### Usage pattern

Routes register `authenticate` as a `preHandler` for endpoints requiring a logged-in user, and chain `requireRole('manager', 'admin')` for endpoints restricted to specific roles:

```ts
fastify.post('/api/example', {
  preHandler: [authenticate, requireRole('admin')],
}, handler);
```

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules

<!-- gestalt:architecture feature=6f64b552-c5b8-42bc-86fa-01fa08ab4abe START -->
## Leave Management Module

### Overview

The leave management module enables employees to apply for annual, sick, and emergency leave, managers to approve or reject requests, and the system to track leave balances. It is implemented as a modular monolith using TypeScript, Fastify, PostgreSQL, and React Native (frontend).

### Domain Entities

- **LeaveRequest** — central aggregate representing an employee's leave application. Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED. Tracks approver, rejector, canceller, and timestamps.
- **LeaveType** — enum of leave categories (`annual`, `sick`, `emergency`, `unpaid`, `maternity`, `paternity`). Stored as a check-constrained varchar on `leave_policies.leave_type` (no separate `leave_types` table).
- **LeaveRequestStatus** — enum of lifecycle states (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`).
- **LeavePolicy** — defines entitlement rules (days, accrual, notice period, approval requirement) per leave type. Lifecycle: ACTIVE, INACTIVE.
- **LeaveBalance** — tracks an employee's entitlement, used, and accrued days per leave type per year. Lifecycle: ACTIVE, EXHAUSTED, FROZEN.
- **Employee** — organizational actor with manager relationship and employment status (ACTIVE, INACTIVE, TERMINATED).

### Module Boundaries

| Module | Path | Responsibilities |
|--------|------|------------------|
| `leave-type` | `src/modules/leave-type/` | LeaveType enum, model, repository |
| `leave-policy` | `src/modules/leave-policy/` | LeavePolicy CRUD, service, controller, routes |
| `employee` | `src/modules/employee/` | Employee model, repository, service (identity, manager lookup) |
| `audit` | `src/modules/audit/` | AuditRecord model, repository, service (cross-cutting GP-002) |
| `leave-balance` | `src/modules/leave-balance/` | LeaveBalance tracking, service, controller, routes |
| `leave-validation` | `src/modules/leave-validation/` | Validation rules (balance, policy, overlap) — reusable service |
| `leave-request` | `src/modules/leave-request/` | LeaveRequest aggregate, workflow orchestration, REST API |
| `notification` | `src/modules/notification/` | Notification model, repository, service (fire-and-forget) |

### Dependency Map

- `leave-request` depends on `leave-validation`, `leave-balance`, `leave-policy`, `employee`, `audit`, `notification`, `leave-type`
- `leave-validation` depends on `leave-balance`, `leave-policy`, `leave-type`
- `leave-balance` depends on `leave-policy`, `employee`, `leave-type`, `audit`
- `leave-policy` depends on `leave-type`, `audit`
- `employee` depends on `audit`
- `notification` depends on `employee`

### Database Schema (as built — migrations 001–003)

Migrations are managed via Knex (`knexfile.ts` at project root, using `DATABASE_URL` from env). All tables use UUID primary keys with `knex.fn.uuid()` defaults and timestamptz for temporal columns.

**`leave_policies`** (migration 001)
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default uuid |
| policy_name | varchar | NOT NULL |
| leave_type | varchar | NOT NULL, CHECK IN ('annual','sick','emergency','unpaid','maternity','paternity') |
| entitlement_days | integer | NOT NULL |
| accrual_rate | decimal | nullable |
| max_accumulation | decimal | nullable |
| minimum_notice_days | integer | nullable |
| requires_manager_approval | boolean | NOT NULL, DEFAULT true |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Note: `leave_type` is an inline check-constrained varchar — there is no separate `leave_types` table. The FK from `leave_requests` and `leave_balances` references `leave_policies.id`.

**`leave_requests`** (migration 002)
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default uuid |
| employee_id | uuid | NOT NULL |
| leave_type_id | uuid | NOT NULL, FK → leave_policies.id |
| start_date | date | NOT NULL |
| end_date | date | NOT NULL |
| reason | text | nullable |
| status | varchar | NOT NULL, DEFAULT 'DRAFT', CHECK IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED') |
| approved_by | uuid | nullable |
| approved_at | timestamptz | nullable |
| rejected_by | uuid | nullable |
| rejected_at | timestamptz | nullable |
| rejection_reason | text | nullable |
| cancelled_by | uuid | nullable |
| cancelled_at | timestamptz | nullable |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**`leave_balances`** (migration 003)
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default uuid |
| employee_id | uuid | NOT NULL |
| leave_type_id | uuid | NOT NULL, FK → leave_policies.id |
| entitlement_days | decimal | NOT NULL |
| used_days | decimal | NOT NULL, DEFAULT 0 |
| accrued_days | decimal | NOT NULL, DEFAULT 0 |
| year | integer | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Unique constraint on `(employee_id, leave_type_id, year)`.

### REST API Surface

**Leave Requests** (exposed by `leave-request` controller)
- `POST /api/leave-requests` — submit (employee)
- `GET /api/leave-requests/:id` — get by ID (employee/manager)
- `GET /api/leave-requests/employee/:employeeId` — list by employee (employee/manager)
- `GET /api/leave-requests/manager/:managerId` — list for manager (manager)
- `PATCH /api/leave-requests/:id/approve` — approve (manager)
- `PATCH /api/leave-requests/:id/reject` — reject (manager)
- `PATCH /api/leave-requests/:id/cancel` — cancel (employee)

**Leave Balances** (exposed by `leave-balance` controller)
- `GET /api/leave-balances/:employeeId` — list balances (employee/manager)
- `GET /api/leave-balances/:employeeId/:leaveTypeId/:fiscalYear` — single balance (employee/manager)

**Leave Policies** (exposed by `leave-policy` controller)
- `GET /api/leave-policies` — list active policies (authenticated)
- `GET /api/leave-policies/:id` — get policy (authenticated)
- `POST /api/leave-policies` — create (HR admin)
- `PUT /api/leave-policies/:id` — update (HR admin)

### Key Business Rules

- Only ACTIVE employees can submit leave requests.
- State transitions enforce strict guards (e.g., only manager can approve/reject).
- Approval decrements leave balance; cancellation of an approved request restores it.
- Balance status becomes EXHAUSTED when remaining days reach zero.
- Every state-changing operation writes an audit log (GP-002).
- Notifications are sent on submission, approval, rejection, and cancellation (fire-and-forget).

### Implementation Phases

1. **Foundation** — `leave-type`, `audit`, `employee` (zero-dependency leaf modules).
2. **Policy Layer** — `leave-policy` (depends on Phase 1).
3. **Balance Engine** — `leave-balance` (depends on Phases 1–2).
4. **Validation & Notification** — `leave-validation`, `notification` (depends on Phases 1–3; can be parallel).
5. **Orchestration** — `leave-request` (depends on all prior phases; exposes public API).

### Implementation Progress

- ✅ **Phase 1 (Migrations)** — `knexfile.ts` + migrations 001–003 created. Tables `leave_policies`, `leave_requests`, `leave_balances` defined with UUID PKs, check constraints, foreign keys, and unique constraints. All migrations include `up` and `down` functions.
- ✅ **Phase 2 (Domain Model Types)** — `src/modules/leave/leave.model.ts` defines all domain types: `LeaveType` (6-value literal union), `LeaveRequestStatus` (5-value literal union), `LeavePolicy`, `LeaveRequest`, `LeaveBalance`, `CreateLeaveRequestDto`, and `UpdateLeaveRequestStatusDto` interfaces. Barrel export via `src/modules/leave/index.ts`. Unit tests in `tests/unit/modules/leave/leave.model.test.ts` verify type correctness and optional/nullable field handling.
- ✅ **Phase 3 (Leave Repository)** — `src/modules/leave/leave.repository.ts` implements `ILeaveRepository` interface and `LeaveRepository` class using the pg Pool from `src/shared/db/connection.ts`. Eight methods: `findById`, `findByEmployeeId`, `findByStatus`, `create` (INSERT with DRAFT status), `updateStatus` (switch on APPROVED/REJECTED/CANCELLED/fallback, each setting the appropriate reviewer fields and timestamps), `getBalance`, `upsertBalance` (INSERT ON CONFLICT UPDATE), and `decrementBalance` (increments used_days). Constructor accepts an optional pg Pool (defaults to shared pool). Barrel export updated in `src/modules/leave/index.ts`. Unit tests in `tests/unit/modules/leave/leave.repository.test.ts` with 16 test cases covering all methods, null/empty results, and status-specific update behavior.
- ✅ **Phase 4 (Shared Error Types)** — `src/shared/errorTypes.ts` defines five typed error classes: `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`. All extend `Error`, set `this.name`, and capture stack traces. Unit tests in `tests/unit/shared/errorTypes.test.ts` verify instantiation, property preservation, and stack trace capture for each class.
- ✅ **Phase 5 (Auth Middleware & JWT)** — `src/shared/auth/` provides JWT verification (`verifyToken`, `extractTokenFromHeader`), Fastify `preHandler` middleware (`authenticate`, `requireRole`), and Fastify request type augmentation. Depends on `src/shared/errorTypes.ts` for `UnauthorizedError`/`ForbiddenError`. Unit tests in `tests/unit/shared/auth/jwt.test.ts` (7 tests) and `tests/unit/shared/auth/middleware.test.ts` (9 tests).

### Stack Compliance

- Language: TypeScript (Node 20)
- Framework: Fastify (REST API)
- Frontend: React Native (mobile client)
- Database: PostgreSQL (via `pg` Pool at `src/shared/db/connection.ts`)
- Migrations: Knex (`knexfile.ts` at project root, TypeScript migrations in `migrations/`)
- Architecture: modular-monolith with clear layer separation (domain, application, infrastructure, presentation)
- Cross-cutting: audit (GP-002), RBAC (GP-005), input validation (GP-003)
<!-- gestalt:architecture feature=6f64b552-c5b8-42bc-86fa-01fa08ab4abe END -->
