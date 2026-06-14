import { ProcessUptime, calculateUptime } from "./health.model";

export interface HealthService {
  getUptime(): Promise<ProcessUptime>;
}

export class HealthServiceImpl implements HealthService {
  private readonly processStartTime: Date;

  constructor() {
    this.processStartTime = new Date();
  }

  async getUptime(): Promise<ProcessUptime> {
    return calculateUptime(this.processStartTime);
  }
}
