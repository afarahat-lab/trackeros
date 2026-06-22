import { Pool } from 'pg';
import { AuditLog, CreateAuditLogDto } from './audit.model';

export interface IAuditRepository {
  createAuditLog(dto: CreateAuditLogDto): Promise<AuditLog>;
}

export class AuditRepository implements IAuditRepository {
  constructor(private readonly pool: Pool) {}

  async createAuditLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    throw new Error('Not implemented');
  }
}
