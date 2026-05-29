import { AuditRecord } from '../../modules/settings/domain/setting';

export const auditLog = {
  async append(record: AuditRecord): Promise<void> {
    // Implement logic to append audit record to the log
  }
};
