import { PingResponse } from './ping.model';

export interface IPingService {
  ping(): PingResponse;
}
