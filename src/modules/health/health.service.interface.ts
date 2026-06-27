import { HealthStatus } from './health.model';

export interface IHealthService {
  getHealth(): HealthStatus;
}
