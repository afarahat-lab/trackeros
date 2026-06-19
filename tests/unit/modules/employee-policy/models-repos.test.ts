import { Employee, CreateEmployeeDto } from '../../../src/modules/employee/employee.model';
import { IEmployeeRepository } from '../../../src/modules/employee/employee.repository';
import { LeavePolicy } from '../../../src/modules/policy/policy.model';
import { ILeavePolicyRepository } from '../../../src/modules/policy/policy.repository';

describe('Employee and Policy models', () => {
  it('Employee interface should be defined', () => {
    const employee: Employee = {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      managerId: null,
      department: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    expect(employee).toBeDefined();
  });

  it('CreateEmployeeDto should have required fields', () => {
    const dto: CreateEmployeeDto = {
      email: 'test@example.com',
      name: 'Test',
    };
    expect(dto.email).toBe('test@example.com');
    expect(dto.name).toBe('Test');
  });

  it('LeavePolicy interface should be defined', () => {
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

describe('Repository contracts', () => {
  it('IEmployeeRepository should define expected methods', () => {
    const mockRepo: IEmployeeRepository = {
      findById: async () => null,
      findByEmail: async () => null,
      findAll: async () => [],
      create: async () => ({} as Employee),
      update: async () => ({} as Employee),
      softDelete: async () => {},
    };
    expect(mockRepo.findById).toBeInstanceOf(Function);
    expect(mockRepo.findByEmail).toBeInstanceOf(Function);
    expect(mockRepo.findAll).toBeInstanceOf(Function);
    expect(mockRepo.create).toBeInstanceOf(Function);
    expect(mockRepo.update).toBeInstanceOf(Function);
    expect(mockRepo.softDelete).toBeInstanceOf(Function);
  });

  it('ILeavePolicyRepository should define expected methods', () => {
    const mockRepo: ILeavePolicyRepository = {
      findById: async () => null,
      findByLeaveType: async () => null,
      findAll: async () => [],
      create: async () => ({} as LeavePolicy),
      update: async () => ({} as LeavePolicy),
      archive: async () => {},
    };
    expect(mockRepo.findById).toBeInstanceOf(Function);
    expect(mockRepo.findByLeaveType).toBeInstanceOf(Function);
    expect(mockRepo.findAll).toBeInstanceOf(Function);
    expect(mockRepo.create).toBeInstanceOf(Function);
    expect(mockRepo.update).toBeInstanceOf(Function);
    expect(mockRepo.archive).toBeInstanceOf(Function);
  });
});
