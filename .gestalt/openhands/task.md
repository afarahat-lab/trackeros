# Fix specific quality-gate violations: Phase 9: LeaveBalance service and Notification service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/e207b7c2-5967-4897-aeeb-2fac2e370ce3/9/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make the targeted edits listed below — do NOT refactor, regenerate, or change unrelated code.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): In src/modules/leave-balance/leave-balance.service.ts, change the ILeavePolicyService import from '../leave-policy/leave-policy.service.interface' to the barrel import '../leave-policy' (i.e., `import { ILeavePolicyService } from '../leave-policy';`).

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: src/modules/leave-balance/leave-balance.service.ts
Line: 4
Offending code: `import { ILeavePolicyService } from '../leave-policy/leave-policy.service.interface';`
Rule violated: cross-module-barrel-import
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.ts` at line 4 in place to fix the `cross-module-barrel-import` violation.
What the quality gate found — apply this: [cross-module-barrel-import] Cross-module import bypasses the leave-policy barrel (index.ts). ARCHITECTURE.md requires: "Modules import from each other ONLY through their declared public entry point (index.ts)." The spec constraint states: "LeaveBalanceService must import ILeavePolicyService from the leave-policy barrel (src/modules/leave-policy/index.ts), not from internal service files." The leave-policy/index.ts already exports ILeavePolicyService. The import should be: `import { ILeavePolicyService } from '../leave-policy';`

- Site 2
File: src/modules/leave-balance/leave-balance.service.ts
Line: 4
Offending code: `import { ILeavePolicyService } from '../leave-policy/leave-policy.service.interface';`
Rule violated: review/architecture
Action (do this now): Edit `src/modules/leave-balance/leave-balance.service.ts` at line 4 in place to fix the `review/architecture` violation.
What the quality gate found — apply this: [review/architecture] Cross-module import of ILeavePolicyService bypasses the leave-policy barrel (index.ts). The spec requires importing from '../leave-policy/index' (or '../leave-policy') for cross-module dependencies.

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