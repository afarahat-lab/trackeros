import { IUptimeService } from './uptime.service.interface';
import { UptimeStatus } from './uptime.model';

export class UptimeService implements IUptimeService {
  getUptime(): UptimeStatus {
    return { uptimeSeconds: Math.floor(process.uptime()) };
  }
}
