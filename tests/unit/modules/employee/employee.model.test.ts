import { EmploymentStatus } from '../../../../src/shared/types';
import { Employee } from '../../../../src/modules/employee';

describe('Employee interface', () => {
  const validEmployee: Employee = {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2026-08-16T00:00:00Z'),
  };

  it('should accept a valid Employee shape with all fields', () => {
    expect(validEmployee.id).toBe('emp-001');
    expect(validEmployee.employeeNumber).toBe('E001');
    expect(validEmployee.firstName).toBe('John');
    expect(validEmployee.lastName).toBe('Doe');
    expect(validEmployee.email).toBe('john.doe@example.com');
    expect(validEmployee.managerId).toBeNull();
    expect(validEmployee.department).toBe('Engineering');
    expect(validEmployee.hireDate).toBeInstanceOf(Date);
    expect(validEmployee.terminationDate).toBeNull();
    expect(validEmployee.employmentStatus).toBe(EmploymentStatus.ACTIVE);
    expect(validEmployee.createdAt).toBeInstanceOf(Date);
    expect(validEmployee.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow managerId to be null for top-level employees', () => {
    const topLevel: Employee = {
      ...validEmployee,
      id: 'emp-002',
      employeeNumber: 'E002',
      email: 'ceo@example.com',
      managerId: null,
    };
    expect(topLevel.managerId).toBeNull();
  });

  it('should allow managerId to be a string for employees with a manager', () => {
    const withManager: Employee = {
      ...validEmployee,
      id: 'emp-003',
      employeeNumber: 'E003',
      email: 'dev@example.com',
      managerId: 'emp-001',
    };
    expect(withManager.managerId).toBe('emp-001');
  });

  it('should allow terminationDate to be null for active employees', () => {
    const active: Employee = {
      ...validEmployee,
      employmentStatus: EmploymentStatus.ACTIVE,
      terminationDate: null,
    };
    expect(active.terminationDate).toBeNull();
    expect(active.employmentStatus).toBe(EmploymentStatus.ACTIVE);
  });

  it('should allow terminationDate to be set for terminated employees', () => {
    const terminated: Employee = {
      ...validEmployee,
      id: 'emp-004',
      employeeNumber: 'E004',
      email: 'former@example.com',
      employmentStatus: EmploymentStatus.TERMINATED,
      terminationDate: new Date('2025-12-31'),
    };
    expect(terminated.terminationDate).toBeInstanceOf(Date);
    expect(terminated.employmentStatus).toBe(EmploymentStatus.TERMINATED);
  });

  it('should support all EmploymentStatus enum values', () => {
    const statuses: EmploymentStatus[] = [
      EmploymentStatus.ACTIVE,
      EmploymentStatus.INACTIVE,
      EmploymentStatus.TERMINATED,
    ];

    statuses.forEach((status) => {
      const employee: Employee = {
        ...validEmployee,
        id: `emp-status-${status}`,
        employeeNumber: `E-${status}`,
        email: `${status.toLowerCase()}@example.com`,
        employmentStatus: status,
        terminationDate: status === EmploymentStatus.TERMINATED ? new Date('2025-12-31') : null,
      };
      expect(employee.employmentStatus).toBe(status);
    });
  });

  it('should have exactly the expected field names', () => {
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
    ];

    const actualFields = Object.keys(validEmployee).sort();
    expect(actualFields.sort()).toEqual(expectedFields.sort());
    expect(actualFields).toHaveLength(12);
  });
});
