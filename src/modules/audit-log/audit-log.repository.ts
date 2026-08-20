import { pool } from '../../shared/db/connection';
import { AuditLog, IAuditLogRepository } from './audit-log.model';

interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  changes: Record<string, unknown>;
  created_at: Date;
}

function mapRowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    performedBy: row.performed_by,
    changes: row.changes,
    createdAt: row.created_at,
  };
}

export class PgAuditLogRepository implements IAuditLogRepository {
  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    const result = await pool.query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entityType, entityId],
    );
    return result.rows.map(mapRowToAuditLog);
  }

  async create(
    entry: Omit<AuditLog, 'id' | 'createdAt'>,
  ): Promise<AuditLog> {
    const result = await pool.query<AuditLogRow>(
      `INSERT INTO audit_logs (
        entity_type, entity_id, action, performed_by, changes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.performedBy,
        entry.changes,
      ],
    );
    return mapRowToAuditLog(result.rows[0]);
  }

  async findAll(
    filters?: {
      entityType?: string;
      performedBy?: string;
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<AuditLog[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.entityType !== undefined) {
      conditions.push(`entity_type = $${paramIndex}`);
      values.push(filters.entityType);
      paramIndex++;
    }

    if (filters?.performedBy !== undefined) {
      conditions.push(`performed_by = $${paramIndex}`);
      values.push(filters.performedBy);
      paramIndex++;
    }

    if (filters?.fromDate !== undefined) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(filters.fromDate);
      paramIndex++;
    }

    if (filters?.toDate !== undefined) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(filters.toDate);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<AuditLogRow>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC`,
      values,
    );
    return result.rows.map(mapRowToAuditLog);
  }
}
