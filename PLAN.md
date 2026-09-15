# PLAN.md

## Phase 1: Phase 1 — Deduplicate leave.service.ts date helpers

Edit ONLY src/modules/leave/leave.service.ts. This is a pure move — behaviour must not change.

1. Add an import of all three helpers from the canonical shared module. Add to the existing imports near the top:
   import { startOfUtcDay, addMonths, periodContaining } from '../../shared/date';

2. Delete the three private methods at the bottom of the LeaveService class:
   - private periodContaining(anchor, accrualMonths, date)
   - private startOfUtcDay(date)
   - private addMonths(date, months)
   Delete them entirely (they are byte-for-byte identical to the shared copies apart from `this.` prefixes and indentation).

3. Update every call site to use the imported free functions instead of `this.`:
   - In `cancel`: `this.startOfUtcDay(request.startDate)` → `startOfUtcDay(request.startDate)` and `this.startOfUtcDay(new Date())` → `startOfUtcDay(new Date())`.
   - In `resolveBalance`: `this.periodContaining(employee.hireDate, policy.accrualPeriodMonths, date)` → `periodContaining(employee.hireDate, policy.accrualPeriodMonths, date)`.

Do NOT change the arithmetic, the `ConflictError` guards, the `10_000` safety bound, or the `getUTC*` accessors. Do NOT touch the shared module, repositories, routes, or DTOs. Do NOT add any other cross-module import.

Verification: `grep -rn "private addMonths\|private startOfUtcDay\|private periodContaining" src/modules/leave/` returns nothing; `npm run build` clean; existing suite still passes.

## Phase 2: Phase 2 — Deduplicate balance.service.ts addMonths

Edit ONLY src/modules/balance/balance.service.ts. This is a pure move — behaviour must not change.

1. Extend the existing import from the shared date module. The file already has:
   import { periodContaining } from '../../shared/date';
   Change it to:
   import { periodContaining, addMonths } from '../../shared/date';

2. Delete the private `addMonths(date, months)` method at the bottom of the BalanceService class (it is byte-for-byte identical to the shared copy apart from indentation).

3. Update the single call site in `carryForward`:
   `this.addMonths(source.periodEnd, policy.accrualPeriodMonths)` → `addMonths(source.periodEnd, policy.accrualPeriodMonths)`.

Do NOT change the arithmetic or the `getUTC*` accessors. Do NOT touch the shared module, repositories, routes, or DTOs. Do NOT add any other cross-module import.

Verification: `grep -rn "private addMonths" src/modules/balance/` returns nothing; `npm run build` clean; existing suite still passes.

## Phase 3: Phase 3 — Add deduplication regression test

Add a regression test that pins the deduplication itself, so a future re-introduction of a drifting private copy is caught.

Add to tests/unit/shared/date.test.ts (the existing date-helper test file) a new describe block, e.g. `describe('deduplication regression', ...)`, that asserts the shared helpers behave identically for a period boundary case under a non-UTC timezone. Reuse the existing pattern already in that file (the `date helpers under a non-UTC timezone` block sets `process.env.TZ = 'Asia/Riyadh'` in beforeAll and restores it in afterAll).

Concretely, add a test that:
- Sets TZ to a non-UTC zone (e.g. Asia/Riyadh) for the duration of the test (or reuse the existing beforeAll/afterAll block).
- Constructs a boundary date and asserts `periodContaining` returns the expected `{ start, end }` instants, and that `startOfUtcDay` and `addMonths` produce the expected UTC instants — e.g. anchor `new Date(Date.UTC(2023, 0, 31))`, `periodContaining(anchor, 1, new Date(Date.UTC(2023, 1, 1)))` → start `Date.UTC(2023, 0, 31)`, end `Date.UTC(2023, 1, 28)`.

Do NOT modify src/shared/date/accrual.ts, src/shared/date/index.ts, or either service file. Do NOT weaken, skip, or delete any existing test.

Verification: `npm run build` clean; full unit suite (178 tests) passes; `npm run smoke` passes every stage.
