# Trackeros

Leave management for mid-sized companies. A Fastify + TypeScript backend, a
React + Vite web client, and PostgreSQL persisted through Knex migrations and a
thin repository layer.

## Running locally

From the repository root, in order:

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

- `npm run migrate` — applies the Knex migrations (`knex migrate:latest`) to the
  development database configured by `knexfile.js` (a `DATABASE_URL`, or the
  local Postgres connection defaults).
- `npm run seed` — loads the development-only demo data (`knex seed:run --env
  development`). The seed is idempotent and never runs as part of `npm run
  migrate`: knex runs seeds as a separate `knex seed:run` step, and the seed
  entry is wired only into the `development` environment.
- `npm run dev` — starts both the API (`npm run start`, i.e.
  `ts-node src/index.ts`) and the web dev server (`npm --prefix web run dev`)
  together via `scripts/dev.js`.

To run the two dev processes separately instead:

```bash
npm run start           # API on http://localhost:3000
npm --prefix web run dev # Vite dev server (proxies /auth, /employees, /leaves, /balances)
```

### Demo credentials

`npm run seed` creates a manager and an employee, both with the default password
`demo1234` (the `DEFAULT_SEED_PASSWORD` in the seed service, overridable via the
`SEED_PASSWORD` environment variable):

| Email                  | Role     |
| ---------------------- | -------- |
| `manager@trackeros.dev` | Manager  |
| `employee@trackeros.dev`| Employee |
