import { LeaveTypeCode } from '../../shared/types';

export interface LeaveType {
  id: string;
  code: LeaveTypeCode;
  label: string;
  description: string | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
