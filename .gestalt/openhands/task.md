# Fix specific quality-gate violations: Phase 5: Auth middleware and JWT utilities

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/6f64b552-c5b8-42bc-86fa-01fa08ab4abe/5/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: src/shared/auth/jwt.ts
Line: 25
Offending code: `const decoded = jwt.verify(token, secret) as jwt.JwtPayload;`
Rule violated: no-any
Action (do this now): Edit `src/shared/auth/jwt.ts` at line 25 in place to fix the `no-any` violation.
What the quality gate found — apply this: [no-any] The cast to `jwt.JwtPayload` introduces `any` into the code because `JwtPayload` has an index signature `[key: string]: any`. This means `decoded.userId` and `decoded.role` are typed as `any` internally. The HARNESS.json `no-any` constraint (high severity) requires using `unknown` with type guards instead. The proper approach is to cast to `unknown` first, then validate the shape with type guards (e.g., `typeof payload.userId === 'string'`), avoiding the `any` index signature entirely.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.