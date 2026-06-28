import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new EmployeeRepository(mockPool);
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const mockEmployee = { id: '1', name: 'John Doe' };
      mockPool.query.mockResolvedValue({ rows: [mockEmployee] } as any);

      const result = await repository.findById('1');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1',
        ['1']
      );
      expect(result).toEqual(mockEmployee);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findById('1');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a manager', async () => {
      const mockEmployees = [{ id: '2', name: 'Jane Doe', managerId: '1' }];
      mockPool.query.mockResolvedValue({ rows: mockEmployees } as any);

      const result = await repository.findByManagerId('1');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1',
        ['1']
      );
      expect(result).toEqual(mockEmployees);
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const mockEmployees = [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }];
      mockPool.query.mockResolvedValue({ rows: mockEmployees } as any);

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM employees');
      expect(result).toEqual(mockEmployees);
    });
  });

  describe('create', () => {
    it('should create and return an employee', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        employmentDate: new Date('2023-01-01'),
      };
      const mockEmployee = { id: '1', ...dto };
      mockPool.query.mockResolvedValue({ rows: [mockEmployee] } as any);

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        [dto.name, dto.email, null, null, dto.employmentDate]
      );
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('should update and return an employee', async () => {
      const dto = { name: 'John Updated' };
      const mockEmployee = { id: '1', name: 'John Updated' };
      mockPool.query.mockResolvedValue({ rows: [mockEmployee] } as any);

      const result = await repository.update('1', dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees'),
        ['John Updated', undefined, undefined, undefined, undefined, '1']
      );
      expect(result).toEqual(mockEmployee);
    });
  });
});
