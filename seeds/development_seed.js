/**
 * Development-only demo-data seed.
 *
 * This file is wired only into the `development` environment (see knexfile.js), so it is
 * NOT reachable from `test`, `production`, or `smoke_pg`. knex runs seeds as a separate
 * `knex seed:run` step and never invokes them as part of `knex migrate:latest`, so this
 * seed never runs automatically during a migration.
 *
 * `SeedService` is TypeScript; this plain-JS entry loads it through `ts-node/register`
 * (the same pattern scripts/smoke.js uses) and drives it with a knex client bound to the
 * development connection. A failure inside `seed()` propagates out of `up`, which makes
 * `knex seed:run` abort with a non-zero exit rather than silently succeeding.
 */
require('ts-node/register');

const { SeedService } = require('../src/modules/seed');

/** @param {import('knex').Knex} knex */
async function up(knex) {
  await new SeedService(knex).seed();
}

/**
 * No-op by design: the seed is idempotent and hand-edited demo data is never destroyed.
 * A `down` that deleted rows would violate the "never deletes-and-reinserts" contract.
 */
async function down() {
  // Intentionally empty.
}

module.exports = { up, down };
