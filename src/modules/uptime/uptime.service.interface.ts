import { UptimeStatus } from './uptime.model';

export interface IUptimeService {
  getUptime(): UptimeStatus;
}
