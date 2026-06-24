import { Pool } from "../../shared/db/connection";
import { IMetricsRepository } from "./metrics.repository.interface";

export class MetricsRepository implements IMetricsRepository {
  constructor(private readonly pool: Pool) {}

  async getRequestCount(): Promise<number> {
    const result = await this.pool.query(
      "SELECT value FROM metrics WHERE key = 'request_count'"
    );
    return result.rows[0]?.value ?? 0;
  }

  async incrementRequestCount(): Promise<void> {
    await this.pool.query(
      "UPDATE metrics SET value = value + 1, updated_at = NOW() WHERE key = 'request_count'"
    );
  }

  async getUptimeSeconds(): Promise<number> {
    const result = await this.pool.query(
      "SELECT value FROM metrics WHERE key = 'uptime_start'"
    );
    const start = result.rows[0]?.value;
    if (!start) return 0;
    return Math.floor((Date.now() - Number(start)) / 1000);
  }

  async resetCounters(): Promise<{ requestCount: number; uptimeSeconds: number }> {
    const now = Date.now();
    await this.pool.query(
      "UPDATE metrics SET value = 0, updated_at = NOW() WHERE key = 'request_count'"
    );
    await this.pool.query(
      "UPDATE metrics SET value = $1, updated_at = NOW() WHERE key = 'uptime_start'",
      [now]
    );
    return { requestCount: 0, uptimeSeconds: 0 };
  }
}
