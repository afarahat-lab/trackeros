export enum LeaveType {
  annual = 'annual',
  sick = 'sick',
  emergency = 'emergency',
  unpaid = 'unpaid',
  maternity = 'maternity',
  paternity = 'paternity',
}

export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum AuditAction {
  CREATED = 'CREATED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  BALANCE_DEDUCTED = 'BALANCE_DEDUCTED',
  BALANCE_RESTORED = 'BALANCE_RESTORED',
}
