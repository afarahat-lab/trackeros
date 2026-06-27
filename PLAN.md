# PLAN.md

## Phase 1: Phase 1: Domain models and service/repository interfaces for status module

Create the foundation of the new `src/modules/status/` module. This phase creates only type definitions and interfaces — no runtime behavior changes, so the app remains fully functional.

Create the following files:

1. **src/modules/status/health.model.ts** — Define the `HealthStatus` interface with attributes: `isHealthy: boolean`, `timestamp: Date`, `version: string`, `uptimeSeconds: number`.

2. **src/modules/status/version.model.ts** — Define the `VersionInfo` interface with attributes: `version: string`, `buildNumber: string`, `commitHash: string`, `buildDate: Date`.

3. **src/modules/status/health.service.interface.ts** — Define `IHealthService` interface with method `getHealth(): Promise<HealthStatus>`. Import `HealthStatus` from `./health.model`.

4. **src/modules/status/version.service.interface.ts** — Define `IVersionService` interface with method `getVersion(): VersionInfo`. Import `VersionInfo` from `./version.model`.

5. **src/modules/status/health.repository.interface.ts** — Define `IHealthRepository` interface with method `checkDatabaseConnection(): Promise<boolean>`.

Read `src/modules/uptime/uptime.model.ts` and `src/modules/uptime/uptime.service.interface.ts` as reference for the existing module pattern. Follow the same style and conventions. Strict TypeScript — no implicit any, strict null checks (per tsconfig.json).

Include Jest unit tests in `tests/unit/modules/status/` that verify the interfaces are importable and the model shapes are correct.

## Phase 2: Phase 2: Health repository implementation

Implement the health repository that checks database connectivity. This phase depends on the interfaces and models created in Phase 1.

Create the following file:

1. **src/modules/status/health.repository.ts** — Implement the `HealthRepository` class that implements `IHealthRepository` from `./health.repository.interface`. The `checkDatabaseConnection()` method should:
   - Import `pool` from `../../shared/db/connection` (this file already exists)
   - Execute a simple query like `SELECT 1` to verify database connectivity
   - Return `true` if the query succeeds, `false` if it fails
   - Wrap the database call in explicit try-catch error handling (per project rules)

Read these files from Phase 1 before generating code:
- `src/modules/status/health.repository.interface.ts` — to see the exact interface signature
- `src/modules/status/health.model.ts` — to understand the domain types
- `src/shared/db/connection.ts` — to see how the database pool is exported

Follow the repository pattern: all database access must go through the repository layer. Use the existing `pool` from `src/shared/db/connection.ts`. Strict TypeScript — no implicit any.

Include Jest unit tests in `tests/unit/modules/status/` that mock the database pool and verify the repository returns correct boolean values for success and failure cases.

## Phase 3: Phase 3: Health service and Version service implementations

Implement both service classes for the status module. This phase depends on the interfaces, models, and repository created in Phases 1 and 2.

Create the following files:

1. **src/modules/status/health.service.ts** — Implement the `HealthService` class that implements `IHealthService` from `./health.service.interface`. The `getHealth()` method should:
   - Accept an `IHealthRepository` via constructor injection (dependency injection pattern)
   - Call `this.healthRepository.checkDatabaseConnection()` wrapped in explicit try-catch error handling
   - Return a `HealthStatus` object with: `isHealthy` set to the result of the database check, `timestamp` set to `new Date()`, `version` read from `package.json` (use ES module import with resolveJsonModule — per tsconfig.json this is enabled), `uptimeSeconds` from `Math.floor(process.uptime())`
   - If the database check throws, set `isHealthy` to `false` rather than propagating the error

2. **src/modules/status/version.service.ts** — Implement the `VersionService` class that implements `IVersionService` from `./version.service.interface`. The `getVersion()` method should:
   - Read version metadata from `package.json` (import using ES module syntax — `resolveJsonModule` is enabled in tsconfig.json)
   - Return a `VersionInfo` object with: `version` from package.json version field, `buildNumber` from environment variable `BUILD_NUMBER` or `'dev'`, `commitHash` from environment variable `COMMIT_HASH` or `'unknown'`, `buildDate` from environment variable `BUILD_DATE` or current date

Read these files from prior phases before generating code:
- `src/modules/status/health.model.ts` — for `HealthStatus` interface fields
- `src/modules/status/health.service.interface.ts` — for `IHealthService` method signature
- `src/modules/status/health.repository.interface.ts` — for `IHealthRepository` to inject
- `src/modules/status/version.model.ts` — for `VersionInfo` interface fields
- `src/modules/status/version.service.interface.ts` — for `IVersionService` method signature
- `src/modules/status/health.repository.ts` — to understand the concrete repository class
- `package.json` — to see the version field and confirm resolveJsonModule is available

Strict TypeScript — no implicit any, strict null checks. No hardcoded secrets (per project constraints).

Include Jest unit tests in `tests/unit/modules/status/` that mock the repository and verify both services return correctly shaped objects.

## Phase 4: Phase 4: Status routes and module index

Create the Fastify route handlers for `/health` and `/version` endpoints, plus the module barrel export. This phase depends on the services created in Phase 3.

Create the following files:

1. **src/modules/status/status.routes.ts** — Define an async Fastify plugin function `statusRoutes(fastify: FastifyInstance): Promise<void>` that registers two GET routes:
   - `GET /health` — Instantiate `HealthRepository` (from `./health.repository`), instantiate `HealthService` (from `./health.service`) injecting the repository, call `healthService.getHealth()`, return the result with status 200. Wrap in try-catch and return 500 with `{ error: 'Internal Server Error' }` on failure.
   - `GET /version` — Instantiate `VersionService` (from `./version.service`), call `versionService.getVersion()`, return the result with status 200. Wrap in try-catch and return 500 with `{ error: 'Internal Server Error' }` on failure.
   - Import `FastifyInstance` from `fastify`

2. **src/modules/status/index.ts** — Barrel export file that re-exports:
   - `HealthStatus` from `./health.model`
   - `VersionInfo` from `./version.model`
   - `IHealthService` from `./health.service.interface`
   - `IVersionService` from `./version.service.interface`
   - `HealthService` from `./health.service`
   - `VersionService` from `./version.service`
   - `statusRoutes` from `./status.routes`

Read these files from prior phases before generating code:
- `src/modules/status/health.service.ts` — to see the HealthService constructor signature and how to instantiate it
- `src/modules/status/health.repository.ts` — to see the HealthRepository class
- `src/modules/status/version.service.ts` — to see the VersionService class
- `src/modules/uptime/uptime.routes.ts` — as reference for the existing route pattern in this project

Follow the same route pattern as `src/modules/uptime/uptime.routes.ts`. Strict TypeScript — no implicit any.

Include Jest unit tests in `tests/unit/modules/status/` that mock the services and verify the routes return correct status codes and response shapes.

## Phase 5: Phase 5: Wire status routes into app.ts

Register the new status routes in the main Fastify application so the `/health` and `/version` endpoints become accessible. This is a minimal wiring change.

Modify the following file:

1. **src/app.ts** — Add an import for `statusRoutes` from `./modules/status/status.routes` and register it with `app.register(statusRoutes)` alongside the existing `app.register(uptimeRoutes)` call.

Read this file before modifying:
- `src/app.ts` — to see the current structure (it already imports and registers `uptimeRoutes` from `./modules/uptime/uptime.routes`)
- `src/modules/status/status.routes.ts` from Phase 4 — to confirm the exported function name

This phase is independently deployable: after this change, `GET /health` returns a `HealthStatus` JSON object and `GET /version` returns a `VersionInfo` JSON object. The existing `/uptime` endpoint continues to work unchanged.

Include a Jest integration test in `tests/unit/modules/status/` that verifies the app registers the status routes without errors.
