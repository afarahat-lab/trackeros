import { Pool } from 'pg';

const pool = new Pool();

/**
 * Provides a shared database connection pool.
 * @returns {Pool} The PostgreSQL connection pool
 */
export const getDbPool = (): Pool => pool;