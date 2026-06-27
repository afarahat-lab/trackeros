export type HealthState = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface HealthStatus {
  status: HealthState;
  checkedAt: Date;
  message?: string;
}
