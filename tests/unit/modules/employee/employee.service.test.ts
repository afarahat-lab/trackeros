import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockRepository: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findSubordinates: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    service = new EmployeeService(mockRepository);
  });

  it('getEmployee should call repository.findById', async () => {
    const mockEmployee = { id: '1', employmentStatus: 'ACTIVE' } as Employee;
    mockRepository.findById.mockResolvedValue(mockEmployee);
    const result = await service.getEmployee('1');
    expect(mockRepository.findById).toHaveBeenCalledWith('1');
    expect(result).toEqual(mockEmployee);
  });

  it('getEmployeeByNumber should call repository.findByEmployeeNumber', async () => {
    const mockEmployee = { id: '1', employeeNumber: 'E123' } as Employee;
    mockRepository.findByEmployeeNumber.mockResolvedValue(mockEmployee);
    const result = await service.getEmployeeByNumber('E123');
    expect(mockRepository.findByEmployeeNumber).toHaveBeenCalledWith('E123');
    expect(result).toEqual(mockEmployee);
  });

  it('getSubordinates should call repository.findSubordinates', async () => {
    const mockSubordinates = [{ id: '2' }] as Employee[];
    mockRepository.findSubordinates.mockResolvedValue(mockSubordinates);
    const result = await service.getSubordinates('1');
    expect(mockRepository.findSubordinates).toHaveBeenCalledWith('1');
    expect(result).toEqual(mockSubordinates);
  });

  it('isActive should return true if employee status is ACTIVE', async () => {
    mockRepository.findById.mockResolvedValue({ id: '1', employmentStatus: 'ACTIVE' } as Employee);
    const result = await service.isActive('1');
    expect(result).toBe(true);
  });

  it('isActive should return false if employee status is not ACTIVE', async () => {
    mockRepository.findById.mockResolvedValue({ id: '1', employmentStatus: 'INACTIVE' } as Employee);
    const result = await service.isActive('1');
    expect(result).toBe(false);
  });

  it('isActive should return false if employee not found', async () => {
    mockRepository.findById.mockResolvedValue(null);
    const result = await service.isActive('1');
    expect(result).toBe(false);
  });

  it('listEmployees should call repository.findAll', async () => {
    const mockEmployees = [{ id: '1' }] as Employee[];
    mockRepository.findAll.mockResolvedValue(mockEmployees);
    const result = await service.listEmployees({ department: 'IT' });
    expect(mockRepository.findAll).toHaveBeenCalledWith({ department: 'IT' });
    expect(result).toEqual(mockEmployees);
  });
});
