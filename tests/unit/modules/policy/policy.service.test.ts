import { PolicyService, ILeavePolicyRepository } from '../../../src/modules/policy/policy.service';
import { IAuditService } from '../../../src/shared/audit/audit.service';
import { AuditAction, LeaveType } from '../../../src/shared/types';

describe('PolicyService', () => {
  let service: PolicyService;
  let mockRepo: jest.Mocked<ILeavePolicyRepository>;
  let mockAudit: jest.Mocked<IAuditService>;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };
    mockRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    mockAudit = {
      logAction: jest.fn(),
      getEntityHistory: jest.fn()
    };
    service = new PolicyService(mockRepo, mockAudit, mockPool);
  });

  it('should get policy by id', async () => {
    const policy = { id: '1', isActive: true } as any;
    mockRepo.findById.mockResolvedValue(policy);
    const result = await service.getPolicy('1');
    expect(result).toEqual(policy);
  });

  it('should get active policies', async () => {
    const policies = [{ id: '1', isActive: true }, { id: '2', isActive: false }] as any;
    mockRepo.findAll.mockResolvedValue(policies);
    const result = await service.getPolicies();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should create policy with transaction and audit', async () => {
    const dto = { policyName: 'Test', leaveType: LeaveType.ANNUAL, entitlementDays: 10 };
    const newPolicy = { id: '1', ...dto } as any;
    mockRepo.create.mockResolvedValue(newPolicy);
    
    const result = await service.createPolicy(dto as any, 'user1');
    
    expect(mockPool.connect).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockRepo.create).toHaveBeenCalledWith(dto, mockClient);
    expect(mockAudit.logAction).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.CREATE,
      performedBy: 'user1'
    }), mockClient);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(result).toEqual(newPolicy);
  });

  it('should rollback transaction on create error', async () => {
    mockRepo.create.mockRejectedValue(new Error('DB Error'));
    await expect(service.createPolicy({} as any)).rejects.toThrow('DB Error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should validate entitlement correctly', async () => {
    mockRepo.findById.mockResolvedValue({ id: '1', isActive: true } as any);
    expect(await service.validateEntitlement('1', 5, 10)).toBe(true);
    expect(await service.validateEntitlement('1', 15, 10)).toBe(false);
    
    mockRepo.findById.mockResolvedValue({ id: '1', isActive: false } as any);
    expect(await service.validateEntitlement('1', 5, 10)).toBe(false);
    
    mockRepo.findById.mockResolvedValue(null);
    expect(await service.validateEntitlement('1', 5, 10)).toBe(false);
  });
});
