# Fix specific quality-gate violations: Phase 1: Shared infrastructure — enums, errors, and base repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/dad4001c-2c9a-4970-bffb-a47ff1ea15f5/1/1`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: src/shared/db/base.repository.ts
Line: 37
Rule violated: review/implementation
Required change: Edit src/shared/db/base.repository.ts to resolve the review/implementation violation: [review/implementation] `findAll` does not map camelCase filter keys to snake_case database columns as required by the design spec. The spec states: "camelCase keys mapped to snake_case columns". The

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.