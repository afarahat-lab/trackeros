# Trackeros

Corporate operations platform: employee self-service (leave requests, balances), manager
approvals, and HR administration. The backend is a TypeScript/Fastify API backed by
PostgreSQL (Knex migrations + a repository layer); the frontend is a React + Vite SPA
under `web/`.

## Stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest (API) / Vitest (web React + Vite SPA)
- Backend: Fastify
- Frontend: React + Vite
- Database: PostgreSQL

## Running locally

From the repository root, in order:

```sh
# 1. Apply database migrations (Postgres; see knexfile.js for connection config)
npm run migrate

# 2. Seed development-only demo data
npm run seed

# 3. Start the API (Fastify)
npm run start

# 4. Start the web dev server (Vite) — in a second terminal
cd web
npm run dev
```

Step 1 runs at the repository root; step 4 runs inside `web/` and invokes the web
subproject's `dev` script (which runs `vite`). Alternatively, run the whole stack with the
combined runner at the repository root — it spawns the API via `npm run start` and the web
server via `npm run dev` in `web/`, prefixes each stream's output, and tears both down on
Ctrl-C:

```sh
npm run dev
```

The seed writes development-only demo data and never runs as part of `npm run migrate`.

## Demo credentials

The seed creates two accounts that share a single demo password:

| Role     | Email                | Password        |
| -------- | -------------------- | --------------- |
| Manager  | `manager@example.com`  | `demo-password` |
| Employee | `employee@example.com` | `demo-password` |

The shared password is the literal hardcoded by the seed for demo purposes only.
