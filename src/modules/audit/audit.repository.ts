import { AuditLog } from './audit.model';

/**
 * Repository interface for AuditLog entity.
 * All database access goes through this interface (GP-001).
 * AuditLog records are immutable — only create and read methods are exposed.
 * The real DB-backed implementation comes in a later phase.
 */
export interface IAuditLogRepository {
  findById(id: string): Promise<AuditLog | null>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByPerformedBy(performedBy: string): Promise<AuditLog[]>;
  create(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
}

/**
 * Stub implementation of IAuditLogRepository.
 * All methods throw "not implemented" — the real DB-backed
 * implementation is provided in a later phase.
 */
export class AuditLogRepository implements IAuditLogRepository {
  async findById(_id: string): Promise<AuditLog | null> {
    throw new Error('not implemented');
  }

  async findByEntity(_entityType: string, _entityId: string): Promise<AuditLog[]> {
    throw new Error('not implemented');
  }

  async findByPerformedBy(_performedBy: string): Promise<AuditLog[]> {
    throw new Error('not implemented');
  }

  async create(_log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    throw new Error('not implemented');
  }
}
