import { SystemStatus } from './status.model';

export interface IStatusService {
  getStatus(): SystemStatus;
}
