export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string;
  performedAt: Date;
}

export interface IAuditRepository {
  create(entry: Omit<AuditLog, 'id' | 'performedAt'>): Promise<AuditLog>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByPerformer(performedBy: string, limit?: number): Promise<AuditLog[]>;
}
