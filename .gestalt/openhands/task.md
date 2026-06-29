# Implement this phase: Phase 2: Create PingService implementation

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/retry/76e54c06-7df3-48e6-8f3f-1d9bc8d28301/2/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Add a /ping endpoint that returns HTTP 200 with body {"status": "ok"} — Phase 2: Phase 2: Create PingService implementation]

Create **src/modules/ping/ping.service.ts** — the concrete `PingService` class:

- Import `IPingService` from `./ping.service.interface`
- Import `PingResponse` from `./ping.model`
- Export class `PingService implements IPingService`
- Implement `getPing(): PingResponse` returning `{ status: 'ok' }`

Before generating, read the existing files this phase depends on:
- src/modules/ping/ping.model.ts (from Phase 1)
- src/modules/ping/ping.service.interface.ts (from Phase 1)
- src/modules/uptime/uptime.service.ts (existing pattern to follow)

This phase depends on: Phase 1: src/modules/ping/ping.model.ts, Phase 1: src/modules/ping/ping.service.interface.ts.

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 3 — Phase 3: Create ping routes: Create **src/modules/ping/ping.routes.ts** — the Fastify route registration for GET /ping: - Import 
- Phase 4 — Phase 4: Create ping module barrel export: Create **src/modules/ping/index.ts** — the barrel re-export file: - Re-export `PingResponse` from `.
- Phase 5 — Phase 5: Register ping routes in app.ts: Update **src/app.ts** to register the ping routes alongside the existing uptime routes: - Add import

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.