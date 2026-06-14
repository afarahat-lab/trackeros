export interface HealthService {
  getUptime(): Promise<number>;
}

export class HealthServiceImpl implements HealthService {
  private readonly processStartTime: Date;

  constructor() {
    this.processStartTime = new Date();
  }

  async getUptime(): Promise<number> {
    const currentTime = new Date();
    const uptimeSeconds = Math.floor((currentTime.getTime() - this.processStartTime.getTime()) / 1000);
    return uptimeSeconds;
  }
}
