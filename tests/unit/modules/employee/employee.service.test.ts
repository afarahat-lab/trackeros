import { EmployeeService, ValidationError } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../../../../src/modules/employee/employee.service.interface';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    department: 'Engineering',
    managerId: 'mgr-1',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeMockRepo(): jest.Mocked<IEmployeeRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByManager: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    repo = makeMockRepo();
    service = new EmployeeService(repo);
  });

  describe('getById', () => {
    it('should return employee when found', async () => {
      const emp = makeEmployee();
      repo.findById.mockResolvedValue(emp);

      const result = await service.getById('emp-1');
      expect(result).toEqual(emp);
      expect(repo.findById).toHaveBeenCalledWith('emp-1');
    });

    it('should return null when not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all employees', async () => {
      const emps = [makeEmployee(), makeEmployee({ id: 'emp-2', fullName: 'Jane' })];
      repo.findAll.mockResolvedValue(emps);

      const result = await service.getAll();
      expect(result).toEqual(emps);
      expect(repo.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no employees', async () => {
      repo.findAll.mockResolvedValue([]);

      const result = await service.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getSubordinates', () => {
    it('should return employees for a given manager', async () => {
      const subs = [makeEmployee({ id: 'emp-2', managerId: 'mgr-1' })];
      repo.findByManager.mockResolvedValue(subs);

      const result = await service.getSubordinates('mgr-1');
      expect(result).toEqual(subs);
      expect(repo.findByManager).toHaveBeenCalledWith('mgr-1');
    });

    it('should return empty array when manager has no subordinates', async () => {
      repo.findByManager.mockResolvedValue([]);

      const result = await service.getSubordinates('mgr-1');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const validDto: CreateEmployeeDto = {
      fullName: 'John Doe',
      email: 'john@example.com',
      department: 'Engineering',
      managerId: 'mgr-1',
    };

    it('should create an employee with valid data', async () => {
      const created = makeEmployee();
      repo.create.mockResolvedValue(created);

      const result = await service.create(validDto);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({
        fullName: 'John Doe',
        email: 'john@example.com',
        department: 'Engineering',
        managerId: 'mgr-1',
        isActive: true,
      });
    });

    it('should default department and managerId to null when not provided', async () => {
      const dto: CreateEmployeeDto = { fullName: 'Jane', email: 'jane@example.com' };
      const created = makeEmployee({ fullName: 'Jane', email: 'jane@example.com', department: null, managerId: null });
      repo.create.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({
        fullName: 'Jane',
        email: 'jane@example.com',
        department: null,
        managerId: null,
        isActive: true,
      });
    });

    it('should reject when fullName is empty', async () => {
      await expect(service.create({ fullName: '', email: 'a@b.com' }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ fullName: '  ', email: 'a@b.com' }))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when fullName is missing', async () => {
      await expect(service.create({ fullName: '', email: 'a@b.com' } as CreateEmployeeDto))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when email is empty', async () => {
      await expect(service.create({ fullName: 'John', email: '' }))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when email is invalid format', async () => {
      await expect(service.create({ fullName: 'John', email: 'not-an-email' }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ fullName: 'John', email: 'missing@domain' }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ fullName: 'John', email: '@nodomain.com' }))
        .rejects.toThrow(ValidationError);
    });

    it('should trim whitespace from fullName and email', async () => {
      const created = makeEmployee();
      repo.create.mockResolvedValue(created);

      await service.create({ fullName: '  John  ', email: '  john@example.com  ' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'John', email: 'john@example.com' })
      );
    });
  });

  describe('update', () => {
    it('should update an existing employee', async () => {
      const existing = makeEmployee();
      const updated = makeEmployee({ fullName: 'Jane Doe', updatedAt: new Date() });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const data: UpdateEmployeeDto = { fullName: 'Jane Doe' };
      const result = await service.update('emp-1', data);
      expect(result).toEqual(updated);
      expect(repo.update).toHaveBeenCalledWith('emp-1', expect.objectContaining({ fullName: 'Jane Doe' }));
    });

    it('should return null when employee does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.update('nonexistent', { fullName: 'X' });
      expect(result).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should reject when email is updated to invalid format', async () => {
      const existing = makeEmployee();
      repo.findById.mockResolvedValue(existing);

      await expect(service.update('emp-1', { email: 'bad-email' }))
        .rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should allow updating email to valid format', async () => {
      const existing = makeEmployee();
      const updated = makeEmployee({ email: 'new@example.com' });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('emp-1', { email: 'new@example.com' });
      expect(result).toEqual(updated);
    });

    it('should allow updating department to null', async () => {
      const existing = makeEmployee();
      const updated = makeEmployee({ department: null });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('emp-1', { department: null });
      expect(result).toEqual(updated);
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active employee', async () => {
      const existing = makeEmployee({ isActive: true });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(makeEmployee({ isActive: false }));

      const result = await service.deactivate('emp-1');
      expect(result).toBe(true);
      expect(repo.update).toHaveBeenCalledWith('emp-1', {
        isActive: false,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should return false when employee does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.deactivate('nonexistent');
      expect(result).toBe(false);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should return true when employee is already inactive (idempotent)', async () => {
      const existing = makeEmployee({ isActive: false });
      repo.findById.mockResolvedValue(existing);

      const result = await service.deactivate('emp-1');
      expect(result).toBe(true);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
