import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = (pool as any).query;
    mockQuery.mockReset();
    repository = new EmployeeRepository(pool as any);
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const mockEmployee = { id: '1', name: 'John Doe' };
      mockQuery.mockResolvedValue({ rows: [mockEmployee] });

      const result = await repository.findById('1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1',
        ['1']
      );
      expect(result).toEqual(mockEmployee);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById('1');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a manager', async () => {
      const mockEmployees = [{ id: '2', name: 'Jane Doe', managerId: '1' }];
      mockQuery.mockResolvedValue({ rows: mockEmployees });

      const result = await repository.findByManagerId('1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1',
        ['1']
      );
      expect(result).toEqual(mockEmployees);
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const mockEmployees = [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }];
      mockQuery.mockResolvedValue({ rows: mockEmployees });

      const result = await repository.findAll();

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees');
      expect(result).toEqual(mockEmployees);
    });
  });

  describe('create', () => {
    it('should create and return an employee', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        employmentDate: new Date(),
      };
      const mockEmployee = { id: '1', ...dto };
      mockQuery.mockResolvedValue({ rows: [mockEmployee] });

      const result = await repository.create(dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        expect.arrayContaining([dto.name, dto.email, null, null, dto.employmentDate])
      );
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('should update and return an employee', async () => {
      const dto = { name: 'John Updated' };
      const mockEmployee = { id: '1', name: 'John Updated' };
      mockQuery.mockResolvedValue({ rows: [mockEmployee] });

      const result = await repository.update('1', dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees'),
        expect.arrayContaining(['John Updated', undefined, undefined, undefined, undefined, '1'])
      );
      expect(result).toEqual(mockEmployee);
    });
  });
});
