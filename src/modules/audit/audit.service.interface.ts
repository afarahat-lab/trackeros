import { AuditRecord } from './audit.model';
import { AuditAction } from '../../shared/types/index';

export interface CreateAuditRecordDto {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  changes?: Record<string, unknown> | null;
}

export interface IAuditService {
  log(record: CreateAuditRecordDto): Promise<AuditRecord>;
  getEntityHistory(entityType: string, entityId: string): Promise<AuditRecord[]>;
  getUserActions(performedBy: string): Promise<AuditRecord[]>;
  getByDateRange(start: Date, end: Date): Promise<AuditRecord[]>;
}
