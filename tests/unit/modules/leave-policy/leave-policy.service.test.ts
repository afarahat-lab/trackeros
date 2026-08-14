import {
  LeavePolicyService,
  AppError,
} from '../../../../src/modules/leave-policy/leave-policy.service';
import { ILeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository.interface';
import { ILeaveTypeRepository } from '../../../../src/modules/leave-policy/leave-type.repository.interface';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/modules/leave-policy/leave-type.model';
import { LeaveTypeCode } from '../../../../src/shared/types';

function makeLeaveType(overrides: Partial<LeaveType> = {}): LeaveType {
  return {
    id: overrides.id ?? 'lt-1',
    code: overrides.code ?? LeaveTypeCode.annual,
    label: overrides.label ?? 'Annual Leave',
    description: overrides.description ?? undefined,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01T00:00:00Z'),
  };
}

function makeLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: overrides.id ?? 'lp-1',
    policyName: overrides.policyName ?? 'Standard Annual Policy',
    leaveTypeId: overrides.leaveTypeId ?? 'lt-1',
    entitlementDays: overrides.entitlementDays ?? 20,
    accrualRate: overrides.accrualRate ?? undefined,
    maxAccumulation: overrides.maxAccumulation ?? undefined,
    minimumNoticeDays: overrides.minimumNoticeDays ?? undefined,
    requiresManagerApproval: overrides.requiresManagerApproval ?? true,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01T00:00:00Z'),
  };
}

describe('LeavePolicyService', () => {
  let service: LeavePolicyService;
  let mockPolicyRepo: jest.Mocked<ILeavePolicyRepository>;
  let mockTypeRepo: jest.Mocked<ILeaveTypeRepository>;

  beforeEach(() => {
    mockPolicyRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByLeaveTypeId: jest.fn(),
      findActiveByLeaveTypeId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockTypeRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    service = new LeavePolicyService(mockPolicyRepo, mockTypeRepo);
  });

  // ── getPolicyForLeaveType ──────────────────────────────────────────

  describe('getPolicyForLeaveType', () => {
    it('should return the active policy for a valid leave type code', async () => {
      const leaveType = makeLeaveType({ id: 'lt-1', code: LeaveTypeCode.annual });
      const policy = makeLeavePolicy({ id: 'lp-1', leaveTypeId: 'lt-1' });

      mockTypeRepo.findByCode.mockResolvedValue(leaveType);
      mockPolicyRepo.findActiveByLeaveTypeId.mockResolvedValue([policy]);

      const result = await service.getPolicyForLeaveType(LeaveTypeCode.annual);

      expect(mockTypeRepo.findByCode).toHaveBeenCalledWith(LeaveTypeCode.annual);
      expect(mockPolicyRepo.findActiveByLeaveTypeId).toHaveBeenCalledWith('lt-1');
      expect(result).toBe(policy);
    });

    it('should throw NOT_FOUND when leave type does not exist', async () => {
      mockTypeRepo.findByCode.mockResolvedValue(null);

      await expect(
        service.getPolicyForLeaveType(LeaveTypeCode.annual),
      ).rejects.toThrow(AppError);

      await expect(
        service.getPolicyForLeaveType(LeaveTypeCode.annual),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: "Leave type with code 'annual' not found",
      });
    });

    it('should throw POLICY_VIOLATION when leave type is inactive', async () => {
      const leaveType = makeLeaveType({
        id: 'lt-1',
        code: LeaveTypeCode.annual,
        isActive: false,
      });

      mockTypeRepo.findByCode.mockResolvedValue(leaveType);

      await expect(
        service.getPolicyForLeaveType(LeaveTypeCode.annual),
      ).rejects.toMatchObject({
        code: 'POLICY_VIOLATION',
        message: "Leave type 'annual' is inactive",
      });
    });

    it('should throw POLICY_VIOLATION when no active policies exist for the type', async () => {
      const leaveType = makeLeaveType({ id: 'lt-1', code: LeaveTypeCode.annual });

      mockTypeRepo.findByCode.mockResolvedValue(leaveType);
      mockPolicyRepo.findActiveByLeaveTypeId.mockResolvedValue([]);

      await expect(
        service.getPolicyForLeaveType(LeaveTypeCode.annual),
      ).rejects.toMatchObject({
        code: 'POLICY_VIOLATION',
        message: "No active policy found for leave type 'annual'",
      });
    });

    it('should throw POLICY_VIOLATION when multiple active policies exist for the type', async () => {
      const leaveType = makeLeaveType({ id: 'lt-1', code: LeaveTypeCode.annual });
      const policy1 = makeLeavePolicy({ id: 'lp-1', leaveTypeId: 'lt-1' });
      const policy2 = makeLeavePolicy({ id: 'lp-2', leaveTypeId: 'lt-1' });

      mockTypeRepo.findByCode.mockResolvedValue(leaveType);
      mockPolicyRepo.findActiveByLeaveTypeId.mockResolvedValue([policy1, policy2]);

      await expect(
        service.getPolicyForLeaveType(LeaveTypeCode.annual),
      ).rejects.toMatchObject({
        code: 'POLICY_VIOLATION',
        message: "Multiple active policies found for leave type 'annual'",
      });
    });

    it('should work for emergency leave type code', async () => {
      const leaveType = makeLeaveType({
        id: 'lt-3',
        code: LeaveTypeCode.emergency,
        label: 'Emergency Leave',
      });
      const policy = makeLeavePolicy({
        id: 'lp-3',
        leaveTypeId: 'lt-3',
        entitlementDays: 5,
      });

      mockTypeRepo.findByCode.mockResolvedValue(leaveType);
      mockPolicyRepo.findActiveByLeaveTypeId.mockResolvedValue([policy]);

      const result = await service.getPolicyForLeaveType(LeaveTypeCode.emergency);

      expect(result).toBe(policy);
      expect(result.entitlementDays).toBe(5);
    });
  });

  // ── getActivePolicies ──────────────────────────────────────────────

  describe('getActivePolicies', () => {
    it('should return only active policies', async () => {
      const active1 = makeLeavePolicy({ id: 'lp-1', isActive: true });
      const active2 = makeLeavePolicy({ id: 'lp-2', isActive: true, leaveTypeId: 'lt-2' });
      const inactive = makeLeavePolicy({ id: 'lp-3', isActive: false, leaveTypeId: 'lt-3' });

      mockPolicyRepo.findAll.mockResolvedValue([active1, active2, inactive]);

      const result = await service.getActivePolicies();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lp-1');
      expect(result[1].id).toBe('lp-2');
    });

    it('should return empty array when no policies exist', async () => {
      mockPolicyRepo.findAll.mockResolvedValue([]);

      const result = await service.getActivePolicies();

      expect(result).toEqual([]);
    });

    it('should return empty array when all policies are inactive', async () => {
      const inactive1 = makeLeavePolicy({ id: 'lp-1', isActive: false });
      const inactive2 = makeLeavePolicy({ id: 'lp-2', isActive: false, leaveTypeId: 'lt-2' });

      mockPolicyRepo.findAll.mockResolvedValue([inactive1, inactive2]);

      const result = await service.getActivePolicies();

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPolicyRepo.findAll.mockRejectedValue(dbError);

      await expect(service.getActivePolicies()).rejects.toThrow('Database connection failed');
    });
  });

  // ── calculateEntitlement ───────────────────────────────────────────

  describe('calculateEntitlement', () => {
    const policy = makeLeavePolicy({ entitlementDays: 20 });

    it('should return full entitlement when hire date is before fiscal year start', () => {
      const hireDate = new Date(2024, 6, 1); // July 1, 2024
      const result = service.calculateEntitlement(policy, hireDate, 2025);
      expect(result).toBe(20);
    });

    it('should pro-rate: hire Jan 15 → 11 months remaining', () => {
      const hireDate = new Date(2025, 0, 15); // Jan 15, 2025
      const result = service.calculateEntitlement(policy, hireDate, 2025);
      // 20 * 11/12 = 18.33 → floor 18
      expect(result).toBe(18);
    });

    it('should pro-rate: hire Dec 1 → 0 months remaining', () => {
      const hireDate = new Date(2025, 11, 1); // Dec 1, 2025
      const result = service.calculateEntitlement(policy, hireDate, 2025);
      expect(result).toBe(0);
    });

    it('should pro-rate: hire Feb 1 → 10 months remaining', () => {
      const hireDate = new Date(2025, 1, 1); // Feb 1, 2025
      const result = service.calculateEntitlement(policy, hireDate, 2025);
      // 20 * 10/12 = 16.67 → floor 16
      expect(result).toBe(16);
    });

    it('should pro-rate: hire Jun 15 → 6 months remaining', () => {
      const hireDate = new Date(2025, 5, 15); // Jun 15, 2025
      const result = service.calculateEntitlement(policy, hireDate, 2025);
      // 20 * 6/12 = 10
      expect(result).toBe(10);
    });

    it('should pro-rate: hire Nov 30 → 1 month remaining', () => {
      const hireDate = new Date(2025, 10, 30); // Nov 30, 2025
      const result = service.calculateEntitlement(policy, hireDate, 2025);
      // 20 * 1/12 = 1.67 → floor 1
      expect(result).toBe(1);
    });

    it('should cap result at maxAccumulation when defined', () => {
      const cappedPolicy = makeLeavePolicy({ entitlementDays: 30, maxAccumulation: 25 });
      const hireDate = new Date(2024, 6, 1); // Before fiscal year → full 30
      const result = service.calculateEntitlement(cappedPolicy, hireDate, 2025);
      expect(result).toBe(25);
    });

    it('should not cap when maxAccumulation is undefined', () => {
      const noCapPolicy = makeLeavePolicy({ entitlementDays: 30, maxAccumulation: undefined });
      const hireDate = new Date(2024, 6, 1);
      const result = service.calculateEntitlement(noCapPolicy, hireDate, 2025);
      expect(result).toBe(30);
    });

    it('should not cap when entitlement is below maxAccumulation', () => {
      const cappedPolicy = makeLeavePolicy({ entitlementDays: 10, maxAccumulation: 25 });
      const hireDate = new Date(2024, 6, 1);
      const result = service.calculateEntitlement(cappedPolicy, hireDate, 2025);
      expect(result).toBe(10);
    });

    it('should cap pro-rated result at maxAccumulation', () => {
      const cappedPolicy = makeLeavePolicy({ entitlementDays: 60, maxAccumulation: 40 });
      const hireDate = new Date(2025, 0, 15); // Jan 15 → 11 months
      // 60 * 11/12 = 55 → capped at 40
      const result = service.calculateEntitlement(cappedPolicy, hireDate, 2025);
      expect(result).toBe(40);
    });

    it('should return a non-negative integer', () => {
      const result = service.calculateEntitlement(policy, new Date(2025, 11, 15), 2025);
      expect(result).toBe(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should return full entitlement when hire date is exactly one year before fiscal year start', () => {
      const hireDate = new Date(2024, 0, 1); // Jan 1, 2024
      const result = service.calculateEntitlement(policy, hireDate, 2025);
      expect(result).toBe(20);
    });

    it('should handle different fiscal years correctly', () => {
      // Hired in 2025, checking fiscal year 2026 → hireDate < fiscalYearStart(2026)
      const hireDate = new Date(2025, 6, 1);
      const result = service.calculateEntitlement(policy, hireDate, 2026);
      expect(result).toBe(20);
    });
  });

  // ── validatePolicy ─────────────────────────────────────────────────

  describe('validatePolicy', () => {
    it('should return true for a valid policy', () => {
      const policy = makeLeavePolicy();
      expect(service.validatePolicy(policy)).toBe(true);
    });

    it('should return true for a valid policy with all optional fields', () => {
      const policy = makeLeavePolicy({
        accrualRate: 20,
        maxAccumulation: 40,
        minimumNoticeDays: 7,
      });
      expect(service.validatePolicy(policy)).toBe(true);
    });

    it('should return false for null input', () => {
      expect(service.validatePolicy(null as unknown as LeavePolicy)).toBe(false);
    });

    it('should return false for undefined input', () => {
      expect(service.validatePolicy(undefined as unknown as LeavePolicy)).toBe(false);
    });

    it('should return false for non-object input', () => {
      expect(service.validatePolicy('not an object' as unknown as LeavePolicy)).toBe(false);
    });

    it('should return false when policyName is empty', () => {
      const policy = makeLeavePolicy({ policyName: '' });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when policyName is whitespace only', () => {
      const policy = makeLeavePolicy({ policyName: '   ' });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when leaveTypeId is empty', () => {
      const policy = makeLeavePolicy({ leaveTypeId: '' });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when entitlementDays is zero', () => {
      const policy = makeLeavePolicy({ entitlementDays: 0 });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when entitlementDays is negative', () => {
      const policy = makeLeavePolicy({ entitlementDays: -5 });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when entitlementDays is not an integer', () => {
      const policy = makeLeavePolicy({ entitlementDays: 20.5 });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when accrualRate is negative', () => {
      const policy = makeLeavePolicy({ accrualRate: -1 });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return true when accrualRate is zero', () => {
      const policy = makeLeavePolicy({ accrualRate: 0 });
      expect(service.validatePolicy(policy)).toBe(true);
    });

    it('should return false when maxAccumulation is negative', () => {
      const policy = makeLeavePolicy({ maxAccumulation: -1 });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return true when maxAccumulation is zero', () => {
      const policy = makeLeavePolicy({ maxAccumulation: 0 });
      expect(service.validatePolicy(policy)).toBe(true);
    });

    it('should return false when minimumNoticeDays is negative', () => {
      const policy = makeLeavePolicy({ minimumNoticeDays: -1 });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when minimumNoticeDays is not an integer', () => {
      const policy = makeLeavePolicy({ minimumNoticeDays: 3.5 });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when requiresManagerApproval is not a boolean', () => {
      const policy = makeLeavePolicy({ requiresManagerApproval: 'yes' as unknown as boolean });
      expect(service.validatePolicy(policy)).toBe(false);
    });

    it('should return false when isActive is not a boolean', () => {
      const policy = makeLeavePolicy({ isActive: 1 as unknown as boolean });
      expect(service.validatePolicy(policy)).toBe(false);
    });
  });
});
