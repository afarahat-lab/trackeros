All three files have been created and verification has passed successfully. Here's a summary:

### Files Created:
1. **`src/modules/policy/policy.model.ts`** — Exports `LeavePolicy` and `CreateLeavePolicyDto` interfaces with all required fields (id, leaveTypeId, maxDaysPerYear, maxConsecutiveDays, requiresApproval, allowNegativeBalance, blackoutDates, status).

2. **`src/modules/policy/policy.repository.ts`** — Exports `ILeavePolicyRepository` interface and `LeavePolicyRepository` class implementing all CRUD methods (findById, findByLeaveTypeId, create, update, archive) with proper snake_case ↔ camelCase row mapping. Note: The `Pool` import was corrected to import from `'pg'` directly since the shared connection module only exports the pool instance, not the type.

3. **`tests/unit/modules/policy/policy.repository.test.ts`** — Jest unit tests covering all repository methods with mocked Pool, including edge cases (not found, defaults, empty updates).

### Verification Results:
- ✅ **Build**: `tsc --noEmit` passed with no errors
- ✅ **Tests**: 19 tests passed across 2 test suites (including the existing employee repository tests)