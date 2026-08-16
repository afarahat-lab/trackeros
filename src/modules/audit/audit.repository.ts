import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { AuditLog } from './audit.model';

export interface IAuditRepository {
  create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
}

function parseJsonField(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return JSON.parse(value) as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function rowToAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: row.id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    action: row.action as string,
    oldValues: parseJsonField(row.old_values),
    newValues: parseJsonField(row.new_values),
    performedBy: row.performed_by as string | null,
    performedAt: new Date(row.performed_at as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class AuditRepository implements IAuditRepository {
  private readonly db: Pool | PoolClient;

  constructor(client?: Pool | PoolClient) {
    this.db = client ?? pool;
  }

  async create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog> {
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO audit_logs (
        entity_type, entity_id, action, old_values, new_values,
        performed_by, performed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.performedBy,
        entry.performedAt,
        now,
        now,
      ],
    );
    return rowToAuditLog(result.rows[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await this.db.query(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at DESC',
      [entityType, entityId],
    );
    return result.rows.map(rowToAuditLog);
  }
}
