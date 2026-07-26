# Fix specific quality-gate violations: Phase 1: Database migrations for leave tables

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/fix/6f64b552-c5b8-42bc-86fa-01fa08ab4abe/1/2`. Do not clone anything; work only in this directory.

You are fixing SPECIFIC violations the quality gate found in EXISTING, already-committed files. Make ONLY the targeted edits listed below — do NOT refactor, regenerate, or change anything else.

The files ALREADY EXIST. You MUST edit them in place with the `str_replace_editor` tool. Reading or viewing a file is NOT sufficient — you have NOT finished until you have edited EVERY file listed below.

## Required edits

### Edit 1
File: knexfile.ts
Line: 8
Offending code: `connection: process.env.DATABASE_URL,`
Rule violated: knexfile-ssl-parity
Action (do this now): Edit `knexfile.ts` at line 8 in place to fix the `knexfile-ssl-parity` violation.
What the quality gate found — apply this: [knexfile-ssl-parity] The knexfile must mirror the SSL logic from src/shared/db/connection.ts — SSL enabled when NODE_ENV === 'production' using DB_SSL_CA, disabled otherwise. The knexfile passes only a raw connection string with no SSL configuration, so Knex and the runtime pg Pool will not connect with parity in production environments where SSL is required.

### Coherent change 1 — apply as ONE atomic edit across ALL sites below

Unifying change (do this now): In all three migrations (001_create_leave_policies.ts, 002_create_leave_requests.ts, 003_create_leave_balances.ts), add `.defaultTo(knex.fn.now())` to both the `created_at` and `updated_at` timestamp column definitions so they read `table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())` and likewise for `updated_at`.

The sites below are the SAME underlying issue. Fixing some but not others leaves the code incoherent and the quality gate WILL re-flag it — apply the one change above consistently to EVERY site:

- Site 1
File: migrations/001_create_leave_policies.ts
Line: 13
Offending code: `table.timestamp('created_at', { useTz: true }).notNullable();`
Rule violated: migration-missing-timestamp-defaults
Action (do this now): Edit `migrations/001_create_leave_policies.ts` at line 13 in place to fix the `migration-missing-timestamp-defaults` violation.
What the quality gate found — apply this: [migration-missing-timestamp-defaults] The spec constraint states: "created_at and updated_at must be timestamptz NOT NULL with a default of knex.fn.now() so inserts that omit them succeed." This line (and the same pattern in all three migrations) declares created_at as NOT NULL but omits .defaultTo(knex.fn.now()), so an INSERT that omits the column will fail with a NOT NULL violation. The same issue applies to updated_at on line 14 of this file, and to both columns in migrations 002 and 003.

- Site 2
File: migrations/002_create_leave_requests.ts
Line: 17
Offending code: `table.timestamp('created_at', { useTz: true }).notNullable();`
Rule violated: migration-missing-timestamp-defaults
Action (do this now): Edit `migrations/002_create_leave_requests.ts` at line 17 in place to fix the `migration-missing-timestamp-defaults` violation.
What the quality gate found — apply this: [migration-missing-timestamp-defaults] Same violation as migration 001: created_at is declared NOT NULL without .defaultTo(knex.fn.now()), so inserts that omit the column will fail. The updated_at column on line 18 has the same issue.

- Site 3
File: migrations/003_create_leave_balances.ts
Line: 11
Offending code: `table.timestamp('created_at', { useTz: true }).notNullable();`
Rule violated: migration-missing-timestamp-defaults
Action (do this now): Edit `migrations/003_create_leave_balances.ts` at line 11 in place to fix the `migration-missing-timestamp-defaults` violation.
What the quality gate found — apply this: [migration-missing-timestamp-defaults] Same violation as migrations 001 and 002: created_at is declared NOT NULL without .defaultTo(knex.fn.now()), so inserts that omit the column will fail. The updated_at column on line 12 has the same issue.

Then check the rest of these files (and the surrounding module) for ANY OTHER occurrence of the same pattern beyond the specific lines listed above, and apply the same change there too — do NOT limit the fix to only the enumerated sites.

## Constraints (mandatory)
- Edit ONLY the files listed above; do not add, delete, or rename files.
- Do not modify imports unless a required change above needs it.
- Do NOT run `git commit`, `git push`, `git add`, or any git command. The platform handles all git operations.
- Do not run tests or build commands.
- When all the listed edits are made, stop.