# PLAN.md

## Phase 1: Phase 1: Create ping module domain model and service

Create the core domain logic for the ping module following the same pattern as the existing uptime module at src/modules/uptime/.

Create these 3 files:

1. **src/modules/ping/ping.model.ts** — Define the `PingResponse` interface with two attributes:
   - `message: string` — the literal response payload, always 'pong'
   - `timestamp: Date` — the server-side timestamp at which the ping was processed

2. **src/modules/ping/ping.service.interface.ts** — Define the `IPingService` interface with a single method:
   - `ping(): PingResponse`
   Import `PingResponse` from `./ping.model`.

3. **src/modules/ping/ping.service.ts** — Implement the `PingService` class that implements `IPingService`:
   - Import `IPingService` from `./ping.service.interface`
   - Import `PingResponse` from `./ping.model`
   - The `ping()` method returns `{ message: 'pong', timestamp: new Date() }`

This phase adds new files only — no existing files are modified. The application behavior is unchanged. This phase is independently deployable (CI passes with new unused module files).

Reference the existing uptime module pattern:
- src/modules/uptime/uptime.model.ts
- src/modules/uptime/uptime.service.interface.ts
- src/modules/uptime/uptime.service.ts

## Phase 2: Phase 2: Wire ping routes, barrel export, app registration, and tests

Wire the ping module into the Fastify application and add tests. This phase depends on the files created in Phase 1 — read them before generating any code that references their types.

**Prior phase dependencies (read these first):**
- src/modules/ping/ping.model.ts (Phase 1) — defines `PingResponse`
- src/modules/ping/ping.service.interface.ts (Phase 1) — defines `IPingService`
- src/modules/ping/ping.service.ts (Phase 1) — implements `PingService`

Create/modify these 5 files:

1. **src/modules/ping/ping.routes.ts** — Fastify route plugin following the exact pattern of src/modules/uptime/uptime.routes.ts:
   - Import `FastifyInstance` from `fastify`
   - Import `PingService` from `./ping.service`
   - Export `async function pingRoutes(fastify: FastifyInstance): Promise<void>`
   - Register `GET /ping` handler that instantiates `PingService`, calls `ping()`, returns `reply.status(200).send(result)`
   - Wrap in try/catch returning 500 on error, matching the uptime routes pattern

2. **src/modules/ping/index.ts** — Barrel export file:
   - Export `PingResponse` from `./ping.model`
   - Export `IPingService` from `./ping.service.interface`
   - Export `PingService` from `./ping.service`
   - Export `pingRoutes` from `./ping.routes`

3. **src/app.ts** — Modify existing file to register ping routes:
   - Add import: `import { pingRoutes } from './modules/ping/ping.routes';`
   - Add registration: `app.register(pingRoutes);`
   - Keep existing uptime imports and registration unchanged

4. **tests/unit/modules/ping/ping.service.test.ts** — Jest unit test for PingService:
   - Import `PingService` from `../../../../src/modules/ping/ping.service`
   - Test that `ping()` returns an object with `message` equal to `'pong'`
   - Test that `ping()` returns an object with `timestamp` that is a Date instance
   - Test that `timestamp` is close to `new Date()` (within 1 second)

5. **tests/integration/modules/ping/ping.routes.test.ts** — Jest integration test for the route:
   - Import `app` from `../../../../src/app`
   - Use `app.inject()` to send `GET /ping`
   - Assert status code is 200
   - Assert response body has `message` equal to `'pong'`
   - Assert response body has `timestamp` that is a valid ISO date string

Reference the existing uptime module for patterns:
- src/modules/uptime/uptime.routes.ts
- src/modules/uptime/index.ts
- src/app.ts
