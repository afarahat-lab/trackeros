export interface IAuditService {
  log(
    entityType: string,
    entityId: string,
    action: string,
    changedBy: string,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null
  ): Promise<void>;
}
