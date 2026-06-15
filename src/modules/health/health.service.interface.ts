import { HealthCheck } from './health.model';

export interface IHealthService {
  ping(): Promise<string>;
  getHealthCheck(): Promise<HealthCheck>;
}
