import { LeavePolicyRepository } from '../../../../src/modules/leave/leave-policy.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeavePolicy, CreateLeavePolicyDto } from '../../../../src/modules/leave/leave-policy.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'lp-1',
    policyName: 'Standard Annual Policy',
    leaveTypeId: 'lt-1',
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 3,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeCreateDto(overrides: Partial<CreateLeavePolicyDto> = {}): CreateLeavePolicyDto {
  return {
    policyName: 'Standard Annual Policy',
    leaveTypeId: 'lt-1',
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 3,
    ...overrides,
  };
}

describe('LeavePolicyRepository', () => {
  let repo: LeavePolicyRepository;

  beforeEach(() => {
    repo = new LeavePolicyRepository();
    mockQuery.mockReset();
  });

  describe('findByLeaveTypeId', () => {
    it('should return policies for a given leave type', async () => {
      const policies = [makeLeavePolicy(), makeLeavePolicy({ id: 'lp-2', policyName: 'Senior Annual Policy', entitlementDays: 25 })];
      mockQuery.mockResolvedValueOnce({ rows: policies });

      const result = await repo.findByLeaveTypeId('lt-1');

      expect(result).toEqual(policies);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type_id = $1 AND deleted_at IS NULL ORDER BY policy_name',
        ['lt-1']
      );
    });

    it('should return empty array when no policies exist for the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveTypeId('lt-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a leave policy when found', async () => {
      const policy = makeLeavePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [policy] });

      const result = await repo.findById('lp-1');

      expect(result).toEqual(policy);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1 AND deleted_at IS NULL',
        ['lp-1']
      );
    });

    it('should return null when leave policy is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted leave policies ordered by name', async () => {
      const policies = [makeLeavePolicy(), makeLeavePolicy({ id: 'lp-2', policyName: 'Sick Leave Policy', leaveTypeId: 'lt-2' })];
      mockQuery.mockResolvedValueOnce({ rows: policies });

      const result = await repo.findAll();

      expect(result).toEqual(policies);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE deleted_at IS NULL ORDER BY policy_name'
      );
    });

    it('should return empty array when no leave policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new leave policy and return it', async () => {
      const dto = makeCreateDto();
      const created = makeLeavePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        [dto.policyName, dto.leaveTypeId, dto.entitlementDays, dto.accrualRate, dto.maxAccumulation, dto.minimumNoticeDays, true, true]
      );
    });

    it('should use provided requiresManagerApproval and isActive when specified', async () => {
      const dto = makeCreateDto({ requiresManagerApproval: false, isActive: false });
      const created = makeLeavePolicy({ requiresManagerApproval: false, isActive: false });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result.requiresManagerApproval).toBe(false);
      expect(result.isActive).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        expect.arrayContaining([false, false])
      );
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated leave policy', async () => {
      const updated = makeLeavePolicy({ policyName: 'Updated Policy', entitlementDays: 25 });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update('lp-1', { policyName: 'Updated Policy', entitlementDays: 25 });

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        expect.arrayContaining(['Updated Policy', 25, 'lp-1'])
      );
    });

    it('should return null when leave policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { policyName: 'New Name' });

      expect(result).toBeNull();
    });

    it('should return existing leave policy when no fields are provided', async () => {
      const existing = makeLeavePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [existing] });

      const result = await repo.update('lp-1', {});

      expect(result).toEqual(existing);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1 AND deleted_at IS NULL',
        ['lp-1']
      );
    });

    it('should handle isActive update', async () => {
      const updated = makeLeavePolicy({ isActive: false });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      await repo.update('lp-1', { isActive: false });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        expect.arrayContaining([false, 'lp-1'])
      );
    });

    it('should handle requiresManagerApproval update', async () => {
      const updated = makeLeavePolicy({ requiresManagerApproval: false });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      await repo.update('lp-1', { requiresManagerApproval: false });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        expect.arrayContaining([false, 'lp-1'])
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a leave policy and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.softDelete('lp-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_policies SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        ['lp-1']
      );
    });

    it('should return false when leave policy does not exist or is already deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
