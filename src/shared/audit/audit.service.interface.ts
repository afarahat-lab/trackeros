// Audit service interface without dependency on unavailable modules.
export interface AuditEntry {
  id: string;
  action: string;
  timestamp: Date;
  performedBy: string; // user identifier, not Employee model
  details?: string;
}

export interface IAuditService {
  log(entry: AuditEntry): Promise<void>;
  getEntries(filter?: Partial<AuditEntry>): Promise<AuditEntry[]>;
}
