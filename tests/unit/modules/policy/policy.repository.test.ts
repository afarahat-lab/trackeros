import { Pool } from 'pg';
import { LeavePolicyRepository, ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { CreateLeavePolicyDto, LeavePolicy, UpdateLeavePolicyDto } from '../../../../src/modules/policy/policy.model';

// Mock the pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('LeavePolicyRepository', () => {
  let repository: ILeavePolicyRepository;
  let mockPool: any;

  const samplePolicy: LeavePolicy = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    policyName: 'Annual Leave',
    leaveType: 'ANNUAL',
    entitlementDays: 20,
    accrualRate: null,
    maxCarryover: 5,
    requiresApproval: true,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockPool = new Pool();
    repository = new LeavePolicyRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a new policy and return it', async () => {
      const dto: CreateLeavePolicyDto = {
        policyName: 'Annual Leave',
        leaveType: 'ANNUAL',
        entitlementDays: 20,
        accrualRate: undefined,
        maxCarryover: 5,
        requiresApproval: true,
        isActive: true,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [samplePolicy] });

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const [query, values] = mockPool.query.mock.calls[0];
      expect(query).toContain('INSERT INTO leave_policies');
      expect(values).toEqual([
        'Annual Leave',
        'ANNUAL',
        20,
        null,
        5,
        true,
        true,
      ]);
      expect(result).toEqual(samplePolicy);
    });

    it('should use default values for optional fields when not provided', async () => {
      const dto: CreateLeavePolicyDto = {
        policyName: 'Sick Leave',
        leaveType: 'SICK',
        entitlementDays: 10,
      };

      const createdPolicy: LeavePolicy = {
        ...samplePolicy,
        policyName: 'Sick Leave',
        leaveType: 'SICK',
        entitlementDays: 10,
        accrualRate: null,
        maxCarryover: null,
        requiresApproval: true,
        isActive: true,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [createdPolicy] });

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const [, values] = mockPool.query.mock.calls[0];
      expect(values).toEqual([
        'Sick Leave',
        'SICK',
        10,
        null,
        null,
        true,
        true,
      ]);
      expect(result).toEqual(createdPolicy);
    });
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [samplePolicy] });

      const result = await repository.findById(samplePolicy.id);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_policies WHERE id = $1'),
        [samplePolicy.id]
      );
      expect(result).toEqual(samplePolicy);
    });

    it('should return null when policy not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all policies ordered by policy_name', async () => {
      const policies = [samplePolicy];
      mockPool.query.mockResolvedValueOnce({ rows: policies });

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_policies ORDER BY policy_name')
      );
      expect(result).toEqual(policies);
    });

    it('should return an empty array when no policies exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByLeaveType', () => {
    it('should return policies matching the given leave type', async () => {
      const policies = [samplePolicy];
      mockPool.query.mockResolvedValueOnce({ rows: policies });

      const result = await repository.findByLeaveType('ANNUAL');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_policies WHERE leave_type = $1 ORDER BY policy_name'),
        ['ANNUAL']
      );
      expect(result).toEqual(policies);
    });

    it('should return an empty array when no policies match', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByLeaveType('EMERGENCY');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update provided fields and return the updated policy', async () => {
      const updateDto: UpdateLeavePolicyDto = {
        policyName: 'Updated Annual Leave',
        entitlementDays: 25,
      };

      const updatedPolicy: LeavePolicy = {
        ...samplePolicy,
        policyName: 'Updated Annual Leave',
        entitlementDays: 25,
        updatedAt: new Date('2025-06-01T00:00:00.000Z'),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [updatedPolicy] });

      const result = await repository.update(samplePolicy.id, updateDto);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const [query, values] = mockPool.query.mock.calls[0];
      expect(query).toContain('UPDATE leave_policies');
      expect(query).toContain('policy_name = $1');
      expect(query).toContain('entitlement_days = $2');
      expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
      // The id should be the last parameter
      expect(values[values.length - 1]).toBe(samplePolicy.id);
      expect(result).toEqual(updatedPolicy);
    });

    it('should throw an error when no fields are provided', async () => {
      await expect(repository.update(samplePolicy.id, {}))
        .rejects.toThrow('No fields to update');
    });

    it('should throw an error when the policy does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(repository.update('nonexistent', { policyName: 'New' }))
        .rejects.toThrow('Leave policy with id nonexistent not found');
    });
  });

  describe('delete', () => {
    it('should delete the policy when it exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await repository.delete(samplePolicy.id);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM leave_policies WHERE id = $1'),
        [samplePolicy.id]
      );
    });

    it('should throw an error when the policy does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      await expect(repository.delete('nonexistent'))
        .rejects.toThrow('Leave policy with id nonexistent not found');
    });
  });

  describe('findActivePolicies', () => {
    it('should return only active policies', async () => {
      const activePolicies = [samplePolicy];
      mockPool.query.mockResolvedValueOnce({ rows: activePolicies });

      const result = await repository.findActivePolicies();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_policies WHERE is_active = true ORDER BY policy_name')
      );
      expect(result).toEqual(activePolicies);
    });

    it('should return an empty array when no active policies exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findActivePolicies();

      expect(result).toEqual([]);
    });
  });
});
