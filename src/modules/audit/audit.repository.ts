import { Pool } from "pg";
import { IAuditRepository, CreateAuditEntryDTO } from "./audit.repository.interface";
import { AuditRecord } from "../../shared/types/index";

export class AuditRepository implements IAuditRepository {
  constructor(private readonly pool: Pool) {}

  async create(entry: CreateAuditEntryDTO): Promise<AuditRecord> {
    const query = `
      INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_values, new_values)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [entry.entityType, entry.entityId, entry.action, entry.changedBy, entry.oldValues ? JSON.stringify(entry.oldValues) : null, entry.newValues ? JSON.stringify(entry.newValues) : null];
    const result = await this.pool.query(query, values);
    return this.mapRowToAuditRecord(result.rows[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
    const query = `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY changed_at DESC`;
    const result = await this.pool.query(query, [entityType, entityId]);
    return result.rows.map(this.mapRowToAuditRecord);
  }

  private mapRowToAuditRecord(row: any): AuditRecord {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      details: row.details || JSON.stringify({ oldValues: row.old_values, newValues: row.new_values }),
    };
  }
}
