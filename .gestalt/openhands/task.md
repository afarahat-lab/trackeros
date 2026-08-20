# Fix specific quality-gate violations: Phase 1: Foundation – Shared types, Employee, LeavePolicy (part 1/2)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/3350baf6-9bd5-4cac-b688-f263972317f9/1/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- LeavePolicy.leaveType and ILeavePolicyService method parameters must use the LeaveType enum imported from src/shared/types/index.ts — the import already exists but is unused; the field and parameters must reference it (see `src/shared/types/index.ts`)
- Employee.employmentStatus must use the EmploymentStatus enum from src/shared/types/index.ts — add the import and replace the string type (see `src/shared/types/index.ts`)
- IEmployeeRepository.softDelete return type must match the pattern established by update (Promise<Employee | null>), not Promise<boolean> — the reconciled architecture and PLAN.md both describe softDelete as setting deletedAt and returning the entity (see `src/modules/employee/employee.model.ts`)
### Entity invariants — enforce these
- Reuse or extend `Employee`: employmentStatus must be typed as EmploymentStatus enum, not as string — the enum values (active | inactive | terminated) are the only valid states
- Reuse or extend `LeavePolicy`: leaveType must be typed as LeaveType enum, not as string — the enum values (annual | sick | emergency) are the only valid leave types
### Interface contract — expose these operations (their shape is yours)
- ILeavePolicyService.getPolicyForLeaveType — No auth rule at interface level — auth is enforced at the controller/route layer per GP-005

## Authoritative entity shape (from the reconciled architecture — MANDATORY, not your choice)
The entities below are shared, cross-module DATA CONTRACTS. Implement each one with EXACTLY these fields and types — identical names and types, with no additions, renames, splits (e.g. do NOT split a `fullName` into first/last), or omissions. This is a fixed contract other modules and later phases depend on; it is NOT an implementation choice, and it OVERRIDES any field list you might infer from PLAN.md or the phase description:
- `LeavePolicy` — the entity MUST have exactly these fields:
    - id: string
    - policyName: string
    - leaveType: string
    - entitlementDays: number
    - accrualRate: number | undefined
    - maxAccumulation: number | undefined
    - minimumNoticeDays: number
    - requiresManagerApproval: boolean
    - isActive: boolean
    - createdAt: Date
    - updatedAt: Date
- `Employee` — the entity MUST have exactly these fields:
    - id: string
    - employeeNumber: string
    - firstName: string
    - lastName: string
    - email: string
    - managerId: string | null
    - department: string | null
    - hireDate: Date
    - terminationDate: Date | null
    - employmentStatus: string
    - createdAt: Date
    - updatedAt: Date
    - deletedAt: Date | null

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- Calendar days inclusive: start_date through end_date, all days count toward used_days (weekends and public holidays included). end_date is inclusive. [BINDING RULE — operator decision resolving: How are leave days counted — are start_date and end_date inclusive, and do weekends/public holidays count toward the used-days total?; apply everywhere these apply, not in one place only]

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

Unifying change (do this now): Change the leaveType field type from string to LeaveType in leave-policy.model.ts (the import already exists).

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-policy/leave-policy.model.ts
Line: 6
Offending code: `leaveType: string;`
Rule violated: spec-constraint-leaveType-enum
Action (do this now): Edit `src/modules/leave-policy/leave-policy.model.ts` at line 6 in place to fix the `spec-constraint-leaveType-enum` violation.
What the quality gate found — apply this: [spec-constraint-leaveType-enum] The spec constraint requires: "The `leaveType` field on `LeavePolicy` MUST be typed as the `LeaveType` enum imported from `../../shared/types`, not as `string`". The `LeaveType` enum is imported on line 1 but the field is typed as `string` instead of `LeaveType`.

- Site 2
File: src/modules/leave-policy/leave-policy.model.ts
Offending code: `leaveType: string;`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave-policy/leave-policy.model.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `leaveType` field is typed as `string` but the spec constraint requires it be typed as the `LeaveType` enum. The import `import { LeaveType } from '../../shared/types';` exists on line 1 but is unused — the field still uses `string`.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Import EmploymentStatus from '../../shared/types' and change the employmentStatus field type from string to EmploymentStatus in employee.model.ts.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/employee/employee.model.ts
Line: 11
Offending code: `employmentStatus: string;`
Rule violated: spec-constraint-employmentStatus-enum
Action (do this now): Edit `src/modules/employee/employee.model.ts` at line 11 in place to fix the `spec-constraint-employmentStatus-enum` violation.
What the quality gate found — apply this: [spec-constraint-employmentStatus-enum] The spec constraint requires: "The `Employee` entity's `employmentStatus` field MUST be typed as `EmploymentStatus` (the enum from shared types), not as `string`". The `EmploymentStatus` enum is defined in `src/shared/types/index.ts` but is not imported in this file, and the field is typed as `string`.

- Site 2
File: src/modules/employee/employee.model.ts
Offending code: `employmentStatus: string;`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/employee/employee.model.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `employmentStatus` field is typed as `string` but the spec constraint requires it be typed as the `EmploymentStatus` enum imported from `../../shared/types`. The Employee model does not import `EmploymentStatus` at all.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 3 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Change the return type of softDelete method from Promise<boolean> to Promise<void> in employee.model.ts.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/employee/employee.model.ts
Line: 23
Offending code: `softDelete(id: string): Promise<boolean>;`
Rule violated: spec-constraint-softDelete-return-type
Action (do this now): Edit `src/modules/employee/employee.model.ts` at line 23 in place to fix the `spec-constraint-softDelete-return-type` violation.
What the quality gate found — apply this: [spec-constraint-softDelete-return-type] The success criteria specify `softDelete(id: string): Promise<void>`, but the implementation returns `Promise<boolean>`. This is a contract mismatch — downstream consumers expecting `void` will get a different type.

- Site 2
File: src/modules/employee/employee.model.ts
Offending code: `softDelete(id: string): Promise<boolean>;`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/employee/employee.model.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] The `softDelete` method returns `Promise<boolean>` but the spec success criterion #8 requires `Promise<void>`. The return type does not match the contract.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Verify before you finish (MANDATORY)
After making the edits above, the code MUST still compile and its tests MUST pass — a compilation/type error, or a test your change breaks, must NEVER be left for CI or the quality gate to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`, install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`).
- FIX every compilation error, type error, and failing test that YOUR edits introduced — including updating a test whose expectation your change legitimately invalidated (e.g. a new required field, a new status code such as 401/403 from an added authorization check, added input validation) — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Keep the change SURGICAL: make the required edits above and fix only what they broke (compile/type errors and the tests they invalidated). Do NOT refactor, regenerate, or change unrelated code, and do not add / delete / rename source files beyond what a required edit — or a test-fix for it — needs.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- When the listed edits are made and the build + tests pass, stop.