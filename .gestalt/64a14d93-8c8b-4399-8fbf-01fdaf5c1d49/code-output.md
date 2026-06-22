All three files have been created successfully and verification has passed:

1. **`src/modules/leave/leave.model.ts`** — Exports `LeaveRequestStatus` enum, `LeaveRequest` interface, `CreateLeaveRequestDto`, and `UpdateLeaveRequestDto`
2. **`src/modules/leave/leave.repository.ts`** — Exports `ILeaveRequestRepository` interface and `LeaveRequestRepository` class with full implementations including:
   - `create()` — inserts with default `draft` status and writes audit log
   - `findById()` — returns single request or null
   - `findByEmployeeId()` — returns all requests for an employee
   - `findByManagerId()` — returns all requests for a manager
   - `updateStatus()` — updates status and writes audit log
   - All methods have proper error handling (no unhandled promise rejections)
   - Uses the `pool` from `src/shared/db/connection.ts`
3. **`tests/unit/modules/leave/leave.repository.test.ts`** — 14 Jest tests covering all repository methods including success cases, edge cases, and error handling

**Verification results:**
- ✅ TypeScript build passes (`tsc --noEmit`)
- ✅ All 82 tests pass across 7 test suites (including the new leave repository tests)