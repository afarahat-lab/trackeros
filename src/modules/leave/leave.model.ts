export enum LeaveRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string;
  isPaid: boolean;
  requiresDocumentation: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveTypeId: string;
  entitlementDays: number;
  accrualRate: number;
  maxAccumulation: number;
  minimumNoticeDays: number;
  maxConsecutiveDays: number;
  requiresDocumentation: boolean;
  requiresManagerApproval: boolean;
  allowNegativeBalance: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestStatusDto {
  status: LeaveRequestStatus;
  actorId: string;
  rejectionReason?: string;
  cancellationReason?: string;
}
