import { DatabaseService, DatabaseConnection } from '../../../src/shared/database/database.service';

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService({ connectionString: 'postgres://localhost:5432/test' });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should implement DatabaseConnection interface', () => {
    expect(db).toBeDefined();
    expect(typeof db.query).toBe('function');
    expect(typeof db.getClient).toBe('function');
    expect(typeof db.close).toBe('function');
  });

  it('should create instance with connection string', () => {
    const service = new DatabaseService({ connectionString: 'postgres://localhost:5432/test' });
    expect(service).toBeInstanceOf(DatabaseService);
  });

  it('should create instance with ssl option', () => {
    const service = new DatabaseService({ connectionString: 'postgres://localhost:5432/test', ssl: true });
    expect(service).toBeInstanceOf(DatabaseService);
  });
});
