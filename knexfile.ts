import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config: Knex.Config = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA }
        : false,
  },
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
};

export default config;
