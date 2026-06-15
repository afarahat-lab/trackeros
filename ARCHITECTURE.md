# Architecture

## Domain Concepts

### HealthCheck Entity

The `HealthCheck` entity represents a system health check with the following attributes:
- `timestamp`: Date — The time when the health check was performed
- `status`: HealthCheckStatus — The current status of the health check
- `responseTime?`: number — Optional response time in milliseconds

### HealthCheck Lifecycle States

Health checks progress through the following lifecycle states:
- `initiated` — Health check has been initiated
- `processing` — Health check is currently being processed
- `completed` — Health check completed successfully
- `failed` — Health check failed
