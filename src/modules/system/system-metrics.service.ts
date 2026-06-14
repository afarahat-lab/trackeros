export interface SystemHealth {
  nodeVersion: string;
  uptimeSeconds: number;
  memoryUsageMB: number;
}

export class SystemMetricsService {
  getSystemHealth(): SystemHealth {
    const nodeVersion = process.version;
    const uptimeSeconds = process.uptime();
    const memoryUsageMB = process.memoryUsage().heapUsed / (1024 * 1024);
    
    return {
      nodeVersion,
      uptimeSeconds,
      memoryUsageMB
    };
  }
}
