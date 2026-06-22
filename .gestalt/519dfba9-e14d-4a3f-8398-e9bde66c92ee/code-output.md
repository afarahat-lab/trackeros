Phase 4 is complete. Here's a summary of what was accomplished:

## Results

✅ **Verification passed** — exit code 0, build succeeded, all 51 tests passed across 4 test suites.

### Files created:

1. **`src/modules/policy/policy.service.ts`** — Exports:
   - `ValidationResult` interface (`valid: boolean`, `errors: string[]`)
   - `IPolicyService` interface with `getPolicy()` and `validateRequest()` methods
   - `PolicyService` class implementing `IPolicyService`:
     - `getPolicy(leaveTypeId)` — fetches policy from repository, throws descriptive errors if not found or inactive
     - `validateRequest(policy, startDate, endDate, daysRequested)` — validates max consecutive days and blackout dates, returns `{ valid, errors }`
     - Private `getDateRange()` helper for date iteration

2. **`tests/unit/modules/policy/policy.service.test.ts`** — Comprehensive unit tests covering all validation branches:
   - Valid request passes validation
   - Consecutive days exceeded returns error
   - Blackout date conflict returns error
   - Missing policy throws error
   - Inactive policy throws error

All tests pass and the TypeScript build compiles cleanly.