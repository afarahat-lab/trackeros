export interface IMetricsRepository {
  getRequestCount(): Promise<number>;
  incrementRequestCount(): Promise<void>;
  getUptimeSeconds(): Promise<number>;
  resetCounters(): Promise<{ requestCount: number; uptimeSeconds: number }>;
}
