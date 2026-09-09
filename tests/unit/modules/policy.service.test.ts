import {
  LeavePolicy,
  CreateLeavePolicyInput,
  IPolicyRepository,
  PolicyService,
  LeavePolicyStatus,
} from '../../../src/modules/policy';
import { ILeaveTypeService, LeaveType } from '../../../src/modules/leave-type';
import { ValidationError, NotFoundError } from '../../../src/shared/errors';
import { LeaveTypeCode } from '../../../src/shared/types';

class FakePolicyRepository implements IPolicyRepository {
  private rows: LeavePolicy[] = [];

  async create(input: CreateLeavePolicyInput): Promise<LeavePolicy> {
    const policy: LeavePolicy = { id: 'policy-id', ...input };
    this.rows.push(policy);
    return policy;
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    return this.rows.find((p) => p.id === id) ?? null;
  }

  async findAll(): Promise<LeavePolicy[]> {
    return [...this.rows];
  }
}

class FakeLeaveTypeService implements ILeaveTypeService {
  constructor(private rows: LeaveType[] = []) {}

  async createLeaveType(): Promise<LeaveType> {
    throw new Error('Not implemented');
  }

  async getLeaveTypeByCode(code: LeaveTypeCode): Promise<LeaveType> {
    const leaveType = this.rows.find((lt) => lt.code === code);
    if (!leaveType) {
      throw new NotFoundError('Leave type not found');
    }
    return leaveType;
  }
}

function makeLeaveType(code: LeaveTypeCode = LeaveTypeCode.ANNUAL): LeaveType {
  return {
    code,
    name: 'Annual Leave',
    requiresApproval: true,
    maxConsecutiveDays: 30,
    isPaid: true,
  };
}

function makeInput(overrides: Partial<CreateLeavePolicyInput> = {}): CreateLeavePolicyInput {
  return {
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    policyName: 'Annual Leave Policy',
    annualEntitlementDays: 20,
    accrualPeriodMonths: 12,
    carryForwardDays: 5,
    minNoticeDays: 2,
    maxRequestDays: 15,
    requiresManagerApproval: true,
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: new Date('2025-01-01'),
    status: LeavePolicyStatus.ACTIVE,
    ...overrides,
  };
}

describe('PolicyService', () => {
  let repository: FakePolicyRepository;
  let leaveTypeService: FakeLeaveTypeService;
  let service: PolicyService;

  beforeEach(() => {
    repository = new FakePolicyRepository();
    leaveTypeService = new FakeLeaveTypeService([makeLeaveType(LeaveTypeCode.ANNUAL)]);
    service = new PolicyService(repository, leaveTypeService);
  });

  describe('createLeavePolicy', () => {
    it('returns the created policy with id and matching fields', async () => {
      const input = makeInput();
      const policy = await service.createLeavePolicy(input);

      expect(policy.id).toBe('policy-id');
      expect(policy).toEqual({ id: 'policy-id', ...input });
    });

    it('rejects empty policyName with ValidationError', async () => {
      const input = makeInput({ policyName: ' ' });
      await expect(service.createLeavePolicy(input)).rejects.toThrow(ValidationError);
    });

    it('rejects unknown leaveTypeCode with NotFoundError', async () => {
      const input = makeInput({ leaveTypeCode: LeaveTypeCode.SICK });
      await expect(service.createLeavePolicy(input)).rejects.toThrow(NotFoundError);
    });

    it('rejects effectiveFrom after effectiveTo with ValidationError', async () => {
      const input = makeInput({
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: new Date('2024-01-01'),
      });
      await expect(service.createLeavePolicy(input)).rejects.toThrow(ValidationError);
    });
  });

  describe('getLeavePolicyById', () => {
    it('returns the policy when found', async () => {
      const input = makeInput();
      const created = await service.createLeavePolicy(input);
      const found = await service.getLeavePolicyById(created.id);

      expect(found).toEqual(created);
    });

    it('throws NotFoundError when unknown id', async () => {
      await expect(service.getLeavePolicyById('unknown-id')).rejects.toThrow(NotFoundError);
    });
  });
});
