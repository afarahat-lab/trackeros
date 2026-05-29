import { SettingsRepository } from '../repository/settings-repository';
import { AuditRecord } from '../domain/audit-record';
import { appendAuditLog } from '../../shared/utils/audit-log';

export class SettingsService {
  private repository: SettingsRepository;

  constructor() {
    this.repository = new SettingsRepository();
  }

  async getSettings(): Promise<Record<string, string>> {
    return this.repository.getSettings();
  }

  async updateSettings(settings: Partial<Record<string, string>>, userId: string): Promise<void> {
    await this.repository.updateSettings(settings);
    await appendAuditLog({
      operation: 'update',
      entity: 'Setting',
      timestamp: new Date(),
      userId
    });
  }
}
