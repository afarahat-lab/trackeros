import { LeaveType } from '../../shared/types/leave-type.enum';

export interface ILeaveTypeRepository {
  findAll(): Promise<LeaveType[]>;
  findByValue(value: LeaveType): Promise<LeaveType | null>;
}
