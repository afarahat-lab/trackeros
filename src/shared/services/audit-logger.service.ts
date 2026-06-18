export class AuditLogger {
  async log(entityType: string, entityId: string, action: string, details?: Record<string, unknown>): Promise<void> {
    // Stub - will be implemented in a later phase
  }
}
