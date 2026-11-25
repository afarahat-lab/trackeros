# Architecture history — feature 957fb3ff-3b3a-4d0e-9273-8b37869e315c

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 1043-1090 of the pre-consolidation
file, 3,850 bytes.

---

<!-- gestalt:architecture feature=957fb3ff-3b3a-4d0e-9273-8b37869e315c START -->
## Dashboard Leave Balances: Full Breakdown and Empty State

### Scope
Frontend-only change confined to `web/src/presentation/pages/DashboardPage.tsx` and its test. No backend, API contract, route, or page changes. Existing `GET /balances/me` and `balanceService.getBalances()` are reused unchanged.

### Domain Entities
- **LeaveBalance** (existing canonical): id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available (computed, never persisted). Lifecycle: OPEN, CLOSED.
- **LeaveBalanceView** (existing wire projection): id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available. Immutable read-only view; no lifecycle.
- **DashboardBalanceDisplay** (new presentation state): balances: LeaveBalanceView[], loading: boolean, error: string | null. Lifecycle: LOADING, ERROR, EMPTY, POPULATED (mutually exclusive).

### Business Rules
- `available = entitledDays - usedDays - pendingDays` is the single canonical derivation, computed server-side; the dashboard displays it verbatim and never recomputes locally.
- Full breakdown per leave type: entitledDays, usedDays, pendingDays, available, in that order, with period dates via `formatUtcDate`.
- Dashboard has exactly four mutually exclusive states: LOADING, ERROR, EMPTY, POPULATED. EMPTY is a normal outcome (e.g. new joiner with no accrual period) and must be visibly distinct from LOADING and ERROR.
- Profile and balances fetches are independent. A balances-only failure must resolve to ERROR, never a perpetual loading state. The loading condition must not be `employee === null || balances === null`; use an explicit `loading` boolean set false in both `.then` and `.catch`.
- An empty balances array is a valid non-error result rendered as an explicit empty state.

### Module Boundaries
- `web-presentation-pages` (`web/src/presentation/pages/`) owns `DashboardPage` and its test. It depends on `web-shared-types`, `web-shared-date`, `web-leave`, `web-employee`, `web-auth`, `web-presentation-components`. No new modules or services.

### Dependency Map
- `web-presentation-pages` -> `web-shared-types`
- `web-presentation-pages` -> `web-shared-date`
- `web-presentation-pages` -> `web-leave`
- `web-presentation-pages` -> `web-employee`
- `web-presentation-pages` -> `web-auth`
- `web-presentation-pages` -> `web-presentation-components`

### Persistence
No new tables, repositories, or repository implementations. Existing backend tables (employees, leave_types, leave_policies, leave_balances, leave_requests, audit_logs, notifications) are reused unchanged. No SQL DDL.

### Cross-Cutting Contracts
- **Auth**: No new API surface or role-gated access; dashboard already behind existing authenticated session. Contract intentionally empty.
- **Error response**: No new endpoints; existing `GET /balances/me` unchanged. Contract intentionally empty.
- **Transaction**: Read-only feature; no multi-step writes. Contract intentionally empty.

### Testing
Web tests use Vitest (project-specific instruction); backend test framework remains Jest per declared stack.

### Recommended Phases
1. **Phase 1 — DashboardPage rendering: full breakdown, empty state, decoupled loading** (1 file): Add explicit `loading` boolean set false in both `.then` and `.catch`; render entitled/used/pending/available per leave type with `formatUtcDate`; add explicit empty state when `balances.length === 0`.
2. **Phase 2 — DashboardPage tests: empty case, balances-fetch error, full breakdown** (1 file): Extend `DashboardPage.test.tsx` (Vitest) covering empty balances, balances-fetch rejection, and full breakdown rendering.

### Open Questions
None.
<!-- gestalt:architecture feature=957fb3ff-3b3a-4d0e-9273-8b37869e315c END -->

