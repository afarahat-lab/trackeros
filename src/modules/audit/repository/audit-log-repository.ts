import { AuditLog } from '../domain/audit-log';
import { Pool } from 'pg';

export class AuditLogRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Fetches audit logs with pagination.
   * @param from - Start date for logs.
   * @param to - End date for logs.
   * @param limit - Maximum number of logs to fetch.
   * @returns Promise resolving to an array of AuditLog.
   */
  async getAuditLogs(from: string, to: string, limit: number): Promise<AuditLog[]> {
    const query = `SELECT * FROM audit_logs WHERE timestamp BETWEEN $1 AND $2 LIMIT $3`;
    const result = await this.pool.query(query, [from, to, limit]);
    return result.rows;
  }
}