export interface HealthzResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
}

export function getHealthz(): HealthzResponse {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}
