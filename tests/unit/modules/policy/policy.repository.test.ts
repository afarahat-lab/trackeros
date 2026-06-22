import { LeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { CreateLeavePolicyDto } from '../../../../src/modules/policy/policy.model';

describe('LeavePolicyRepository', () => {
  let repository: LeavePolicyRepository;
  let mockPool: any;

  const mockPolicyRow = {
    id: 'policy-1',
    leave_type_id: 'type-1',
    max_days_per_year: 20,
    max_consecutive_days: 5,
    requires_approval: true,
    allow_negative_balance: false,
    blackout_dates: [],
    status: 'active',
  };

  const expectedPolicy = {
    id: 'policy-1',
    leaveTypeId: 'type-1',
    maxDaysPerYear: 20,
    maxConsecutiveDays: 5,
    requiresApproval: true,
    allowNegativeBalance: false,
    blackoutDates: [],
    status: 'active',
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    repository = new LeavePolicyRepository(mockPool);
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockPolicyRow] });

      const result = await repository.findById('policy-1');

      expect(result).toEqual(expectedPolicy);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_type_policies WHERE id = $1',
        ['policy-1']
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveTypeId', () => {
    it('should return a policy when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockPolicyRow] });

      const result = await repository.findByLeaveTypeId('type-1');

      expect(result).toEqual(expectedPolicy);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_type_policies WHERE leave_type_id = $1',
        ['type-1']
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByLeaveTypeId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a policy with defaults', async () => {
      const dto: CreateLeavePolicyDto = {
        leaveTypeId: 'type-1',
        maxDaysPerYear: 20,
        maxConsecutiveDays: 5,
      };

      mockPool.query.mockResolvedValue({ rows: [mockPolicyRow] });

      const result = await repository.create(dto);

      expect(result).toEqual(expectedPolicy);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_type_policies'),
        ['type-1', 20, 5, true, false, [], 'active']
      );
    });

    it('should create a policy with all fields specified', async () => {
      const dto: CreateLeavePolicyDto = {
        leaveTypeId: 'type-1',
        maxDaysPerYear: 30,
        maxConsecutiveDays: 10,
        requiresApproval: false,
        allowNegativeBalance: true,
        blackoutDates: [new Date('2024-12-25')],
        status: 'active',
      };

      const row = { ...mockPolicyRow, max_days_per_year: 30, max_consecutive_days: 10, requires_approval: false, allow_negative_balance: true };
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await repository.create(dto);

      expect(result.maxDaysPerYear).toBe(30);
      expect(result.requiresApproval).toBe(false);
      expect(result.allowNegativeBalance).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a policy', async () => {
      const updatedRow = { ...mockPolicyRow, max_days_per_year: 25 };
      mockPool.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('policy-1', { maxDaysPerYear: 25 });

      expect(result.maxDaysPerYear).toBe(25);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_type_policies SET'),
        expect.arrayContaining([25, 'policy-1'])
      );
    });

    it('should throw when policy not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(repository.update('non-existent', { maxDaysPerYear: 25 })).rejects.toThrow(
        'LeavePolicy with id non-existent not found'
      );
    });

    it('should return existing policy when no fields to update', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockPolicyRow] });

      const result = await repository.update('policy-1', {});

      expect(result).toEqual(expectedPolicy);
    });
  });

  describe('archive', () => {
    it('should archive a policy', async () => {
      const archivedRow = { ...mockPolicyRow, status: 'archived' };
      mockPool.query.mockResolvedValue({ rows: [archivedRow] });

      const result = await repository.archive('policy-1');

      expect(result.status).toBe('archived');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'archived'"),
        ['policy-1']
      );
    });

    it('should throw when policy not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(repository.archive('non-existent')).rejects.toThrow(
        'LeavePolicy with id non-existent not found'
      );
    });
  });
});
