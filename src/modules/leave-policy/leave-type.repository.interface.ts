import { LeaveType } from './leave-type.model';
import { LeaveTypeCode } from '../../shared/types';

export interface CreateLeaveTypeDto {
  code: LeaveTypeCode;
  label: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLeaveTypeDto {
  code?: LeaveTypeCode;
  label?: string;
  description?: string;
  isActive?: boolean;
}

export interface ILeaveTypeRepository {
  findAll(): Promise<LeaveType[]>;
  findById(id: string): Promise<LeaveType | null>;
  findByCode(code: LeaveTypeCode): Promise<LeaveType | null>;
  create(dto: CreateLeaveTypeDto): Promise<LeaveType>;
  update(id: string, dto: UpdateLeaveTypeDto): Promise<LeaveType | null>;
  delete(id: string): Promise<boolean>;
}
