# PLAN.md

## Phase 1: Phase 1: Create ping model and service interface

Create two files in src/modules/ping/:

1. **src/modules/ping/ping.model.ts** — Define the `PingResponse` interface:
   - `status: string` (the literal `"ok"`)

2. **src/modules/ping/ping.service.interface.ts** — Define the `IPingService` interface:
   - Import `PingResponse` from `./ping.model`
   - Single method: `getPing(): PingResponse`

Follow the pattern in the existing uptime module at src/modules/uptime/uptime.model.ts and src/modules/uptime/uptime.service.interface.ts. Read those files before generating to match conventions exactly. No dependencies on any other module — this is a pure leaf module.

## Phase 2: Phase 2: Create PingService implementation

Create **src/modules/ping/ping.service.ts** — the concrete `PingService` class:

- Import `IPingService` from `./ping.service.interface`
- Import `PingResponse` from `./ping.model`
- Export class `PingService implements IPingService`
- Implement `getPing(): PingResponse` returning `{ status: 'ok' }`

Before generating, read the existing files this phase depends on:
- src/modules/ping/ping.model.ts (from Phase 1)
- src/modules/ping/ping.service.interface.ts (from Phase 1)
- src/modules/uptime/uptime.service.ts (existing pattern to follow)

## Phase 3: Phase 3: Create ping routes

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

## Phase 4: Phase 4: Create ping module barrel export

Create **src/modules/ping/index.ts** — the barrel re-export file:

- Re-export `PingResponse` from `./ping.model`
- Re-export `IPingService` from `./ping.service.interface`
- Re-export `PingService` from `./ping.service`
- Re-export `pingRoutes` from `./ping.routes`

Before generating, read the existing barrel at src/modules/uptime/index.ts to match the exact export pattern. Also read src/modules/ping/ping.routes.ts (Phase 3) to confirm the exported function name.

## Phase 5: Phase 5: Register ping routes in app.ts

Update **src/app.ts** to register the ping routes alongside the existing uptime routes:

- Add import: `import { pingRoutes } from './modules/ping/ping.routes';`
- Add registration: `app.register(pingRoutes);` after the existing `app.register(uptimeRoutes);`

Before editing, read src/app.ts to see the current state. The import should follow the same pattern as the existing uptimeRoutes import. This phase depends on src/modules/ping/ping.routes.ts from Phase 3 — read it to confirm the exported function name is `pingRoutes`.
