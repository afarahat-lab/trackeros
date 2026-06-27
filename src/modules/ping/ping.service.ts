import { IPingService } from './ping.service.interface';
import { PingResponse } from './ping.model';

export class PingService implements IPingService {
  ping(): PingResponse {
    return { message: 'pong', timestamp: new Date() };
  }
}
