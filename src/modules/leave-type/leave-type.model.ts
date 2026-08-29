import type { PoolClient } from 'pg';

import { LeaveTypeCode } from '../../shared/types';

export interface LeaveType {
  id: string;
  code: LeaveTypeCode;
  name: string;
  isPaid: boolean;
  requiresManagerApproval: boolean;
  isActive: boolean;
}

export interface ILeaveTypeRepository {
  create(leaveType: LeaveType, client?: PoolClient): Promise<LeaveType>;
  update(leaveType: LeaveType, client?: PoolClient): Promise<LeaveType>;
  findById(id: string, client?: PoolClient): Promise<LeaveType | null>;
  findByCode(
    code: LeaveTypeCode,
    client?: PoolClient
  ): Promise<LeaveType | null>;
  findActive(client?: PoolClient): Promise<LeaveType[]>;
}
