import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { AuditLog } from './audit-log.model';
import { UniqueConstraintViolationError } from '../employee/employee.repository';

export interface IAuditLogRepository {
  create(
    input: Omit<AuditLog, 'id' | 'createdAt'>,
    client?: PoolClient,
  ): Promise<AuditLog>;

  findByEntity(
    entityType: string,
    entityId: string,
    client?: PoolClient,
  ): Promise<AuditLog[]>;

  findByPerformedBy(
    performedBy: string,
    client?: PoolClient,
  ): Promise<AuditLog[]>;
}

export class PgAuditLogRepository implements IAuditLogRepository {
  async create(
    input: Omit<AuditLog, 'id' | 'createdAt'>,
    client?: PoolClient,
  ): Promise<AuditLog> {
    const db = client ?? pool;
    try {
      const result = await db.query(
        `INSERT INTO audit_logs (
          entity_type, entity_id, action,
          old_values, new_values, performed_by,
          performed_at, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          input.entityType,
          input.entityId,
          input.action,
          input.oldValues ? JSON.stringify(input.oldValues) : null,
          input.newValues ? JSON.stringify(input.newValues) : null,
          input.performedBy,
          input.performedAt,
          input.ipAddress ?? null,
          input.userAgent ?? null,
        ],
      );
      return this.rowToAuditLog(result.rows[0]);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new UniqueConstraintViolationError(
          'Unique constraint violation on audit_logs',
          error,
        );
      }
      throw error;
    }
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    client?: PoolClient,
  ): Promise<AuditLog[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entityType, entityId],
    );
    return result.rows.map((row) => this.rowToAuditLog(row));
  }

  async findByPerformedBy(
    performedBy: string,
    client?: PoolClient,
  ): Promise<AuditLog[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM audit_logs WHERE performed_by = $1 ORDER BY created_at DESC',
      [performedBy],
    );
    return result.rows.map((row) => this.rowToAuditLog(row));
  }

  private rowToAuditLog(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      action: row.action as AuditLog['action'],
      oldValues: row.old_values
        ? (typeof row.old_values === 'string'
            ? JSON.parse(row.old_values as string)
            : (row.old_values as Record<string, unknown>))
        : null,
      newValues: row.new_values
        ? (typeof row.new_values === 'string'
            ? JSON.parse(row.new_values as string)
            : (row.new_values as Record<string, unknown>))
        : null,
      performedBy: row.performed_by as string,
      performedAt: new Date(row.performed_at as string),
      ipAddress: (row.ip_address as string) ?? null,
      userAgent: (row.user_agent as string) ?? null,
      createdAt: new Date(row.created_at as string),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>).code === '23505'
    );
  }
}
