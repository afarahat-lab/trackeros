import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockRepo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findSubordinates: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IEmployeeRepository>;
    service = new EmployeeService(mockRepo);
  });

  it('getEmployee returns employee when found', async () => {
    const employee: Employee = { id: '1', employeeNumber: 'E001', firstName: 'John', lastName: 'Doe', email: 'john@example.com', employmentStatus: 'ACTIVE' } as Employee;
    mockRepo.findById.mockResolvedValue(employee);
    const result = await service.getEmployee('1');
    expect(result).toEqual(employee);
  });

  it('getEmployee returns null when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const result = await service.getEmployee('1');
    expect(result).toBeNull();
  });

  it('getEmployeeByNumber returns employee', async () => {
    const employee: Employee = { id: '1', employeeNumber: 'E001' } as Employee;
    mockRepo.findByEmployeeNumber.mockResolvedValue(employee);
    const result = await service.getEmployeeByNumber('E001');
    expect(result).toEqual(employee);
  });

  it('getSubordinates returns list', async () => {
    const subs: Employee[] = [{ id: '2' } as Employee];
    mockRepo.findSubordinates.mockResolvedValue(subs);
    const result = await service.getSubordinates('1');
    expect(result).toEqual(subs);
  });

  it('isActive returns true for ACTIVE status', async () => {
    mockRepo.findById.mockResolvedValue({ employmentStatus: 'ACTIVE' } as Employee);
    const result = await service.isActive('1');
    expect(result).toBe(true);
  });

  it('isActive returns false for non-ACTIVE', async () => {
    mockRepo.findById.mockResolvedValue({ employmentStatus: 'INACTIVE' } as Employee);
    const result = await service.isActive('1');
    expect(result).toBe(false);
  });

  it('listEmployees calls repository with filters', async () => {
    const filters = { department: 'Engineering' };
    await service.listEmployees(filters);
    expect(mockRepo.findAll).toHaveBeenCalledWith(filters);
  });
});
