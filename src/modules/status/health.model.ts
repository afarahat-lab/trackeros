export interface HealthStatus {
  isHealthy: boolean;
  timestamp: Date;
  version: string;
  uptimeSeconds: number;
}
