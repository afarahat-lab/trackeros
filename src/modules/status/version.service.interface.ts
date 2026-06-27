import { VersionInfo } from './version.model';

export interface IVersionService {
  getVersion(): VersionInfo;
}
