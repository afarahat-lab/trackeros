// Knex seed entry — registers the TypeScript compiler and delegates all dataset and
// idempotency logic to the seed service (seeds/seed.service.ts).
require('ts-node/register');

const { seed } = require('./seed.service');

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function seedDemoData(knex) {
  await seed(knex);
};
