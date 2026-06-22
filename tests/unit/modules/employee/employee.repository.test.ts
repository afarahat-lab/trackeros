import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    repository = new EmployeeRepository(pool as any);
  });

  const mockRow = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    manager_id: null,
    department: 'Engineering',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('findById', () => {
    it('should return an employee if found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });
      const result = await repository.findById('1');
      expect(result).toEqual(expect.objectContaining({ id: '1', name: 'John Doe' }));
    });

    it('should return null if not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      const result = await repository.findById('1');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return an employee if found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });
      const result = await repository.findByEmail('john@example.com');
      expect(result).toEqual(expect.objectContaining({ email: 'john@example.com' }));
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });
      const result = await repository.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create an employee and log audit without PII', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] }); // INSERT employee
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT audit
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT
      
      const result = await repository.create({
        name: 'John Doe',
        email: 'john@example.com',
        managerId: null,
        department: 'Engineering',
        status: 'active',
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.id).toBe('1');
      
      const auditCall = mockClient.query.mock.calls.find((call: any) => call[0].includes('audit_logs'));
      expect(auditCall[1]).toEqual(['employee', '1', 'create', null, expect.any(String)]);
      const auditData = JSON.parse(auditCall[1][4]);
      expect(auditData).not.toHaveProperty('name');
      expect(auditData).not.toHaveProperty('email');
    });

    it('should rollback on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));
      
      await expect(repository.create({
        name: 'John Doe',
        email: 'john@example.com',
        managerId: null,
        department: 'Engineering',
        status: 'active',
      })).rejects.toThrow('DB Error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('update', () => {
    it('should update an employee and log audit', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] }); // SELECT existing
      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] }); // UPDATE employee
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT audit
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

      const result = await repository.update('1', { department: 'HR' });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      
      const auditCall = mockClient.query.mock.calls.find((call: any) => call[0].includes('audit_logs'));
      expect(auditCall[1][2]).toBe('update');
    });
  });

  describe('delete', () => {
    it('should delete an employee and log audit', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] }); // SELECT existing
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // DELETE employee
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT audit
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

      await repository.delete('1');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      
      const auditCall = mockClient.query.mock.calls.find((call: any) => call[0].includes('audit_logs'));
      expect(auditCall[1][2]).toBe('delete');
      expect(auditCall[1][4]).toBeNull();
    });
  });
});
