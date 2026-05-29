import { AuditLogRepository } from '../repository/audit-log-repository';
import { AuditLog } from '../domain/audit-log';

export class AuditLogService {
  private repository: AuditLogRepository;

  constructor(repository: AuditLogRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves audit logs with pagination.
   * @param from - Start date for logs.
   * @param to - End date for logs.
   * @param limit - Maximum number of logs to fetch.
   * @returns Promise resolving to an array of AuditLog.
   */
  async fetchAuditLogs(from: string, to: string, limit: number): Promise<AuditLog[]> {
    return this.repository.getAuditLogs(from, to, limit);
  }
}