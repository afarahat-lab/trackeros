# Architecture Decisions — trackeros

## ADR-001 — Project initialised

Date: 2026-06-10
Status: Accepted

Decision: Project initialised via the Gestalt platform.
Description: Trackeros — a corporate operations web and mobile platform for
  mid-sized companies. Provides employee self-service (leave
  requests, balances, expense claims), manager workflows
  (approvals, team views, time-off calendars), and HR admin
  surfaces (leave policy configuration, balance accruals,
  audit reports).
  
  Backend: TypeScript on Node 20 (Fastify), PostgreSQL via
  Knex migrations + a thin repository layer, BullMQ for
  background jobs (accrual schedulers, notification fanout).
  Module structure: src/modules/<name>/<name>.{model,
  repository,service,controller,routes}.ts. Domain modules
  include leave, balance, employee, policy, notification.
  Shared utilities under src/shared/ (db connection, base
  repository, error types).
  
  Frontend: React + Vite SPA for the web client, React Native
  for the mobile client (shared @trackeros/contracts package
  for the typed REST surface). Auth via JWT against the
  backend's /auth endpoints; identity comes from corporate
  OIDC in production and from local users in development.
  
  Tests: Vitest for unit + integration. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)

## ADR-002 — Shared types foundation (Phase 1)

Date: 2026-06-10
Status: Accepted

Decision: Established `src/shared/types/index.ts` as the single source of truth
for cross-module enums and DTOs in the leave management feature.

Enums defined:
- `LeaveStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- `LeaveType`: annual, sick, emergency, unpaid, maternity, paternity
- `AuditAction`: CREATE, UPDATE, DELETE, APPROVE, REJECT
- `NotificationStatus`: PENDING, SENT, READ, ARCHIVED
- `EmploymentStatus`: ACTIVE, INACTIVE, TERMINATED

DTOs defined:
- `CreateLeaveRequestDto`: employeeId, leavePolicyId, startDate, endDate, reason
- `UpdateLeaveRequestDto`: startDate, endDate, reason, status (all optional)
- `LeaveRequestQueryParams`: employeeId, status, leavePolicyId, startDateFrom, startDateTo (all optional)
- `ValidationResult`: valid (boolean), errors (string[])

Tests: `tests/unit/shared/types/index.test.ts` — Jest unit tests verifying enum
values, member counts, and DTO shape acceptance.

## ADR-003 — LeavePolicy model and repository (Phase 3)

Date: 2026-06-10
Status: Accepted

Decision: Created the leave-policy module at `src/modules/leave-policy/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/leave-policy/leave-policy.model.ts` — `LeavePolicy` entity interface
  with fields: id, policyName, leaveType (LeaveType enum), entitlementDays,
  accrualRate (number | null), maxAccumulation (number | null),
  minimumNoticeDays (number | null), requiresManagerApproval (boolean),
  isActive (boolean), createdAt, updatedAt.
- `src/modules/leave-policy/leave-policy.repository.ts` — `ILeavePolicyRepository`
  interface with methods: findById, findByLeaveType, findAllActive, create, update.
  `LeavePolicyRepository` stub class throws "not implemented" for all methods.
- `src/modules/leave-policy/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/leave-policy/leave-policy.model.test.ts` — Validates
  LeavePolicy shape, nullable fields, all LeaveType enum values, isActive and
  requiresManagerApproval booleans, and exact field count (11).
- `tests/unit/modules/leave-policy/leave-policy.repository.test.ts` — Validates
  all stub methods throw "not implemented", accepts valid create input and
  partial updates, and verifies interface contract has all 5 methods.

Dependencies: `src/shared/types/index.ts` (LeaveType enum) from Phase 1.

## ADR-004 — LeaveRequest model and repository (Phase 5)

Date: 2026-06-10
Status: Accepted

Decision: Created the leave-request module at `src/modules/leave-request/` with
model, repository interface, stub implementation, and barrel export.

Files created:
- `src/modules/leave-request/leave-request.model.ts` — `LeaveRequest` entity interface
  with fields: id, employeeId, leavePolicyId, startDate, endDate, reason (string | undefined),
  status (LeaveStatus enum), approvedBy (string | null), approvedAt (Date | null),
  cancelledAt (Date | null), createdAt, updatedAt. Documents invariants: lifecycle
  DRAFT → SUBMITTED → (APPROVED | REJECTED), cancellable from SUBMITTED or APPROVED;
  approvedBy/approvedAt must both be null unless APPROVED; cancelledAt must be null
  unless CANCELLED; startDate ≤ endDate.
- `src/modules/leave-request/leave-request.repository.ts` — `ILeaveRequestRepository`
  interface with methods: findById, findByEmployeeId, findByStatus, query (accepts
  LeaveRequestQueryParams), create, update. `LeaveRequestRepository` stub class
  throws "not implemented" for all methods.
- `src/modules/leave-request/index.ts` — Barrel export of model and repository.

Tests:
- `tests/unit/modules/leave-request/leave-request.model.test.ts` — Validates
  LeaveRequest shape, reason optionality, approvedBy/approvedAt nullability
  invariants per status, cancelledAt nullability invariants, single-day leave
  (startDate === endDate), all LeaveStatus enum values, and exact field count (12).
- `tests/unit/modules/leave-request/leave-request.repository.test.ts` — Validates
  all 6 stub methods throw "not implemented", accepts valid create input (without
  id/createdAt/updatedAt), accepts partial and empty updates, and verifies
  interface contract has all required methods.

Dependencies: `src/shared/types/index.ts` (LeaveStatus enum, LeaveRequestQueryParams)
from Phase 1.
