import { AuditLog, CreateAuditLogInput } from './audit.model';

export interface IAuditService {
  record(input: CreateAuditLogInput): Promise<AuditLog>;
  getById(id: string): Promise<AuditLog>;
}
