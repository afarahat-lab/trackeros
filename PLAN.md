# PLAN.md

## Phase 1: Phase 1 — Deduplicate leave.service.ts date helpers

Edit ONLY src/modules/leave/leave.service.ts. This is a pure move — behaviour must not change.

1. Add an import of the three canonical helpers from the shared module. The shared module's public entry point is src/shared/date/index.ts, which re-exports startOfUtcDay, addMonths, periodContaining from src/shared/date/accrual.ts. Add to the existing imports:
   import { startOfUtcDay, addMonths, periodContaining } from '../../shared/date';

2. Delete the three private methods at the bottom of the LeaveService class: private periodContaining, private startOfUtcDay, and private addMonths (the full method bodies, including the ConflictError guards, the 10_000 safety bound, and the final ConflictError('Unable to resolve accrual period')). Do NOT modify the arithmetic in any way — this is a deletion, not a rewrite.

3. Update every call site to drop the `this.` prefix:
   - In cancel(): `this.startOfUtcDay(request.startDate)` → `startOfUtcDay(request.startDate)` and `this.startOfUtcDay(new Date())` → `startOfUtcDay(new Date())`.
   - In resolveBalance(): `this.periodContaining(employee.hireDate, policy.accrualPeriodMonths, date)` → `periodContaining(employee.hireDate, policy.accrualPeriodMonths, date)`.

Do NOT touch any other file. Do NOT change the shared module, repositories, routes, or DTOs. Do NOT touch the unrelated `../leave-type` import (that is in balance.service.ts, not here). After the change, `grep -rn "private addMonths\|private startOfUtcDay\|private periodContaining" src/modules/leave/` must return nothing.

Verification: `npm run build` clean and the existing unit suite passes unchanged (this phase introduces no new module dependency — shared-date is already an allowed dependency of leave).

## Phase 2: Phase 2 — Deduplicate balance.service.ts addMonths

Edit ONLY src/modules/balance/balance.service.ts. This is a pure move — behaviour must not change.

1. Extend the EXISTING import from the shared date module. The file already imports `periodContaining` from '../../shared/date'. Change that line to also import addMonths:
   import { periodContaining, addMonths } from '../../shared/date';

2. Delete the private addMonths method at the bottom of the BalanceService class (the full method body). Do NOT modify the arithmetic — this is a deletion, not a rewrite.

3. Update the single call site in carryForward(): `this.addMonths(source.periodEnd, policy.accrualPeriodMonths)` → `addMonths(source.periodEnd, policy.accrualPeriodMonths)`.

Do NOT touch any other file. Do NOT change the shared module, repositories, routes, or DTOs. Leave the unrelated `../leave-type` import exactly as it is — it is out of scope. After the change, `grep -rn "private addMonths" src/modules/balance/` must return nothing.

Verification: `npm run build` clean and the existing unit suite passes unchanged (shared-date is already an allowed dependency of balance).

## Phase 3: Phase 3 — Deduplication pin test

Add a test that pins the deduplication itself, so a future re-introduction of a private copy that drifts is caught.

Create tests/unit/shared/date.deduplication.test.ts (or add to the existing tests/unit/shared/date.test.ts if preferred — approximately 1 file). The test must:

1. Assert the shared helpers behave correctly at a period boundary under a non-UTC timezone. Set process.env.TZ = 'Asia/Riyadh' (save and restore the original TZ in beforeAll/afterAll, matching the existing pattern in tests/unit/shared/date.test.ts). Assert that startOfUtcDay, addMonths, and periodContaining produce the expected UTC instants at a boundary (e.g. anchor Date.UTC(2023, 0, 10), a date exactly at the period end Date.UTC(2023, 1, 10) rolls into the next period [start Date.UTC(2023,1,10), end Date.UTC(2023,2,10)]), proving the UTC accessors are load-bearing and unaffected by the process timezone.

2. Pin that exactly one definition of each helper exists. Use a source-level assertion (e.g. read src/modules/leave/leave.service.ts and src/modules/balance/balance.service.ts via fs and assert they do NOT contain `private startOfUtcDay`, `private addMonths`, or `private periodContaining`), so a future private copy is caught rather than merely discouraged.

Import the helpers from '../../../src/shared/date' (the public entry point). Do NOT modify any source file. Verification: `npm run build` clean, the full unit suite passes, and `npm run smoke` still passes every stage.
