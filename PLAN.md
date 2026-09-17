# PLAN.md

## Phase 1: Phase 1 — Add createPolicyService() to the policy module

Add a `createPolicyService()` composition factory to the policy module and export it from the module's public entry point.

Files to create/edit (approximately 2):
1. `src/modules/policy/policy.service.ts` — add an exported `createPolicyService(): IPolicyService` factory function (alongside the existing `PolicyService` class). It must construct and return `new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))`. Import `PgLeavePolicyRepository` from `./policy.repository`, `LeaveTypeService` from `../leave-type`, and `PgLeaveTypeRepository` from `../leave-type` (the policy -> leave-type dependency is allowed by the architecture's dependency map). Do NOT change the `PolicyService` class, its constructor signature, or any runtime behaviour.
2. `src/modules/policy/index.ts` — add `export { createPolicyService } from './policy.service';` (keep all existing exports).

Existing files this phase depends on (read before generating): `src/modules/policy/policy.service.ts`, `src/modules/policy/policy.repository.ts`, `src/modules/policy/index.ts`, `src/modules/leave-type/index.ts` (to confirm `LeaveTypeService` and `PgLeaveTypeRepository` are exported from the leave-type public entry point).

Success criteria: `npm run build` is clean; the policy module now owns and exports its own composition factory; no other module is modified in this phase.

## Phase 2: Phase 2 — Rewire createBalanceService() to call createPolicyService()

Rewire the balance module's convenience factory to delegate PolicyService construction to the policy module's new factory, removing the balance -> leave-type import.

File to edit (approximately 1):
1. `src/modules/balance/balance.service.ts` — in `createBalanceService()`, replace the inline `new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))` argument with a call to `createPolicyService()`. Import `createPolicyService` from `../policy` (add it to the existing `../policy` import block). Remove the now-unused imports `PolicyService`, `PgLeavePolicyRepository` from `../policy`, and remove the entire `import { LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';` line. Do NOT change the `BalanceService` class, its constructor signature, or any runtime behaviour.

Existing files this phase depends on (read before generating): `src/modules/balance/balance.service.ts` (current state), and `src/modules/policy/index.ts` from Phase 1 (to confirm `createPolicyService` is exported).

Success criteria: `npm run build` is clean; all existing tests pass; `src/modules/balance/balance.service.ts` no longer imports from `../leave-type`; the dependency map in docs/ARCHITECTURE.md is satisfied without amendment.

## Phase 3: Phase 3 — Rewire createLeaveService() to call createPolicyService()

Rewire the leave module's convenience factory to delegate PolicyService construction to the policy module's new factory, removing the leave -> leave-type import.

File to edit (approximately 1):
1. `src/modules/leave/leave.service.ts` — in `createLeaveService()`, replace the inline `new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))` argument with a call to `createPolicyService()`. Import `createPolicyService` from `../policy` (add it to the existing `../policy` import block). Remove the now-unused imports `PolicyService`, `PgLeavePolicyRepository` from `../policy`, and remove the entire `import { PgLeaveTypeRepository, LeaveTypeService } from '../leave-type';` line. Do NOT change the `LeaveService` class, its constructor signature, or any runtime behaviour.

Existing files this phase depends on (read before generating): `src/modules/leave/leave.service.ts` (current state), and `src/modules/policy/index.ts` from Phase 1 (to confirm `createPolicyService` is exported).

Success criteria: `npm run build` is clean; all existing tests pass; `npm run smoke` is green; `src/modules/leave/leave.service.ts` no longer imports from `../leave-type`; the dependency map in docs/ARCHITECTURE.md is satisfied without amendment.
