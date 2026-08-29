import type { PoolClient } from 'pg';

import { pool } from '../../shared/db/connection';
import {
  AuditAction,
  AuditLog,
  IAuditLogRepository
} from './audit.model';

interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: Date;
}

type AuditActionValue =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'SUBMIT';

const AUDIT_ACTIONS: readonly AuditActionValue[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'CANCEL',
  'SUBMIT'
];

function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

function mapRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: isAuditAction(row.action) ? row.action : 'UPDATE',
    oldValues: row.old_values,
    newValues: row.new_values,
    performedBy: row.performed_by,
    performedAt: row.performed_at
  };
}

export class PgAuditLogRepository implements IAuditLogRepository {
  async create(log: AuditLog, client?: PoolClient): Promise<AuditLog> {
    const db = client ?? pool;
    const result = await db.query(
      `INSERT INTO audit_logs (
         id, entity_type, entity_id, action, old_values, new_values,
         performed_by, performed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, entity_type, entity_id, action, old_values, new_values,
         performed_by, performed_at`,
      [
        log.id,
        log.entityType,
        log.entityId,
        log.action,
        log.oldValues,
        log.newValues,
        log.performedBy,
        log.performedAt
      ]
    );
    return mapRow(result.rows[0] as AuditLogRow);
  }

  async findById(id: string, client?: PoolClient): Promise<AuditLog | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, entity_type, entity_id, action, old_values, new_values,
         performed_by, performed_at
       FROM audit_logs WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as AuditLogRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    client?: PoolClient
  ): Promise<AuditLog[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, entity_type, entity_id, action, old_values, new_values,
         performed_by, performed_at
       FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY performed_at DESC`,
      [entityType, entityId]
    );
    return (result.rows as AuditLogRow[]).map(mapRow);
  }
}
