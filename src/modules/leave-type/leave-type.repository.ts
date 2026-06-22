import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveType, CreateLeaveTypeDto } from './leave-type.model';

export interface ILeaveTypeRepository {
  findById(id: string): Promise<LeaveType | null>;
  findAll(): Promise<LeaveType[]>;
}

export class LeaveTypeRepository implements ILeaveTypeRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: string): Promise<LeaveType | null> {
    const result = await this.db.query(
      'SELECT id, name, description, requires_documentation, created_at FROM leave_types WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      requiresDocumentation: row.requires_documentation,
      createdAt: row.created_at,
    };
  }

  async findAll(): Promise<LeaveType[]> {
    const result = await this.db.query(
      'SELECT id, name, description, requires_documentation, created_at FROM leave_types ORDER BY name'
    );
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      requiresDocumentation: row.requires_documentation,
      createdAt: row.created_at,
    }));
  }
}
