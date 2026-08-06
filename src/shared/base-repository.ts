import { QueryResult } from 'pg';
import { pool } from './db/connection';

export abstract class BaseRepository {
  async query<T extends Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      return await pool.query<T>(text, params);
    } catch (error: unknown) {
      throw error;
    }
  }

  async findById<T extends Record<string, unknown>>(
    table: string,
    id: string | number
  ): Promise<T | null> {
    try {
      const result = await this.query<T>(
        `SELECT * FROM ${table} WHERE id = $1`,
        [id]
      );
      return result.rows[0] ?? null;
    } catch (error: unknown) {
      throw error;
    }
  }

  async findAll<T extends Record<string, unknown>>(
    table: string
  ): Promise<T[]> {
    try {
      const result = await this.query<T>(`SELECT * FROM ${table}`);
      return result.rows;
    } catch (error: unknown) {
      throw error;
    }
  }

  async insert<T extends Record<string, unknown>>(
    table: string,
    data: Record<string, unknown>
  ): Promise<T> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const result = await this.query<T>(
        `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (error: unknown) {
      throw error;
    }
  }

  async update<T extends Record<string, unknown>>(
    table: string,
    id: string | number,
    data: Record<string, unknown>
  ): Promise<T | null> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClauses = keys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');
      const result = await this.query<T>(
        `UPDATE ${table} SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );
      return result.rows[0] ?? null;
    } catch (error: unknown) {
      throw error;
    }
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    try {
      const result = await this.query(
        `DELETE FROM ${table} WHERE id = $1`,
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error: unknown) {
      throw error;
    }
  }
}
