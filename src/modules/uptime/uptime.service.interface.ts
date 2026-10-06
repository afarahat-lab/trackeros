import { ReadinessResult, UptimeStatus } from './uptime.model';

export interface IUptimeService {
  getUptime(): UptimeStatus;
  checkReadiness(): Promise<ReadinessResult>;
}
