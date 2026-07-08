# Fix specific quality-gate violations: Phase 2: Leave domain model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/be7ddf67-d8cd-4b4b-9a8e-9a007adf8c79/2/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Fix LeavePolicy interface to match design-spec.json: rename maxCarryoverDays to maxAccumulation, rename minRequestDays to minimumNoticeDays, and add requiresManagerApproval: boolean and allowNegativeBalance: boolean fields.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.model.ts
Line: 27
Offending code: `maxCarryoverDays: number;`
Rule violated: intent-spec:leave-policy-fields
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 27 in place to fix the `intent-spec:leave-policy-fields` violation.
What the quality gate found — apply this: [intent-spec:leave-policy-fields] The reconciled architecture (intent-spec.json constraint) requires `maxAccumulation`, not `maxCarryoverDays`. Additionally, line 28 uses `minRequestDays` instead of `minimumNoticeDays`, and the interface is missing `requiresManagerApproval: boolean` and `allowNegativeBalance: boolean` fields that are present in the canonical design-spec.json.

- Site 2
File: src/modules/leave/leave.model.ts
Line: 28
Offending code: `minRequestDays: number;`
Rule violated: intent-spec:leave-policy-fields
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 28 in place to fix the `intent-spec:leave-policy-fields` violation.
What the quality gate found — apply this: [intent-spec:leave-policy-fields] The reconciled architecture requires `minimumNoticeDays`, not `minRequestDays`.

- Site 3
File: src/modules/leave/leave.model.ts
Line: 30
Offending code: `requiresDocumentation: boolean;`
Rule violated: intent-spec:leave-policy-missing-fields
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 30 in place to fix the `intent-spec:leave-policy-missing-fields` violation.
What the quality gate found — apply this: [intent-spec:leave-policy-missing-fields] The LeavePolicy interface is missing `requiresManagerApproval: boolean` and `allowNegativeBalance: boolean` fields required by the reconciled architecture (design-spec.json). The `requiresDocumentation` field on line 30 is present but the two additional fields are absent.

- Site 4
File: src/modules/leave/leave.model.ts
Offending code: `maxCarryoverDays: number;`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.model.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] LeavePolicy field must be `maxAccumulation` per reconciled architecture (ARCHITECTURE.md, DOMAIN.md line 154, intent-spec constraint). The field `maxCarryoverDays` does not match the canonical name.

- Site 5
File: src/modules/leave/leave.model.ts
Offending code: `minRequestDays: number;`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.model.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] LeavePolicy field must be `minimumNoticeDays` per reconciled architecture (ARCHITECTURE.md, DOMAIN.md line 155, intent-spec constraint). The field `minRequestDays` does not match the canonical name.

- Site 6
File: src/modules/leave/leave.model.ts
Offending code: `export interface LeavePolicy {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.model.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] LeavePolicy interface is missing required fields `requiresManagerApproval` (boolean) and `allowNegativeBalance` (boolean) per reconciled architecture (ARCHITECTURE.md BR-005, DOMAIN.md lines 156-157, intent-spec constraint).

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Coherent change 2 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Rename ILeaveRepository to ILeaveRequestRepository throughout src/modules/leave/leave.repository.ts and tests/unit/modules/leave/leave.repository.test.ts.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.repository.ts
Line: 5
Offending code: `export interface ILeaveRepository extends IBaseRepository<LeaveRequest> {`
Rule violated: intent-spec:repository-interface-name
Action (do this now): Edit `src/modules/leave/leave.repository.ts` at line 5 in place to fix the `intent-spec:repository-interface-name` violation.
What the quality gate found — apply this: [intent-spec:repository-interface-name] The reconciled architecture (intent-spec.json constraint) requires the interface to be named `ILeaveRequestRepository`, not `ILeaveRepository`.

- Site 2
File: src/modules/leave/leave.repository.ts
Line: 5
Offending code: `export interface ILeaveRepository extends IBaseRepository<LeaveRequest> {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.repository.ts` at line 5 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Interface must be named `ILeaveRequestRepository` per the reconciled architecture (ARCHITECTURE.md line 125) and intent-spec constraint. The current name `ILeaveRepository` does not match the canonical name.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 1
File: src/modules/leave/leave.repository.ts
Line: 22
Offending code: `constructor(knex: Knex) {`
Rule violated: intent-spec:repository-constructor
Action (do this now): Edit `src/modules/leave/leave.repository.ts` at line 22 in place to fix the `intent-spec:repository-constructor` violation.
What the quality gate found — apply this: [intent-spec:repository-constructor] The intent-spec.json constraint states: "KnexLeaveRepository must extend BaseKnexRepository<LeaveRequest> from src/shared/base.repository.ts, accepting knex: Knex and tableName: string via constructor." The constructor only accepts `knex` and hardcodes `'leave_requests'` in the super call, rather than accepting `tableName` as a parameter.

### Coherent change 3 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Fix UpdateLeaveRequestStatusDto to match design-spec.json: add actorId: string field and remove individual actor fields (approvedBy, approvedAt, rejectedBy, rejectedAt, cancelledBy, cancelledAt).

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave/leave.model.ts
Line: 64
Offending code: `export interface UpdateLeaveRequestStatusDto {`
Rule violated: intent-spec:update-status-dto
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 64 in place to fix the `intent-spec:update-status-dto` violation.
What the quality gate found — apply this: [intent-spec:update-status-dto] The design-spec.json defines UpdateLeaveRequestStatusDto with fields: status, actorId, rejectionReason, cancellationReason. The generated code is missing the required `actorId: string` field and instead has individual actor fields (approvedBy, approvedAt, rejectedBy, rejectedAt, cancelledBy, cancelledAt) that are not in the canonical spec.

- Site 2
File: src/modules/leave/leave.model.ts
Offending code: `export interface UpdateLeaveRequestStatusDto {`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave/leave.model.ts` in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] UpdateLeaveRequestStatusDto is missing the `actorId` field required by the intent-spec success criteria: "Create UpdateLeaveRequestStatusDto type with status, actorId, and conditional fields".

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

### Edit 2
File: src/modules/leave/leave.model.ts
Line: 42
Offending code: `reason: string;`
Rule violated: design-spec:leave-request-reason-nullable
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 42 in place to fix the `design-spec:leave-request-reason-nullable` violation.
What the quality gate found — apply this: [design-spec:leave-request-reason-nullable] The design-spec.json defines `reason` on LeaveRequest as `required: false` (optional). The generated code declares it as `reason: string` (required), but it should be `reason: string | null` to match the canonical spec.

### Edit 3
File: src/modules/leave/leave.model.ts
Line: 60
Offending code: `reason: string;`
Rule violated: design-spec:create-dto-reason-optional
Action (do this now): Edit `src/modules/leave/leave.model.ts` at line 60 in place to fix the `design-spec:create-dto-reason-optional` violation.
What the quality gate found — apply this: [design-spec:create-dto-reason-optional] The design-spec.json defines `reason` on CreateLeaveRequestDto as `required: false` (optional). The generated code declares it as `reason: string` (required), but it should be `reason?: string` to match the canonical spec.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.