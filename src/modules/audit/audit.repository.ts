import { pool } from '../../shared/db/connection';
import { AuditRecord } from './audit.model';
import { AuditAction } from '../../shared/types';

export interface IAuditRepository {
  create(record: CreateAuditRecordInput): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  findByPerformer(performedBy: string, limit?: number, offset?: number): Promise<AuditRecord[]>;
}

export interface CreateAuditRecordInput {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string | null;
  performedAt: Date;
}

interface AuditRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: Date;
  created_at: Date;
  updated_at: Date;
}

function mapRowToAuditRecord(row: AuditRow): AuditRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action as AuditAction,
    oldValues: row.old_values,
    newValues: row.new_values,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AuditRepository implements IAuditRepository {
  async create(record: CreateAuditRecordInput): Promise<AuditRecord> {
    const result = await pool.query(
      `INSERT INTO audit_logs (
        id, entity_type, entity_id, action,
        old_values, new_values, performed_by, performed_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        NOW(), NOW()
      ) RETURNING *`,
      [
        record.id,
        record.entityType,
        record.entityId,
        record.action,
        record.oldValues ? JSON.stringify(record.oldValues) : null,
        record.newValues ? JSON.stringify(record.newValues) : null,
        record.performedBy,
        record.performedAt,
      ],
    );
    return mapRowToAuditRecord(result.rows[0] as AuditRow);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
    const result = await pool.query(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at ASC',
      [entityType, entityId],
    );
    return result.rows.map((row: AuditRow) => mapRowToAuditRecord(row));
  }

  async findByPerformer(performedBy: string, limit?: number, offset?: number): Promise<AuditRecord[]> {
    let query = 'SELECT * FROM audit_logs WHERE performed_by = $1 ORDER BY performed_at ASC';
    const params: (string | number)[] = [performedBy];

    if (limit !== undefined) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    if (offset !== undefined) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map((row: AuditRow) => mapRowToAuditRecord(row));
  }
}
