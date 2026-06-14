import { SystemVersion } from './version.model';

export interface IVersionService {
  getVersion(): Promise<SystemVersion>;
}
