export type HealthCheckStatus = 'initiated' | 'processing' | 'completed' | 'failed';

export interface HealthCheck {
  timestamp: Date;
  status: HealthCheckStatus;
  responseTime?: number;
}
