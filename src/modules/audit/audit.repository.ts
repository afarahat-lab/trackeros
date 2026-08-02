import { pool } from '../../shared/db/connection';
import { AuditRecord } from './audit.model';

function rowToAuditRecord(row: Record<string, unknown>): AuditRecord {
  return {
    id: row.id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    action: row.action as AuditRecord['action'],
    performedBy: row.performed_by as string,
    details: (row.details as Record<string, unknown> | null) ?? null,
    createdAt: new Date(row.created_at as string),
  };
}

export interface IAuditRepository {
  create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  findByUser(performedBy: string): Promise<AuditRecord[]>;
}

export class AuditRepository implements IAuditRepository {
  async create(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord> {
    const result = await pool.query(
      `INSERT INTO audit_records (
        entity_type, entity_id, action, performed_by, details
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        record.entityType,
        record.entityId,
        record.action,
        record.performedBy,
        record.details ?? null,
      ],
    );
    return rowToAuditRecord(result.rows[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
    const result = await pool.query(
      'SELECT * FROM audit_records WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entityType, entityId],
    );
    return result.rows.map(rowToAuditRecord);
  }

  async findByUser(performedBy: string): Promise<AuditRecord[]> {
    const result = await pool.query(
      'SELECT * FROM audit_records WHERE performed_by = $1 ORDER BY created_at DESC',
      [performedBy],
    );
    return result.rows.map(rowToAuditRecord);
  }
}
