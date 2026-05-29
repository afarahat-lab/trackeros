import { SettingRepository } from '../repository/setting-repository';
import { auditLog } from '../../shared/utils/audit-log';

export class SettingsService {
  private repository: SettingRepository;

  constructor() {
    this.repository = new SettingRepository();
  }

  async getSettings(): Promise<Record<string, string>> {
    return this.repository.getAllSettings();
  }

  async updateSettings(settings: Record<string, string>, userId: string): Promise<boolean> {
    await this.repository.updateSettings(settings);
    await auditLog.append({
      operation: 'update',
      entity: 'Setting',
      timestamp: new Date(),
      userId
    });
    return true;
  }
}
