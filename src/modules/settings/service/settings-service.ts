import { SettingRepository } from '../repository/setting-repository';
import { AuditRecordRepository } from '../repository/audit-record-repository';
import { AuditRecord } from '../domain/audit-record';

export class SettingsService {
  private settingRepository: SettingRepository;
  private auditRecordRepository: AuditRecordRepository;

  constructor() {
    this.settingRepository = new SettingRepository();
    this.auditRecordRepository = new AuditRecordRepository();
  }

  /**
   * Get all settings.
   * @returns Promise<Record<string, string>>
   */
  async getSettings(): Promise<Record<string, string>> {
    return this.settingRepository.getAllSettings();
  }

  /**
   * Update settings and log the operation.
   * @param settings Record<string, string>
   * @returns Promise<Record<string, string>>
   */
  async updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
    const updatedSettings = await this.settingRepository.updateSettings(settings);
    const auditRecord: AuditRecord = {
      operation: 'update',
      entity: 'Setting',
      timestamp: new Date(),
      details: JSON.stringify(settings)
    };
    await this.auditRecordRepository.append(auditRecord);
    return updatedSettings;
  }
}
