# Architecture history — feature b020624d-f000-464a-871e-edfa5e57ac4e

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 862-926 of the pre-consolidation
file, 6,225 bytes.

---

<!-- gestalt:architecture feature=b020624d-f000-464a-871e-edfa5e57ac4e START -->
## Runnable End-to-End: Seeded Demo Account and Dev Run

### Context
Feature adds development-only seed data, a dev runner, npm scripts, and documentation. No API contract or route changes.

### Domain Entities
- **DemoAccount** (aggregate; no table): manager, employee, leaveTypes, leavePolicies, leaveBalances, leaveRequests, demoCredentials. Lifecycle: none.
- **Employee**: id, employeeNumber, firstName, lastName, email, role, managerId, department, hireDate, terminationDate, employmentStatus, passwordHash. Lifecycle: ACTIVE | TERMINATED | ON_LEAVE.
- **LeaveRequest**: id, employeeId, leaveTypeCode, startDate, endDate, requestedDays, reason, status, approverId, approvalComment, submittedAt, decidedAt, cancelledBy, cancelledAt. Lifecycle: DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED.
- **LeaveBalance**: id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays. Lifecycle: OPEN | CLOSED.
- **LeavePolicy**: id, leaveTypeCode, policyName, annualEntitlementDays, accrualPeriodMonths, carryForwardDays, minNoticeDays, maxRequestDays, requiresManagerApproval, effectiveFrom, effectiveTo, status. Lifecycle: DRAFT | ACTIVE | SUPERSEDED.
- **LeaveType**: code, name, requiresApproval, maxConsecutiveDays, isPaid. Static catalog; no lifecycle.

### Conceptual Tables
- **employees**: fields id, employee_number, first_name, last_name, email, password_hash, role, manager_id, department, hire_date, termination_date, employment_status. PK id. FK manager_id -> employees.id. Indexes: email unique (login lookup, seed idempotency), employee_number unique (natural key, seed idempotency), manager_id (direct-report lookups).
- **leave_types**: fields code, name, requires_approval, max_consecutive_days, is_paid. PK code. Index: code (natural key, seed idempotency, policy FK lookups).
- **leave_policies**: fields id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months, carry_forward_days, min_notice_days, max_request_days, requires_manager_approval, effective_from, effective_to, status. PK id. FK leave_type_code -> leave_types.code. Indexes: leave_type_code (policy lookup by type), id (seed idempotency by stable seed id).
- **leave_balances**: fields id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code. Unique index (employee_id, leave_type_code, period_start, period_end) for findByKey and seed idempotency. Index employee_id for balance reads.
- **leave_requests**: fields id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at. PK id. FKs employee_id -> employees.id, leave_type_code -> leave_types.code, approver_id -> employees.id, cancelled_by -> employees.id. Indexes: employee_id (owner scoping), status (filtering), (leave_type_code, start_date) (date-range/type queries), (employee_id, leave_type_code, start_date) (seed idempotency composite key).

### Module Boundaries and Dependencies
- **seed** (`seeds/`): owns demo dataset, idempotency, balance-counter consistency, knex entry. Depends on shared-types and shared-date.
- **dev-runner** (`scripts/dev.js`): spawns API and web dev server, forwards output/exit codes, signal handling.
- **shared-types** (`src/shared/types`): existing enums and requestedDays helper.
- **shared-date** (`src/shared/date`): existing startOfUtcDay and periodContaining helpers.

### Repository Interfaces
No new repository interfaces are introduced. Existing concrete implementations remain: PgEmployeeRepository, PgLeaveTypeRepository, PgLeavePolicyRepository, PgLeaveBalanceRepository, PgLeaveRequestRepository (PostgreSQL via shared pg Pool). The seed writes directly through the knex instance (standard knex seed mechanism), not through application repositories.

### Contracts
- **authContract**: none — no API endpoints or role-gated access.
- **errorResponseContract**: none — no API endpoints.
- **transactionContract**: none — seed is idempotent and re-runnable; no runtime multi-step atomic write.

### Business Rules
- Seed idempotency: skip already-seeded rows by composite key; never delete or truncate. Keys: employees by email/employee_number; leave_types by code; leave_policies by stable seed id; leave_balances by (employee_id, leave_type_code, period_start, period_end); leave_requests by (employee_id, leave_type_code, start_date).
- Balance counters: SUBMITTED requestedDays -> pending_days; APPROVED requestedDays -> used_days; DRAFT/REJECTED/CANCELLED reserve nothing.
- Seed is development-only; never runs as part of migrate; wired only into knexfile.js development seeds config.
- requestedDays = endDate - startDate + 1 inclusive whole-day UTC, derived only via shared requestedDays helper.
- All seeded dates use UTC discipline via startOfUtcDay/periodContaining anchored on hireDate.
- Demo passwordHash minted with bcrypt.hashSync(plaintext, 10), the same call AuthService verifies.

### Phases
1. Seed module + knex wiring + npm run seed (4 files)
2. Dev runner + npm run dev (2 files)
3. web test script fix: vitest -> vitest run (1 file)
4. README documentation (1 file)

### Open Questions
- Demo credentials: hardcoded vs env-driven with defaults.

### Stack Compliance Note
**Two test runners, by the owner's decision (2026-11-20): Jest for the API, Vitest for the web
app.** This is the declared stack, not a deviation and not pending a ruling.

The API (root `package.json`) runs `jest`; the web app (`web/package.json`) runs `vitest run`
against React 18 + Vite 5. A Vite SPA is the case Vitest exists for — it shares the app's own
Vite config and transform pipeline — so migrating `web/` to Jest would mean maintaining a second
transform chain for no gain.

The open question that used to sit above this note is removed: it had been answered by the code
for some time, and leaving it open made every later feature re-read a settled choice as unsettled.
<!-- gestalt:architecture feature=b020624d-f000-464a-871e-edfa5e57ac4e END -->

