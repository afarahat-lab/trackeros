import { pool } from '../../shared/db/connection';
import { User } from './user.entity';

export class UserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, username, password_hash AS "passwordHash", employee_id AS "employeeId", role FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }
}
