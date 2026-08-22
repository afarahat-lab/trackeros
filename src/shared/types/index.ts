export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  EMERGENCY = 'emergency',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
}

export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  SUBMIT = 'SUBMIT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
}
