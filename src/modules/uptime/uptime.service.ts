import { IUptimeService } from './uptime.service.interface';
import { IReadinessRepository } from './uptime.repository.interface';
import { PgReadinessRepository } from './uptime.repository';
import { ReadinessState, ReadinessStatus, UptimeStatus } from './uptime.model';

export class UptimeService implements IUptimeService {
  constructor(
    private readonly readinessRepository: IReadinessRepository = new PgReadinessRepository()
  ) {}

  getUptime(): UptimeStatus {
    return { uptimeSeconds: Math.floor(process.uptime()) };
  }

  async checkReadiness(): Promise<ReadinessStatus> {
    try {
      await this.readinessRepository.check();
      return { status: ReadinessState.READY };
    } catch {
      return { status: ReadinessState.NOT_READY };
    }
  }
}
