import { randomUUID } from 'crypto';
import { BaseRepository } from '../../shared/base-repository';
import { AuditLog } from './audit.model';
import { AuditLogFilters, IAuditLogRepository } from './audit.repository.interface';

interface AuditLogRow {
  [key: string]: unknown;
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: Date;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    oldValues: row.old_values,
    newValues: row.new_values,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function isAuditLogRow(row: unknown): row is AuditLogRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.entity_type === 'string' &&
    typeof r.entity_id === 'string' &&
    typeof r.action === 'string' &&
    (r.old_values === null || typeof r.old_values === 'object') &&
    (r.new_values === null || typeof r.new_values === 'object') &&
    (r.performed_by === null || typeof r.performed_by === 'string') &&
    r.performed_at instanceof Date &&
    (r.ip_address === null || typeof r.ip_address === 'string') &&
    (r.user_agent === null || typeof r.user_agent === 'string') &&
    r.created_at instanceof Date
  );
}

class AuditBaseRepository extends BaseRepository {}

export class PgAuditLogRepository implements IAuditLogRepository {
  private readonly base = new AuditBaseRepository();
  private readonly table = 'audit_logs';

  async findById(id: string): Promise<AuditLog | null> {
    const result = await this.base.query<AuditLogRow>(
      `SELECT * FROM ${this.table} WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row || !isAuditLogRow(row)) return null;
    return rowToAuditLog(row);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await this.base.query<AuditLogRow>(
      `SELECT * FROM ${this.table} WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId]
    );
    return result.rows.filter(isAuditLogRow).map(rowToAuditLog);
  }

  async findByPerformedBy(performedBy: string, limit?: number): Promise<AuditLog[]> {
    if (limit !== undefined) {
      const result = await this.base.query<AuditLogRow>(
        `SELECT * FROM ${this.table} WHERE performed_by = $1 LIMIT $2`,
        [performedBy, limit]
      );
      return result.rows.filter(isAuditLogRow).map(rowToAuditLog);
    }
    const result = await this.base.query<AuditLogRow>(
      `SELECT * FROM ${this.table} WHERE performed_by = $1`,
      [performedBy]
    );
    return result.rows.filter(isAuditLogRow).map(rowToAuditLog);
  }

  async create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const id = randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = {
      id,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      old_values: entry.oldValues,
      new_values: entry.newValues,
      performed_by: entry.performedBy,
      performed_at: entry.performedAt,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      created_at: now,
    };
    const result = await this.base.query<AuditLogRow>(
      `INSERT INTO ${this.table} (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.id,
        data.entity_type,
        data.entity_id,
        data.action,
        data.old_values,
        data.new_values,
        data.performed_by,
        data.performed_at,
        data.ip_address,
        data.user_agent,
        data.created_at,
      ]
    );
    const row = result.rows[0];
    if (!row || !isAuditLogRow(row)) {
      throw new Error('Failed to create audit log entry');
    }
    return rowToAuditLog(row);
  }

  async findAll(filters: AuditLogFilters): Promise<AuditLog[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.entityType !== undefined) {
      clauses.push(`entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    }
    if (filters.entityId !== undefined) {
      clauses.push(`entity_id = $${paramIndex++}`);
      values.push(filters.entityId);
    }
    if (filters.action !== undefined) {
      clauses.push(`action = $${paramIndex++}`);
      values.push(filters.action);
    }
    if (filters.performedBy !== undefined) {
      clauses.push(`performed_by = $${paramIndex++}`);
      values.push(filters.performedBy);
    }
    if (filters.performedFrom !== undefined) {
      clauses.push(`performed_at >= $${paramIndex++}`);
      values.push(filters.performedFrom);
    }
    if (filters.performedTo !== undefined) {
      clauses.push(`performed_at <= $${paramIndex++}`);
      values.push(filters.performedTo);
    }

    const whereClause = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.base.query<AuditLogRow>(
      `SELECT * FROM ${this.table}${whereClause}`,
      values.length > 0 ? values : undefined
    );
    return result.rows.filter(isAuditLogRow).map(rowToAuditLog);
  }
}
