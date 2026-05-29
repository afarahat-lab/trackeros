import { Pool } from 'pg';
import config from '../config';

const pool = new Pool({
  connectionString: config.databaseUrl
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Use platform logger instead of console.log
  // logger.info('executed query', { text, duration, rows: res.rowCount });
  return res;
};

export default pool;