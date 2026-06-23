All files have been created and verification has passed. Here's a summary of what was implemented:

### Phase 6: Balance — Model and Repository ✅

**Files created/modified:**

1. **`src/modules/balance/balance.model.ts`** — Re-exports `LeaveBalance` and `CreateLeaveBalanceDto` from shared types, and defines the `BalanceStatus` enum with values `INITIALIZED`, `ACTIVE`, `EXHAUSTED`.

2. **`src/modules/balance/balance.repository.ts`** — Implements:
   - `ILeaveBalanceRepository` interface with `findByEmployeeAndPolicy`, `findByEmployee`, `deductDays`, and `restoreDays`
   - `PgLeaveBalanceRepository` extending `BaseRepository<LeaveBalance>` with:
     - Query methods using `pool.query` with soft-delete filtering
     - `deductDays` — atomic transaction with `SELECT FOR UPDATE`, insufficient balance check, and audit record insertion
     - `restoreDays` — atomic transaction with `SELECT FOR UPDATE` and audit record insertion
     - Proper rollback on errors and client release in `finally` blocks

3. **`tests/unit/modules/balance/balance.repository.test.ts`** — 11 Jest tests covering all repository methods with mocked pool, including success paths, null/empty results, insufficient balance errors, not-found errors, and rollback on unexpected errors.

4. **`ARCHITECTURE.md`** — Updated with BalanceStatus enum documentation.

**Verification:** Build passes (`tsc --noEmit`) and all 39 tests pass (8 test suites).