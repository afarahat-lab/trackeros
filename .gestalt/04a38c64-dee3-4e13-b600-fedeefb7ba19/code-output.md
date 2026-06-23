All files were created successfully and verification passed:

- **Build**: ✅ TypeScript compilation succeeded (`tsc --noEmit`)
- **Tests**: ✅ All 9 test suites passed (45 tests total), including the new `balance.service.test.ts`

Files created:
1. `src/modules/balance/balance.service.ts` — `ILeaveBalanceService` interface and `BalanceService` class with all 5 methods (getBalance, getBalancesByEmployee, deductBalance, restoreBalance, initializeBalance), audit recording on mutations, and status transitions (ACTIVE ↔ EXHAUSTED)
2. `src/modules/balance/balance.controller.ts` — `BalanceController` with Zod validation, RBAC-aware handlers, and async error mapping to HTTP responses
3. `src/modules/balance/balance.routes.ts` — `balanceRoutes` function registering GET /balances, GET /balances/:employeeId, and POST /balances/initialize with RBAC preHandlers
4. `tests/unit/modules/balance/balance.service.test.ts` — Jest unit tests covering all service methods with mocked repository and audit service