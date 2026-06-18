import { DatabaseConnection } from '../database/database.service';

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface IRepository<T extends BaseEntity> {
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  findAll(filter?: Record<string, any>): Promise<T[]>;
}

export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  constructor(
    protected readonly db: DatabaseConnection,
    protected readonly tableName: string,
    protected readonly entityName: string
  ) {}

  async create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const now = new Date();
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.db.query<T>(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}, created_at, updated_at)
       VALUES (${placeholders}, $${keys.length + 1}, $${keys.length + 2})
       RETURNING *`,
      [...values, now, now]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db.query<T>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null> {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const result = await this.db.query<T>(
      `UPDATE ${this.tableName}
       SET ${setClause}, updated_at = $${keys.length + 1}
       WHERE id = $${keys.length + 2}
       RETURNING *`,
      [...values, new Date(), id]
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findAll(filter?: Record<string, any>): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const values: any[] = [];
    if (filter && Object.keys(filter).length > 0) {
      const conditions = Object.keys(filter).map((key, i) => {
        values.push(filter[key]);
        return `${key} = $${i + 1}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    const result = await this.db.query<T>(query, values);
    return result.rows;
  }
}
