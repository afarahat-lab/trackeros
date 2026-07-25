export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveTypeCode {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  EMERGENCY = 'EMERGENCY',
}

export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  REVOKED = 'REVOKED',
}

export enum BalanceStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  FROZEN = 'FROZEN',
}
