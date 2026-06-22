export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export enum EntityType {
  LEAVE_REQUEST = 'LEAVE_REQUEST',
  LEAVE_BALANCE = 'LEAVE_BALANCE',
  LEAVE_POLICY = 'LEAVE_POLICY',
  EMPLOYEE = 'EMPLOYEE',
  NOTIFICATION = 'NOTIFICATION'
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedBy: string | null;
  changedAt: Date;
}

export interface CreateAuditLogDto {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changedBy?: string;
}
