# Implement this phase: Phase 3: Create ping routes

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/76e54c06-7df3-48e6-8f3f-1d9bc8d28301/3`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Add a /ping endpoint that returns HTTP 200 with body {"status": "ok"} — Phase 3: Phase 3: Create ping routes]

Create **src/modules/ping/ping.routes.ts** — the Fastify route registration for GET /ping:

- Import `FastifyInstance` from `fastify`
- Import `PingService` from `./ping.service`
- Export async function `pingRoutes(fastify: FastifyInstance): Promise<void>`
- Register `fastify.get('/ping', ...)` handler
- Handler instantiates `PingService`, calls `getPing()`, returns `reply.status(200).send(status)`
- Wrap in try/catch with 500 error response on failure (matching the uptime module pattern)

Before generating, read:
- src/modules/ping/ping.service.ts (from Phase 2) — to confirm the class name and method signature
- src/modules/uptime/uptime.routes.ts (existing pattern to follow exactly)

This phase depends on: Phase 2: src/modules/ping/ping.service.ts.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 4 — Phase 4: Create ping module barrel export: Create **src/modules/ping/index.ts** — the barrel re-export file: - Re-export `PingResponse` from `.
- Phase 5 — Phase 5: Register ping routes in app.ts: Update **src/app.ts** to register the ping routes alongside the existing uptime routes: - Add import

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.