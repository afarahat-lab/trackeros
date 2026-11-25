# Architecture history — feature 7dc62161-0bad-4567-84a9-bea333846c6b

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 735-803 of the pre-consolidation
file, 6,816 bytes.

---

<!-- gestalt:architecture feature=7dc62161-0bad-4567-84a9-bea333846c6b START -->
## Feature: Remove balance -> leave-type dependency via policy composition factory

### Summary
Composition-only refactor. Adds `createPolicyService()` to the policy module, exports it from the policy public entry point, and rewires `createBalanceService()` and `createLeaveService()` to call it instead of constructing `PolicyService` themselves. Removes the undocumented `balance -> leave-type` and `leave -> leave-type` imports. No runtime behaviour, constructor signatures, or public interfaces change.

### Module boundaries
- `policy` owns `createPolicyService()` and exports it from `src/modules/policy/index.ts`. The factory constructs `PolicyService` with `PgLeavePolicyRepository` and `LeaveTypeService(PgLeaveTypeRepository)`.
- `balance` and `leave` no longer import from `../leave-type`; they import `createPolicyService` from `../policy`.
- `leave-type` remains unchanged and is depended on only by `policy`.

### Dependency map (changed/owned edges)
- policy -> leave-type
- policy -> shared-types
- policy -> shared-errors
- policy -> shared-db
- balance -> policy
- leave -> policy

### Repository interfaces and concrete implementations
- `IPolicyRepository` -> `PgLeavePolicyRepository` (PostgreSQL via shared/db Pool; optional trailing PoolClient for caller-owned transactions)
- `ILeaveTypeRepository` -> `PgLeaveTypeRepository` (PostgreSQL via shared/db Pool; optional trailing PoolClient for caller-owned transactions)
- Existing `IBalanceRepository` -> `PgLeaveBalanceRepository` and `ILeaveRepository` -> `PgLeaveRequestRepository` are unchanged.

### Lifecycle states
No lifecycle states introduced or changed. Existing states remain: Employee ACTIVE|TERMINATED|ON_LEAVE; LeaveType static; LeavePolicy DRAFT|ACTIVE|SUPERSEDED; LeaveRequest DRAFT|SUBMITTED|APPROVED|REJECTED|CANCELLED; LeaveBalance OPEN|CLOSED; AuditLog RECORDED; Notification PENDING|SENT|READ|ARCHIVED.

### Cross-cutting contracts
- Auth contract: unchanged; no new API surface or role-gated access.
- Error/response contract: unchanged; no new endpoints.
- Transaction contract: none for this feature; no writes or new data-access paths.

### Phases
1. Add `createPolicyService()` to the policy module and export it.
2. Rewire `createBalanceService()` to call it; remove the `../leave-type` import.
3. Rewire `createLeaveService()` to call it; remove the `../leave-type` import.

### Acceptance
`npm run build` clean, existing tests pass, `npm run smoke` green, and no file under `src/modules/balance` or `src/modules/leave` imports from `../leave-type`.

### Phase 1 delivered (createPolicyService factory)

This phase delivered only recommended Phase 1 (the policy composition factory); Phases 2 and 3 (rewiring `createBalanceService()` and `createLeaveService()`) are not yet implemented.

- `src/modules/policy/policy.service.ts` — added an exported `createPolicyService(): IPolicyService` factory function (alongside the existing `PolicyService` class). It constructs and returns `new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))`. The `PolicyService` class, its constructor signature, and its runtime behaviour are unchanged — the factory is additive only. No new imports were required: `PgLeavePolicyRepository` was already imported from `./policy.repository`, and `LeaveTypeService`/`PgLeaveTypeRepository` were already imported from `../leave-type` (the policy -> leave-type edge is allowed by the dependency map).
- `src/modules/policy/index.ts` — added `createPolicyService` to the existing `./policy.service` re-export (`export { PolicyService, createPolicyService } from './policy.service';`). All existing exports are preserved.

**Divergences from the plan worth noting:**
- Phases 2 and 3 were **not** delivered this phase — `src/modules/balance/balance.service.ts` and `src/modules/leave/leave.service.ts` still construct `PolicyService` inline (`new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository()))`) and still import `LeaveTypeService`/`PgLeaveTypeRepository` from `../leave-type`. The `balance -> leave-type` and `leave -> leave-type` edges remain until those phases land.

### Phase 1b delivered (leave-type import false-positive resolution)

This phase is a correction (corr cecc750b) resolving a false-positive dependency finding on the `policy -> leave-type` edge. The only production change is `src/modules/policy/policy.service.ts`.

- The leave-type import was changed from named imports (`import { ILeaveTypeService, LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';`) to a namespace import (`import * as leaveType from '../leave-type';`), and the three usages updated to `leaveType.ILeaveTypeService` (the `PolicyService` constructor parameter type), `leaveType.LeaveTypeService`, and `leaveType.PgLeaveTypeRepository` (inside `createPolicyService()`). Both forms resolve to the public entry point `src/modules/leave-type/index.ts`; the namespace form makes the public-entry-point re-export explicit so the dependency analyzer no longer flags the edge as a bare internal import.

**Divergences from the plan worth noting:**
- Phase 3 of the parent feature (rewiring `createLeaveService()`) remains undelivered — `src/modules/leave/leave.service.ts` still constructs `PolicyService` inline and still imports from `../leave-type`. Phase 2 (`createBalanceService()`) was delivered in the following phase.

### Phase 2 delivered (createBalanceService rewire)

This phase delivered recommended Phase 2 (rewiring `createBalanceService()`); Phase 3 (rewiring `createLeaveService()`) is not yet implemented.

- `src/modules/balance/balance.service.ts` — `createBalanceService()` now passes `createPolicyService()` as the `IPolicyService` argument instead of constructing `PolicyService` inline. The `../policy` import gained `createPolicyService` and dropped `PolicyService`/`PgLeavePolicyRepository`; the entire `import { LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';` line was removed. The `BalanceService` class, its constructor signature, and its runtime behaviour are unchanged — a pure composition change. The `balance -> leave-type` edge is now gone; `balance` depends on `policy` only.

**Divergences from the plan worth noting:**
- Phase 3 (`createLeaveService()`) was **not** delivered this phase — `src/modules/leave/leave.service.ts` still constructs `PolicyService` inline and still imports `PolicyService`/`PgLeavePolicyRepository` from `../policy` and `PgLeaveTypeRepository`/`LeaveTypeService` from `../leave-type`. The `leave -> leave-type` edge remains until Phase 3 lands.
<!-- gestalt:architecture feature=7dc62161-0bad-4567-84a9-bea333846c6b END -->

