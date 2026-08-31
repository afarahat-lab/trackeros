import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { AuditAction, EntityType } from '../../shared/types';
import { AuditLog, AuditLogQuery, IAuditLogRepository } from './audit.model';

interface AuditRow {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: AuditAction;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: Date;
  created_at: Date;
  updated_at: Date;
}

function toAuditLog(row: AuditRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    oldValues: row.old_values,
    newValues: row.new_values,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgAuditLogRepository implements IAuditLogRepository {
  async create(entry: AuditLog, client?: PoolClient): Promise<AuditLog> {
    const db = client ?? pool;
    const result = await db.query<AuditRow>(
      `INSERT INTO audit_logs (
         id, entity_type, entity_id, action, old_values, new_values,
         performed_by, performed_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        entry.id,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.oldValues,
        entry.newValues,
        entry.performedBy,
        entry.performedAt,
        entry.createdAt,
        entry.updatedAt,
      ],
    );
    return toAuditLog(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<AuditLog | null> {
    const db = client ?? pool;
    const result = await db.query<AuditRow>(
      `SELECT * FROM audit_logs WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toAuditLog(result.rows[0]) : null;
  }

  async findByEntity(
    entityType: EntityType,
    entityId: string,
    client?: PoolClient,
  ): Promise<AuditLog[]> {
    const db = client ?? pool;
    const result = await db.query<AuditRow>(
      `SELECT * FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY performed_at ASC`,
      [entityType, entityId],
    );
    return result.rows.map(toAuditLog);
  }

  async findByPerformedAt(
    from: Date,
    to: Date,
    client?: PoolClient,
  ): Promise<AuditLog[]> {
    const db = client ?? pool;
    const result = await db.query<AuditRow>(
      `SELECT * FROM audit_logs
       WHERE performed_at >= $1 AND performed_at <= $2
       ORDER BY performed_at ASC`,
      [from, to],
    );
    return result.rows.map(toAuditLog);
  }

  async query(query: AuditLogQuery, client?: PoolClient): Promise<AuditLog[]> {
    const db = client ?? pool;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (query.entityType !== undefined) {
      values.push(query.entityType);
      conditions.push(`entity_type = $${values.length}`);
    }
    if (query.entityId !== undefined) {
      values.push(query.entityId);
      conditions.push(`entity_id = $${values.length}`);
    }
    if (query.performedBy !== undefined) {
      values.push(query.performedBy);
      conditions.push(`performed_by = $${values.length}`);
    }
    if (query.from !== undefined) {
      values.push(query.from);
      conditions.push(`performed_at >= $${values.length}`);
    }
    if (query.to !== undefined) {
      values.push(query.to);
      conditions.push(`performed_at <= $${values.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query<AuditRow>(
      `SELECT * FROM audit_logs ${where} ORDER BY performed_at ASC`,
      values,
    );
    return result.rows.map(toAuditLog);
  }
}
