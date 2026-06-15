export interface HealthCheck {
  id: string;
  timestamp: Date;
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  responseTime?: number;
}
