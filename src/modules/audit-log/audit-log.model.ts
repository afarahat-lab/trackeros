export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  changes: Record<string, unknown>;
  createdAt: Date;
}

export class AuditLogValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'AuditLogValidationError';
  }
}

export interface IAuditLogRepository {
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  create(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  findAll(filters?: { entityType?: string; performedBy?: string; fromDate?: Date; toDate?: Date }): Promise<AuditLog[]>;
}
