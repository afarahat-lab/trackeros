export enum LeaveRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveType {
  annual = 'annual',
  sick = 'sick',
  emergency = 'emergency',
  unpaid = 'unpaid',
  maternity = 'maternity',
  paternity = 'paternity',
}

export enum BalanceStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  CLOSED = 'CLOSED',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
