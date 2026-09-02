import type { PoolClient } from 'pg';

import type { LeaveStatus } from '../../shared/types';
import type { CreateLeaveRequestDto } from '../../shared/types';
import type { LeaveRequest } from './leave.model';

export interface ILeaveService {
  create(input: CreateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  approve(id: string, approverId: string, client?: PoolClient): Promise<LeaveRequest>;
  reject(id: string, approverId: string, client?: PoolClient): Promise<LeaveRequest>;
  cancel(id: string, employeeId: string, client?: PoolClient): Promise<LeaveRequest>;
}
