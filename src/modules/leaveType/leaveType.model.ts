import { LeaveTypeCode } from '../../shared/types/leave.enums';

export enum LeaveTypeStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

export interface LeaveType {
  id: string;
  code: LeaveTypeCode;
  label: string;
  description: string;
  requiresDocumentation: boolean;
  maxConsecutiveDays: number | null;
  isPaid: boolean;
  status: LeaveTypeStatus;
  createdAt: Date;
  updatedAt: Date;
}
