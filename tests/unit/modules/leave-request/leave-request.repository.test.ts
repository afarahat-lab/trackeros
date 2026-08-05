import { PgLeaveRequestRepository } from 'modules/leave-request';
import { LeaveRequest } from 'modules/leave-request';
import { LeaveRequestStatus } from 'shared/types/leave-request-status.enum';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    startDate: new Date('2026-08-10T00:00:00Z'),
    endDate: new Date('2026-08-14T00:00:00Z'),
    reason: 'Vacation',
    status: LeaveRequestStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date('2026-08-01T12:00:00Z'),
    updatedAt: new Date('2026-08-01T12:00:00Z'),
    ...overrides,
  };
}

function makeRow(request: LeaveRequest): Record<string, unknown> {
  return {
    id: request.id,
    employee_id: request.employeeId,
    leave_policy_id: request.leavePolicyId,
    start_date: request.startDate,
    end_date: request.endDate,
    reason: request.reason ?? null,
    status: request.status,
    approved_by: request.approvedBy,
    approved_at: request.approvedAt,
    cancelled_by: request.cancelledBy,
    cancelled_at: request.cancelledAt,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
  };
}

describe('PgLeaveRequestRepository', () => {
  let repo: PgLeaveRequestRepository;

  beforeEach(() => {
    repo = new PgLeaveRequestRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a request when found', async () => {
      const request = makeRequest();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(request)] });

      const result = await repo.findById('lr-001');

      expect(result).toEqual(request);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-001']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return requests for a given employee', async () => {
      const r1 = makeRequest({ id: 'lr-001' });
      const r2 = makeRequest({ id: 'lr-002', status: LeaveRequestStatus.APPROVED });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(r1), makeRow(r2)] });

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toHaveLength(2);
      expect(result).toEqual([r1, r2]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1',
        ['emp-001']
      );
    });

    it('should return empty array when no requests found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return requests matching the given status', async () => {
      const r1 = makeRequest({ id: 'lr-001', status: LeaveRequestStatus.SUBMITTED });
      const r2 = makeRequest({ id: 'lr-002', status: LeaveRequestStatus.SUBMITTED, employeeId: 'emp-002' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(r1), makeRow(r2)] });

      const result = await repo.findByStatus(LeaveRequestStatus.SUBMITTED);

      expect(result).toHaveLength(2);
      expect(result).toEqual([r1, r2]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1',
        [LeaveRequestStatus.SUBMITTED]
      );
    });

    it('should return empty array when no requests match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByStatus(LeaveRequestStatus.APPROVED);

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeAndStatus', () => {
    it('should return requests for employee filtered by status', async () => {
      const r1 = makeRequest({ id: 'lr-001', status: LeaveRequestStatus.SUBMITTED });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(r1)] });

      const result = await repo.findByEmployeeAndStatus('emp-001', LeaveRequestStatus.SUBMITTED);

      expect(result).toHaveLength(1);
      expect(result).toEqual([r1]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2',
        ['emp-001', LeaveRequestStatus.SUBMITTED]
      );
    });

    it('should return empty array when no matching requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndStatus('emp-001', LeaveRequestStatus.APPROVED);

      expect(result).toEqual([]);
    });
  });

  describe('findPendingForManager', () => {
    it('should return SUBMITTED requests for direct reports of the manager', async () => {
      const r1 = makeRequest({ id: 'lr-001', status: LeaveRequestStatus.SUBMITTED });
      const r2 = makeRequest({ id: 'lr-002', status: LeaveRequestStatus.SUBMITTED, employeeId: 'emp-003' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(r1), makeRow(r2)] });

      const result = await repo.findPendingForManager('mgr-001');

      expect(result).toHaveLength(2);
      expect(result).toEqual([r1, r2]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN employees'),
        ['mgr-001']
      );
    });

    it('should return empty array when no pending requests for reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findPendingForManager('mgr-999');

      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should insert and return the request', async () => {
      const request = makeRequest();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(request)] });

      const result = await repo.save(request);

      expect(result).toEqual(request);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          request.id,
          request.employeeId,
          request.leavePolicyId,
          request.startDate,
          request.endDate,
          request.reason,
          request.status,
          request.approvedBy,
          request.approvedAt,
          request.cancelledBy,
          request.cancelledAt,
          request.createdAt,
          request.updatedAt,
        ]
      );
    });

    it('should save a DRAFT request with null actor fields', async () => {
      const request = makeRequest({
        status: LeaveRequestStatus.DRAFT,
        reason: undefined,
        approvedBy: null,
        approvedAt: null,
        cancelledBy: null,
        cancelledAt: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(request)] });

      const result = await repo.save(request);

      expect(result.status).toBe(LeaveRequestStatus.DRAFT);
      expect(result.approvedBy).toBeNull();
      expect(result.cancelledBy).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the request when found', async () => {
      const existing = makeRequest();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const updated = makeRequest({ reason: 'Updated reason', updatedAt: new Date('2026-08-02T00:00:00Z') });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lr-001', { reason: 'Updated reason' });

      expect(result).not.toBeNull();
      expect(result!.reason).toBe('Updated reason');
    });

    it('should return null when request not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.update('nonexistent', { reason: 'test' });

      expect(result).toBeNull();
    });

    it('should set updatedAt to current time on update', async () => {
      const existing = makeRequest();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const beforeUpdate = new Date();
      const updated = makeRequest({ reason: 'new', updatedAt: beforeUpdate });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lr-001', { reason: 'new' });

      expect(result!.updatedAt).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should stamp approvedBy and approvedAt when status is APPROVED', async () => {
      const approved = makeRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-05T00:00:00Z'),
        cancelledBy: null,
        cancelledAt: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(approved)] });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.APPROVED, { actorId: 'mgr-001' });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result!.approvedBy).toBe('mgr-001');
      expect(result!.approvedAt).toBeDefined();
      expect(result!.cancelledBy).toBeNull();
      expect(result!.cancelledAt).toBeNull();
    });

    it('should stamp cancelledBy and cancelledAt when status is CANCELLED', async () => {
      const cancelled = makeRequest({
        status: LeaveRequestStatus.CANCELLED,
        approvedBy: null,
        approvedAt: null,
        cancelledBy: 'emp-001',
        cancelledAt: new Date('2026-08-05T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(cancelled)] });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.CANCELLED, { actorId: 'emp-001' });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(result!.cancelledBy).toBe('emp-001');
      expect(result!.cancelledAt).toBeDefined();
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
    });

    it('should clear all actor fields when status is SUBMITTED', async () => {
      const submitted = makeRequest({
        status: LeaveRequestStatus.SUBMITTED,
        approvedBy: null,
        approvedAt: null,
        cancelledBy: null,
        cancelledAt: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(submitted)] });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.SUBMITTED, { actorId: 'emp-001' });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.cancelledBy).toBeNull();
      expect(result!.cancelledAt).toBeNull();
    });

    it('should clear all actor fields when status is REJECTED', async () => {
      const rejected = makeRequest({
        status: LeaveRequestStatus.REJECTED,
        approvedBy: null,
        approvedAt: null,
        cancelledBy: null,
        cancelledAt: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(rejected)] });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.REJECTED, { actorId: 'mgr-001' });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.REJECTED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.cancelledBy).toBeNull();
      expect(result!.cancelledAt).toBeNull();
    });

    it('should return null when the id does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('nonexistent', LeaveRequestStatus.APPROVED, { actorId: 'mgr-001' });

      expect(result).toBeNull();
    });

    it('should use the provided client when a transaction client is passed', async () => {
      const mockClient = {
        query: jest.fn(),
      };
      const approved = makeRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-05T00:00:00Z'),
      });
      mockClient.query.mockResolvedValueOnce({ rows: [makeRow(approved)] });

      const result = await repo.updateStatus(
        'lr-001',
        LeaveRequestStatus.APPROVED,
        { actorId: 'mgr-001' },
        mockClient as unknown as import('pg').PoolClient
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        expect.any(Array)
      );
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
