import { Pool } from '../../shared/db/connection';
import { AuditLog, CreateAuditLogDto } from './audit.model';

export interface IAuditRepository {
  create(dto: CreateAuditLogDto): Promise<AuditLog>;
  findById(id: string): Promise<AuditLog | null>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
}

export class AuditRepository implements IAuditRepository {
  constructor(private readonly pool: Pool) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const { entityType, entityId, action, oldValue, newValue, changedBy } = dto;

    const query = `
      INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by, changed_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, entity_type, entity_id, action, old_value, new_value, changed_by, changed_at
    `;

    const values = [
      entityType,
      entityId,
      action,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      changedBy || null
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      oldValue: row.old_value,
      newValue: row.new_value,
      changedBy: row.changed_by,
      changedAt: row.changed_at
    };
  }

  async findById(id: string): Promise<AuditLog | null> {
    throw new Error('Not implemented');
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    throw new Error('Not implemented');
  }
}
