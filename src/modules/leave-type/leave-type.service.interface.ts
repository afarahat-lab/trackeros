import { LeaveTypeCode } from '../../shared/types';
import { LeaveType, CreateLeaveTypeInput } from './leave-type.model';

export interface ILeaveTypeService {
  createLeaveType(input: CreateLeaveTypeInput): Promise<LeaveType>;
  getLeaveTypeByCode(code: LeaveTypeCode): Promise<LeaveType>;
}
