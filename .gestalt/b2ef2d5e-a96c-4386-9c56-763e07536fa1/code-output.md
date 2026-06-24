Phase 1 is complete. All files have been created and verification passes. Here's a summary of what was implemented:

### Files Created

| File | Description |
|------|-------------|
| `src/modules/metrics/metrics.model.ts` | `MetricsResponse` DTO with `requests: number` and `uptime: number` |
| `src/modules/metrics/metrics.repository.interface.ts` | `IMetricsRepository` interface with `getRequestCount()`, `incrementRequestCount()`, `getUptimeSeconds()`, `resetCounters()` |
| `src/modules/metrics/metrics.repository.ts` | `MetricsRepository` class implementing `IMetricsRepository` using `Pool` from `src/shared/db/connection.ts` |
| `src/modules/metrics/metrics.service.interface.ts` | `IMetricsService` interface with `getMetrics()` and `resetMetrics()` |
| `src/modules/metrics/migrations/001_create_metrics_table.sql` | SQL migration creating the `metrics` key-value table with seed data |

### Files Modified

| File | Change |
|------|--------|
| `src/shared/db/connection.ts` | Added `export { Pool } from 'pg'` to make the Pool type importable |
| `ARCHITECTURE.md` | Updated to include the metrics module and MetricsResponse entity |

### Verification
✅ `npm run build` — passed  
✅ `npx jest --passWithNoTests` — passed