import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository.interface';
import { AppError } from '../../../../src/shared/types';
import { Employee } from '../../../../src/modules/employee/employee.model';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockRepository: IEmployeeRepository;

  const mockEmployee: Employee = {
    id: '1', name: 'John Doe', email: 'john@example.com', managerId: '2',
    department: 'Engineering', status: 'active', createdAt: new Date(), updatedAt: new Date(),
  };
  const mockManager: Employee = { ...mockEmployee, id: '2', name: 'Jane Doe', managerId: null };

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new EmployeeService(mockRepository);
  });

  describe('getEmployeeById', () => {
    it('should return an employee on success', async () => {
      (mockRepository.findById as any).mockResolvedValue(mockEmployee);
      await expect(service.getEmployeeById('1')).resolves.toEqual(mockEmployee);
    });
    it('should throw AppError if not found', async () => {
      (mockRepository.findById as any).mockResolvedValue(null);
      await expect(service.getEmployeeById('1')).rejects.toThrow(AppError);
    });
    it('should throw AppError for invalid input', async () => {
      await expect(service.getEmployeeById('')).rejects.toThrow(AppError);
    });
    it('should propagate repository errors', async () => {
      (mockRepository.findById as any).mockRejectedValue(new Error('DB error'));
      await expect(service.getEmployeeById('1')).rejects.toThrow('DB error');
    });
  });

  describe('getEmployeeByEmail', () => {
    it('should return an employee on success', async () => {
      (mockRepository.findByEmail as any).mockResolvedValue(mockEmployee);
      await expect(service.getEmployeeByEmail('john@example.com')).resolves.toEqual(mockEmployee);
    });
    it('should throw AppError if not found', async () => {
      (mockRepository.findByEmail as any).mockResolvedValue(null);
      await expect(service.getEmployeeByEmail('john@example.com')).rejects.toThrow(AppError);
    });
    it('should throw AppError for invalid input', async () => {
      await expect(service.getEmployeeByEmail('')).rejects.toThrow(AppError);
    });
    it('should propagate repository errors', async () => {
      (mockRepository.findByEmail as any).mockRejectedValue(new Error('DB error'));
      await expect(service.getEmployeeByEmail('john@example.com')).rejects.toThrow('DB error');
    });
  });

  describe('employeeExists', () => {
    it('should return true if employee exists', async () => {
      (mockRepository.findById as any).mockResolvedValue(mockEmployee);
      await expect(service.employeeExists('1')).resolves.toBe(true);
    });
    it('should return false if not found', async () => {
      (mockRepository.findById as any).mockResolvedValue(null);
      await expect(service.employeeExists('1')).resolves.toBe(false);
    });
    it('should throw AppError for invalid input', async () => {
      await expect(service.employeeExists('')).rejects.toThrow(AppError);
    });
    it('should propagate repository errors', async () => {
      (mockRepository.findById as any).mockRejectedValue(new Error('DB error'));
      await expect(service.employeeExists('1')).rejects.toThrow('DB error');
    });
  });

  describe('getManagerHierarchy', () => {
    it('should return hierarchy on success', async () => {
      (mockRepository.findById as any).mockImplementation(async (id: string) => {
        if (id === '1') return mockEmployee;
        if (id === '2') return mockManager;
        return null;
      });
      await expect(service.getManagerHierarchy('1')).resolves.toEqual([mockManager]);
    });
    it('should return empty array if employee not found', async () => {
      (mockRepository.findById as any).mockResolvedValue(null);
      await expect(service.getManagerHierarchy('1')).resolves.toEqual([]);
    });
    it('should throw AppError for invalid input', async () => {
      await expect(service.getManagerHierarchy('')).rejects.toThrow(AppError);
    });
    it('should propagate repository errors', async () => {
      (mockRepository.findById as any).mockRejectedValue(new Error('DB error'));
      await expect(service.getManagerHierarchy('1')).rejects.toThrow('DB error');
    });
  });

  describe('isManagerOf', () => {
    it('should return true if user is manager', async () => {
      (mockRepository.findById as any).mockImplementation(async (id: string) => {
        if (id === '1') return mockEmployee;
        if (id === '2') return mockManager;
        return null;
      });
      await expect(service.isManagerOf('2', '1')).resolves.toBe(true);
    });
    it('should return false if user is not manager', async () => {
      (mockRepository.findById as any).mockImplementation(async (id: string) => {
        if (id === '1') return mockEmployee;
        return null;
      });
      await expect(service.isManagerOf('99', '1')).resolves.toBe(false);
    });
    it('should throw AppError for invalid input', async () => {
      await expect(service.isManagerOf('', '1')).rejects.toThrow(AppError);
    });
    it('should propagate repository errors', async () => {
      (mockRepository.findById as any).mockRejectedValue(new Error('DB error'));
      await expect(service.isManagerOf('2', '1')).rejects.toThrow('DB error');
    });
  });
});
