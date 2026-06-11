export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
}

export interface CreateAuditRecordInput {
  entityType: string;
  entityId: string;
  action: string;
}
