# PLAN.md

## Phase 1: Create Health domain model and service interface

Create the health module domain types in src/modules/health/. 

Create src/modules/health/health.model.ts with:
- HealthState type alias: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
- HealthStatus interface with attributes: status (HealthState), checkedAt (Date), message (string | undefined)

Create src/modules/health/health.service.interface.ts with:
- IHealthService interface defining method: getHealth(): HealthStatus

Follow the exact pattern from src/modules/uptime/uptime.model.ts and src/modules/uptime/uptime.service.interface.ts which already exist in the project.

This phase depends on no prior phases — only existing files src/modules/uptime/uptime.model.ts and src/modules/uptime/uptime.service.interface.ts for reference pattern.

## Phase 2: Implement Health service

Create the health service implementation in src/modules/health/health.service.ts.

Implement HealthService class that implements IHealthService interface. The getHealth() method should:
- Return a HealthStatus object
- Set status to 'HEALTHY' (the application is running if this code executes)
- Set checkedAt to new Date() (current timestamp)
- Set message to undefined (or optionally a simple message like 'All systems operational')

This phase depends on src/modules/health/health.model.ts and src/modules/health/health.service.interface.ts from Phase 1 — read them before generating code to use the exact type names HealthStatus, HealthState, and IHealthService.

Follow the pattern from src/modules/uptime/uptime.service.ts which already exists.

## Phase 3: Create Health routes and module index

Create the health routes and module barrel export in src/modules/health/.

Create src/modules/health/health.routes.ts:
- Export async function healthRoutes(fastify: FastifyInstance): Promise<void>
- Register GET /health endpoint
- Instantiate HealthService and call getHealth()
- Return 200 status with the HealthStatus object
- Handle errors with 500 status and error message

Create src/modules/health/index.ts:
- Export HealthStatus from './health.model'
- Export IHealthService from './health.service.interface'
- Export HealthService from './health.service'
- Export healthRoutes from './health.routes'

This phase depends on src/modules/health/health.model.ts, src/modules/health/health.service.interface.ts, and src/modules/health/health.service.ts from Phases 1-2 — read them before generating code.

Follow the exact pattern from src/modules/uptime/uptime.routes.ts and src/modules/uptime/index.ts which already exist.

## Phase 4: Create Version domain model and service interface

Create the version module domain types in src/modules/version/.

Create src/modules/version/version.model.ts with:
- VersionInfo interface with attributes: version (string), name (string), nodeVersion (string), environment (string)

Create src/modules/version/version.service.interface.ts with:
- IVersionService interface defining method: getVersion(): VersionInfo

Follow the exact pattern from src/modules/uptime/uptime.model.ts and src/modules/uptime/uptime.service.interface.ts which already exist in the project.

This phase depends on no prior phases — only existing files for reference pattern.

## Phase 5: Implement Version service

Create the version service implementation in src/modules/version/version.service.ts.

Implement VersionService class that implements IVersionService interface. The getVersion() method should:
- Return a VersionInfo object
- Read version and name from package.json (use require('../../../package.json') or similar relative path)
- Set nodeVersion to process.version
- Set environment to process.env.NODE_ENV || 'development'

This phase depends on src/modules/version/version.model.ts and src/modules/version/version.service.interface.ts from Phase 4 — read them before generating code to use the exact type name VersionInfo and IVersionService.

Follow the pattern from src/modules/uptime/uptime.service.ts which already exists.

## Phase 6: Create Version routes and module index

Create the version routes and module barrel export in src/modules/version/.

Create src/modules/version/version.routes.ts:
- Export async function versionRoutes(fastify: FastifyInstance): Promise<void>
- Register GET /version endpoint
- Instantiate VersionService and call getVersion()
- Return 200 status with the VersionInfo object
- Handle errors with 500 status and error message

Create src/modules/version/index.ts:
- Export VersionInfo from './version.model'
- Export IVersionService from './version.service.interface'
- Export VersionService from './version.service'
- Export versionRoutes from './version.routes'

This phase depends on src/modules/version/version.model.ts, src/modules/version/version.service.interface.ts, and src/modules/version/version.service.ts from Phases 4-5 — read them before generating code.

Follow the exact pattern from src/modules/uptime/uptime.routes.ts and src/modules/uptime/index.ts which already exist.

## Phase 7: Register health and version routes in app

Update src/app.ts to register the new health and version route modules.

Add imports:
- import { healthRoutes } from './modules/health/health.routes';
- import { versionRoutes } from './modules/version/version.routes';

Register the routes after the existing uptimeRoutes registration:
- app.register(healthRoutes);
- app.register(versionRoutes);

This phase depends on src/modules/health/health.routes.ts from Phase 3 and src/modules/version/version.routes.ts from Phase 6 — read them before generating code to use the exact exported function names healthRoutes and versionRoutes.

Read src/app.ts first to understand the existing registration pattern with uptimeRoutes.
