import { AuditRecord } from '../domain/audit-record';

export class AuditRecordRepository {
  /**
   * Append an audit record to the database.
   * @param record AuditRecord
   * @returns Promise<void>
   */
  async append(record: AuditRecord): Promise<void> {
    // Implementation to append audit record to the database
  }
}
