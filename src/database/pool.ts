import { Pool } from 'pg';
import { config } from '../config/env';

const pool = new Pool({
  connectionString: config.dbUrl,
});

export default pool;
