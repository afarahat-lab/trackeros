import { EmployeeDto } from '../../../../src/modules/employee/employee.dto';

describe('Employee DTO', () => {
  it('should allow valid EmployeeDto', () => {
    const dto: EmployeeDto = {
      id: 'emp-1',
      employeeNumber: 'E001',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      managerId: 'mgr-1',
      department: 'Engineering',
      hireDate: new Date('2020-01-15'),
      employmentStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(dto.id).toBe('emp-1');
  });
});
