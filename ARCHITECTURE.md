# Architecture

## Domain Concepts

### Health Module

#### HealthCheck Entity
The `HealthCheck` entity represents a health monitoring record with the following attributes:
- `timestamp`: Date — The time when the health check was performed
- `status`: HealthCheckStatus — The current status of the health check
- `responseTime`: number (optional) — The response time in milliseconds

#### Lifecycle States
Health checks progress through the following lifecycle states:
- `initiated`: The health check has been initiated
- `processing`: The health check is currently being processed
- `completed`: The health check completed successfully
- `failed`: The health check failed
