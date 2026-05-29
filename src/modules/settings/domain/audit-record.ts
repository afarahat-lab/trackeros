export interface AuditRecord {
  operation: string;
  entity: string;
  timestamp: Date;
  details: string;
}
