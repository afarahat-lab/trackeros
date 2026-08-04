import { Employee, EmploymentStatus } from 'modules/employee';

describe('Employee model', () => {
  const validEmployee: Employee = {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'emp-002',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2020-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    deletedAt: null,
  };

  it('should create a valid Employee with all required fields', () => {
    expect(validEmployee.id).toBe('emp-001');
    expect(validEmployee.employeeNumber).toBe('E001');
    expect(validEmployee.firstName).toBe('John');
    expect(validEmployee.lastName).toBe('Doe');
    expect(validEmployee.email).toBe('john.doe@example.com');
    expect(validEmployee.managerId).toBe('emp-002');
    expect(validEmployee.department).toBe('Engineering');
    expect(validEmployee.hireDate).toBeInstanceOf(Date);
    expect(validEmployee.terminationDate).toBeNull();
    expect(validEmployee.employmentStatus).toBe('ACTIVE');
    expect(validEmployee.createdAt).toBeInstanceOf(Date);
    expect(validEmployee.updatedAt).toBeInstanceOf(Date);
    expect(validEmployee.deletedAt).toBeNull();
  });

  it('should allow managerId to be null', () => {
    const employee: Employee = { ...validEmployee, managerId: null };
    expect(employee.managerId).toBeNull();
  });

  it('should allow department to be null', () => {
    const employee: Employee = { ...validEmployee, department: null };
    expect(employee.department).toBeNull();
  });

  it('should allow terminationDate to be null', () => {
    const employee: Employee = { ...validEmployee, terminationDate: null };
    expect(employee.terminationDate).toBeNull();
  });

  it('should allow deletedAt to be null', () => {
    const employee: Employee = { ...validEmployee, deletedAt: null };
    expect(employee.deletedAt).toBeNull();
  });

  it('should accept all valid EmploymentStatus values', () => {
    const statuses: EmploymentStatus[] = ['ACTIVE', 'INACTIVE', 'TERMINATED'];
    for (const status of statuses) {
      const employee: Employee = { ...validEmployee, employmentStatus: status };
      expect(employee.employmentStatus).toBe(status);
    }
  });

  it('should have exactly the fields specified in the canonical shape', () => {
    const expectedFields = [
      'id',
      'employeeNumber',
      'firstName',
      'lastName',
      'email',
      'managerId',
      'department',
      'hireDate',
      'terminationDate',
      'employmentStatus',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
    const actualFields = Object.keys(validEmployee);
    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });
});
