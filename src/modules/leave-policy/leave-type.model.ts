import { LeaveTypeCode } from '../../shared/types/leave-type-code.enum';

export interface LeaveType {
  id: string;
  code: LeaveTypeCode;
  label: string;
  description: string | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
