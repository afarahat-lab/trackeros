import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';

describe('Employee Model and Repository', () => {
  it('should define Employee interface with correct fields', () => {
    const employee: Employee = {
      id: '1',
      employeeNumber: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      managerId: null,
      department: 'Engineering',
      hireDate: new Date(),
      employmentStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    expect(employee).toBeDefined();
    expect(employee.employmentStatus).toBe('active');
  });

  it('should define EmployeeRepository interface with required methods', () => {
    const repository: EmployeeRepository = {
      findById: async (id: string) => null,
      findByEmployeeNumber: async (employeeNumber: string) => null,
      findByManagerId: async (managerId: string) => [],
      save: async (employee) => ({ ...employee, id: '1', createdAt: new Date(), updatedAt: new Date() }),
      update: async (id, updates) => null
    };
    
    expect(repository).toBeDefined();
    expect(repository.findById).toBeDefined();
    expect(repository.findByEmployeeNumber).toBeDefined();
    expect(repository.findByManagerId).toBeDefined();
    expect(repository.save).toBeDefined();
    expect(repository.update).toBeDefined();
  });
});
