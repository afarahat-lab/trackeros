import { PoolClient } from 'pg';
import { AuditRecord, CreateAuditRecordDto } from '../types';
import { pool } from '../db/connection';

export interface IAuditService {
  logAction(dto: CreateAuditRecordDto, client?: PoolClient): Promise<AuditRecord>;
  getEntityHistory(entityType: string, entityId: string): Promise<AuditRecord[]>;
}

export class AuditService implements IAuditService {
  async logAction(dto: CreateAuditRecordDto, client?: PoolClient): Promise<AuditRecord> {
    const executor = client || pool;
    const result = await executor.query(
      `INSERT INTO audit_records (
        entity_type, entity_id, action, old_values, new_values, 
        performed_by, performed_at, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8) RETURNING *`,
      [
        dto.entityType,
        dto.entityId,
        dto.action,
        dto.oldValues ? JSON.stringify(dto.oldValues) : null,
        dto.newValues ? JSON.stringify(dto.newValues) : null,
        dto.performedBy || null,
        dto.ipAddress || null,
        dto.userAgent || null
      ]
    );
    return result.rows[0];
  }

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditRecord[]> {
    const result = await pool.query(
      `SELECT * FROM audit_records WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at DESC`,
      [entityType, entityId]
    );
    return result.rows;
  }
}
