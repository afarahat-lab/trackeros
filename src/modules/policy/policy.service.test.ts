import { PolicyService } from './policy.service';

describe('PolicyService', () => {
  let service: PolicyService;
  let policyRepo: any;
  let employeeRepo: any;

  beforeEach(() => {
    policyRepo = {
      findById: jest.fn(),
      findByPolicyName: jest.fn(),
      findByQuery: jest.fn(),
      findAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    employeeRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      findManagers: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new PolicyService(policyRepo, employeeRepo);
  });

  it('should get policy by id', async () => {
    const mockPolicy = { id: '1', policyName: 'Annual', leaveType: 'annual', entitlementDays: 10, requiresManagerApproval: true, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    policyRepo.findById.mockResolvedValue(mockPolicy);
    const result = await service.getPolicy('1');
    expect(result).toEqual(mockPolicy);
  });

  it('should throw if policyId is missing', async () => {
    await expect(service.getPolicy('')).rejects.toThrow('Policy ID is required');
  });

  it('should get active policies', async () => {
    const policies = [{ id: '1', policyName: 'Annual', leaveType: 'annual', entitlementDays: 10, requiresManagerApproval: true, isActive: true, createdAt: new Date(), updatedAt: new Date() }];
    policyRepo.findAllActive.mockResolvedValue(policies);
    const result = await service.getActivePolicies();
    expect(result).toEqual(policies);
  });

  it('should get policy by leave type', async () => {
    const policy = { id: '1', policyName: 'Annual', leaveType: 'annual', entitlementDays: 10, requiresManagerApproval: true, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    policyRepo.findByQuery.mockResolvedValue([policy]);
    const result = await service.getPolicyByLeaveType('annual');
    expect(result).toEqual(policy);
  });

  it('should validate request successfully', async () => {
    const policy = { id: '1', policyName: 'Annual', leaveType: 'annual', entitlementDays: 10, requiresManagerApproval: true, isActive: true, minimumNoticeDays: 1, createdAt: new Date(), updatedAt: new Date() };
    policyRepo.findById.mockResolvedValue(policy);
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const result = await service.validateRequest('1', 'e1', futureDate);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return errors if policy is inactive', async () => {
    const policy = { id: '1', policyName: 'Annual', leaveType: 'annual', entitlementDays: 10, requiresManagerApproval: true, isActive: false, createdAt: new Date(), updatedAt: new Date() };
    policyRepo.findById.mockResolvedValue(policy);
    const result = await service.validateRequest('1', 'e1', new Date());
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Policy is not active');
  });

  it('should check eligibility successfully', async () => {
    const policy = { id: '1', policyName: 'Annual', leaveType: 'annual', entitlementDays: 10, requiresManagerApproval: true, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    const employee = { id: 'e1', employeeNumber: 'E001', firstName: 'John', lastName: 'Doe', email: 'john@example.com', managerId: null, department: 'IT', hireDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), terminationDate: null, employmentStatus: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
    policyRepo.findById.mockResolvedValue(policy);
    employeeRepo.findById.mockResolvedValue(employee);
    const result = await service.checkEligibility('1', 'e1');
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('should return reasons if employee is inactive', async () => {
    const policy = { id: '1', policyName: 'Annual', leaveType: 'annual', entitlementDays: 10, requiresManagerApproval: true, isActive: true, createdAt: new Date(), updatedAt: new Date() };
    const employee = { id: 'e1', employeeNumber: 'E001', firstName: 'John', lastName: 'Doe', email: 'john@example.com', managerId: null, department: 'IT', hireDate: new Date(), terminationDate: null, employmentStatus: 'INACTIVE', createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
    policyRepo.findById.mockResolvedValue(policy);
    employeeRepo.findById.mockResolvedValue(employee);
    const result = await service.checkEligibility('1', 'e1');
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('Employee is not active');
  });
});
