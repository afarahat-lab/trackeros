# PLAN.md

## Phase 1: Phase 1: Ping domain model, service interface, and service implementation

Create the core ping module files following the exact pattern established by src/modules/uptime/:

1. **src/modules/ping/ping.model.ts** — Define the `PingStatus` interface with a single field `status: "ok"` (literal string type, always "ok"). This is a transient value object representing the GET /ping response body.

2. **src/modules/ping/ping.service.interface.ts** — Define the `IPingService` interface with a single method `getStatus(): PingStatus`. Import `PingStatus` from `./ping.model`.

3. **src/modules/ping/ping.service.ts** — Implement `PingService` class that implements `IPingService`. The `getStatus()` method returns `{ status: "ok" }`. Import `IPingService` from `./ping.service.interface` and `PingStatus` from `./ping.model`.

4. **src/modules/ping/index.ts** — Barrel export file re-exporting `PingStatus`, `IPingService`, and `PingService` from their respective files.

Reference the existing uptime module files for the exact patterns: src/modules/uptime/uptime.model.ts, src/modules/uptime/uptime.service.interface.ts, src/modules/uptime/uptime.service.ts, and src/modules/uptime/index.ts. This module is self-contained with no cross-module dependencies.

## Phase 2: Phase 2: Ping routes and Fastify registration

Create the Fastify route plugin and register it in the app:

1. **src/modules/ping/ping.routes.ts** — Create a Fastify plugin that registers `GET /ping`. Instantiate `PingService`, call `getStatus()`, and return HTTP 200 with the `{ status: "ok" }` body. Follow the exact pattern from src/modules/uptime/uptime.routes.ts (import FastifyInstance, export async function pingRoutes, use try/catch with error logging). Import `PingService` from `./ping.service`.

2. **src/modules/ping/index.ts** — Update the barrel export to also re-export `pingRoutes` from `./ping.routes`.

3. **src/app.ts** — Register the `pingRoutes` plugin alongside the existing `uptimeRoutes`. Import `pingRoutes` from `./modules/ping/ping.routes` and call `app.register(pingRoutes)`.

This phase depends on Phase 1 files: src/modules/ping/ping.model.ts, src/modules/ping/ping.service.interface.ts, src/modules/ping/ping.service.ts — read them before generating any code that references their types. Also read src/modules/uptime/uptime.routes.ts and src/app.ts for the exact registration pattern.
