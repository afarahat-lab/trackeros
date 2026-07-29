import { PgLeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types/leave-type.enum';
import crypto from 'crypto';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockedPool = pool as unknown as { query: jest.Mock };

describe('PgLeavePolicyRepository', () => {
  let repo: PgLeavePolicyRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PgLeavePolicyRepository();
  });

  const mockPolicy: LeavePolicy = {
    id: 'policy-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('findAll', () => {
    it('should return all policies ordered by created_at DESC', async () => {
      mockedPool.query.mockResolvedValue({ rows: [mockPolicy] });
      const result = await repo.findAll();
      expect(result).toEqual([mockPolicy]);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies ORDER BY created_at DESC;'
      );
    });

    it('should propagate errors', async () => {
      const error = new Error('DB error');
      mockedPool.query.mockRejectedValue(error);
      await expect(repo.findAll()).rejects.toThrow('DB error');
    });
  });

  describe('findById', () => {
    it('should return policy when found', async () => {
      mockedPool.query.mockResolvedValue({ rows: [mockPolicy] });
      const result = await repo.findById('policy-1');
      expect(result).toEqual(mockPolicy);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1;',
        ['policy-1']
      );
    });

    it('should return null when not found', async () => {
      mockedPool.query.mockResolvedValue({ rows: [] });
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should propagate errors', async () => {
      mockedPool.query.mockRejectedValue(new Error('fail'));
      await expect(repo.findById('1')).rejects.toThrow('fail');
    });
  });

  describe('findByLeaveType', () => {
    it('should return policies for given leave type', async () => {
      mockedPool.query.mockResolvedValue({ rows: [mockPolicy] });
      const result = await repo.findByLeaveType(LeaveType.ANNUAL);
      expect(result).toEqual([mockPolicy]);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1;',
        [LeaveType.ANNUAL]
      );
    });

    it('should propagate errors', async () => {
      mockedPool.query.mockRejectedValue(new Error('fail'));
      await expect(repo.findByLeaveType(LeaveType.SICK)).rejects.toThrow('fail');
    });
  });

  describe('create', () => {
    const input = {
      policyName: 'Sick Leave',
      leaveType: LeaveType.SICK,
      entitlementDays: 10,
      accrualRate: 1.5,
      maxAccumulation: 30,
      minimumNoticeDays: 1,
      requiresManagerApproval: false,
      isActive: true,
    };

    it('should insert a new policy and return it', async () => {
      const createdPolicy: LeavePolicy = {
        ...input,
        id: 'generated-uuid',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };
      mockedPool.query.mockResolvedValue({ rows: [createdPolicy] });
      jest.spyOn(crypto, 'randomUUID').mockReturnValue('generated-uuid' as any);

      const result = await repo.create(input);

      expect(result).toEqual(createdPolicy);
      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        expect.arrayContaining([
          'generated-uuid',
          input.policyName,
          input.leaveType,
          input.entitlementDays,
          input.accrualRate,
          input.maxAccumulation,
          input.minimumNoticeDays,
          input.requiresManagerApproval,
          input.isActive,
          expect.any(Date),
          expect.any(Date),
        ])
      );
    });

    it('should propagate errors', async () => {
      mockedPool.query.mockRejectedValue(new Error('insert error'));
      await expect(repo.create(input)).rejects.toThrow('insert error');
    });
  });

  describe('update', () => {
    const id = 'policy-1';
    const partial = { policyName: 'Updated Name', entitlementDays: 25 };

    it('should update provided fields and return updated policy', async () => {
      const updatedPolicy: LeavePolicy = {
        ...mockPolicy,
        ...partial,
        updatedAt: new Date('2025-02-01'),
      };
      mockedPool.query.mockResolvedValue({ rows: [updatedPolicy] });

      const result = await repo.update(id, partial);

      expect(result).toEqual(updatedPolicy);
      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        expect.arrayContaining([partial.policyName, partial.entitlementDays, id])
      );
      // ensure updated_at = NOW() is included
      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should return null if no row updated', async () => {
      mockedPool.query.mockResolvedValue({ rows: [] });
      const result = await repo.update('nonexistent', partial);
      expect(result).toBeNull();
    });

    it('should propagate errors', async () => {
      mockedPool.query.mockRejectedValue(new Error('update error'));
      await expect(repo.update(id, partial)).rejects.toThrow('update error');
    });
  });

  describe('delete', () => {
    it('should return true when a row is deleted', async () => {
      mockedPool.query.mockResolvedValue({ rowCount: 1 });
      const result = await repo.delete('policy-1');
      expect(result).toBe(true);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'DELETE FROM leave_policies WHERE id = $1;',
        ['policy-1']
      );
    });

    it('should return false when no row is deleted', async () => {
      mockedPool.query.mockResolvedValue({ rowCount: 0 });
      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should propagate errors', async () => {
      mockedPool.query.mockRejectedValue(new Error('delete error'));
      await expect(repo.delete('1')).rejects.toThrow('delete error');
    });
  });
});
