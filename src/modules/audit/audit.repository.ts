import { pool } from '../../shared/db/connection';
import { AuditLog, IAuditRepository } from './audit.model';
import { AuditAction } from '../../shared/types';

export class AuditRepository implements IAuditRepository {
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await pool.query(
      `SELECT * FROM audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY performed_at DESC`,
      [entityType, entityId],
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findByPerformer(performedBy: string): Promise<AuditLog[]> {
    const result = await pool.query(
      `SELECT * FROM audit_log
       WHERE performed_by = $1
       ORDER BY performed_at DESC`,
      [performedBy],
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async create(data: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    const result = await pool.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, performed_by, performed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.entityType,
        data.entityId,
        data.action,
        data.oldValues ? JSON.stringify(data.oldValues) : null,
        data.newValues ? JSON.stringify(data.newValues) : null,
        data.performedBy,
        data.performedAt,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): AuditLog {
    const parseJson = (val: unknown): Record<string, unknown> | null => {
      if (val == null) return null;
      if (typeof val === 'string') return JSON.parse(val) as Record<string, unknown>;
      return val as Record<string, unknown>;
    };

    return {
      id: row.id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      action: row.action as AuditAction,
      oldValues: parseJson(row.old_values),
      newValues: parseJson(row.new_values),
      performedBy: row.performed_by as string,
      performedAt: new Date(row.performed_at as string),
    };
  }
}
