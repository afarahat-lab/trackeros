import { Employee, CreateEmployeeDto } from '../../../../src/modules/employee/employee.model';
import { EmployeeStatus } from '../../../../src/shared/types/leave.types';

describe('Employee interface', () => {
  it('should allow a valid Employee object', () => {
    const now = new Date('2026-07-27T00:00:00.000Z');
    const employee: Employee = {
      id: 'emp-001',
      userId: 'usr-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'ENGINEER',
      managerId: 'emp-002',
      department: 'Engineering',
      designation: 'Senior Software Engineer',
      dateOfJoining: new Date('2024-01-15'),
      status: EmployeeStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    expect(employee.id).toBe('emp-001');
    expect(employee.userId).toBe('usr-001');
    expect(employee.firstName).toBe('John');
    expect(employee.lastName).toBe('Doe');
    expect(employee.email).toBe('john.doe@example.com');
    expect(employee.role).toBe('ENGINEER');
    expect(employee.managerId).toBe('emp-002');
    expect(employee.department).toBe('Engineering');
    expect(employee.designation).toBe('Senior Software Engineer');
    expect(employee.dateOfJoining).toEqual(new Date('2024-01-15'));
    expect(employee.status).toBe(EmployeeStatus.ACTIVE);
    expect(employee.createdAt).toEqual(now);
    expect(employee.updatedAt).toEqual(now);
  });

  it('should allow null managerId', () => {
    const employee: Employee = {
      id: 'emp-003',
      userId: 'usr-003',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      role: 'MANAGER',
      managerId: null,
      department: 'HR',
      designation: 'HR Manager',
      dateOfJoining: new Date('2023-06-01'),
      status: EmployeeStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(employee.managerId).toBeNull();
  });

  it('should support all EmployeeStatus values', () => {
    const statuses: EmployeeStatus[] = [
      EmployeeStatus.ACTIVE,
      EmployeeStatus.ON_LEAVE,
      EmployeeStatus.INACTIVE,
      EmployeeStatus.PROBATION,
    ];

    expect(statuses).toHaveLength(4);
    expect(statuses).toContain(EmployeeStatus.ACTIVE);
    expect(statuses).toContain(EmployeeStatus.ON_LEAVE);
    expect(statuses).toContain(EmployeeStatus.INACTIVE);
    expect(statuses).toContain(EmployeeStatus.PROBATION);
  });
});

describe('CreateEmployeeDto', () => {
  it('should allow a valid CreateEmployeeDto object', () => {
    const dto: CreateEmployeeDto = {
      userId: 'usr-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'ENGINEER',
      managerId: null,
      department: 'Engineering',
      designation: 'Software Engineer',
      dateOfJoining: new Date('2024-01-15'),
      status: EmployeeStatus.PROBATION,
    };

    expect(dto.userId).toBe('usr-001');
    expect(dto.firstName).toBe('John');
    expect(dto.lastName).toBe('Doe');
    expect(dto.email).toBe('john.doe@example.com');
    expect(dto.role).toBe('ENGINEER');
    expect(dto.managerId).toBeNull();
    expect(dto.department).toBe('Engineering');
    expect(dto.designation).toBe('Software Engineer');
    expect(dto.dateOfJoining).toEqual(new Date('2024-01-15'));
    expect(dto.status).toBe(EmployeeStatus.PROBATION);
  });
});
