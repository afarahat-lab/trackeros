import { Pool } from 'pg';
import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA }
      : false
});

export const db: Knex = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
});
