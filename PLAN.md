# PLAN.md

## Phase 1: Phase 1: Ping model and service interface

Create src/modules/ping/ping.model.ts with the PingStatus interface: `export interface PingStatus { status: 'ok'; }`. Create src/modules/ping/ping.service.interface.ts with the IPingService interface: `export interface IPingService { getPing(): PingStatus; }`, importing PingStatus from ./ping.model.ts. Follow the exact pattern established by src/modules/uptime/uptime.model.ts and src/modules/uptime/uptime.service.interface.ts. No external dependencies — this phase is self-contained.

## Phase 2: Phase 2: Ping service implementation

Create src/modules/ping/ping.service.ts with the PingService class implementing IPingService. The getPing() method returns `{ status: 'ok' }` (the literal string 'ok' typed as the literal). Import IPingService from ./ping.service.interface.ts and PingStatus from ./ping.model.ts. This phase depends on src/modules/ping/ping.model.ts and src/modules/ping/ping.service.interface.ts from Phase 1 — read both before generating. Follow the pattern in src/modules/uptime/uptime.service.ts.

## Phase 3: Phase 3: Ping routes

Create src/modules/ping/ping.routes.ts. Export an async function pingRoutes(fastify: FastifyInstance): Promise<void> that registers GET /ping on the Fastify instance. The handler instantiates PingService, calls getPing(), and returns reply.status(200).send(status). Wrap in try/catch with error logging and a 500 fallback. Import FastifyInstance from 'fastify' and PingService from ./ping.service.ts. This phase depends on src/modules/ping/ping.service.ts from Phase 2 — read it before generating to confirm the PingService class and getPing() method signature. Follow the exact pattern in src/modules/uptime/uptime.routes.ts.

## Phase 4: Phase 4: Ping barrel export

Create src/modules/ping/index.ts — the barrel export file that re-exports the public surface of the ping module: PingStatus from ./ping.model.ts, IPingService from ./ping.service.interface.ts, PingService from ./ping.service.ts, and pingRoutes from ./ping.routes.ts. This phase depends on all files from Phases 1-3: src/modules/ping/ping.model.ts, src/modules/ping/ping.service.interface.ts, src/modules/ping/ping.service.ts, and src/modules/ping/ping.routes.ts. Follow the exact pattern in src/modules/uptime/index.ts.

## Phase 5: Phase 5: Register ping routes in app.ts

Update src/app.ts to register the ping routes. Add `import { pingRoutes } from './modules/ping/ping.routes';` alongside the existing uptimeRoutes import, and add `app.register(pingRoutes);` after the existing uptimeRoutes registration. This phase depends on src/modules/ping/ping.routes.ts from Phase 3 — read src/app.ts first to see the current state, then add the import and registration line. The existing file has exactly: import Fastify, import uptimeRoutes, create app, register uptimeRoutes, export default app.
