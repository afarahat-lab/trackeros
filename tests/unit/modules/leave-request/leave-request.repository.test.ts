import { LeaveStatus, LeaveRequestQueryParams } from '../../../../src/shared/types';
import {
  LeaveRequestRepository,
  ILeaveRequestRepository,
  LeaveRequest,
} from '../../../../src/modules/leave-request';

describe('LeaveRequestRepository (stub)', () => {
  let repository: ILeaveRequestRepository;

  const validCreateInput: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-14'),
    reason: 'Family vacation',
    status: LeaveStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    cancelledAt: null,
  };

  beforeEach(() => {
    repository = new LeaveRequestRepository();
  });

  describe('findById', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findById('lr-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByEmployeeId', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByEmployeeId('emp-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByStatus', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByStatus(LeaveStatus.DRAFT)).rejects.toThrow('not implemented');
    });
  });

  describe('query', () => {
    it('should throw "not implemented" with empty params', async () => {
      const params: LeaveRequestQueryParams = {
        employeeId: undefined,
        status: undefined,
        leavePolicyId: undefined,
        startDateFrom: undefined,
        startDateTo: undefined,
      };
      await expect(repository.query(params)).rejects.toThrow('not implemented');
    });

    it('should throw "not implemented" with partial params', async () => {
      const params: LeaveRequestQueryParams = {
        employeeId: 'emp-001',
        status: LeaveStatus.APPROVED,
        leavePolicyId: undefined,
        startDateFrom: undefined,
        startDateTo: undefined,
      };
      await expect(repository.query(params)).rejects.toThrow('not implemented');
    });

    it('should throw "not implemented" with all params populated', async () => {
      const params: LeaveRequestQueryParams = {
        employeeId: 'emp-001',
        status: LeaveStatus.APPROVED,
        leavePolicyId: 'lp-001',
        startDateFrom: new Date('2026-01-01'),
        startDateTo: new Date('2026-12-31'),
      };
      await expect(repository.query(params)).rejects.toThrow('not implemented');
    });
  });

  describe('create', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.create(validCreateInput)).rejects.toThrow('not implemented');
    });

    it('should accept input without id, createdAt, and updatedAt', async () => {
      const input: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-002',
        leavePolicyId: 'lp-002',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        reason: undefined,
        status: LeaveStatus.SUBMITTED,
        approvedBy: null,
        approvedAt: null,
        cancelledAt: null,
      };

      await expect(repository.create(input)).rejects.toThrow('not implemented');
    });
  });

  describe('update', () => {
    it('should throw "not implemented"', async () => {
      await expect(
        repository.update('lr-001', { reason: 'Updated reason' }),
      ).rejects.toThrow('not implemented');
    });

    it('should accept a partial LeaveRequest update', async () => {
      const partialUpdate: Partial<LeaveRequest> = {
        status: LeaveStatus.APPROVED,
        approvedBy: 'emp-mgr-001',
        approvedAt: new Date('2026-08-10T10:00:00Z'),
      };

      await expect(repository.update('lr-001', partialUpdate)).rejects.toThrow('not implemented');
    });

    it('should accept an empty partial update', async () => {
      await expect(repository.update('lr-001', {})).rejects.toThrow('not implemented');
    });
  });

  describe('interface contract', () => {
    it('should have all required methods', () => {
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByEmployeeId).toBe('function');
      expect(typeof repository.findByStatus).toBe('function');
      expect(typeof repository.query).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.update).toBe('function');
    });
  });
});
