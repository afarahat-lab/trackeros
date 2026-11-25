# Architecture history — feature 5710baba-c42d-4743-bc05-ce5effb0f951

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 654-734 of the pre-consolidation
file, 7,169 bytes.

---

<!-- gestalt:architecture feature=5710baba-c42d-4743-bc05-ce5effb0f951 START -->
## Feature: Deduplicate the UTC accrual date helpers (v2)

### Status
Reconciled architecture — pure refactor, no behavior change.

### Domain
- **AccrualPeriod** (value object): `{ start: Date (UTC midnight, inclusive), end: Date (UTC midnight, exclusive) }`. Half-open accrual window `[start, end)` produced by `periodContaining`. No lifecycle states.
- Binding rules:
  - `startOfUtcDay` derives UTC midnight from UTC calendar fields (`getUTCFullYear/getUTCMonth/getUTCDate`), never local fields.
  - `addMonths` advances calendar month and clamps day-of-month to target month's last day; does not mutate input.
  - `periodContaining` returns half-open `[start, end)`; rejects dates before anchor with `ConflictError('Requested date precedes the accrual anchor')`; steps at most 10,000 periods and throws `ConflictError('Unable to resolve accrual period')`.
  - All three helpers are pure UTC functions independent of host TZ.
  - Exactly one definition of each helper exists in `src/shared/date/accrual.ts`; leave and balance import from shared entry point.

### Modules
- `shared-date` (`src/shared/date/`) owns `startOfUtcDay`, `addMonths`, `periodContaining`, `index.ts`.
- `leave` (`src/modules/leave/`) owns `LeaveService`; deletes private copies, imports all three from `../../shared/date`.
- `balance` (`src/modules/balance/`) owns `BalanceService`; deletes private `addMonths`, adds to existing shared import.

### Dependency map
- `leave -> shared-date`
- `balance -> shared-date`
No new cross-module imports. Pre-existing `balance -> ../leave-type` remains out of scope.

### Data
No schema changes. Existing tables (`leave_requests`, `leave_balances`, etc.) and repositories (`PgLeaveRequestRepository`, `PgLeaveBalanceRepository`, etc.) untouched. No new repository interfaces or implementations. No transaction contract.

### Contracts
- Auth: none (no API surface).
- Error response: none (no API surface).
- Transaction: none (no writes).

### Phases
1. Phase 1 — Deduplicate leave.service.ts date helpers (1 file)
2. Phase 2 — Deduplicate balance.service.ts addMonths (1 file)
3. Phase 3 — Deduplication pin test (1 file)

### Verification
- `npm run build` clean.
- Full unit suite (178 tests) and `npm run smoke` pass unchanged.
- New test pins shared helpers at a period boundary under `TZ=Asia/Riyadh`.

### Acceptance
Exactly one definition of `startOfUtcDay`, `addMonths`, `periodContaining`; both services import from `src/shared/date`; build, unit suite, smoke pass unchanged.

### Phase 1 delivered (leave.service.ts date-helper deduplication)

This phase delivered only recommended Phase 1 (the `leave.service.ts` dedup); Phase 2 (`balance.service.ts` `addMonths`) and Phase 3 (the deduplication pin test) are not yet implemented.

- `src/modules/leave/leave.service.ts` — added `import { startOfUtcDay, addMonths, periodContaining } from '../../shared/date';` and deleted the three private methods (`private startOfUtcDay`, `private addMonths`, `private periodContaining`) from the `LeaveService` class. Call sites were updated to drop the `this.` prefix: `cancel()` now calls `startOfUtcDay(request.startDate)` and `startOfUtcDay(new Date())`; `resolveBalance()` now calls `periodContaining(employee.hireDate, policy.accrualPeriodMonths, date)`. No arithmetic changed — a pure move, no behavior change.

**Divergences from the plan worth noting:**
- `addMonths` is imported but never called in `leave.service.ts` (the file only uses `startOfUtcDay` and `periodContaining`); the plan prescribed importing all three helpers, and the implementation followed that literally, leaving `addMonths` as an unused import.
- Phase 2 (`balance.service.ts`) and Phase 3 (the deduplication pin test) were **not** delivered this phase — `balance.service.ts` still declares its own `private addMonths` and calls `this.addMonths(...)` in `carryForward()`, and no `date.deduplication.test.ts` exists.

### Phase 2 delivered (balance.service.ts addMonths deduplication)

This phase delivered recommended Phase 2 (the `balance.service.ts` `addMonths` dedup); Phase 3 (the deduplication pin test) is not yet implemented.

- `src/modules/balance/balance.service.ts` — extended the existing shared-date import to `import { periodContaining, addMonths } from '../../shared/date';` and deleted the `private addMonths` method from the `BalanceService` class. The single call site in `carryForward()` now calls `addMonths(source.periodEnd, policy.accrualPeriodMonths)` (dropped the `this.` prefix). No arithmetic changed — a pure move, no behavior change. The unrelated `../leave-type` import (`LeaveTypeService`, `PgLeaveTypeRepository`) was left exactly as it was, per the plan's out-of-scope constraint.

**Divergences from the plan worth noting:**
- Phase 3 (the deduplication pin test) was **not** delivered this phase — no `date.deduplication.test.ts` exists, and the source-level "exactly one definition" pin assertion has not yet been added.

### Phase 3 delivered (deduplication pin test)

This phase delivers recommended Phase 3 — the deduplication pin test — completing the three recommended phases. No production source changed; the only project file touched is `tests/unit/shared/date.deduplication.test.ts` (NEW).

- `tests/unit/shared/date.deduplication.test.ts` — NEW. Two describe blocks:
  - **"shared helpers at a period boundary under a non-UTC timezone"** — captures `process.env.TZ` before `beforeAll` sets it to `'Asia/Riyadh'` and restores it in `afterAll` (matching the existing `date.test.ts` pattern). One test asserts the three helpers produce the expected UTC instants at a boundary: `startOfUtcDay(new Date(Date.UTC(2023, 0, 10)))` → `Date.UTC(2023, 0, 10)`; `addMonths(anchor, 1)` → `Date.UTC(2023, 1, 10)`; and `periodContaining(anchor, 1, new Date(Date.UTC(2023, 1, 10)))` — a date exactly at the period end — rolls into the next period `{ start: Date.UTC(2023, 1, 10), end: Date.UTC(2023, 2, 10) }`, proving the UTC accessors are load-bearing and unaffected by the process timezone.
  - **"exactly one definition of each helper exists"** — reads `src/modules/leave/leave.service.ts` and `src/modules/balance/balance.service.ts` via `fs.readFileSync` (path resolved with `join(__dirname, '..', '..', '..', 'src', ...)`) and asserts neither contains the tokens `private startOfUtcDay`, `private addMonths`, or `private periodContaining`, so a future re-introduced private copy is caught at the source level rather than merely discouraged.
- The helpers are imported from `../../../src/shared/date` (the public entry point), not from `accrual.ts` directly.

**Divergences from the plan worth noting:**
- None — this phase matches PLAN.md Phase 3 and the phase spec exactly: the TZ save/restore, the boundary assertions under `TZ=Asia/Riyadh`, the source-level "exactly one definition" pin via `fs` reads of both service files, and the import from the public entry point. No production source was modified.

### Open questions
None.
<!-- gestalt:architecture feature=5710baba-c42d-4743-bc05-ce5effb0f951 END -->

