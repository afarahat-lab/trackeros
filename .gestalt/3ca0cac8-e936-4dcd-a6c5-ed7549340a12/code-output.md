Phase 9 completed successfully. I've created:

**src/modules/leave/leave.service.ts**
- Exports `ILeaveService`, `LeaveService`, and `LeaveRequestFilters` interfaces
- Implements complete leave workflow orchestration with all required methods
- Constructor accepts all dependencies: ILeaveRepository, EmployeeService, PolicyService, BalanceService, INotificationRepository, IAuditRepository
- All state-changing operations (submit, approve, reject, cancel) write audit records
- Validates inputs, status transitions, and manager authorization
- Validates leave requests against policies (max days, consecutive days, blackout dates) before submission
- Deducts leave balance on approval via BalanceService
- Sends notifications on all state changes
- Executes operations atomically within transactions
- Proper error handling without sensitive data logging

**tests/unit/modules/leave/leave.service.test.ts**
- Comprehensive Jest test suite covering all public methods
- Tests for success cases and error scenarios
- Verifies audit records are written for state changes
- Verifies notifications are sent appropriately
- Verifies balance deduction on approval
- Tests policy validation and authorization checks

Verification passed:
- ✅ TypeScript build successful
- ✅ All 107 tests passing (including 25 new tests for LeaveService)
- ✅ Exit code 0