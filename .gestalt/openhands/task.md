# Fix specific quality-gate violations: Phase 6: AuditLog model + repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/219727ae-a952-461a-b605-c6d40c0c1e42/6/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Define an explicit `AuditLogFilters` type with optional `entityType`, `entityId`, `performedBy`, `action`, `performedFrom` (Date), and `performedTo` (Date) fields. Use it as the parameter type for `findAll` in both `IAuditLogRepository` and `PgAuditLogRepository`, and implement WHERE clauses `performed_at >= $N` for `performedFrom` and `performed_at <= $N` for `performedTo` when those fields are present.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/audit/audit.repository.interface.ts
Line: 7
Offending code: `findAll(filters: Partial<Pick<AuditLog, 'entityType' | 'entityId' | 'action' | 'performedBy'>>): Promise<AuditLog[]>;`
Rule violated: review/completeness
Action (do this now): Edit `src/modules/audit/audit.repository.interface.ts` at line 7 in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] The findAll filter type is missing `performedFrom` and `performedTo` fields required by the success criterion: "findAll(filters) accepts an AuditLogFilters shape with optional entityType, entityId, performedBy, action, performedFrom, and performedTo fields". The current signature only accepts entityType, entityId, action, and performedBy.

- Site 2
File: src/modules/audit/audit.repository.ts
Line: 113
Offending code: `async findAll(
    filters: Partial<Pick<AuditLog, 'entityType' | 'entityId' | 'action' | 'performedBy'>>
  ): Promise<AuditLog[]> {`
Rule violated: review/completeness
Action (do this now): Edit `src/modules/audit/audit.repository.ts` at line 113 in place to fix the `review/completeness` violation.
What the quality gate found — apply this: [review/completeness] The repository implementation's findAll method also lacks `performedFrom` and `performedTo` filter support, matching the incomplete interface. The success criterion explicitly requires these date-range filter fields.

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