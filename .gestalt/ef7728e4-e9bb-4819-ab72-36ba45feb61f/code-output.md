Phase 9 is complete. All files were created and verification passed:

**Files created:**
1. **`src/modules/leave/leave.model.ts`** — Exports `LEAVE_REQUEST_TRANSITIONS` (state machine: DRAFT→SUBMITTED→APPROVED|REJECTED, plus CANCELLED from DRAFT|SUBMITTED|APPROVED), `isValidTransition()`, and re-exports all shared types.

2. **`src/modules/leave/leave.repository.ts`** — Implements `ILeaveRequestRepository` interface and `PgLeaveRequestRepository` class extending `BaseRepository<LeaveRequest>` with:
   - `findByEmployee(employeeId, queryParams)` — parameterized query with dynamic filters
   - `findByApprover(approverId)` — queries by approver
   - `findPending()` — queries for SUBMITTED status
   - `updateStatus(id, status, approvedBy?, approvedAt?)` — enforces valid state transitions via `isValidTransition`, writes audit record in same transaction
   - Overridden `create` — writes audit record (action: 'CREATE') in same transaction

3. **`tests/unit/modules/leave/leave.repository.test.ts`** — Jest tests covering valid transitions, invalid transitions (throws), audit record creation, and all query methods.

**Verification results:**
- ✅ TypeScript build: passed
- ✅ All 13 test suites passed (73 tests total), including the new leave repository tests