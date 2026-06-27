import { HealthStatus } from './health.model';

export interface IHealthService {
  getHealth(): Promise<HealthStatus>;
}
