import { pool } from '../../shared/db/connection';
import { LeaveType, CreateLeaveTypeDto } from './leave-type.model';

export interface ILeaveTypeRepository {
  findByCode(code: string): Promise<LeaveType | null>;
  findById(id: string): Promise<LeaveType | null>;
  findAll(): Promise<LeaveType[]>;
  create(dto: CreateLeaveTypeDto): Promise<LeaveType>;
  update(id: string, dto: Partial<CreateLeaveTypeDto>): Promise<LeaveType | null>;
  softDelete(id: string): Promise<boolean>;
}

export class LeaveTypeRepository implements ILeaveTypeRepository {
  async findByCode(code: string): Promise<LeaveType | null> {
    const result = await pool.query<LeaveType>(
      'SELECT * FROM leave_types WHERE code = $1 AND deleted_at IS NULL',
      [code]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<LeaveType | null> {
    const result = await pool.query<LeaveType>(
      'SELECT * FROM leave_types WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<LeaveType[]> {
    const result = await pool.query<LeaveType>(
      'SELECT * FROM leave_types WHERE deleted_at IS NULL ORDER BY name'
    );
    return result.rows;
  }

  async create(dto: CreateLeaveTypeDto): Promise<LeaveType> {
    const result = await pool.query<LeaveType>(
      `INSERT INTO leave_types (code, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dto.code, dto.name, dto.description, dto.isActive ?? true]
    );
    return result.rows[0];
  }

  async update(id: string, dto: Partial<CreateLeaveTypeDto>): Promise<LeaveType | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const addField = (column: string, value: unknown) => {
      fields.push(`${column} = $${paramIndex++}`);
      values.push(value);
    };

    if (dto.code !== undefined) addField('code', dto.code);
    if (dto.name !== undefined) addField('name', dto.name);
    if (dto.description !== undefined) addField('description', dto.description);
    if (dto.isActive !== undefined) addField('is_active', dto.isActive);

    if (fields.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query<LeaveType>(
      `UPDATE leave_types SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE leave_types SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
