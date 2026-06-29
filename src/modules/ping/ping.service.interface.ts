import { PingResponse } from './ping.model';

export interface IPingService {
  getPing(): PingResponse;
}
