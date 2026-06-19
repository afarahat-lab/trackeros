import { LeaveRepository } from '../../../../src/modules/leave/leave.repository.impl';
import pool from '../../../../src/shared/db/connection';
import { LeaveType, LeaveStatus } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  default: {
    query: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('LeaveRepository', () => {
  let repo: LeaveRepository;

  beforeEach(() => {
    repo = new LeaveRepository();
    jest.clearAllMocks();
  });

  const mockRow = (overrides: Partial<any> = {}) => ({
    id: 1,
    employee_id: 100,
    leave_type: 'annual',
    start_date: '2025-06-01',
    end_date: '2025-06-05',
    status: 'pending',
    reason: 'vacation',
    created_at: '2025-06-01T00:00:00.000Z',
    updated_at: '2025-06-01T00:00:00.000Z',
    ...overrides,
  });

  describe('create', () => {
    it('should insert a leave request and return the created entity', async () => {
      const input = {
        employeeId: 100,
        leaveType: LeaveType.Annual,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-05'),
        status: LeaveStatus.Pending,
        reason: 'vacation',
      };
      const row = mockRow();
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [100, 'annual', input.startDate, input.endDate, 'pending', 'vacation']
      );
      expect(result).toEqual({
        id: 1,
        employeeId: 100,
        leaveType: 'annual',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-05'),
        status: 'pending',
        reason: 'vacation',
        createdAt: new Date('2025-06-01T00:00:00.000Z'),
        updatedAt: new Date('2025-06-01T00:00:00.000Z'),
      });
    });

    it('should handle missing reason', async () => {
      const input = {
        employeeId: 200,
        leaveType: LeaveType.Sick,
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-02'),
        status: LeaveStatus.Pending,
      };
      const row = mockRow({ employee_id: 200, leave_type: 'sick', reason: null });
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [200, 'sick', input.startDate, input.endDate, 'pending', null]
      );
      expect(result.reason).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const row = mockRow({ id: 42 });
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById(42);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE id = $1', [42]);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(42);
    });

    it('should return null when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all leave requests for an employee', async () => {
      const rows = [mockRow({ id: 1 }), mockRow({ id: 2, leave_type: 'sick' })];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows });

      const result = await repo.findByEmployeeId(100);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE employee_id = $1', [100]);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].leaveType).toBe('sick');
    });

    it('should return empty array when no requests', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId(999);

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update status and return updated request', async () => {
      const row = mockRow({ id: 10, status: 'approved' });
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.updateStatus(10, LeaveStatus.Approved);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET status'),
        [10, 'approved']
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe('approved');
    });

    it('should return null when request does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus(999, LeaveStatus.Rejected);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a row is deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.delete(5);

      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM leave_requests WHERE id = $1', [5]);
      expect(result).toBe(true);
    });

    it('should return false when no row is deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.delete(999);

      expect(result).toBe(false);
    });
  });
});
