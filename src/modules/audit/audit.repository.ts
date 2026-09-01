import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { AuditAction } from '../../shared/types';
import type { AuditLog, AuditLogInput } from './audit.model';

const AUDIT_LOG_COLUMNS =
  'id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at';

interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: unknown;
  new_values: unknown;
  performed_by: string | null;
  performed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IAuditLogRepository {
  record(entry: AuditLogInput, client?: PoolClient): Promise<AuditLog>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByActor(performedBy: string): Promise<AuditLog[]>;
  findByTimeRange(from: Date, to: Date): Promise<AuditLog[]>;
}

function mapRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action as AuditAction,
    oldValues: row.old_values as Record<string, any> | null,
    newValues: row.new_values as Record<string, any> | null,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AuditLogRepository implements IAuditLogRepository {
  async record(entry: AuditLogInput, client?: PoolClient): Promise<AuditLog> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const result = await conn.query<AuditLogRow>(
      `INSERT INTO audit_logs
         (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10)
       RETURNING ${AUDIT_LOG_COLUMNS}`,
      [
        randomUUID(),
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.oldValues != null ? JSON.stringify(entry.oldValues) : null,
        entry.newValues != null ? JSON.stringify(entry.newValues) : null,
        entry.performedBy ?? null,
        entry.performedAt ?? now,
        now,
        now,
      ]
    );

    return mapRow(result.rows[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await pool.query<AuditLogRow>(
      `SELECT ${AUDIT_LOG_COLUMNS}
       FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY performed_at ASC, id ASC`,
      [entityType, entityId]
    );

    return result.rows.map(mapRow);
  }

  async findByActor(performedBy: string): Promise<AuditLog[]> {
    const result = await pool.query<AuditLogRow>(
      `SELECT ${AUDIT_LOG_COLUMNS}
       FROM audit_logs
       WHERE performed_by = $1
       ORDER BY performed_at ASC, id ASC`,
      [performedBy]
    );

    return result.rows.map(mapRow);
  }

  async findByTimeRange(from: Date, to: Date): Promise<AuditLog[]> {
    const result = await pool.query<AuditLogRow>(
      `SELECT ${AUDIT_LOG_COLUMNS}
       FROM audit_logs
       WHERE performed_at >= $1 AND performed_at <= $2
       ORDER BY performed_at ASC, id ASC`,
      [from, to]
    );

    return result.rows.map(mapRow);
  }
}
