Phase 4 is complete. All files have been created and verification passed:

**Created files:**
- `src/modules/policy/policy.service.ts` - IPolicyService interface and PolicyService implementation with validateEntitlement logic
- `src/modules/policy/policy.controller.ts` - PolicyController with Zod validation for all CRUD operations
- `src/modules/policy/policy.routes.ts` - Fastify routes with RBAC middleware for all endpoints

**Fixed test files:**
- `tests/unit/modules/policy/policy.service.test.ts` - Added missing mock methods (findByLeaveType, findActive)
- `tests/unit/modules/policy/policy.controller.test.ts` - Added missing getPolicyByLeaveType mock

**Verification results:**
- TypeScript compilation: ✓ Passed
- Jest tests: ✓ 5 test suites, 21 tests passed

All success criteria met:
- IPolicyService and PolicyService exported
- PolicyController exported with Zod validation
- policyRoutes plugin registered with RBAC middleware
- validateEntitlement checks policy existence, active status, and balance
- Complete test coverage for service, controller, and routes