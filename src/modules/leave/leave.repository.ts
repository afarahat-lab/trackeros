import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import { LeaveType } from './leave.model';

dotenv.config();

export interface ILeaveTypeRepository {
  findAll(): Promise<LeaveType[]>;
  findById(id: string): Promise<LeaveType | null>;
  findByCode(code: string): Promise<LeaveType | null>;
  create(data: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveType>;
}

export class KnexLeaveTypeRepository implements ILeaveTypeRepository {
  private readonly db: Knex;

  constructor(db?: Knex) {
    this.db =
      db ??
      knex({
        client: 'pg',
        connection: process.env.DATABASE_URL,
      });
  }

  async findAll(): Promise<LeaveType[]> {
    const rows = await this.db('leave_types')
      .where('is_active', true)
      .select('*');
    return rows.map(this.toLeaveType);
  }

  async findById(id: string): Promise<LeaveType | null> {
    const row = await this.db('leave_types').where('id', id).first();
    return row ? this.toLeaveType(row) : null;
  }

  async findByCode(code: string): Promise<LeaveType | null> {
    const row = await this.db('leave_types').where('code', code).first();
    return row ? this.toLeaveType(row) : null;
  }

  async create(
    data: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveType> {
    const [row] = await this.db('leave_types')
      .insert({
        code: data.code,
        label: data.label,
        description: data.description,
        is_active: data.isActive,
      })
      .returning('*');
    return this.toLeaveType(row);
  }

  private toLeaveType(row: Record<string, unknown>): LeaveType {
    return {
      id: row.id as string,
      code: row.code as string,
      label: row.label as string,
      description: row.description as string,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
