import { PingResponse } from './ping.model';

export interface PingService {
  getPing(): Promise<PingResponse>;
}

export class PingServiceImpl implements PingService {
  async getPing(): Promise<PingResponse> {
    return { ok: true };
  }
}
