import { PoolClient } from 'pg';
import { LeaveTypeCode } from '../../shared/types';
import { LeaveType, CreateLeaveTypeInput } from './leave-type.model';

export interface ILeaveTypeRepository {
  create(input: CreateLeaveTypeInput, client?: PoolClient): Promise<LeaveType>;
  findByCode(code: LeaveTypeCode, client?: PoolClient): Promise<LeaveType | null>;
  findAll(client?: PoolClient): Promise<LeaveType[]>;
}
