import { IPingService } from './ping.service.interface';
import { PingResponse } from './ping.model';

export class PingService implements IPingService {
  getPing(): PingResponse {
    return { status: 'ok' };
  }
}
