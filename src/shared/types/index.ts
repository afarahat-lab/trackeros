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

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedUser {
  id: string;
  role: 'employee' | 'manager' | 'hr_admin';
}
