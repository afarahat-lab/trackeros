# Architecture

## Modules

### health

The health module provides health check and monitoring capabilities.

#### Entities

##### HealthCheck

The `HealthCheck` entity represents a single health check operation with the following lifecycle states:

- `REQUESTED` — Health check has been requested
- `PROCESSING` — Health check is currently being processed
- `COMPLETED` — Health check completed successfully
- `FAILED` — Health check failed

Attributes:
- `id`: string — Unique identifier
- `timestamp`: Date — When the health check was initiated
- `status`: HealthCheckStatus — Current lifecycle state
- `responseTime?`: number — Optional response time in milliseconds
