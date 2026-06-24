import { SystemStatus } from './status.model';
import { IStatusService } from './status.service.interface';

export class StatusService implements IStatusService {
  getStatus(): SystemStatus {
    return { up: true, version: '1' };
  }
}
