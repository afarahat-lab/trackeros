export interface Setting {
  key: string;
  value: string;
}

export interface AuditRecord {
  operation: string;
  entity: string;
  timestamp: Date;
  userId: string;
}
