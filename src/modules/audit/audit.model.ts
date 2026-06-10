export type AuditAction = 'CREATED' | 'APPROVED' | 'REJECTED';

export interface AuditRecord {
  id: string;
  entityType: 'LeaveRequest';
  entityId: string;
  action: AuditAction;
}

export interface CreateAuditRecordDto {
  entityType: 'LeaveRequest';
  entityId: string;
  action: AuditAction;
}
