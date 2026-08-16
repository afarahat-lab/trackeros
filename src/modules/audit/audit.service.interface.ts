export interface IAuditService {
  log(params: {
    entityType: string;
    entityId: string;
    action: string;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    performedBy: string | null;
  }): Promise<void>;
}
