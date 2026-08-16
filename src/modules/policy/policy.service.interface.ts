import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/leave-type.enum';

export interface IPolicyService {
  getById(id: string): Promise<LeavePolicy | null>;
  getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  getAllActive(): Promise<LeavePolicy[]>;
}
