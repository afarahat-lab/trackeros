import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConnection {
  query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  getClient(): Promise<PoolClient>;
  close(): Promise<void>;
}

export class DatabaseService implements DatabaseConnection {
  private pool: Pool;

  constructor(config: { connectionString: string; ssl?: boolean }) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
