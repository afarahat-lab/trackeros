import { ProcessInfo, ISystemService } from './system.interface';

export class SystemService implements ISystemService {
  async getProcessInfo(): Promise<ProcessInfo> {
    return { pid: process.pid };
  }
}
