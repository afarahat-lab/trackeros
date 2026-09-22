# PLAN.md

## Phase 1: Phase 1 — DashboardPage rendering: full breakdown, empty state, decoupled loading

Modify ONLY `web/src/presentation/pages/DashboardPage.tsx` (the single file this phase owns). This phase depends on the existing `web/src/shared/types/index.ts` (LeaveBalanceView, EmployeeProfile), `web/src/shared/date/index.ts` (formatUtcDate), and `web/src/modules/leave/index.ts` (IBalanceService) — read them before generating code; do not change them.

Three changes, all within the existing component (no new route, no new page, no backend/API change):

1. Full per-leave-type breakdown. Replace the current single-line list item (`{balance.leaveTypeCode} — available: {balance.available} (...)`) with a rendering that shows all four components of `LeaveBalanceView` for each balance: `entitledDays`, `usedDays`, `pendingDays`, and `available`. Keep the period dates already shown, rendered via the existing `formatUtcDate(balance.periodStart)` / `formatUtcDate(balance.periodEnd)` — do NOT add any date parsing or a second formatter. Use the exact field names from the canonical `LeaveBalanceView` (id, employeeId, leaveTypeCode, periodStart, periodEnd, entitledDays, usedDays, pendingDays, available); do not rename or invent fields.

2. Empty state. When `balances.length === 0`, render an explicit, visible "no balances yet" message (e.g. a paragraph) instead of an empty `<ul>`. This must be visibly distinct from both the loading state and the error state.

3. Decoupled loading. Introduce an explicit `loading` boolean state decoupled from data nullability, so a balances-only failure can never present as a permanently loading page. The current condition `employee === null || balances === null` conflates the two independent fetches. Keep a single loading state if that reads better, but ensure: (a) `loading` is set true before the fetch and false when the `Promise.all` settles (both success and failure paths, respecting the existing `cancelled` guard); (b) the error state (existing `role="alert"` div) still takes precedence and is reachable when only the balances fetch fails; (c) the empty state is reachable when the fetch succeeds with an empty array. The `DashboardBalanceDisplay` presentation state resolves to exactly one of loading / error / empty / populated.

Do not modify the test file in this phase. After editing, `web` build (`tsc --noEmit && vite build`) must pass.

## Phase 2: Phase 2 — DashboardPage tests: empty case, balances-fetch error, full breakdown

Modify ONLY `web/src/presentation/pages/DashboardPage.test.tsx` (the single file this phase owns). This phase depends on `web/src/presentation/pages/DashboardPage.tsx` from Phase 1 — read it before writing assertions so the test matches the actual rendered markup (labels, element roles, and the empty-state message text). Also read `web/src/shared/types/index.ts` for the `LeaveBalanceView` field names.

Extend the existing Vitest suite (keep the existing approvals-link tests intact) with coverage for the three new behaviors, using the existing `buildBalance`/`buildProfile` fixtures and the `renderPage` helper (extend it or add a variant that accepts a balances array and/or a rejecting `getBalances`):

1. Full breakdown — render a balance with non-zero `entitledDays`, `usedDays`, `pendingDays`, and `available` (e.g. entitled 20, used 8, pending 2, available 10) and assert all four values appear in the document, plus the period dates via `formatUtcDate` output. Do not assert only `available`.

2. Empty case — render with `getBalances` resolving to `[]` and assert the explicit "no balances yet" message is present, and that it is distinct from the loading text (assert the loading text is NOT present).

3. Balances-fetch error — render with `getBalances` rejecting (e.g. `vi.fn().mockRejectedValue(new Error('balances failed'))`) while `getMe` resolves, and assert the `role="alert"` error element is shown with the error message, and that the page is NOT stuck in the loading state (loading text absent).

Use `await screen.findBy...` for async assertions. After editing, `vitest run` (web test) and `tsc --noEmit && vite build` (web build) must both pass.
