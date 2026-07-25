import { Pool } from 'pg';
import { LeaveType } from './leaveType.model';

export interface ILeaveTypeRepository {
  findAll(): Promise<LeaveType[]>;
  findById(id: string): Promise<LeaveType | null>;
  findByCode(code: string): Promise<LeaveType | null>;
}

export class LeaveTypeRepository implements ILeaveTypeRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<LeaveType[]> {
    const result = await this.pool.query<LeaveType>(
      'SELECT * FROM leave_types ORDER BY label ASC'
    );
    return result.rows;
  }

  async findById(id: string): Promise<LeaveType | null> {
    const result = await this.pool.query<LeaveType>(
      'SELECT * FROM leave_types WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByCode(code: string): Promise<LeaveType | null> {
    const result = await this.pool.query<LeaveType>(
      'SELECT * FROM leave_types WHERE code = $1',
      [code]
    );
    return result.rows[0] ?? null;
  }
}
