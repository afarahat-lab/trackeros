import { AuditRecord, CreateAuditRecordDto } from '../../shared/types/index';

export { AuditRecord, CreateAuditRecordDto };

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  CANCEL = 'CANCEL',
}
