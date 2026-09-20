# Feature review findings

Findings from the FEATURE-level review — one pass over everything this feature built, scoped to its diff against the default branch. Per-phase gate findings live in each phase's `.gestalt/<correlation id>/` folder.

**1 open · 1 fixed** after 2 attempts.

A finding is `fixed` when an attempt stopped reporting it. Findings are never removed from this file — one that lists only what is currently broken cannot show you that anything got better.

| status | rule | location | first seen | resolved | finding |
|---|---|---|---|---|---|
| 🔴 open | `review/architecture` | `README.md:15` | attempt 1 | — | [review/architecture] README's "Running locally" section documents `npm run dev` as a command, but package.json has no `dev` script (scripts are start/build/test/lint/migrate/migrate:rollback/migrate:make/seed/smoke:migrate/smoke). Running `npm run dev` fails with "Missing script: dev". The spec's ambiguity required either adding a `dev` script mapping to `node scripts/dev.js` or documenting `node scripts/dev.js`; the README documents the `npm run dev` form without wiring the script, so the primary documented command is broken.   Evidence: "npm run dev"   Fix: Document the invocation as `node scripts/dev.js` in the README (the spec's outOfScope forbids adding a `dev` script to package.json), or add `"dev": "node scripts/dev.js"` to package.json scripts so `npm run dev` resolves. |
| 🟢 fixed | `review/architecture` | `src/modules/seed/seed.service.ts` | attempt 1 | attempt 2 | [review/architecture] The phase spec's consistency requirement mandates using `LeavePolicyStatus.ACTIVE` (referencePath `src/modules/policy/policy.model.ts`), and the constraint "Every type is imported from the exact module path the architecture declares for it" requires the enum be imported rather than re-declared. The seed instead hardcodes the raw string `'ACTIVE'` and types `SeedLeavePolicyInput.status` as `string`, losing the enum type safety the spec requires. The value is correct at runtime, but this is a genuine deviation from a stated consistency invariant.   Evidence: "const POLICY_STATUS_ACTIVE = 'ACTIVE';" |

## Offending lines

- **src/modules/seed/seed.service.ts** — `review/architecture` (fixed in attempt 2)

  ```
  const POLICY_STATUS_ACTIVE = 'ACTIVE';
  ```

- **README.md:15** — `review/architecture` (open)

  ```
  npm run dev
  ```
