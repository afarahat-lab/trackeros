import { PoolClient } from 'pg';
import { IBaseRepository, BaseRepository } from 'shared/base-repository';
import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from 'shared/types';

export interface ILeavePolicyRepository extends IBaseRepository<LeavePolicy> {
  findByLeaveType(leaveType: LeaveType, client?: PoolClient): Promise<LeavePolicy | null>;
  findActive(client?: PoolClient): Promise<LeavePolicy[]>;
}

export class LeavePolicyRepository extends BaseRepository<LeavePolicy> implements ILeavePolicyRepository {
  protected readonly tableName = 'leave_policies';

  async findByLeaveType(leaveType: LeaveType, client?: PoolClient): Promise<LeavePolicy | null> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE leave_type = $1`,
      [leaveType],
    );
    return result.rows[0] ?? null;
  }

  async findActive(client?: PoolClient): Promise<LeavePolicy[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE is_active = true`,
    );
    return result.rows;
  }
}
