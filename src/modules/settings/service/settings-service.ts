import { SettingRepository } from '../repository/setting-repository';
import { auditLog } from '../../shared/utils/audit-log';
import { AuditRecord } from '../domain/audit-record';

export class SettingsService {
  private repository: SettingRepository;

  constructor() {
    this.repository = new SettingRepository();
  }

  async getSettings(): Promise<Record<string, string>> {
    return this.repository.getAllSettings();
  }

  async updateSettings(settings: Partial<Record<string, string>>, userId: string): Promise<Record<string, string>> {
    const updatedSettings = await this.repository.updateSettings(settings);
    await auditLog.append({
      operation: 'update',
      entity: 'Setting',
      timestamp: new Date(),
      userId
    } as AuditRecord);
    return updatedSettings;
  }
}
