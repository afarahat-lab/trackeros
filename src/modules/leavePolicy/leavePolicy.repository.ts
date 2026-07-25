
import { Pool } from 'pg';
import { LeavePolicy } from './leavePolicy.model';

export interface ILeavePolicyRepository {
  findAll(): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>;
  findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<LeavePolicy[]> {
    const result = await this.pool.query<LeavePolicy>(
      'SELECT * FROM leave_policies ORDER BY name ASC'
    );
    return result.rows;
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await this.pool.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> {
    const result = await this.pool.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE leave_type_id = $1 ORDER BY name ASC',
      [leaveTypeId]
    );
    return result.rows;
  }

  async findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null> {
    const result = await this.pool.query<LeavePolicy>(
      "SELECT * FROM leave_policies WHERE leave_type_id = $1 AND status = 'ACTIVE' ORDER BY effective_from DESC LIMIT 1",
      [leaveTypeId]
    );
    return result.rows[0] ?? null;
  }
}
