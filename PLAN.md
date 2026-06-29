# PLAN.md

## Phase 1: Phase 1: Ping domain model and service

Create the core ping domain layer following the existing uptime module pattern.

Create three new files:

1. **src/modules/ping/ping.model.ts** — Define the PingResponse interface:
   - `export interface PingResponse { status: string; }`
   - This is a stateless value object with no identity or lifecycle.

2. **src/modules/ping/ping.service.interface.ts** — Define the IPingService interface:
   - Import `PingResponse` from `./ping.model`
   - `export interface IPingService { getPing(): PingResponse; }`

3. **src/modules/ping/ping.service.ts** — Implement PingService:
   - Import `IPingService` from `./ping.service.interface`
   - Import `PingResponse` from `./ping.model`
   - `export class PingService implements IPingService { getPing(): PingResponse { return { status: 'ok' }; } }`

Follow the exact pattern from src/modules/uptime/uptime.model.ts, src/modules/uptime/uptime.service.interface.ts, and src/modules/uptime/uptime.service.ts. This phase has zero dependencies on other modules — the ping module is self-contained.

## Phase 2: Phase 2: Ping route, barrel export, and app registration

Create the Fastify route handler for GET /ping, the barrel index.ts, and register the route in src/app.ts.

Create two new files:

1. **src/modules/ping/ping.routes.ts** — Fastify route plugin:
   - Import `FastifyInstance` from `fastify`
   - Import `PingService` from `./ping.service` (created in Phase 1)
   - `export async function pingRoutes(fastify: FastifyInstance): Promise<void>`
   - Register `fastify.get('/ping', async (request, reply) => { ... })`
   - Inside the handler: instantiate `new PingService()`, call `getPing()`, return `reply.status(200).send(result)`
   - Wrap in try/catch with `request.log.error(error)` and `reply.status(500).send({ error: 'Internal Server Error' })` per GP-006
   - Follow the exact pattern from src/modules/uptime/uptime.routes.ts

2. **src/modules/ping/index.ts** — Barrel export:
   - Re-export `PingResponse` from `./ping.model`
   - Re-export `IPingService` from `./ping.service.interface`
   - Re-export `PingService` from `./ping.service`
   - Re-export `pingRoutes` from `./ping.routes`
   - Follow the exact pattern from src/modules/uptime/index.ts

Modify one existing file:

3. **src/app.ts** — Register the ping route plugin:
   - Add `import { pingRoutes } from './modules/ping/ping.routes';` alongside the existing uptimeRoutes import
   - Add `app.register(pingRoutes);` alongside the existing `app.register(uptimeRoutes);`

This phase depends on Phase 1 files: src/modules/ping/ping.model.ts, src/modules/ping/ping.service.interface.ts, src/modules/ping/ping.service.ts — read them before generating any code that references their types.
