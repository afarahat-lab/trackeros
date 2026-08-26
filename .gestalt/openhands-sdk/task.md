# Continue the previous attempt (it hit the iteration limit before finishing)

A prior code-agent attempt on this work dir (`/tmp/gestalt/fix/2a5d3d87-ce68-4c51-a1e4-6c85bde3c2fd/5/2`) was stopped after reaching its iteration limit. Its work is ALREADY on disk here — do NOT restart from scratch or re-read everything; build on what exists. It made 8 file edit(s). Its last verification FAILED (`cd /tmp/gestalt/fix/2a5d3d87-ce68-4c51-a1e4-6c85bde3c2fd/5/2 && npx jest --passWithNoTests 2>&1`):
2m0 total\n\x1b[1mSnapshots:   \x1b[22m0 total\n\x1b[1mTime:\x1b[22m        52 s\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\x1b[K\x1b[1A\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\x1b[0m\x1b[7m\x1b[33m\x1b[1m RUNS \x1b[22m\x1b[39m\x1b[27m\x1b[0m \x1b[1m...\x1b[22m\n\n\x1b[1mTest Suites: \x1b[22m0 of 5 total\n\x1b[1mTests:       \x1b[22m0 total\n\x1b[1mSnapshots:   \x1b[22m0 total\n\x1b[1mTime:\x1b[22m        53 s'}]

Finish the task now: fix any failing build/type-check/tests, then RUN the build and the tests and fix anything still failing. Stop as soon as the build and tests pass. The full original task (with all mandatory constraints) follows for reference.

---

# Fix specific quality-gate violations: Phase 5: Leave module (core) (~5 files)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/2a5d3d87-ce68-4c51-a1e4-6c85bde3c2fd/5/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## This is fix attempt 2, but you are starting from a CLEAN branch
No earlier fix attempt's changes are present in this working tree — this branch was created from the phase's own state, not from a previous attempt. Do NOT look for a prior attempt's edits; they are not here. Work from the code that IS present, and if a file named below does not exist yet, CREATE it with the required content rather than reporting that there is nothing to change.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The transaction contract in .gestalt/architecture/reconciled.json: "Repository methods that participate in multi-step writes accept an optional client?: PoolClient parameter. The calling service owns the unit of work: it acquires a client from the pool, executes BEGIN, passes the client to every repository call in the operation, then executes COMMIT or ROLLBACK." This is the single mechanism — no second transaction abstraction. (see `.gestalt/architecture/reconciled.json → transaction_contract`)
- The three-counter model from the reconciled architecture business rules: entitlementDays, usedDays, pendingDays. availableDays is always derived as entitlementDays - usedDays - pendingDays and never stored. Counter semantics: SUBMIT reserves into pendingDays, APPROVE moves pending→used, REJECT/CANCEL-pending releases, CANCEL-approved restores used. No counter may go negative. (see `.gestalt/architecture/reconciled.json → business_rules item 4`)
- The leave module's dependency on the balance module must be through IBalanceService only, matching the dependency map in the reconciled architecture: leave → balance. The current code's direct dependency on IBalanceRepository violates this boundary. (see `.gestalt/architecture/reconciled.json → dependency_map (leave → balance)`)
- The countLeaveDays helper in src/modules/leave/leave.model.ts is the single canonical day-count function. Every call site in the leave service must use it — no inline re-derivation. This is already the case in the current code and must remain so after the refactor. (see `src/modules/leave/leave.model.ts → countLeaveDays`)
### Entity invariants — enforce these
- Reuse or extend `LeaveBalance`: No counter (entitlementDays, usedDays, pendingDays) may go below zero. Any transition that would cause a negative counter is an error, not a clamp. This guard exists exclusively in BalanceService — never duplicated in LeaveService or any other module.
- Reuse or extend `LeaveRequest`: The policyId stored on a LeaveRequest must reference the active policy resolved at submission time (via findActiveByLeaveType), not the raw dto.policyId. This ensures the request's policy reference is consistent with the balance record used for counter operations.
- Reuse or extend `LeaveRequest (transactional)`: Every mutating operation on a LeaveRequest (submit, approve, reject, cancel) that also mutates balance counters and writes an audit record must execute all three mutations within a single database transaction. A failure in any one must roll back all three.
### Interface contract — expose these operations (their shape is yours)
- IBalanceService.reserveDays — No auth — internal service method; Throws if available balance insufficient (entitlementDays - usedDays - pendingDays < days). Accepts optional client?: PoolClient as last parameter.
- IBalanceService.commitDays — No auth — internal service method; Throws if pendingDays < days. Accepts optional client?: PoolClient as last parameter.
- IBalanceService.releaseDays — No auth — internal service method; Throws if pendingDays < days. Accepts optional client?: PoolClient as last parameter.
- IBalanceService.restoreDays — Throws if usedDays < days. Accepts optional client?: PoolClient as last parameter.
- IBalanceRepository.updateCounters — Atomic counter update. Accepts optional client?: PoolClient as last parameter. When client is provided, uses it for the query; when omitted, uses the shared pool.
- ILeaveRequestRepository.updateStatus — Accepts optional client?: PoolClient as last parameter for transaction participation.
- ILeaveRequestRepository.create — Accepts optional client?: PoolClient as last parameter for transaction participation.
- IAuditRepository.create — Accepts optional client?: PoolClient as last parameter for transaction participation.

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — binding for every phase of this feature.

1 — THERE IS NO FISCAL YEAR. The leave year IS the CALENDAR year: 1 January to 31 December.
Balances reset on 1 January. Do NOT implement a configurable fiscal-year start month and do
NOT implement employee-anniversary years (the latter would additionally require hire dates
this feature does not own). Store the year as a plain integer (e.g. 2026) on the balance
record and derive it from the leave request's startDate. A request whose range crosses
31 December is charged IN FULL to the year of its startDate — never split across two years.

2 — NO overlapping APPROVED leave for the same employee. Enforce at APPROVAL time, not at
submission: a submission-time check cannot account for other PENDING requests approved later,
so approval is the only authoritative gate. Run the overlap check and the balance-sufficiency
check at the SAME point in the approval path so both invariants hold together. Overlap = any
intersection of the [startDate, endDate] range with an existing APPROVED request for that
employee, regardless of leave type.

3 — NO half-day leave. Leave is counted in WHOLE days only; every day counter is an integer.
Do not add a fraction, a half-day flag, or a start/end period (AM/PM) field. This is a
deliberate scope decision: half-days would make every counter fractional and would interact
badly with the inclusive day-count rule in (6).

4 — remainingDays IS DERIVED, NEVER STORED. The balance record holds three non-negative
integer counters — entitlementDays, usedDays, pendingDays — and availability is always
computed:
    availableDays = entitlementDays - usedDays - pendingDays
Do not add a remainingDays column. A stored counter updated on every deduction and
restoration is the classic drift defect: two code paths disagree and the balance silently
goes wrong. Expose it as a computed property/selector so every caller derives it identically.

The ONLY permitted writes to the counters:
- SUBMIT a request for n days:  pendingDays += n   (reserve; usedDays unchanged)
- APPROVE it:                   pendingDays -= n, usedDays += n   (availableDays unchanged —
                                the days were already reserved at submit)
- REJECT a PENDING request:     pendingDays -= n   (release)
- CANCEL a PENDING request:     pendingDays -= n   (release)
- CANCEL an APPROVED request:   usedDays -= n      (restore)
No counter may go negative; a transition that would take one below zero is an ERROR, not a
clamp. The sufficiency check before approval is n <= availableDays.

5 — NO CARRY-OVER AND NO ACCRUAL. The full annual entitlement is available from 1 January.
Unused days simply EXPIRE at 31 December — they do not roll into the next year, and there is
no monthly/pro-rata accrual, no maximum-carry-over cap, and no expiry-deadline logic. On
1 January a fresh balance row is created for the new year with usedDays = 0 and
pendingDays = 0. Mid-year joiners receive the full entitlement (no proration).

6 — LEAVE DAY COUNT = CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. Do NOT exclude weekends. Do NOT exclude public holidays.
There is no holiday calendar in scope.
Implement this EXACTLY ONCE as a single shared exported helper (e.g.
countLeaveDays(startDate, endDate)) in the leave domain module, and call that helper from
EVERY site needing a day count: balance deduction on APPROVED, restoration on CANCELLED, the
sufficiency check before approval, entitlement comparison, and minimumNoticeDays enforcement.
No call site may re-derive the count inline — inline re-derivation is the anti-pattern this
decision exists to prevent.

STANDING DECISIONS carried forward from earlier runs of this feature (unchanged):
- Emergency leave has its OWN entitlement pool, separate from annual; default 5 days. Model
  all types uniformly: annual, sick and emergency each get their own LeavePolicy entitlement
  and their own LeaveBalance record. No special-casing of any type in the balance logic.
- NO documentation requirement for sick leave. Do NOT add a PENDING_DOCUMENTATION state and
  do NOT add any document-tracking entity. The LeaveRequest lifecycle is exactly:
  PENDING -> APPROVED | REJECTED, and PENDING | APPROVED -> CANCELLED.
- Every operation that changes a LeaveRequest status AND balance counters AND writes an audit
  record must run all three through the SAME transaction client, in ONE transaction, so a
  failure rolls back the whole thing. [BINDING RULE — operator decision resolving: What is the fiscal year start month? The domain currently assumes January (calendar year). Many organisations use April or July. This affects which fiscalYear a leave request maps to for balance lookups.; Should the system prevent overlapping leave requests for the same employee? If so, what states count as "active" for overlap detection (APPROVED only, or SUBMITTED + APPROVED)?; Should the system support half-day leave requests? The current model uses Date for startDate/endDate, implying full-day granularity.; How should remainingDays be computed — as a derived field (totalEntitlement - usedDays) or as a stored column that is updated on every deduction/restoration?; What are the fiscal-year boundary rules for balance carry-over and accrual? Should unused days carry over to the next fiscal year, and if so, up to what cap?; How are leave days counted — calendar days or business days (Mon–Fri excluding holidays)?; apply everywhere these apply, not in one place only]

## Architecture & constraint rules the quality gate enforces (satisfy these now)
The quality gate judges your code against the rules below and BLOCKS the phase on any violation — a violation it rates critical escalates to a human with no automatic retry. These are the same rules the gate checks, so comply up front rather than leaving them for the gate:
- Data access is only permitted in the designated data access layer of this project. Code in business logic, presentation, or routing layers must delegate all data operations to the data access layer.
- The data access layer is the only layer permitted to contain connection management, query execution, and direct interaction with the data store.
- Each architectural layer communicates only with its immediately adjacent layer. Layers must not bypass intermediate layers.
- Dependencies flow in one direction only — from outer layers toward inner layers. Inner layers must not depend on outer layers.
- Error handling must be explicit. Callers must not be exposed to unhandled failures from dependencies.
- Do not redefine a symbol another module already owns. Before declaring an error class, DTO, interface, enum, or constant, check whether a symbol representing the SAME concept is already exported by another module; if so, import it from that module's public entry point instead of declaring a second copy. The test is conceptual identity, NOT name identity — a symbol that shares a name but represents a genuinely DIFFERENT concept (different fields or meaning, owned by THIS module) is a legitimately distinct declaration and is not a violation; only flag a declaration that duplicates the shape and meaning of an existing exported symbol.

## Module boundary & dependency rules (satisfy these now)
The quality gate's review judges your code against the project's cross-module dependency rules below and BLOCKS the phase on a violation. These govern how modules depend on each other: import another module ONLY through its declared public entry point (its barrel / index) — never reach into another module's internal files — and introduce no circular dependencies. Comply now rather than leaving them for the gate:
- Modules import from each other ONLY through their declared public entry point (`index.ts`, `__init__.py`, package root — whatever the stack uses)
- No circular dependencies between modules

## Golden principles (NON-NEGOTIABLE — satisfy every one that applies)
These are the project's non-negotiable invariants. A violation is a GOLDEN_PRINCIPLE_BREACH: the quality gate BLOCKS the phase and escalates to a human with NO automatic retry, so it is far more costly than an ordinary finding. Apply EVERY principle relevant to the code you write in this phase — e.g. enforce role-based access control on every API endpoint you add, and validate all inputs at API boundaries before use:
- GP-001 — Repository pattern: All database access goes through repository interfaces. Never query the database directly from services or controllers.
- GP-002 — Audit records: All state-changing operations write an audit record.
- GP-003 — Input validation: Validate all inputs at API boundaries before processing.
- GP-004 — No sensitive data in logs: Never log passwords, tokens, PII, or financial data.
- GP-005 — RBAC enforcement: All API endpoints enforce role-based access control.
- GP-006 — Error handling: No unhandled promise rejections. All async errors are caught and handled.

## Project stack & references
Before making the edits below, read the referenced files (those present in the working directory) to learn the project's architecture, conventions, and the cross-cutting rules your fix must still satisfy — then keep the edits consistent with them:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Remove the call to findActiveByLeaveType and instead check isActive on the policy retrieved by findById.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.service.ts
Line: 36
Offending code: `const policy = await this.policyRepo.findActiveByLeaveType(referencedPolicy.leaveType);`
Rule violated: spec-constraint:submit-no-findActiveByLeaveType
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 36 in place to fix the `spec-constraint:submit-no-findActiveByLeaveType` violation.
What the quality gate found — apply this: [spec-constraint:submit-no-findActiveByLeaveType] The spec constraint (b4533b56/spec.json) explicitly states: "The submit method resolves the policy via IPolicyRepository.findById(policyId) ... and validates isActive === true. It does NOT use findActiveByLeaveType." The code calls findActiveByLeaveType instead of checking isActive on the policy already retrieved by findById. This also introduces a logical risk: findActiveByLeaveType could return a different policy (same leaveType, different id) than the one the caller requested via policyId.

- Site 2
File: src/modules/leave/leave.service.ts
Line: 33
Offending code: `const policy = await this.policyRepo.findActiveByLeaveType(referencedPolicy.leaveType);`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 33 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The submit method calls `findActiveByLeaveType`, but the phase spec (10f63c92 constraint #2) explicitly states: "The submit method resolves the policy via IPolicyRepository.findById(policyId) (since CreateLeaveRequestDto carries policyId, not leaveType) and validates isActive === true. It does NOT use findActiveByLeaveType." The current code first calls findById, then calls findActiveByLeaveType — the second call is the violation.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Remove extends BaseEntity from LeaveRequest and declare id, createdAt, updatedAt directly.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.model.ts
Line: 3
Offending code: `export interface LeaveRequest extends BaseEntity {`
Rule violated: spec-constraint:LeaveRequest-no-extends-BaseEntity
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 3 in place to fix the `spec-constraint:LeaveRequest-no-extends-BaseEntity` violation.
What the quality gate found — apply this: [spec-constraint:LeaveRequest-no-extends-BaseEntity] The spec constraint (b4533b56/spec.json) states: "LeaveRequest does NOT extend BaseEntity — it declares its own id, createdAt, updatedAt fields directly, consistent with Employee, Balance, and Audit patterns. Only LeavePolicy extends BaseEntity." The code has LeaveRequest extending BaseEntity, which contradicts the explicit constraint. This is a binding architectural rule.

- Site 2
File: src/modules/leave/leave.model.ts
Line: 3
Offending code: `export interface LeaveRequest extends BaseEntity {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 3 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] LeaveRequest extends BaseEntity, but the phase spec (10f63c92 constraint #5) explicitly states: "LeaveRequest does NOT extend BaseEntity — it declares its own id, createdAt, updatedAt fields directly, consistent with Employee, Balance, and Audit patterns. Only LeavePolicy extends BaseEntity." The current code violates this invariant.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 3 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Add guards before each counter subtraction to ensure the counter is not less than the days being subtracted, throwing an error if insufficient.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.service.ts
Line: 108
Offending code: `await this.balanceRepo.updateCounters(balance.id, balance.usedDays + days, balance.pendingDays - days);`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 108 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `approve` method does not validate that `pendingDays >= days` before computing `pendingDays - days`. The sufficiency check `available >= days` (where available = entitlementDays - usedDays - pendingDays) does NOT guarantee pendingDays >= days. Example: entitlementDays=20, usedDays=0, pendingDays=3, days=5 → available=17 ≥ 5 passes, but pendingDays - days = -2, violating the spec constraint: "No counter may go negative."

- Site 2
File: src/modules/leave/leave.service.ts
Line: 131
Offending code: `await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays - days);`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 131 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `reject` method does not validate that `pendingDays >= days` before computing `pendingDays - days`. If the balance's pendingDays is somehow less than the request's days (e.g., due to a prior partial release), this would produce a negative counter, violating the spec constraint: "No counter may go negative."

- Site 3
File: src/modules/leave/leave.service.ts
Line: 163
Offending code: `await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays - days);`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 163 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `cancel` method (PENDING branch) does not validate that `pendingDays >= days` before computing `pendingDays - days`. This could produce a negative counter, violating the spec constraint: "No counter may go negative."

- Site 4
File: src/modules/leave/leave.service.ts
Line: 169
Offending code: `await this.balanceRepo.updateCounters(balance.id, balance.usedDays - days, balance.pendingDays);`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 169 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `cancel` method (APPROVED branch) does not validate that `usedDays >= days` before computing `usedDays - days`. This could produce a negative counter, violating the spec constraint: "No counter may go negative."

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 1
File: src/modules/leave/leave.service.ts
Line: 1
Offending code: `import { LeaveStatus } from 'shared/types';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` at line 1 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The spec success criterion #7 requires: "Every mutating operation (submit, approve, reject, cancel) that changes a LeaveRequest status AND balance counters AND writes an audit record must run all three through the same transaction — a failure in any step rolls back the entire operation." The LeaveService does not implement any transaction management — no client acquisition, no BEGIN/COMMIT/ROLLBACK, and no client parameter passed to repository methods. A failure after balance update but before audit write would leave the system in an inconsistent state.

### Edit 2
File: src/modules/leave/leave.service.ts
Offending code: `const referencedPolicy = await this.policyRepo.findById(dto.policyId);
    if (!referencedPolicy) {
      throw new Error('Policy not found');
    }

    const policy = await this.policyRepo.findActiveByLeaveType(referencedPolicy.leaveType);`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.service.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `submit` method does not validate `referencedPolicy.isActive === true` after `findById`. The spec requires: "looks up the active policy via IPolicyRepository.findById(policyId) and checks isActive". The current code skips this check and instead calls `findActiveByLeaveType`, which could resolve a DIFFERENT policy than the one the user explicitly requested via `dto.policyId`. If the referenced policy is inactive but another policy for the same leave type is active, the request would be created against the wrong policy.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.