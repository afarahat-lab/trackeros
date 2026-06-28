import { LeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveType } from '../../../../src/shared/types/leave.types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('LeavePolicyRepository', () => {
  let repository: LeavePolicyRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new LeavePolicyRepository(mockPool);
  });

  describe('findByLeaveType', () => {
    it('should return a policy when found', async () => {
      const mockPolicy = { id: '1', leaveType: LeaveType.ANNUAL, entitlementDays: 20 };
      mockPool.query.mockResolvedValue({ rows: [mockPolicy] } as any);

      const result = await repository.findByLeaveType(LeaveType.ANNUAL);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        [LeaveType.ANNUAL]
      );
      expect(result).toEqual(mockPolicy);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findByLeaveType(LeaveType.SICK);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all policies', async () => {
      const mockPolicies = [
        { id: '1', leaveType: LeaveType.ANNUAL },
        { id: '2', leaveType: LeaveType.SICK },
      ];
      mockPool.query.mockResolvedValue({ rows: mockPolicies } as any);

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM leave_policies');
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
      mockPool.query.mockResolvedValue({ rows: [mockPolicy] } as any);

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        [dto.leaveType, dto.entitlementDays, dto.carryOverLimit, dto.requiresApproval]
      );
      expect(result).toEqual(mockPolicy);
    });
  });

  describe('update', () => {
    it('should update and return a policy', async () => {
      const dto = { entitlementDays: 25 };
      const mockPolicy = { id: '1', entitlementDays: 25 };
      mockPool.query.mockResolvedValue({ rows: [mockPolicy] } as any);

      const result = await repository.update('1', dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies'),
        [undefined, 25, undefined, undefined, '1']
      );
      expect(result).toEqual(mockPolicy);
    });
  });
});
