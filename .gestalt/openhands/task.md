# Fix specific quality-gate violations: Phase 5: Audit module (model + repository + service)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/4fbbfee4-4feb-4a2b-8127-85025f82af24/5/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): Change the `ORDER BY performed_at DESC` clause in `findByEntity` to `ORDER BY performed_at ASC` so records are returned in ascending chronological order by performedAt.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/audit/audit.repository.ts
Line: 78
Offending code: `'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at DESC',`
Rule violated: spec:findByEntity-sort-order
Action (do this now): Edit `src/modules/audit/audit.repository.ts` at line 78 in place to fix the `spec:findByEntity-sort-order` violation.
What the quality gate found — apply this: [spec:findByEntity-sort-order] The success criterion requires findByEntity to return records ordered by performedAt ascending (chronological order). The code uses DESC (reverse chronological), which violates the spec requirement.

- Site 2
File: src/modules/audit/audit.repository.ts
Line: 78
Offending code: `'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at DESC',`
Rule violated: review/correctness
Action (do this now): Edit `src/modules/audit/audit.repository.ts` at line 78 in place to fix the `review/correctness` violation.
What the quality gate found — apply this: [review/correctness] findByEntity orders by performed_at DESC but the spec success criterion requires ascending chronological order ("ordered chronologically by performedAt (ascending)"). Change DESC to ASC.

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