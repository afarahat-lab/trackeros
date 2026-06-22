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
      RETURNING *
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
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<AuditLog | null> {
    const result = await this.pool.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await this.pool.query(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY changed_at DESC',
      [entityType, entityId]
    );
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): AuditLog {
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
}
