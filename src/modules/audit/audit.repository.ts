import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import type { AuditLog } from './audit.model';

interface AuditLogRow {
  id: string;
  actor_id: string;
  action: string;
  target_id: string;
  target_type: string;
  details: Record<string, unknown> | null;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
}

function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    targetId: row.target_id,
    targetType: row.target_type,
    details: row.details,
    timestamp: row.timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface IAuditLogRepository {
  create(entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog>;
  findByTarget(targetId: string, targetType: string): Promise<AuditLog[]>;
  findByActor(actorId: string): Promise<AuditLog[]>;
}

export class PgAuditLogRepository implements IAuditLogRepository {
  async create(
    entry: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AuditLog> {
    const id = randomUUID();
    const now = new Date();
    const result = await pool.query<AuditLogRow>(
      `INSERT INTO audit_logs (
        id, actor_id, action, target_id, target_type,
        details, timestamp, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        entry.actorId,
        entry.action,
        entry.targetId,
        entry.targetType,
        entry.details ?? null,
        entry.timestamp,
        now,
        now,
      ],
    );
    return rowToAuditLog(result.rows[0]);
  }

  async findByTarget(targetId: string, targetType: string): Promise<AuditLog[]> {
    const result = await pool.query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE target_id = $1 AND target_type = $2 ORDER BY timestamp DESC',
      [targetId, targetType],
    );
    return result.rows.map(rowToAuditLog);
  }

  async findByActor(actorId: string): Promise<AuditLog[]> {
    const result = await pool.query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE actor_id = $1 ORDER BY timestamp DESC',
      [actorId],
    );
    return result.rows.map(rowToAuditLog);
  }
}
