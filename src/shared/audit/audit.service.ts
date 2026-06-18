export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export class AuditLogService {
  private logs: AuditLogEntry[] = [];

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const newEntry: AuditLogEntry = {
      id: this.generateId(),
      ...entry,
      timestamp: new Date(),
    };
    this.logs.push(newEntry);
    return newEntry;
  }

  async getLogsForEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return this.logs.filter(
      (log) => log.entityType === entityType && log.entityId === entityId
    );
  }

  async getAllLogs(): Promise<AuditLogEntry[]> {
    return [...this.logs];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
