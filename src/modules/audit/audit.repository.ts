import { pool } from 'shared/db/connection';
import { AuditLog, IAuditRepository } from './audit.model';
import { randomUUID } from 'crypto';

type DbRow = Record<string, unknown>;

export class AuditRepository implements IAuditRepository {
  async create(entry: Omit<AuditLog, 'id' | 'performedAt'>): Promise<AuditLog> {
    const id = randomUUID();
    const performedAt = new Date();

    const result = await pool.query(
      `INSERT INTO audit_logs (
        id, entity_type, entity_id, action, old_values, new_values,
        performed_by, performed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.performedBy,
        performedAt,
      ]
    );

    const rows = result.rows as DbRow[];
    return this.mapRow(rows[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await pool.query(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at DESC',
      [entityType, entityId]
    );
    const rows = result.rows as DbRow[];
    return rows.map((row) => this.mapRow(row));
  }

  async findByPerformer(performedBy: string, limit?: number): Promise<AuditLog[]> {
    const query = limit
      ? 'SELECT * FROM audit_logs WHERE performed_by = $1 ORDER BY performed_at DESC LIMIT $2'
      : 'SELECT * FROM audit_logs WHERE performed_by = $1 ORDER BY performed_at DESC';
    const params: unknown[] = limit ? [performedBy, limit] : [performedBy];

    const result = await pool.query(query, params);
    const rows = result.rows as DbRow[];
    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: DbRow): AuditLog {
    return {
      id: row.id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      action: row.action as string,
      oldValues: row.old_values as Record<string, unknown> | null,
      newValues: row.new_values as Record<string, unknown> | null,
      performedBy: row.performed_by as string,
      performedAt: row.performed_at as Date,
    };
  }
}
