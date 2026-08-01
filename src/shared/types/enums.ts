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
  CREATED = 'CREATED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  BALANCE_DEDUCTED = 'BALANCE_DEDUCTED',
  BALANCE_RESTORED = 'BALANCE_RESTORED',
}
