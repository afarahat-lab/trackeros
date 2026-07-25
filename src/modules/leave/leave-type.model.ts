import { LeaveTypeCode } from '../../shared/types';

export interface LeaveType {
  id: string;
  code: LeaveTypeCode;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveTypeDto {
  code: LeaveTypeCode;
  name: string;
  description: string;
  isActive?: boolean;
}
