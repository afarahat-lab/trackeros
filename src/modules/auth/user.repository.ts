import { Pool } from 'pg';
import { User } from './user.entity';

export class UserRepository {
  constructor(private pool: Pool) {}

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, username, password_hash AS "passwordHash", employee_id AS "employeeId", role FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }
}
