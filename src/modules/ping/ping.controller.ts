import { PingService } from './ping.service';
import { PingResponse } from './ping.model';

export class PingController {
  constructor(private readonly pingService: PingService) {}

  async getPing(): Promise<PingResponse> {
    return this.pingService.getPing();
  }
}
