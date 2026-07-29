import { pool } from '../../shared/db/connection';
import { LeaveType } from '../../shared/types/leave-type.enum';
import { ILeaveTypeRepository } from './leave-type.repository.interface';

export class PgLeaveTypeRepository implements ILeaveTypeRepository {
  async findAll(): Promise<LeaveType[]> {
    try {
      const { rows } = await pool.query('SELECT value FROM leave_types ORDER BY value;');
      return rows.map(row => row.value as LeaveType);
    } catch (error) {
      console.error('Error in findAll (leave types):', error);
      throw error;
    }
  }

  async findByValue(value: LeaveType): Promise<LeaveType | null> {
    try {
      const { rows } = await pool.query('SELECT value FROM leave_types WHERE value = $1;', [value]);
      return rows[0]?.value as LeaveType ?? null;
    } catch (error) {
      console.error('Error in findByValue:', error);
      throw error;
    }
  }
}
