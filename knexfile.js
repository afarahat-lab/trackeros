// Knex configuration — the migration mechanism this project declared but never built.
//
// `knex` has been a dependency since the leave-management work began, and the operator's
// binding clarification for that feature said: "Adopt knex migrations. knex is already in
// package.json — use it rather than adding a new tool. Create the knexfile and a
// migrations directory as part of the persistence work." The dependency landed; the
// mechanism did not, and nothing caught it — every repository queries tables that no
// migration ever created. See docs/briefs/deployability-gap.md in the gestalt repo.
//
// `test` uses sqlite3 so the schema can be applied and probed with no server running:
// `knex migrate:latest` is itself the check that the schema mechanism exists AND that no
// model writes a column no migration created.

require('dotenv').config();

/** @type {import('knex').Knex.Config} */
const base = {
  migrations: { directory: './migrations', tableName: 'knex_migrations' },
};

module.exports = {
  development: {
    ...base,
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'trackeros',
    },
  },
  production: { ...base, client: 'pg', connection: process.env.DATABASE_URL },
  // Real-Postgres smoke — the brief's Q1 target. Used by `npm run smoke` whenever
  // SMOKE_DATABASE_URL is set, so all three stages run against the SAME engine the
  // repositories dial. This is what closes the persistence caveat the sqlite path prints.
  smoke_pg: { ...base, client: 'pg', connection: process.env.SMOKE_DATABASE_URL },
  // Throwaway file DB for the smoke check — no container, no credentials. The fallback
  // when no Postgres is available: it still catches a missing schema mechanism and a
  // column no migration created, but NOT anything the handler does with the database.
  test: {
    ...base,
    client: 'sqlite3',
    connection: { filename: process.env.SMOKE_DB || './.smoke.sqlite' },
    useNullAsDefault: true,
  },
};
