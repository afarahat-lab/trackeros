import { Employee, CreateEmployeeDto } from '../../../../src/modules/employee/employee.model';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';

describe('Employee model', () => {
  it('should have required fields', () => {
    const emp: Employee = {
      id: '1',
      email: 'test@test.com',
      name: 'Test',
      managerId: null,
      department: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    expect(emp).toBeDefined();
  });

  it('should allow CreateEmployeeDto with optional fields', () => {
    const dto: CreateEmployeeDto = { email: 'a@b.com', name: 'A' };
    expect(dto).toBeDefined();
  });
});

describe('LeavePolicy model', () => {
  it('should have required fields', () => {
    const policy: LeavePolicy = {
      id: '1',
      leaveType: 'annual',
      annualEntitlement: 20,
      maxConsecutiveDays: 10,
      requiresApproval: true,
      requiresDocumentation: false,
      documentationThresholdDays: 0,
      carryOverAllowed: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(policy).toBeDefined();
  });
});

describe('IEmployeeRepository contract', () => {
  it('should define all required methods', () => {
    const repo: IEmployeeRepository = {
      findById: async () => null,
      findByEmail: async () => null,
      findAll: async () => [],
      create: async () => ({} as Employee),
      update: async () => ({} as Employee),
      softDelete: async () => {},
    };
    expect(repo).toBeDefined();
  });
});

describe('ILeavePolicyRepository contract', () => {
  it('should define all required methods', () => {
    const repo: ILeavePolicyRepository = {
      findById: async () => null,
      findByLeaveType: async () => null,
      findAll: async () => [],
      create: async () => ({} as LeavePolicy),
      update: async () => ({} as LeavePolicy),
      archive: async () => {},
    };
    expect(repo).toBeDefined();
  });
});
