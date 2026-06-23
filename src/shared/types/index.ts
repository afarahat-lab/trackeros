export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  EMERGENCY = 'emergency',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity'
}

export enum LeaveRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED'
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  CANCEL = 'CANCEL'
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | null;
  maxAccumulation: number | null;
  minimumNoticeDays: number | null;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  performedBy: string | null;
  performedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  status?: LeaveRequestStatus;
}

export interface LeaveRequestQueryParams {
  employeeId?: string;
  status?: LeaveRequestStatus;
  startDate?: Date;
  endDate?: Date;
  leaveTypeId?: string;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays?: number;
  remainingDays?: number;
  fiscalYear: number;
  status?: string;
}

export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface CreateAuditRecordDto {
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string;
  department?: string;
  hireDate: Date;
  employmentStatus?: EmploymentStatus;
}

export interface UpdateEmployeeDto {
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  managerId?: string;
  department?: string;
  hireDate?: Date;
  terminationDate?: Date;
  employmentStatus?: EmploymentStatus;
}

export interface CreateLeavePolicyDto {
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate?: number;
  maxAccumulation?: number;
  minimumNoticeDays?: number;
  requiresManagerApproval?: boolean;
  isActive?: boolean;
}

export interface UpdateLeavePolicyDto {
  policyName?: string;
  leaveType?: LeaveType;
  entitlementDays?: number;
  accrualRate?: number;
  maxAccumulation?: number;
  minimumNoticeDays?: number;
  requiresManagerApproval?: boolean;
  isActive?: boolean;
}
