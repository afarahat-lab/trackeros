import { LeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveType } from '../../../../src/shared/types/leave.types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('LeavePolicyRepository', () => {
  let repository: LeavePolicyRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = (pool as any).query;
    mockQuery.mockReset();
    repository = new LeavePolicyRepository(pool as any);
  });

  describe('findByLeaveType', () => {
    it('should return a policy when found', async () => {
      const mockPolicy = { id: '1', leaveType: LeaveType.ANNUAL, entitlementDays: 20 };
      mockQuery.mockResolvedValue({ rows: [mockPolicy] });

      const result = await repository.findByLeaveType(LeaveType.ANNUAL);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        [LeaveType.ANNUAL]
      );
      expect(result).toEqual(mockPolicy);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByLeaveType(LeaveType.SICK);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all policies', async () => {
      const mockPolicies = [{ id: '1', leaveType: LeaveType.ANNUAL }];
      mockQuery.mockResolvedValue({ rows: mockPolicies });

      const result = await repository.findAll();

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leave_policies');
      expect(result).toEqual(mockPolicies);
    });
  });

  describe('create', () => {
    it('should create and return a policy', async () => {
      const dto = {
        leaveType: LeaveType.ANNUAL,
        entitlementDays: 20,
        carryOverLimit: 5,
        requiresApproval: true,
      };
      const mockPolicy = { id: '1', ...dto };
      mockQuery.mockResolvedValue({ rows: [mockPolicy] });

      const result = await repository.create(dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        expect.arrayContaining([dto.leaveType, dto.entitlementDays, dto.carryOverLimit, dto.requiresApproval])
      );
      expect(result).toEqual(mockPolicy);
    });
  });

  describe('update', () => {
    it('should update and return a policy', async () => {
      const dto = { entitlementDays: 25 };
      const mockPolicy = { id: '1', entitlementDays: 25 };
      mockQuery.mockResolvedValue({ rows: [mockPolicy] });

      const result = await repository.update('1', dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies'),
        expect.arrayContaining([undefined, 25, undefined, undefined, '1'])
      );
      expect(result).toEqual(mockPolicy);
    });
  });
});
