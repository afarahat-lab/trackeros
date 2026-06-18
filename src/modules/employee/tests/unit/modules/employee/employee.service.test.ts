import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

describe('EmployeeService', () => {
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let service: EmployeeService;

  const mockEmployee: Employee = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    isActive: true,
    createdAt: new Date('2020-01-15T08:00:00Z'),
    updatedAt: new Date('2020-01-15T08:00:00Z'),
  };

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByManagerId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    service = new EmployeeService(mockRepository);
  });

  describe('getEmployeeById', () => {
    it('should return employee when found', async () => {
      mockRepository.findById.mockResolvedValue(mockEmployee);
      const result = await service.getEmployeeById(mockEmployee.id);
      expect(result).toEqual(mockEmployee);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockEmployee.id);
    });

    it('should throw error when employee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.getEmployeeById('nonexistent')).rejects.toThrow(
        'Employee with id nonexistent not found'
      );
    });
  });

  describe('getEmployeesByManager', () => {
    it('should return employees for a given manager', async () => {
      const employees = [mockEmployee];
      mockRepository.findByManagerId.mockResolvedValue(employees);
      const result = await service.getEmployeesByManager('manager-1');
      expect(result).toEqual(employees);
      expect(mockRepository.findByManagerId).toHaveBeenCalledWith('manager-1');
    });

    it('should return empty array when no employees found', async () => {
      mockRepository.findByManagerId.mockResolvedValue([]);
      const result = await service.getEmployeesByManager('manager-2');
      expect(result).toEqual([]);
    });
  });
});
