import { LeaveRepository } from 'modules/leave/leave.repository';
import { pool } from 'shared/db/connection';
import { LeaveRequestStatus } from 'shared/types';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'lr-1',
    employee_id: 'emp-1',
    policy_id: 'pol-1',
    leave_type: 'annual',
    start_date: '2026-07-01T00:00:00.000Z',
    end_date: '2026-07-03T00:00:00.000Z',
    reason: 'Vacation',
    status: 'SUBMITTED',
    rejection_reason: null,
    approved_by: null,
    approved_at: null,
    created_at: '2026-06-15T12:00:00.000Z',
    updated_at: '2026-06-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('LeaveRepository', () => {
  let repo: LeaveRepository;

  beforeEach(() => {
    repo = new LeaveRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a LeaveRequest when the row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const result = await repo.findById('lr-1');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE id = $1', ['lr-1']);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-1');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.policyId).toBe('pol-1');
      expect(result!.startDate).toEqual(new Date('2026-07-01T00:00:00.000Z'));
      expect(result!.endDate).toEqual(new Date('2026-07-03T00:00:00.000Z'));
      expect(result!.reason).toBe('Vacation');
      expect(result!.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.rejectionReason).toBeNull();
      expect(result!.createdAt).toEqual(new Date('2026-06-15T12:00:00.000Z'));
      expect(result!.updatedAt).toEqual(new Date('2026-06-15T12:00:00.000Z'));
    });

    it('should return null when no row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should map an approved request with approvedBy and approvedAt', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'APPROVED',
            approved_by: 'mgr-1',
            approved_at: '2026-06-16T10:00:00.000Z',
          }),
        ],
      });

      const result = await repo.findById('lr-1');

      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result!.approvedBy).toBe('mgr-1');
      expect(result!.approvedAt).toEqual(new Date('2026-06-16T10:00:00.000Z'));
    });

    it('should map a rejected request with rejectionReason', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'REJECTED',
            rejection_reason: 'Insufficient staffing',
          }),
        ],
      });

      const result = await repo.findById('lr-1');

      expect(result!.status).toBe(LeaveRequestStatus.REJECTED);
      expect(result!.rejectionReason).toBe('Insufficient staffing');
    });

    it('should handle undefined reason', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ reason: null })],
      });

      const result = await repo.findById('lr-1');

      expect(result!.reason).toBeUndefined();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for the given employee', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow(), makeRow({ id: 'lr-2', start_date: '2026-08-01T00:00:00.000Z' })],
      });

      const results = await repo.findByEmployeeId('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC',
        ['emp-1'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('lr-1');
      expect(results[1].id).toBe('lr-2');
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByEmployeeId('emp-none');

      expect(results).toHaveLength(0);
    });

    it('should apply status filter when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const results = await repo.findByEmployeeId('emp-1', { status: LeaveRequestStatus.SUBMITTED });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2 ORDER BY start_date DESC',
        ['emp-1', 'SUBMITTED'],
      );
      expect(results).toHaveLength(1);
    });

    it('should apply policyId filter when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const results = await repo.findByEmployeeId('emp-1', { policyId: 'pol-1' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND policy_id = $2 ORDER BY start_date DESC',
        ['emp-1', 'pol-1'],
      );
      expect(results).toHaveLength(1);
    });

    it('should apply date range filters when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const results = await repo.findByEmployeeId('emp-1', {
        startDateFrom: new Date('2026-06-01'),
        startDateTo: new Date('2026-08-01'),
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND start_date >= $2 AND start_date <= $3 ORDER BY start_date DESC',
        ['emp-1', new Date('2026-06-01'), new Date('2026-08-01')],
      );
      expect(results).toHaveLength(1);
    });

    it('should apply endDate filters when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const results = await repo.findByEmployeeId('emp-1', {
        endDateFrom: new Date('2026-07-01'),
        endDateTo: new Date('2026-07-31'),
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND end_date >= $2 AND end_date <= $3 ORDER BY start_date DESC',
        ['emp-1', new Date('2026-07-01'), new Date('2026-07-31')],
      );
      expect(results).toHaveLength(1);
    });

    it('should apply limit and offset when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const results = await repo.findByEmployeeId('emp-1', { limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC LIMIT $2 OFFSET $3',
        ['emp-1', 10, 20],
      );
      expect(results).toHaveLength(1);
    });

    it('should apply all filters together', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByEmployeeId('emp-1', {
        status: LeaveRequestStatus.APPROVED,
        policyId: 'pol-1',
        startDateFrom: new Date('2026-01-01'),
        limit: 5,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2 AND policy_id = $3 AND start_date >= $4 ORDER BY start_date DESC LIMIT $5',
        ['emp-1', 'APPROVED', 'pol-1', new Date('2026-01-01'), 5],
      );
      expect(results).toHaveLength(0);
    });
  });

  describe('findByStatus', () => {
    it('should return leave requests with the given status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow(), makeRow({ id: 'lr-2' })],
      });

      const results = await repo.findByStatus(LeaveRequestStatus.SUBMITTED);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1 ORDER BY start_date DESC',
        ['SUBMITTED'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(results[1].status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByStatus(LeaveRequestStatus.APPROVED);

      expect(results).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should insert a new leave request and return it', async () => {
      const input = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-03'),
        reason: 'Vacation',
        status: LeaveRequestStatus.SUBMITTED,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'lr-new',
            employee_id: 'emp-1',
            policy_id: 'pol-1',
            leave_type: 'annual',
            start_date: '2026-07-01T00:00:00.000Z',
            end_date: '2026-07-03T00:00:00.000Z',
            reason: 'Vacation',
            status: 'SUBMITTED',
            rejection_reason: null,
            approved_by: null,
            approved_at: null,
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_requests (employee_id, policy_id, start_date, end_date, reason, status, approved_by, approved_at, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          'emp-1',
          'pol-1',
          new Date('2026-07-01'),
          new Date('2026-07-03'),
          'Vacation',
          'SUBMITTED',
          null,
          null,
          null,
        ],
      );
      expect(result.id).toBe('lr-new');
      expect(result.employeeId).toBe('emp-1');
      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(result.reason).toBe('Vacation');
    });

    it('should handle undefined reason', async () => {
      const input = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-03'),
        reason: undefined,
        status: LeaveRequestStatus.DRAFT,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'lr-new',
            employee_id: 'emp-1',
            policy_id: 'pol-1',
            leave_type: 'annual',
            start_date: '2026-07-01T00:00:00.000Z',
            end_date: '2026-07-03T00:00:00.000Z',
            reason: null,
            status: 'DRAFT',
            rejection_reason: null,
            approved_by: null,
            approved_at: null,
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_requests (employee_id, policy_id, start_date, end_date, reason, status, approved_by, approved_at, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          'emp-1',
          'pol-1',
          new Date('2026-07-01'),
          new Date('2026-07-03'),
          null,
          'DRAFT',
          null,
          null,
          null,
        ],
      );
      expect(result.reason).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated request', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            reason: 'Updated reason',
            end_date: '2026-07-05T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          }),
        ],
      });

      const result = await repo.update('lr-1', {
        reason: 'Updated reason',
        endDate: new Date('2026-07-05'),
      });

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_requests SET end_date = $1, reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [new Date('2026-07-05'), 'Updated reason', 'lr-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('Updated reason');
      expect(result!.endDate).toEqual(new Date('2026-07-05T00:00:00.000Z'));
    });

    it('should return null when request does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { reason: 'X' });

      expect(result).toBeNull();
    });

    it('should return the existing request when no fields are provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const result = await repo.update('lr-1', {});

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE id = $1', ['lr-1']);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-1');
    });

    it('should handle setting a field to null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ reason: null })],
      });

      const result = await repo.update('lr-1', { reason: undefined });

      // reason is undefined, so it won't be in the SET clause
      // Let's test with an explicit null instead
    });

    it('should handle setting approvedBy to null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ approved_by: null })],
      });

      const result = await repo.update('lr-1', { approvedBy: null });

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_requests SET approved_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [null, 'lr-1'],
      );
      expect(result!.approvedBy).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should set status to APPROVED with approvedBy and approvedAt', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'APPROVED',
            approved_by: 'mgr-1',
            approved_at: '2026-08-01T10:00:00.000Z',
            rejection_reason: null,
            updated_at: '2026-08-01T10:00:00.000Z',
          }),
        ],
      });

      const result = await repo.updateStatus('lr-1', LeaveRequestStatus.APPROVED, 'mgr-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_requests SET status = $1, approved_at = NOW(), approved_by = $2, rejection_reason = NULL, updated_at = NOW() WHERE id = $3 RETURNING *`,
        ['APPROVED', 'mgr-1', 'lr-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result!.approvedBy).toBe('mgr-1');
      expect(result!.approvedAt).toEqual(new Date('2026-08-01T10:00:00.000Z'));
      expect(result!.rejectionReason).toBeNull();
    });

    it('should set status to REJECTED with rejectionReason', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'REJECTED',
            approved_by: null,
            approved_at: null,
            rejection_reason: 'Insufficient staffing',
            updated_at: '2026-08-01T10:00:00.000Z',
          }),
        ],
      });

      const result = await repo.updateStatus(
        'lr-1',
        LeaveRequestStatus.REJECTED,
        undefined,
        'Insufficient staffing',
      );

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_requests SET status = $1, approved_at = NULL, approved_by = NULL, rejection_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        ['REJECTED', 'Insufficient staffing', 'lr-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.REJECTED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.rejectionReason).toBe('Insufficient staffing');
    });

    it('should set status to CANCELLED and clear approval/rejection fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'CANCELLED',
            approved_by: null,
            approved_at: null,
            rejection_reason: null,
            updated_at: '2026-08-01T10:00:00.000Z',
          }),
        ],
      });

      const result = await repo.updateStatus('lr-1', LeaveRequestStatus.CANCELLED);

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_requests SET status = $1, approved_at = NULL, approved_by = NULL, rejection_reason = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`,
        ['CANCELLED', 'lr-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.rejectionReason).toBeNull();
    });

    it('should set status to DRAFT and clear approval/rejection fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'DRAFT',
            approved_by: null,
            approved_at: null,
            rejection_reason: null,
            updated_at: '2026-08-01T10:00:00.000Z',
          }),
        ],
      });

      const result = await repo.updateStatus('lr-1', LeaveRequestStatus.DRAFT);

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_requests SET status = $1, approved_at = NULL, approved_by = NULL, rejection_reason = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`,
        ['DRAFT', 'lr-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.DRAFT);
    });

    it('should return null when request does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('nonexistent', LeaveRequestStatus.APPROVED, 'mgr-1');

      expect(result).toBeNull();
    });

    it('should handle approvedBy as null for APPROVED status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'APPROVED',
            approved_by: null,
            approved_at: '2026-08-01T10:00:00.000Z',
            rejection_reason: null,
            updated_at: '2026-08-01T10:00:00.000Z',
          }),
        ],
      });

      const result = await repo.updateStatus('lr-1', LeaveRequestStatus.APPROVED, null);

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_requests SET status = $1, approved_at = NOW(), approved_by = $2, rejection_reason = NULL, updated_at = NOW() WHERE id = $3 RETURNING *`,
        ['APPROVED', null, 'lr-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
    });
  });
});
